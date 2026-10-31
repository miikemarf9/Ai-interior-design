-- Community room publishing and thumbs-up voting.
-- Apply once to the production Neon database before deploying the community feature.

create table if not exists public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.room_designs(id) on delete cascade,
  generation_id uuid not null unique references public.render_generations(id) on delete cascade,
  share_id uuid not null unique references public.room_shares(id) on delete cascade,
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  slug text not null unique,
  title text not null,
  room_type text not null,
  styles text[] not null default '{}',
  status text not null default 'published',
  consent_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_rooms_type_check check (room_type in ('living_room','bedroom')),
  constraint community_rooms_status_check check (status in ('published','hidden'))
);

create index if not exists community_rooms_public_feed_idx
  on public.community_rooms (status,published_at desc);
create index if not exists community_rooms_type_style_idx
  on public.community_rooms (room_type);
create index if not exists community_rooms_styles_idx
  on public.community_rooms using gin (styles);

create table if not exists public.community_room_votes (
  community_room_id uuid not null references public.community_rooms(id) on delete cascade,
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_room_id,account_id)
);

create index if not exists community_room_votes_recent_idx
  on public.community_room_votes (community_room_id,created_at desc);
