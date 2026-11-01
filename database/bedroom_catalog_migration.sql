-- Bedroom catalogue prerequisites for the room-specific selection and render flow.
-- Safe to run more than once.
alter table public.categories drop constraint if exists categories_room_type;
alter table public.categories add constraint categories_room_type check (room_type in ('living_room','bedroom'));
alter table public.products drop constraint if exists products_room_type;
alter table public.products add constraint products_room_type check (room_type in ('living_room','bedroom'));

insert into public.categories (name, slug, room_type, sort_order) values
  ('Beds', 'beds', 'bedroom', 10),
  ('Bedside tables', 'bedside-tables', 'bedroom', 20),
  ('Wardrobes', 'wardrobes', 'bedroom', 30),
  ('Chest of drawers', 'chest-of-drawers', 'bedroom', 40)
on conflict (slug) do update set
  name = excluded.name,
  room_type = excluded.room_type,
  sort_order = excluded.sort_order,
  is_active = true;
