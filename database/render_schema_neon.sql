-- Stage 7: render engine, private image assets and enforced credits.
-- Neon/Postgres. Browser clients never receive direct database credentials.

create table public.room_designs (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  status text not null default 'intake',
  intake jsonb,
  brief jsonb,
  product_selection jsonb,
  approved_brief_at timestamptz,
  approved_products_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_designs_status_check check (status in ('intake','brief','products','render_ready','rendered','archived'))
);

create index room_designs_owner_created_idx
  on public.room_designs (owner_key, created_at desc);

create table public.design_assets (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.room_designs(id) on delete cascade,
  asset_kind text not null,
  mime_type text not null,
  byte_size integer not null default 0,
  data bytea,
  external_url text,
  sha256 text,
  storage_backend text not null default 'postgres_bytea_mvp',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint design_assets_kind_check check (asset_kind in ('room_original','render_result')),
  constraint design_assets_size_nonnegative check (byte_size >= 0),
  constraint design_assets_source_check check (
    (data is not null and external_url is null)
    or (data is null and external_url is not null)
  )
);

alter table public.room_designs
  add column original_room_asset_id uuid references public.design_assets(id) on delete set null;

create index design_assets_design_kind_idx
  on public.design_assets (design_id, asset_kind, created_at desc);

create table public.design_credit_wallets (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null unique,
  owner_type text not null default 'development_session',
  verification_status text not null default 'unverified',
  balance integer not null default 0,
  free_grant_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_credit_wallets_owner_type_check check (owner_type in ('development_session','account')),
  constraint design_credit_wallets_verification_check check (verification_status in ('unverified','development','verified')),
  constraint design_credit_wallets_balance_nonnegative check (balance >= 0)
);

create table public.render_generations (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.room_designs(id) on delete cascade,
  wallet_id uuid not null references public.design_credit_wallets(id) on delete restrict,
  provider text not null,
  model text not null,
  prompt_version text not null,
  prompt_text text not null,
  product_ids uuid[] not null default '{}',
  status text not null default 'processing',
  quality text,
  output_size text,
  provider_request_id text,
  input_text_tokens integer,
  input_image_tokens integer,
  output_image_tokens integer,
  total_tokens integer,
  cost_usd_micros bigint,
  duration_ms integer,
  result_asset_id uuid references public.design_assets(id) on delete set null,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint render_generations_status_check check (status in ('processing','succeeded','failed')),
  constraint render_generations_cost_nonnegative check (cost_usd_micros is null or cost_usd_micros >= 0),
  constraint render_generations_duration_nonnegative check (duration_ms is null or duration_ms >= 0)
);

create index render_generations_design_created_idx
  on public.render_generations (design_id, created_at desc);
create index render_generations_status_created_idx
  on public.render_generations (status, created_at desc);

create table public.design_credit_ledger (
  id bigint generated always as identity primary key,
  wallet_id uuid not null references public.design_credit_wallets(id) on delete restrict,
  event_type text not null,
  amount smallint not null,
  design_id uuid references public.room_designs(id) on delete set null,
  generation_id uuid references public.render_generations(id) on delete set null,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint design_credit_ledger_amount_nonzero check (amount <> 0),
  constraint design_credit_ledger_type_check check (
    event_type in ('signup_grant','credit_pack_purchase','render_spend','render_refund','qualifying_purchase_reward','manual_adjustment')
  )
);

create index design_credit_ledger_wallet_created_idx
  on public.design_credit_ledger (wallet_id, created_at desc);

create unique index render_generations_provider_request_unique
  on public.render_generations (provider, provider_request_id)
  where provider_request_id is not null;
