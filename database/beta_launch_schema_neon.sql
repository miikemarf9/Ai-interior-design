-- Stage 13: beta hardening, first-party analytics, privacy operations and unit economics.

create table public.analytics_events (
  id bigserial primary key,
  session_key text,
  account_id uuid references public.customer_accounts(id) on delete set null,
  design_id uuid references public.room_designs(id) on delete cascade,
  generation_id uuid references public.render_generations(id) on delete cascade,
  event_name text not null,
  path text,
  referrer_host text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_name_check check (char_length(event_name) between 2 and 80),
  constraint analytics_events_path_check check (path is null or char_length(path) <= 300)
);

create index analytics_events_name_created_idx
  on public.analytics_events (event_name,created_at desc);
create index analytics_events_design_created_idx
  on public.analytics_events (design_id,created_at desc)
  where design_id is not null;

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  request_type text not null,
  status text not null default 'open',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  constraint privacy_requests_type_check check (request_type in ('access','deletion','correction','restriction','objection')),
  constraint privacy_requests_status_check check (status in ('open','in_progress','completed','rejected'))
);

create index privacy_requests_account_status_idx
  on public.privacy_requests (account_id,status,requested_at desc);

create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.customer_accounts(id) on delete set null,
  design_id uuid references public.room_designs(id) on delete set null,
  rating smallint,
  feedback text not null,
  page_path text,
  created_at timestamptz not null default now(),
  constraint beta_feedback_rating_check check (rating is null or rating between 1 and 5),
  constraint beta_feedback_length_check check (char_length(feedback) between 1 and 3000)
);

create table public.security_rate_limits (
  key_hash text not null,
  action text not null,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (key_hash,action),
  constraint security_rate_limits_count_nonnegative check (attempt_count >= 0)
);

create index security_rate_limits_blocked_idx
  on public.security_rate_limits (blocked_until)
  where blocked_until is not null;

alter table public.customer_accounts
  add column analytics_consent_at timestamptz;
alter table public.customer_accounts
  add column analytics_opted_out_at timestamptz;

alter table public.render_generations
  add column cost_gbp_minor integer,
  add column cost_fx_usd_gbp numeric(10,6),
  add constraint render_generations_cost_gbp_nonnegative
    check (cost_gbp_minor is null or cost_gbp_minor >= 0),
  add constraint render_generations_cost_fx_positive
    check (cost_fx_usd_gbp is null or cost_fx_usd_gbp > 0);

create or replace view public.beta_room_economics as
select
  d.id as design_id,
  d.account_id,
  d.room_name,
  d.status as design_status,
  coalesce(renders.successful_renders,0) as successful_renders,
  coalesce(renders.failed_renders,0) as failed_renders,
  renders.ai_cost_usd_micros,
  renders.ai_cost_gbp_minor,
  coalesce(commerce.retailer_clicks,0) as retailer_clicks,
  coalesce(commerce.expected_revenue_minor,0) as expected_revenue_gbp_minor,
  coalesce(commerce.pending_commission_minor,0) as pending_revenue_gbp_minor,
  coalesce(commerce.approved_commission_minor,0) as approved_revenue_gbp_minor,
  case
    when renders.ai_cost_gbp_minor is null then null
    else coalesce(commerce.approved_commission_minor,0) - renders.ai_cost_gbp_minor
  end as approved_contribution_gbp_minor,
  d.created_at,
  d.updated_at
from public.room_designs d
left join lateral (
  select
    count(*) filter (where status='succeeded')::int as successful_renders,
    count(*) filter (where status='failed')::int as failed_renders,
    sum(cost_usd_micros) filter (where status in ('succeeded','failed'))::bigint as ai_cost_usd_micros,
    sum(cost_gbp_minor) filter (where status in ('succeeded','failed'))::bigint as ai_cost_gbp_minor
  from public.render_generations g
  where g.design_id=d.id
) renders on true
left join lateral (
  select
    (select count(*) from public.affiliate_clicks ac where ac.design_id=d.id)::int as retailer_clicks,
    (select coalesce(sum(ac.expected_revenue_minor),0) from public.affiliate_clicks ac where ac.design_id=d.id)::bigint as expected_revenue_minor,
    (select coalesce(sum(conv.commission_amount_minor),0)
       from public.affiliate_conversions conv
       join public.affiliate_clicks ac on ac.id=conv.click_id
      where ac.design_id=d.id and conv.status='pending')::bigint as pending_commission_minor,
    (select coalesce(sum(conv.commission_amount_minor),0)
       from public.affiliate_conversions conv
       join public.affiliate_clicks ac on ac.id=conv.click_id
      where ac.design_id=d.id and conv.status='approved')::bigint as approved_commission_minor
) commerce on true;
