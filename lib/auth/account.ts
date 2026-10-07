import { creditPolicy } from "@/lib/credits";
import { getCatalogDb } from "@/lib/catalog/neon";
import { canonicalOwnerKey } from "@/lib/auth";

export async function ensurePrimaryHome(accountId: string) {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `with existing as (
      select id from public.customer_homes
      where account_id=$1::uuid and is_primary
      limit 1
    ),
    inserted as (
      insert into public.customer_homes (account_id,name,is_primary)
      select $1::uuid,'My home',true
      where not exists (select 1 from existing)
      returning id
    )
    select id::text as id from existing
    union all
    select id::text from inserted
    limit 1`,
    [accountId],
  ) as Array<{ id: string }>;
  return rows[0].id;
}

export async function ensureAccountWallet(accountId: string, verified: boolean) {
  const sql = getCatalogDb();
  const ownerKey = canonicalOwnerKey(accountId);

  await sql.query(
    `insert into public.design_credit_wallets (
      owner_key, owner_type, verification_status, balance,
      free_grant_applied, account_id
    )
    values ($1,'account',$2,0,false,$3::uuid)
    on conflict (owner_key) do update
    set account_id=excluded.account_id,
        owner_type='account',
        verification_status=case
          when public.design_credit_wallets.verification_status='verified' then 'verified'
          else excluded.verification_status
        end,
        updated_at=now()`,
    [ownerKey, verified ? "verified" : "unverified", accountId],
  );

  if (verified) await grantVerifiedCredits(accountId);
}

export async function grantVerifiedCredits(accountId: string) {
  const sql = getCatalogDb();
  const ownerKey = canonicalOwnerKey(accountId);

  await sql.query(
    `with wallet as (
      update public.design_credit_wallets
      set verification_status='verified',
          balance=case
            when free_grant_applied then balance
            else balance + $2
          end,
          free_grant_applied=true,
          updated_at=now()
      where account_id=$1::uuid
        and owner_key=$3
      returning id, free_grant_applied
    ),
    ledger as (
      insert into public.design_credit_ledger (
        wallet_id,event_type,amount,idempotency_key,metadata
      )
      select id,'signup_grant',$2,'verified-signup-grant:' || $1,
             '{"grant":"verified_account"}'::jsonb
      from wallet
      on conflict (idempotency_key) do nothing
      returning wallet_id
    )
    select count(*) from ledger`,
    [accountId, creditPolicy.freeRenderCredits, ownerKey],
  );
}

export async function claimAnonymousRooms(
  accountId: string,
  anonymousOwnerKey?: string | null,
) {
  if (!anonymousOwnerKey || !/^[a-zA-Z0-9_-]{20,100}$/.test(anonymousOwnerKey)) {
    return [] as string[];
  }

  const sql = getCatalogDb();
  const homeId = await ensurePrimaryHome(accountId);
  const ownerKey = canonicalOwnerKey(accountId);

  const rows = await sql.query(
    `update public.room_designs
     set
       account_id=$1::uuid,
       home_id=coalesce(home_id,$2::uuid),
       owner_key=$3,
       room_name=coalesce(nullif(trim(room_name),''),'Living room'),
       updated_at=now()
     where owner_key=$4
       and (account_id is null or account_id=$1::uuid)
     returning id::text as id`,
    [accountId, homeId, ownerKey, anonymousOwnerKey],
  ) as Array<{ id: string }>;

  if (rows.length) {
    await enqueueCrmEvent(accountId, "room_claimed", "customer", accountId, {
      roomIds: rows.map((row) => row.id),
    });
  }

  return rows.map((row) => row.id);
}

export async function enqueueCrmEvent(
  accountId: string,
  eventType: string,
  aggregateType: string,
  aggregateId: string | null,
  payload: Record<string, unknown>,
) {
  const sql = getCatalogDb();
  await sql.query(
    `insert into public.crm_outbox (
      account_id,event_type,aggregate_type,aggregate_id,payload
    )
    values ($1::uuid,$2,$3,$4::uuid,$5::jsonb)`,
    [accountId, eventType, aggregateType, aggregateId, JSON.stringify(payload)],
  );
}

export async function accountCreditBalance(accountId: string) {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `select balance, verification_status
     from public.design_credit_wallets
     where account_id=$1::uuid
     limit 1`,
    [accountId],
  ) as Array<{ balance: number; verification_status: string }>;

  return {
    balance: rows[0]?.balance ?? 0,
    verificationStatus: rows[0]?.verification_status ?? "unverified",
  };
}
