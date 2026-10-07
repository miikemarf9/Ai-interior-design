-- Stage 9: affiliate commerce attribution and commercial validation.
-- Product/variant identity remains independent from retailer offers.

create table public.affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null unique references public.retailers(id) on delete cascade,
  network text not null,
  advertiser_id text not null,
  publisher_id text,
  relationship_status text,
  commission_range jsonb not null default '[]'::jsonb,
  estimated_commission_rate_percent numeric(8,4),
  conversion_rate_percent numeric(8,4),
  approval_percentage numeric(8,4),
  epc_minor integer,
  currency char(3) not null default 'GBP',
  source_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_programs_rate_nonnegative check (estimated_commission_rate_percent is null or estimated_commission_rate_percent >= 0),
  constraint affiliate_programs_conversion_nonnegative check (conversion_rate_percent is null or conversion_rate_percent >= 0),
  constraint affiliate_programs_approval_range check (approval_percentage is null or approval_percentage between 0 and 100),
  constraint affiliate_programs_epc_nonnegative check (epc_minor is null or epc_minor >= 0),
  unique (network, advertiser_id)
);

create table public.commerce_events (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  event_type text not null,
  design_id uuid references public.room_designs(id) on delete set null,
  generation_id uuid references public.render_generations(id) on delete set null,
  share_id uuid references public.room_shares(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  offer_id uuid references public.retailer_offers(id) on delete set null,
  retailer_id uuid references public.retailers(id) on delete set null,
  alternative_kind text,
  surface text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint commerce_events_type_check check (event_type in ('product_viewed','swap_viewed','retailer_clicked')),
  constraint commerce_events_alt_check check (alternative_kind is null or alternative_kind in ('cheaper','similar','premium'))
);

create index commerce_events_type_created_idx on public.commerce_events (event_type, created_at desc);
create index commerce_events_design_created_idx on public.commerce_events (design_id, created_at desc);
create index commerce_events_product_created_idx on public.commerce_events (product_id, created_at desc);

create table public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  click_ref text not null unique,
  event_id uuid unique references public.commerce_events(id) on delete set null,
  session_key text not null,
  design_id uuid references public.room_designs(id) on delete set null,
  generation_id uuid references public.render_generations(id) on delete set null,
  share_id uuid references public.room_shares(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  offer_id uuid references public.retailer_offers(id) on delete set null,
  retailer_id uuid references public.retailers(id) on delete set null,
  network text,
  advertiser_id text,
  publisher_id text,
  destination_url text not null,
  tracking_url text not null,
  sale_value_snapshot_minor integer,
  currency char(3) not null default 'GBP',
  commission_rate_percent numeric(8,4),
  expected_commission_minor integer,
  expected_revenue_minor integer,
  surface text not null,
  clicked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint affiliate_clicks_sale_value_nonnegative check (sale_value_snapshot_minor is null or sale_value_snapshot_minor >= 0),
  constraint affiliate_clicks_expected_commission_nonnegative check (expected_commission_minor is null or expected_commission_minor >= 0),
  constraint affiliate_clicks_expected_revenue_nonnegative check (expected_revenue_minor is null or expected_revenue_minor >= 0)
);

create index affiliate_clicks_clicked_idx on public.affiliate_clicks (clicked_at desc);
create index affiliate_clicks_offer_idx on public.affiliate_clicks (offer_id, clicked_at desc);
create index affiliate_clicks_design_idx on public.affiliate_clicks (design_id, clicked_at desc);

create table public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  external_transaction_id text not null,
  advertiser_id text,
  publisher_id text,
  click_ref text,
  click_id uuid references public.affiliate_clicks(id) on delete set null,
  retailer_id uuid references public.retailers(id) on delete set null,
  status text not null,
  transaction_type text,
  order_ref text,
  sale_amount_minor integer,
  commission_amount_minor integer,
  currency char(3) not null default 'GBP',
  transaction_at timestamptz,
  validation_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_conversions_status_check check (status in ('pending','approved','declined','deleted','unknown')),
  constraint affiliate_conversions_sale_nonnegative check (sale_amount_minor is null or sale_amount_minor >= 0),
  constraint affiliate_conversions_commission_nonnegative check (commission_amount_minor is null or commission_amount_minor >= 0),
  unique (network, external_transaction_id)
);

create index affiliate_conversions_click_ref_idx on public.affiliate_conversions (click_ref);
create index affiliate_conversions_status_date_idx on public.affiliate_conversions (status, transaction_at desc);

create table public.affiliate_sync_runs (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  sync_type text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  records_seen integer not null default 0,
  records_matched integer not null default 0,
  records_unmatched integer not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  constraint affiliate_sync_runs_status_check check (status in ('running','succeeded','partially_succeeded','failed')),
  constraint affiliate_sync_runs_counts_nonnegative check (records_seen >= 0 and records_matched >= 0 and records_unmatched >= 0)
);

create index affiliate_sync_runs_started_idx on public.affiliate_sync_runs (network, sync_type, started_at desc);

insert into public.affiliate_programs (retailer_id, network, advertiser_id)
select id, lower(affiliate_network), affiliate_program_id
from public.retailers
where affiliate_network is not null and affiliate_program_id is not null
on conflict (retailer_id) do update
set network=excluded.network,
    advertiser_id=excluded.advertiser_id,
    updated_at=now();
