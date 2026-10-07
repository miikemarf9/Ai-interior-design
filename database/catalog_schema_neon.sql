-- Stage 5: curated UK living-room commerce catalogue
-- Designed for Neon/Postgres. Application catalogue access is server-side. Supabase-specific roles, grants, policies and RLS are intentionally omitted.
-- Product identity is deliberately separate from retailer offers.

create type public.retailer_status as enum ('active', 'paused', 'disabled');
create type public.catalog_status as enum ('draft', 'active', 'archived');
create type public.offer_availability as enum ('in_stock', 'low_stock', 'preorder', 'backorder', 'out_of_stock', 'unknown');
create type public.uk_delivery_status as enum ('available', 'restricted', 'collection_only', 'unavailable', 'unknown');
create type public.catalog_source_type as enum ('manual', 'affiliate_feed', 'api', 'csv');
create type public.sync_run_status as enum ('running', 'succeeded', 'partially_succeeded', 'failed');
create type public.quality_issue_severity as enum ('info', 'warning', 'blocking');

create table public.retailers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text not null,
  logo_url text,
  affiliate_network text,
  affiliate_program_id text,
  uk_retailer boolean not null default true,
  ships_to_uk boolean not null default true,
  status public.retailer_status not null default 'active',
  last_catalog_checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailers_name_nonempty check (length(trim(name)) > 0)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  country_code char(2),
  status public.catalog_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  room_type text not null default 'living_room',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint categories_room_type check (room_type in ('living_room'))
);

create table public.styles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  family text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.colours (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  family text not null,
  hex_colour char(7),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint colours_hex_format check (hex_colour is null or hex_colour ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  slug text not null unique,
  manufacturer_product_id text,
  ean text,
  description text,
  design_summary text,
  room_type text not null default 'living_room',
  status public.catalog_status not null default 'draft',
  is_curated boolean not null default false,
  curation_score smallint not null default 0,
  ai_selection_notes text,
  selection_metadata jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_room_type check (room_type in ('living_room')),
  constraint products_curation_score check (curation_score between 0 and 100),
  constraint products_name_nonempty check (length(trim(name)) > 0)
);

create unique index products_brand_manufacturer_id_unique
  on public.products (brand_id, manufacturer_product_id)
  where manufacturer_product_id is not null;

create unique index products_ean_unique
  on public.products (ean)
  where ean is not null;

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text,
  manufacturer_sku text,
  ean text,
  status public.catalog_status not null default 'draft',
  width_mm integer,
  height_mm integer,
  depth_mm integer,
  seat_width_mm integer,
  seat_depth_mm integer,
  seat_height_mm integer,
  weight_g integer,
  colour_description text,
  material_description text,
  assembly_required boolean,
  care_text text,
  quality_score smallint not null default 0,
  selection_metadata jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_width_positive check (width_mm is null or width_mm > 0),
  constraint product_variants_height_positive check (height_mm is null or height_mm > 0),
  constraint product_variants_depth_positive check (depth_mm is null or depth_mm > 0),
  constraint product_variants_seat_width_positive check (seat_width_mm is null or seat_width_mm > 0),
  constraint product_variants_seat_depth_positive check (seat_depth_mm is null or seat_depth_mm > 0),
  constraint product_variants_seat_height_positive check (seat_height_mm is null or seat_height_mm > 0),
  constraint product_variants_weight_positive check (weight_g is null or weight_g > 0),
  constraint product_variants_quality_score check (quality_score between 0 and 100)
);

create unique index product_variants_product_sku_unique
  on public.product_variants (product_id, manufacturer_sku)
  where manufacturer_sku is not null;

create unique index product_variants_ean_unique
  on public.product_variants (ean)
  where ean is not null;

create table public.variant_styles (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete restrict,
  confidence numeric(4,3) not null default 1.000,
  created_at timestamptz not null default now(),
  primary key (variant_id, style_id),
  constraint variant_styles_confidence check (confidence between 0 and 1)
);

create table public.variant_materials (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (variant_id, material_id)
);

