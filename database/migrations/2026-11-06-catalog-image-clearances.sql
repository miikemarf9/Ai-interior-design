create table if not exists public.catalog_image_clearances (
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  offer_id uuid not null references public.retailer_offers(id) on delete cascade,
  image_url text not null check (image_url like 'https://%'),
  exact_variant_name text not null,
  pack_size smallint not null default 1 check (pack_size > 0),
  unit_label text not null,
  display_approved boolean not null default false,
  ai_reference_approved boolean not null default false,
  approved_at timestamptz not null,
  expires_at timestamptz not null,
  delivery_basis text not null default 'unknown'
    check (delivery_basis in ('per_unit','per_order','unknown')),
  delivery_details text not null default 'Confirm delivery options with the retailer.',
  private_review_note text not null,
  primary key (product_id, variant_id, offer_id),
  check (expires_at > approved_at)
);

alter table public.catalog_image_clearances enable row level security;
revoke all privileges on table public.catalog_image_clearances from public;
