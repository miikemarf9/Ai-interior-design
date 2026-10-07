import { getCatalogDb } from "@/lib/catalog/neon";
import { creditPolicy } from "@/lib/credits";

export type CreditStatus = {
  balance: number;
  verificationStatus: "unverified" | "development" | "verified";
  verifiedRequired: boolean;
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
    `select balance, verification_status
     from public.design_credit_wallets
     where owner_key = $1
     limit 1`,
    [ownerKey],
  ) as Array<{
    balance: number;
    verification_status: "unverified" | "development" | "verified";
  }>;

  const row = rows[0];
  return {
    balance: row?.balance ?? 0,
    verificationStatus: row?.verification_status ?? "unverified",
    verifiedRequired: !allowDevelopmentWallets() && row?.verification_status !== "verified",
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
}) {
  const sql = getCatalogDb();
  const idempotencyKey = `render-spend:${args.ownerKey}:${args.requestId}`;

  const existing = await sql.query(
    `select
       g.id::text as generation_id,
       w.balance,
       g.status
     from public.design_credit_ledger l
     join public.render_generations g on g.id = l.generation_id
     join public.design_credit_wallets w on w.id = l.wallet_id
     where l.idempotency_key = $1
     limit 1`,
    [idempotencyKey],
  ) as Array<{ generation_id: string; balance: number; status: string }>;

  if (existing[0]) {
    return { ...existing[0], reused: true };
  }

  const allowedStatuses = allowDevelopmentWallets()
    ? ["development", "verified"]
    : ["verified"];

  const rows = await sql.query(
    `with debited as (
      update public.design_credit_wallets
      set balance = balance - 1, updated_at = now()
      where owner_key = $1
        and balance >= 1
        and verification_status = any($9::text[])
      returning id, balance
    ),
    generation as (
      insert into public.render_generations (
        design_id, wallet_id, provider, model, prompt_version, prompt_text,
        product_ids, status, quality, output_size
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
        $10
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
      from generation g
      returning generation_id
    )
    select
      g.id::text as generation_id,
      d.balance,
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
    ],
  ) as Array<{ generation_id: string; balance: number; status: string }>;

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
      returning wallet_id, design_id
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
