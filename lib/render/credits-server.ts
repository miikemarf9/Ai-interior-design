import { getCatalogDb } from "@/lib/catalog/neon";
import { creditPolicy } from "@/lib/credits";
import { isAdminEmail } from "@/lib/auth/admin";

export type CreditStatus = {
  balance: number;
  verificationStatus: "unverified" | "development" | "verified";
  verifiedRequired: boolean;
  siteCreditExempt: boolean;
  freeCreditAvailable: boolean;
};

const allowDevelopmentWallets = () =>
  process.env.RENDER_ALLOW_DEVELOPMENT_WALLETS === "true";

export async function ensureRenderWallet(ownerKey: string): Promise<CreditStatus> {
  const sql = getCatalogDb();

  await sql.query(
    `insert into public.design_credit_wallets (
       owner_key, owner_type, verification_status, balance, free_grant_applied
     )
     values ($1, 'development_session', 'unverified', 0, false)
     on conflict (owner_key) do nothing`,
    [ownerKey],
  );

  if (allowDevelopmentWallets()) {
    await sql.query(
      `with granted as (
        update public.design_credit_wallets
        set
          balance = balance + $2,
          free_grant_applied = true,
          verification_status = case
            when verification_status = 'verified' then 'verified'
            else 'development'
          end,
          updated_at = now()
        where owner_key = $1
          and free_grant_applied = false
        returning id
      )
      insert into public.design_credit_ledger (
        wallet_id, event_type, amount, idempotency_key, metadata
      )
      select
        id,
        'signup_grant',
        $2,
        'signup-grant:' || id::text,
        '{"grant":"development_stage_7"}'::jsonb
      from granted
      on conflict (idempotency_key) do nothing`,
      [ownerKey, creditPolicy.freeRenderCredits],
    );
  }

  const rows = await sql.query(
    `select
        w.balance,
        w.verification_status,
        w.free_grant_applied,
        a.email,
        a.email_verified_at::text as email_verified_at,
        exists (
          select 1
          from public.design_credit_ledger l
          where l.wallet_id=w.id
            and l.event_type='credit_pack_purchase'
        ) as has_paid_purchase
     from public.design_credit_wallets w
     left join public.customer_accounts a on a.id=w.account_id
     where w.owner_key = $1
     limit 1`,
    [ownerKey],
  ) as Array<{
    balance: number;
    verification_status: "unverified" | "development" | "verified";
    email: string | null;
    email_verified_at: string | null;
    free_grant_applied: boolean;
    has_paid_purchase: boolean;
  }>;

  const row = rows[0];
  return {
    balance: row?.balance ?? 0,
    verificationStatus: row?.verification_status ?? "unverified",
    verifiedRequired: !allowDevelopmentWallets() && row?.verification_status !== "verified",
    siteCreditExempt: Boolean(row?.email_verified_at && isAdminEmail(row?.email)),
    freeCreditAvailable: Boolean(row && row.free_grant_applied && !row.has_paid_purchase && row.balance > 0),
  };
}

