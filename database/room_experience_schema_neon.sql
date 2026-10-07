-- Stage 8: explicit public sharing for finished room renders only.
-- A share token never exposes the original room asset or the owner key.

create table public.room_shares (
  id uuid primary key default gen_random_uuid(),
  share_token uuid not null unique default gen_random_uuid(),
  design_id uuid not null references public.room_designs(id) on delete cascade,
  generation_id uuid not null references public.render_generations(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint room_shares_revoked_check check (
    (is_active and revoked_at is null) or (not is_active)
  )
);

create unique index room_shares_active_generation_unique
  on public.room_shares (generation_id)
  where is_active;

create index room_shares_design_created_idx
  on public.room_shares (design_id, created_at desc);
