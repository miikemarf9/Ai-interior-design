import { getCatalogDb } from "@/lib/catalog/neon";

export type PromotionResult = {
  candidateId: string;
  productId: string;
  variantId: string;
  offerId: string;
};

export async function promoteFeedCandidate(candidateId: string): Promise<PromotionResult | null> {
  const sql = getCatalogDb();

  const rows = await sql.query(
    `with candidate as (
      select
        c.*,
        r.slug as retailer_slug,
        case
          when nullif(trim(c.brand_name),'') is null then null
          else lower(trim(both '-' from regexp_replace(c.brand_name, '[^A-Za-z0-9]+', '-', 'g')))
        end as brand_slug,
        lower(trim(both '-' from regexp_replace(c.title, '[^A-Za-z0-9]+', '-', 'g')))
          || '-' || substr(md5(r.slug || ':' || c.external_product_id),1,8) as generated_slug
      from public.catalog_feed_candidates c
      join public.retailers r on r.id = c.retailer_id
      where c.id = $1::uuid
        and c.candidate_status in ('pending','approved')
        and c.quality_score >= 65
        and c.normalized_category_slug is not null
        and c.image_url is not null
        and c.price_minor is not null
        and c.currency = 'GBP'
        and c.availability in ('in_stock','low_stock','preorder')
      limit 1
    ),
    brand_upsert as (
      insert into public.brands (name, slug, status)
      select brand_name, brand_slug, 'active'
      from candidate
      where brand_slug is not null
      on conflict (slug) do update set
        name = excluded.name,
        status = 'active',
        updated_at = now()
      returning id, slug
    ),
    existing_product as (
      select p.id
      from public.products p
      left join public.brands b on b.id = p.brand_id
      cross join candidate c
      where
        (c.ean is not null and p.ean = c.ean)
        or (
          c.mpn is not null
          and p.manufacturer_product_id = c.mpn
          and (c.brand_slug is null or b.slug = c.brand_slug)
        )
      limit 1
    ),
    inserted_product as (
      insert into public.products (
        brand_id, name, slug, manufacturer_product_id, ean, description, design_summary,
        room_type, status, is_curated, curation_score, ai_selection_notes,
        source_metadata, source_updated_at, updated_at
      )
      select
        (select id from brand_upsert limit 1),
        c.title,
        c.generated_slug,
        c.mpn,
        c.ean,
        c.description,
        c.description,
        'living_room',
        'active',
        true,
        c.quality_score,
        'Promoted from reviewed affiliate-feed candidate.',
        jsonb_build_object(
          'feed_candidate_id', c.id,
          'retailer_id', c.retailer_id,
          'external_product_id', c.external_product_id
        ),
        c.source_updated_at,
        now()
      from candidate c
      where not exists (select 1 from existing_product)
      returning id
    ),
    product_target as (
      select id from existing_product
      union all
      select id from inserted_product
      limit 1
    ),
    product_refresh as (
      update public.products p
      set
        status = 'active',
        is_curated = true,
        curation_score = greatest(p.curation_score, c.quality_score),
        description = coalesce(c.description, p.description),
        source_updated_at = coalesce(c.source_updated_at, p.source_updated_at),
        updated_at = now()
      from candidate c, product_target pt
      where p.id = pt.id
      returning p.id
    ),
    existing_variant as (
      select v.id
      from public.product_variants v, product_target pt, candidate c
      where v.product_id = pt.id
        and (
          (c.ean is not null and v.ean = c.ean)
          or v.manufacturer_sku = coalesce(c.mpn, c.external_product_id)
        )
      limit 1
    ),
    inserted_variant as (
      insert into public.product_variants (
        product_id, name, manufacturer_sku, ean, status,
        width_mm, height_mm, depth_mm,
        colour_description, material_description, quality_score,
        source_metadata, updated_at
      )
      select
        pt.id,
        c.title,
        coalesce(c.mpn, c.external_product_id),
        c.ean,
        'active',
        c.width_mm,
        c.height_mm,
        c.depth_mm,
        c.colour_text,
        c.material_text,
        c.quality_score,
        jsonb_build_object('feed_candidate_id', c.id),
        now()
      from candidate c, product_target pt
      where not exists (select 1 from existing_variant)
      returning id
    ),
    variant_target as (
      select id from existing_variant
      union all
      select id from inserted_variant
      limit 1
    ),
    variant_refresh as (
      update public.product_variants v
      set
        status = 'active',
        width_mm = coalesce(c.width_mm, v.width_mm),
        height_mm = coalesce(c.height_mm, v.height_mm),
        depth_mm = coalesce(c.depth_mm, v.depth_mm),
        colour_description = coalesce(c.colour_text, v.colour_description),
        material_description = coalesce(c.material_text, v.material_description),
        quality_score = greatest(v.quality_score, c.quality_score),
        updated_at = now()
      from candidate c, variant_target vt
      where v.id = vt.id
      returning v.id
    ),
    category_link as (
      insert into public.product_categories (product_id, category_id, is_primary)
      select
        pt.id,
        cat.id,
        not exists (
          select 1
          from public.product_categories existing
          where existing.product_id = pt.id and existing.is_primary
        )
      from candidate c
      join public.categories cat on cat.slug = c.normalized_category_slug and cat.is_active
      cross join product_target pt
      on conflict (product_id, category_id) do nothing
      returning product_id
    ),
    style_links as (
      insert into public.variant_styles (variant_id, style_id, confidence)
      select vt.id, s.id, 0.850
      from candidate c
      cross join variant_target vt
      join public.styles s on s.slug = any(c.inferred_style_slugs) and s.is_active
      on conflict (variant_id, style_id) do update set confidence = greatest(public.variant_styles.confidence, excluded.confidence)
      returning variant_id
    ),
    material_links as (
      insert into public.variant_materials (variant_id, material_id, is_primary)
      select vt.id, m.id, false
      from candidate c
      cross join variant_target vt
      join public.materials m on m.slug = any(c.inferred_material_slugs) and m.is_active
      on conflict (variant_id, material_id) do nothing
      returning variant_id
    ),
    colour_links as (
      insert into public.variant_colours (variant_id, colour_id, is_primary)
      select vt.id, col.id, false
      from candidate c
      cross join variant_target vt
      join public.colours col on col.slug = any(c.inferred_colour_slugs) and col.is_active
      on conflict (variant_id, colour_id) do nothing
      returning variant_id
    ),
    offer_upsert as (
      insert into public.retailer_offers (
        retailer_id, variant_id, retailer_sku, external_product_id,
        product_url, affiliate_url, price_minor, compare_at_price_minor, currency,
        availability, stock_quantity, uk_delivery_status,
        is_active, last_price_checked_at, last_availability_checked_at, last_checked_at,
        source_updated_at, quality_score, source_metadata, updated_at
      )
      select
        c.retailer_id,
        vt.id,
        coalesce(c.mpn, c.external_product_id),
        c.external_product_id,
        c.product_url,
        c.affiliate_url,
        c.price_minor,
        c.compare_at_price_minor,
        c.currency,
        c.availability,
        c.stock_quantity,
        case
          when coalesce(c.raw->>'delivery_restrictions','') <> '' then 'restricted'::public.uk_delivery_status
          else 'available'::public.uk_delivery_status
        end,
        true,
        now(),
        now(),
        now(),
        c.source_updated_at,
        c.quality_score,
        jsonb_build_object('feed_candidate_id', c.id),
        now()
      from candidate c
      cross join variant_target vt
      on conflict (retailer_id, external_product_id) where external_product_id is not null
      do update set
        variant_id = excluded.variant_id,
        retailer_sku = excluded.retailer_sku,
        product_url = excluded.product_url,
        affiliate_url = excluded.affiliate_url,
        price_minor = excluded.price_minor,
        compare_at_price_minor = excluded.compare_at_price_minor,
        availability = excluded.availability,
        stock_quantity = excluded.stock_quantity,
        uk_delivery_status = excluded.uk_delivery_status,
        is_active = true,
        last_price_checked_at = now(),
        last_availability_checked_at = now(),
        last_checked_at = now(),
        source_updated_at = excluded.source_updated_at,
        quality_score = excluded.quality_score,
        source_metadata = excluded.source_metadata,
        updated_at = now()
      returning id, price_minor, compare_at_price_minor, availability, stock_quantity
    ),
    image_insert as (
      insert into public.product_images (
        product_id, variant_id, retailer_offer_id, image_url, alt_text,
        source_label, sort_order, is_primary, verified_at, metadata
      )
      select
        pt.id,
        vt.id,
        ou.id,
        c.image_url,
        c.title,
        c.retailer_slug,
        0,
        true,
        now(),
        jsonb_build_object('feed_candidate_id', c.id, 'source', 'awin')
      from candidate c
      cross join product_target pt
      cross join variant_target vt
      cross join offer_upsert ou
      where not exists (
        select 1 from public.product_images pi
        where pi.variant_id = vt.id and pi.is_primary
      )
      returning id
    ),
    price_history as (
      insert into public.offer_price_history (
        offer_id, price_minor, compare_at_price_minor, availability, stock_quantity, checked_at
      )
      select id, price_minor, compare_at_price_minor, availability, stock_quantity, now()
      from offer_upsert
      returning offer_id
    ),
    candidate_done as (
      update public.catalog_feed_candidates c
      set candidate_status = 'imported', updated_at = now()
      where c.id = $1::uuid
      returning c.id
    )
    select
      cd.id::text as candidate_id,
      pt.id::text as product_id,
      vt.id::text as variant_id,
      ou.id::text as offer_id
    from candidate_done cd
    cross join product_target pt
    cross join variant_target vt
    cross join offer_upsert ou`,
    [candidateId],
  ) as Array<{
    candidate_id: string;
    product_id: string;
    variant_id: string;
    offer_id: string;
  }>;

  const row = rows[0];
  if (!row) return null;

  return {
    candidateId: row.candidate_id,
    productId: row.product_id,
    variantId: row.variant_id,
    offerId: row.offer_id,
  };
}
