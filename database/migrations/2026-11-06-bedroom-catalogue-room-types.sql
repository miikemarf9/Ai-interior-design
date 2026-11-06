-- Allow reviewed bedroom products to be assigned to the bedroom catalogue.
-- Existing products remain living-room products; this only changes the allowed values
-- and tags the bedroom product categories used by the Debenhams feed review flow.

alter table public.categories
  drop constraint if exists categories_room_type;
alter table public.categories
  add constraint categories_room_type
  check (room_type in ('living_room', 'bedroom'));

alter table public.products
  drop constraint if exists products_room_type;
alter table public.products
  add constraint products_room_type
  check (room_type in ('living_room', 'bedroom'));

insert into public.categories (name, slug, room_type, sort_order) values
  ('Beds & bed frames', 'bed-frames', 'bedroom', 10),
  ('Bedside tables', 'bedside-tables', 'bedroom', 20),
  ('Chest of drawers', 'chest-of-drawers', 'bedroom', 30),
  ('Wardrobes', 'wardrobes', 'bedroom', 40),
  ('Mattresses', 'mattresses', 'bedroom', 50),
  ('Dressing tables', 'dressing-tables', 'bedroom', 60)
on conflict (slug) do update set
  name = excluded.name,
  room_type = excluded.room_type,
  sort_order = excluded.sort_order,
  is_active = true;
