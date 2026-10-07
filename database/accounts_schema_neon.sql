-- Stage 10: customer accounts, homes, saved-room ownership and CRM bridge.

create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text,
  status text not null default 'active',
  email_verified_at timestamptz,
  password_updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint customer_accounts_email_nonempty check (length(trim(email)) > 3),
  constraint customer_accounts_status_check check (status in ('active','disabled'))
);

create unique index customer_accounts_email_unique on public.customer_accounts (lower(email));

create table public.customer_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index customer_auth_sessions_account_idx
  on public.customer_auth_sessions (account_id, expires_at desc)
  where revoked_at is null;

create table public.customer_auth_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  purpose text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint customer_auth_tokens_purpose_check check (purpose in ('verify_email','reset_password'))
);

create index customer_auth_tokens_account_purpose_idx
  on public.customer_auth_tokens (account_id, purpose, expires_at desc)
  where used_at is null;

create table public.customer_homes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  name text not null default 'My home',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint customer_homes_name_nonempty check (length(trim(name)) > 0)
);

create unique index customer_homes_one_primary
  on public.customer_homes (account_id)
  where is_primary;
create index customer_homes_account_idx on public.customer_homes (account_id, created_at);

alter table public.room_designs add column account_id uuid references public.customer_accounts(id) on delete cascade;
alter table public.room_designs add column home_id uuid references public.customer_homes(id) on delete set null;
alter table public.room_designs add column room_name text not null default 'Living room';
alter table public.room_designs add column room_type text not null default 'living_room';

create index room_designs_account_updated_idx on public.room_designs (account_id, updated_at desc);
create index room_designs_home_updated_idx on public.room_designs (home_id, updated_at desc);

alter table public.design_credit_wallets add column account_id uuid references public.customer_accounts(id) on delete cascade;
create unique index design_credit_wallets_account_unique
  on public.design_credit_wallets (account_id)
  where account_id is not null;

create table public.crm_contact_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  provider text not null default 'grabandbook',
  external_contact_id text,
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contact_links_status_check check (sync_status in ('pending','synced','failed','disabled')),
  unique (account_id, provider)
);

create table public.crm_outbox (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  event_type text not null,
  aggregate_type text not null default 'customer',
  aggregate_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint crm_outbox_status_check check (status in ('pending','processing','processed','failed')),
  constraint crm_outbox_attempts_nonnegative check (attempts >= 0)
);

create index crm_outbox_pending_idx
  on public.crm_outbox (available_at, created_at)
  where status in ('pending','failed');
