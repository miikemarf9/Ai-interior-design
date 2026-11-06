create table if not exists public.customer_auth_identities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  provider text not null check (provider in ('google','facebook','x')),
  provider_subject text not null,
  email_at_link text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  unique (provider, provider_subject),
  unique (account_id, provider)
);

create index if not exists customer_auth_identities_account_idx
  on public.customer_auth_identities (account_id, provider);
