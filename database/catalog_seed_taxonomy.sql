-- Stage 5 seed taxonomy for the living-room MVP.
-- Idempotent: safe to re-run after the schema exists.

insert into public.categories (name, slug, sort_order) values
  ('Sofas', 'sofas', 10),
  ('Armchairs', 'armchairs', 20),
  ('Footstools & pouffes', 'footstools-pouffes', 30),
  ('Coffee tables', 'coffee-tables', 40),
  ('Side tables', 'side-tables', 50),
  ('TV units', 'tv-units', 60),
  ('Storage & cabinets', 'storage-cabinets', 70),
  ('Shelving', 'shelving', 80),
  ('Rugs', 'rugs', 90),
  ('Floor lamps', 'floor-lamps', 100),
  ('Table lamps', 'table-lamps', 110),
  ('Ceiling lighting', 'ceiling-lighting', 120),
  ('Curtains & blinds', 'curtains-blinds', 130),
  ('Mirrors', 'mirrors', 140),
  ('Artwork', 'artwork', 150),
  ('Cushions', 'cushions', 160),
  ('Throws', 'throws', 170),
  ('Accessories', 'accessories', 180)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.styles (name, slug, description) values
  ('Contemporary', 'contemporary', 'Clean current forms with warmth and restraint.'),
  ('Warm minimal', 'warm-minimal', 'Quiet shapes, warm neutrals and tactile natural materials.'),
  ('Modern British', 'modern-british', 'Characterful, comfortable interiors balancing heritage and contemporary pieces.'),
  ('Mid-century', 'mid-century', 'Low profiles, warm timber and graphic 20th-century influence.'),
  ('Classic', 'classic', 'Timeless proportions, layered materials and composed detailing.'),
  ('Scandi', 'scandi', 'Light timber, practical comfort and calm simplicity.'),
  ('Colourful', 'colourful', 'Expressive colour used intentionally rather than as visual noise.'),
  ('Industrial', 'industrial', 'Metal, darker timbers and purposeful utilitarian detailing.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true;

insert into public.materials (name, slug, family) values
  ('Oak', 'oak', 'wood'),
  ('Walnut', 'walnut', 'wood'),
  ('Ash', 'ash', 'wood'),
  ('Pine', 'pine', 'wood'),
  ('Linen', 'linen', 'textile'),
  ('Cotton', 'cotton', 'textile'),
  ('Velvet', 'velvet', 'textile'),
  ('Bouclé', 'boucle', 'textile'),
  ('Wool', 'wool', 'textile'),
  ('Leather', 'leather', 'leather'),
  ('Rattan', 'rattan', 'natural-fibre'),
  ('Cane', 'cane', 'natural-fibre'),
  ('Stone', 'stone', 'stone'),
  ('Marble', 'marble', 'stone'),
  ('Glass', 'glass', 'glass'),
  ('Steel', 'steel', 'metal'),
  ('Brass', 'brass', 'metal')
on conflict (slug) do update set
  name = excluded.name,
  family = excluded.family,
  is_active = true;

insert into public.colours (name, slug, family, hex_colour) values
  ('Warm white', 'warm-white', 'white', '#F2EEE4'),
  ('Cream', 'cream', 'neutral', '#E9DDC6'),
  ('Beige', 'beige', 'neutral', '#CDBB9F'),
  ('Taupe', 'taupe', 'neutral', '#9B8D7A'),
  ('Brown', 'brown', 'brown', '#76533A'),
  ('Black', 'black', 'black', '#232320'),
  ('Charcoal', 'charcoal', 'grey', '#4A4B46'),
  ('Grey', 'grey', 'grey', '#8C8D88'),
  ('Olive', 'olive', 'green', '#7B8060'),
  ('Forest green', 'forest-green', 'green', '#35483D'),
  ('Sage', 'sage', 'green', '#A2AA91'),
  ('Navy', 'navy', 'blue', '#34465C'),
  ('Dusty blue', 'dusty-blue', 'blue', '#718493'),
  ('Terracotta', 'terracotta', 'orange', '#A86149'),
  ('Ochre', 'ochre', 'yellow', '#BD8B45'),
  ('Burgundy', 'burgundy', 'red', '#713D42'),
  ('Dusty pink', 'dusty-pink', 'pink', '#B78D8B')
on conflict (slug) do update set
  name = excluded.name,
  family = excluded.family,
  hex_colour = excluded.hex_colour,
  is_active = true;