create table public.variant_colours (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  colour_id uuid not null references public.colours(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (variant_id, colour_id)
);

create table public.retailer_offers (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  retailer_sku text,
  external_product_id text,
  product_url text not null,
  affiliate_url text,
  price_minor integer not null,
  compare_at_price_minor integer,
  currency char(3) not null default 'GBP',
  availability public.offer_availability not null default 'unknown',
  stock_quantity integer,
  uk_delivery_status public.uk_delivery_status not null default 'unknown',
  delivery_price_minor integer,
  delivery_min_days smallint,
  delivery_max_days smallint,
  delivery_notes text,
  is_active boolean not null default true,
  last_price_checked_at timestamptz,
  last_availability_checked_at timestamptz,
  last_checked_at timestamptz not null default now(),
  source_updated_at timestamptz,
  quality_score smallint not null default 0,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailer_offers_price_nonnegative check (price_minor >= 0),
  constraint retailer_offers_compare_price_nonnegative check (compare_at_price_minor is null or compare_at_price_minor >= 0),
  constraint retailer_offers_stock_nonnegative check (stock_quantity is null or stock_quantity >= 0),
  constraint retailer_offers_delivery_price_nonnegative check (delivery_price_minor is null or delivery_price_minor >= 0),
  constraint retailer_offers_delivery_days_valid check (
    delivery_min_days is null or delivery_max_days is null or delivery_min_days <= delivery_max_days
  ),
  constraint retailer_offers_quality_score check (quality_score between 0 and 100),
  constraint retailer_offers_currency check (currency ~ '^[A-Z]{3}$')
);

create unique index retailer_offers_retailer_sku_unique
  on public.retailer_offers (retailer_id, retailer_sku)
  where retailer_sku is not null;

create unique index retailer_offers_external_product_unique
  on public.retailer_offers (retailer_id, external_product_id)
  where external_product_id is not null;

create table public.offer_price_history (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.retailer_offers(id) on delete cascade,
  price_minor integer not null,
  compare_at_price_minor integer,
  availability public.offer_availability not null,
  stock_quantity integer,
  checked_at timestamptz not null default now(),
  constraint offer_price_history_price_nonnegative check (price_minor >= 0)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  retailer_offer_id uuid references public.retailer_offers(id) on delete set null,
  image_url text,
  storage_path text,
  alt_text text,
  source_label text,
  width_px integer,
  height_px integer,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  verified_at timestamptz,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint product_images_source_present check (image_url is not null or storage_path is not null),
  constraint product_images_width_positive check (width_px is null or width_px > 0),
  constraint product_images_height_positive check (height_px is null or height_px > 0)
);

create table public.catalog_sources (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  name text not null,
  source_type public.catalog_source_type not null,
  feed_url text,
  is_active boolean not null default true,
  sync_frequency_minutes integer,
  last_sync_started_at timestamptz,
  last_sync_succeeded_at timestamptz,
  public_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_sources_sync_frequency_positive check (sync_frequency_minutes is null or sync_frequency_minutes > 0),
  unique (retailer_id, name)
);

create table public.catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.catalog_sources(id) on delete cascade,
  status public.sync_run_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_rejected integer not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  constraint catalog_sync_runs_counts_nonnegative check (
    records_seen >= 0 and records_inserted >= 0 and records_updated >= 0 and records_rejected >= 0
  )
);

create table public.catalog_quality_issues (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  offer_id uuid references public.retailer_offers(id) on delete cascade,
  severity public.quality_issue_severity not null default 'warning',
  issue_code text not null,
  details text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint catalog_quality_issues_target_present check (
    product_id is not null or variant_id is not null or offer_id is not null
  )
);

create index products_active_curated_idx on public.products (status, is_curated, curation_score desc);
create unique index product_categories_one_primary_per_product
  on public.product_categories (product_id)
  where is_primary;

create index product_categories_category_idx on public.product_categories (category_id, product_id);
create index product_variants_product_idx on public.product_variants (product_id, status, quality_score desc);
create index product_variants_dimensions_idx on public.product_variants (width_mm, depth_mm, height_mm);
create index variant_styles_style_idx on public.variant_styles (style_id, confidence desc, variant_id);
create unique index variant_materials_one_primary_per_variant
  on public.variant_materials (variant_id)
  where is_primary;

create index variant_materials_material_idx on public.variant_materials (material_id, variant_id);
create unique index variant_colours_one_primary_per_variant
  on public.variant_colours (variant_id)
  where is_primary;

create index variant_colours_colour_idx on public.variant_colours (colour_id, variant_id);
create unique index retailer_offers_product_url_unique
  on public.retailer_offers (retailer_id, product_url);

create index retailer_offers_variant_idx on public.retailer_offers (variant_id, is_active, availability, price_minor);
create index retailer_offers_retailer_idx on public.retailer_offers (retailer_id, is_active);
create index retailer_offers_last_checked_idx on public.retailer_offers (last_checked_at);
create index offer_price_history_offer_checked_idx on public.offer_price_history (offer_id, checked_at desc);
create unique index product_images_one_primary_product
  on public.product_images (product_id)
  where is_primary and variant_id is null;

create unique index product_images_one_primary_variant
  on public.product_images (variant_id)
  where is_primary and variant_id is not null;

create index product_images_product_sort_idx on public.product_images (product_id, is_primary desc, sort_order);
create index product_images_variant_idx on public.product_images (variant_id, sort_order);
create index catalog_sync_runs_source_started_idx on public.catalog_sync_runs (source_id, started_at desc);
create index catalog_quality_open_idx on public.catalog_quality_issues (severity, created_at desc) where resolved_at is null;

-- Neon Stage 5: updated_at is maintained explicitly by application/import writes.