export async function spendCreditAndCreateGeneration(args: {
  ownerKey: string;
  designId: string;
  requestId: string;
  model: string;
  promptVersion: string;
  promptText: string;
  productIds: string[];
  quality: string;
  outputSize: string;
  metadata?: Record<string, unknown>;
}) {
  const sql = getCatalogDb();
  const idempotencyKey = `render-spend:${args.ownerKey}:${args.requestId}`;

  const existing = await sql.query(
    `select g.id::text as generation_id,w.balance,g.status,
       coalesce((g.metadata->>'siteCreditExempt')::boolean,false) as site_credit_exempt
     from public.render_generations g
     join public.design_credit_wallets w on w.id=g.wallet_id
     where w.owner_key=$1 and (
       g.metadata->>'requestId'=$2
       or exists (select 1 from public.design_credit_ledger l
         where l.generation_id=g.id and l.idempotency_key=$3)
     )
     limit 1`,
    [args.ownerKey, idempotencyKey, idempotencyKey],
  ) as Array<{ generation_id: string; balance: number; status: string; site_credit_exempt: boolean }>;

  if (existing[0]) {
    return { ...existing[0], reused: true };
  }

  const allowedStatuses = allowDevelopmentWallets()
    ? ["development", "verified"]
    : ["verified"];

  const rows = await sql.query(
    `with locked_wallet as (
      select w.id,w.balance,w.verification_status,
        (a.email_verified_at is not null and lower(a.email)=any($12::text[])) as site_credit_exempt
      from public.design_credit_wallets w
      left join public.customer_accounts a on a.id=w.account_id
      where w.owner_key=$1 and w.verification_status=any($9::text[])
        and (w.balance>=1 or (a.email_verified_at is not null and lower(a.email)=any($12::text[])))
      for update of w
    ), debited as (
      update public.design_credit_wallets w
      set balance=case when lw.site_credit_exempt then w.balance else w.balance-1 end,updated_at=now()
      from locked_wallet lw where w.id=lw.id
      returning w.id,w.balance,lw.site_credit_exempt
    ),
    generation as (
      insert into public.render_generations (
        design_id, wallet_id, provider, model, prompt_version, prompt_text,
        product_ids, status, quality, output_size, metadata
      )
      select
        $2::uuid,
        d.id,
        'openai',
        $4,
        $5,
        $6,
        $7::uuid[],
        'processing',
        $8,
        $10,
        $11::jsonb || jsonb_build_object('requestId',$3::text,'siteCreditExempt',d.site_credit_exempt,'creditMode',case when d.site_credit_exempt then 'provider_allowance' else 'credits' end)
      from debited d
      returning id, wallet_id
    ),
    ledger as (
      insert into public.design_credit_ledger (
        wallet_id, event_type, amount, design_id, generation_id,
        idempotency_key, metadata
      )
      select
        g.wallet_id,
        'render_spend',
        -1,
        $2::uuid,
        g.id,
        $3,
        jsonb_build_object('credit_cost', 1)
      from generation g join debited d on d.id=g.wallet_id
      where not d.site_credit_exempt
      returning generation_id
    )
    select
      g.id::text as generation_id,
      d.balance,
      d.site_credit_exempt,
      'processing'::text as status
    from generation g
    join debited d on d.id = g.wallet_id`,
    [
      args.ownerKey,
      args.designId,
      idempotencyKey,
      args.model,
      args.promptVersion,
      args.promptText,
      args.productIds,
      args.quality,
      allowedStatuses,
      args.outputSize,
      JSON.stringify(args.metadata || {}),
      (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
    ],
  ) as Array<{ generation_id: string; balance: number; status: string; site_credit_exempt: boolean }>;

  if (!rows[0]) {
    throw new Error("NO_RENDER_CREDIT");
  }

  return { ...rows[0], reused: false };
}

export async function refundFailedGeneration(args: {
  generationId: string;
  reason: string;
  failureCode?: string | null;
  durationMs?: number | null;
  providerRequestId?: string | null;
  usage?: {
    inputTextTokens: number | null;
    inputImageTokens: number | null;
    outputImageTokens: number | null;
    totalTokens: number | null;
    costUsdMicros: number | null;
  };
  costGbpMinor?: number | null;
  costFxUsdGbp?: number | null;
}) {
  const sql = getCatalogDb();
  const refundKey = `render-refund:${args.generationId}`;

  await sql.query(
    `with generation as (
      update public.render_generations
      set
        status = 'failed',
        completed_at = now(),
        duration_ms = $3,
        provider_request_id = coalesce($4, provider_request_id),
        failure_code = $5,
        failure_message = $6,
        input_text_tokens = $7,
        input_image_tokens = $8,
        output_image_tokens = $9,
        total_tokens = $10,
        cost_usd_micros = $11,
        cost_gbp_minor = $12,
        cost_fx_usd_gbp = $13
      where id = $1::uuid
      returning wallet_id, design_id, metadata
    ),
    refund as (
      insert into public.design_credit_ledger (
        wallet_id, event_type, amount, design_id, generation_id,
        idempotency_key, metadata
      )
      select
        wallet_id,
        'render_refund',
        1,
        design_id,
        $1::uuid,
        $2,
        jsonb_build_object('reason', $6)
      from generation
      where coalesce((metadata->>'siteCreditExempt')::boolean,false)=false
      on conflict (idempotency_key) do nothing
      returning wallet_id
    )
    update public.design_credit_wallets w
    set balance = balance + 1, updated_at = now()
    from refund r
    where w.id = r.wallet_id`,
    [
      args.generationId,
      refundKey,
      args.durationMs ?? null,
      args.providerRequestId ?? null,
      args.failureCode ?? null,
      args.reason.slice(0, 1500),
      args.usage?.inputTextTokens ?? null,
      args.usage?.inputImageTokens ?? null,
      args.usage?.outputImageTokens ?? null,
      args.usage?.totalTokens ?? null,
      args.usage?.costUsdMicros ?? null,
      args.costGbpMinor ?? null,
      args.costFxUsdGbp ?? null,
    ],
  );
}

export async function getCreditStatus(ownerKey: string) {
  return ensureRenderWallet(ownerKey);
}
