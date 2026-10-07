-- Stage 11: Verified Room V1 evidence and uncertainty records.

create table public.room_verifications (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.room_designs(id) on delete cascade,
  generation_id uuid not null references public.render_generations(id) on delete cascade,
  verification_version text not null,
  status text not null default 'processing',
  overall_status text not null default 'insufficient',
  room_measurement_status text not null default 'insufficient',
  room_width_mm integer,
  room_length_mm integer,
  room_height_mm integer,
  visual_provider text,
  visual_model text,
  provider_request_id text,
  duration_ms integer,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint room_verifications_status_check check (status in ('processing','complete','partial','failed')),
  constraint room_verifications_overall_check check (overall_status in ('verified','warning','insufficient','failed')),
  constraint room_verifications_measurement_check check (room_measurement_status in ('verified','warning','insufficient')),
  constraint room_verifications_dimensions_positive check (
    (room_width_mm is null or room_width_mm > 0)
    and (room_length_mm is null or room_length_mm > 0)
    and (room_height_mm is null or room_height_mm > 0)
  ),
  constraint room_verifications_duration_nonnegative check (duration_ms is null or duration_ms >= 0),
  unique (generation_id,verification_version)
);

create index room_verifications_design_created_idx
  on public.room_verifications (design_id,created_at desc);

create table public.room_product_verifications (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.room_verifications(id) on delete cascade,
  position integer not null,
  slot text not null,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  offer_id uuid references public.retailer_offers(id) on delete set null,
  real_product_status text not null,
  uk_availability_status text not null,
  price_status text not null,
  dimensions_status text not null,
  room_fit_status text not null,
  visual_status text not null default 'insufficient',
  visual_confidence smallint,
  visual_note text,
  retailer_name text,
  price_minor integer,
  price_checked_at timestamptz,
  availability text,
  uk_delivery_status text,
  width_mm integer,
  height_mm integer,
  depth_mm integer,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint room_product_verifications_position_nonnegative check (position >= 0),
  constraint room_product_verifications_real_check check (real_product_status in ('verified','warning','failed','insufficient')),
  constraint room_product_verifications_availability_check check (uk_availability_status in ('verified','warning','failed','insufficient')),
  constraint room_product_verifications_price_check check (price_status in ('verified','warning','failed','insufficient')),
  constraint room_product_verifications_dimensions_check check (dimensions_status in ('verified','warning','failed','insufficient')),
  constraint room_product_verifications_room_fit_check check (room_fit_status in ('verified','warning','failed','insufficient')),
  constraint room_product_verifications_visual_check check (visual_status in ('verified','warning','failed','insufficient')),
  constraint room_product_verifications_visual_confidence check (visual_confidence is null or visual_confidence between 0 and 100),
  unique (verification_id,position)
);

create index room_product_verifications_verification_idx
  on public.room_product_verifications (verification_id,position);
create index room_product_verifications_product_idx
  on public.room_product_verifications (product_id,variant_id);
