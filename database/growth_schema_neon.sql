-- Stage 12: growth collections, real-room publishing and abandoned-design recovery.

create table public.growth_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text,
  intro text not null,
  meta_title text not null,
  meta_description text not null,
  intent text,
  tag_slug text not null unique,
  status text not null default 'draft',
  min_rooms_for_index smallint not null default 3,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_collections_status_check check (status in ('draft','active','archived')),
  constraint growth_collections_min_rooms_positive check (min_rooms_for_index >= 1)
);

create table public.growth_publications (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.room_designs(id) on delete cascade,
  generation_id uuid not null references public.render_generations(id) on delete cascade,
  share_id uuid not null references public.room_shares(id) on delete cascade,
  verification_id uuid references public.room_verifications(id) on delete set null,
  slug text not null unique,
  title text not null,
  excerpt text not null,
  room_total_minor integer,
  product_count integer not null default 0,
  tags text[] not null default '{}',
  status text not null default 'draft',
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint growth_publications_total_nonnegative check (room_total_minor is null or room_total_minor >= 0),
  constraint growth_publications_products_nonnegative check (product_count >= 0),
  constraint growth_publications_status_check check (status in ('draft','published','archived')),
  unique (generation_id)
);

create index growth_publications_status_published_idx
  on public.growth_publications (status,published_at desc);
create index growth_publications_tags_idx
  on public.growth_publications using gin (tags);

create table public.growth_collection_publications (
  collection_id uuid not null references public.growth_collections(id) on delete cascade,
  publication_id uuid not null references public.growth_publications(id) on delete cascade,
  relevance_score smallint not null default 50,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id,publication_id),
  constraint growth_collection_publications_score_check check (relevance_score between 0 and 100)
);

create index growth_collection_publications_collection_idx
  on public.growth_collection_publications (collection_id,is_featured desc,relevance_score desc,sort_order);

alter table public.customer_accounts add column marketing_email_consent_at timestamptz;
alter table public.customer_accounts add column marketing_email_opted_out_at timestamptz;

create table public.growth_recovery_candidates (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null unique references public.room_designs(id) on delete cascade,
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  state text not null default 'detected',
  stage text not null,
  abandoned_at timestamptz not null,
  queued_at timestamptz,
  recovered_at timestamptz,
  crm_outbox_id uuid references public.crm_outbox(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_recovery_candidates_state_check check (state in ('detected','queued','suppressed','recovered')),
  constraint growth_recovery_candidates_stage_check check (stage in ('intake','brief','products','render_ready'))
);

create index growth_recovery_candidates_account_idx
  on public.growth_recovery_candidates (account_id,state,abandoned_at desc);

insert into public.growth_collections
  (slug,title,eyebrow,intro,meta_title,meta_description,intent,tag_slug,status,min_rooms_for_index,sort_order)
values
  ('small-living-room-ideas','Small living-room ideas','Real rooms · real products','See real small living rooms redesigned around tight footprints, useful furniture and live UK prices.','Small Living-Room Ideas With Real Products | Roomfound','Explore real small living-room designs with shoppable UK furniture, room totals and product details instead of generic inspiration.','small living room inspiration','small-living-room','active',3,10),
  ('bay-window-living-rooms','Bay-window living rooms','Architecture-led ideas','See how real living rooms with bay windows can be designed around the architecture rather than fighting it.','Bay-Window Living Room Ideas With Real Products | Roomfound','Explore real bay-window living-room designs with actual furniture, prices and shoppable UK product selections.','bay window living room ideas','bay-window','active',3,20),
  ('living-rooms-under-1500','Living rooms under £1,500','Budget-led rooms','Complete living-room directions built around a product budget below £1,500, with every selected item and room total visible.','Living Rooms Under £1,500 With Real Products | Roomfound','See complete living-room designs under £1,500 using real UK products, current prices and itemised room totals.','living room under 1500','under-1500','active',3,30),
  ('warm-neutral-living-rooms','Warm-neutral living rooms','Palette-led rooms','Real warm-neutral rooms using layered creams, taupes, woods and soft materials without turning every space beige.','Warm Neutral Living Room Ideas With Real Products | Roomfound','Explore real warm-neutral living rooms with shoppable UK furniture, prices and complete room totals.','warm neutral living room ideas','warm-neutral','active',3,40),
  ('1930s-living-rooms','1930s living rooms','Period rooms','See real 1930s living rooms updated around their proportions and character with products you can actually buy.','1930s Living Room Ideas With Real Products | Roomfound','Explore real 1930s living-room redesigns with shoppable UK furniture, prices and complete room totals.','1930s living room ideas','1930s','active',3,50),
  ('new-build-living-rooms','New-build living rooms','Modern homes','Real new-build living rooms designed to add warmth, proportion and identity using products available in the UK.','New-Build Living Room Ideas With Real Products | Roomfound','Explore real new-build living-room designs with shoppable UK furniture, current prices and complete room totals.','new build living room ideas','new-build','active',3,60);
