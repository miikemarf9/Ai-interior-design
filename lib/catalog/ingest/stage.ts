import { getCatalogDb } from "@/lib/catalog/neon";
import type { FeedCandidate } from "@/lib/catalog/ingest/awin";

type SourceRow = {
  source_id: string;
  retailer_id: string;
  public_config: Record<string, unknown>;
};

export async function getFeedSource(retailerSlug: string): Promise<SourceRow | null> {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      cs.id::text as source_id,
      r.id::text as retailer_id,
      cs.public_config
    from public.catalog_sources cs
    join public.retailers r on r.id = cs.retailer_id
    where r.slug = $1
      and cs.source_type = 'affiliate_feed'
      and cs.is_active
    order by cs.created_at asc
    limit 1`,
    [retailerSlug],
  ) as SourceRow[];

  return rows[0] ?? null;
}

export async function stageFeedCandidates(
  source: SourceRow,
  candidates: FeedCandidate[],
) {
  if (!candidates.length) return 0;
  const sql = getCatalogDb();
  let staged = 0;

  for (let start = 0; start < candidates.length; start += 100) {
    const batch = candidates.slice(start, start + 100);
    const rows = batch.map((candidate) => ({
      external_product_id: candidate.externalProductId,
      parent_product_id: candidate.parentProductId,
      title: candidate.title,
      description: candidate.description,
      brand_name: candidate.brandName,
      product_url: candidate.productUrl,
      affiliate_url: candidate.affiliateUrl,
      image_url: candidate.imageUrl,
      additional_images: candidate.additionalImages,
      price_minor: candidate.priceMinor,
      compare_at_price_minor: candidate.compareAtPriceMinor,
      currency: candidate.currency,
      availability: candidate.availability,
      stock_quantity: candidate.stockQuantity,
      merchant_category: candidate.merchantCategory,
      category_path: candidate.categoryPath,
      colour_text: candidate.colourText,
      material_text: candidate.materialText,
      dimensions_text: candidate.dimensionsText,
      width_mm: candidate.widthMm,
      height_mm: candidate.heightMm,
      depth_mm: candidate.depthMm,
      ean: candidate.ean,
      mpn: candidate.mpn,
      source_updated_at: candidate.sourceUpdatedAt,
      normalized_category_slug: candidate.normalizedCategorySlug,
      inferred_style_slugs: candidate.inferredStyleSlugs,
      inferred_material_slugs: candidate.inferredMaterialSlugs,
      inferred_colour_slugs: candidate.inferredColourSlugs,
      quality_score: candidate.qualityScore,
      raw: candidate.raw,
    }));

    await sql.query(
      `with incoming as (
        select *
        from jsonb_to_recordset($1::jsonb) as x(
          external_product_id text,
          parent_product_id text,
          title text,
          description text,
          brand_name text,
          product_url text,
          affiliate_url text,
          image_url text,
          additional_images jsonb,
          price_minor integer,
          compare_at_price_minor integer,
          currency text,
          availability text,
          stock_quantity integer,
          merchant_category text,
          category_path text,
          colour_text text,
          material_text text,
          dimensions_text text,
          width_mm integer,
          height_mm integer,
          depth_mm integer,
          ean text,
          mpn text,
          source_updated_at text,
          normalized_category_slug text,
          inferred_style_slugs jsonb,
          inferred_material_slugs jsonb,
          inferred_colour_slugs jsonb,
          quality_score integer,
          raw jsonb
        )
      )
      insert into public.catalog_feed_candidates (
        source_id, retailer_id, external_product_id, parent_product_id, title, description, brand_name,
        product_url, affiliate_url, image_url, additional_images, price_minor, compare_at_price_minor,
        currency, availability, stock_quantity, merchant_category, category_path, colour_text, material_text,
        dimensions_text, width_mm, height_mm, depth_mm, ean, mpn, source_updated_at,
        normalized_category_slug, inferred_style_slugs, inferred_material_slugs, inferred_colour_slugs,
        quality_score, candidate_status, raw, updated_at
      )
      select
        $2::uuid,
        $3::uuid,
        x.external_product_id,
        x.parent_product_id,
        x.title,
        x.description,
        x.brand_name,
        x.product_url,
        x.affiliate_url,
        x.image_url,
        coalesce(x.additional_images, '[]'::jsonb),
        x.price_minor,
        x.compare_at_price_minor,
        upper(coalesce(nullif(x.currency,''),'GBP'))::char(3),
        coalesce(nullif(x.availability,''),'unknown')::public.offer_availability,
        x.stock_quantity,
        x.merchant_category,
        x.category_path,
        x.colour_text,
        x.material_text,
        x.dimensions_text,
        x.width_mm,
        x.height_mm,
        x.depth_mm,
        x.ean,
        x.mpn,
        nullif(x.source_updated_at,'')::timestamptz,
        x.normalized_category_slug,
        array(select jsonb_array_elements_text(coalesce(x.inferred_style_slugs,'[]'::jsonb))),
        array(select jsonb_array_elements_text(coalesce(x.inferred_material_slugs,'[]'::jsonb))),
        array(select jsonb_array_elements_text(coalesce(x.inferred_colour_slugs,'[]'::jsonb))),
        greatest(0, least(100, x.quality_score))::smallint,
        'pending',
        coalesce(x.raw, '{}'::jsonb),
        now()
      from incoming x
      on conflict (retailer_id, external_product_id) do update set
        source_id = excluded.source_id,
        parent_product_id = excluded.parent_product_id,
        title = excluded.title,
        description = excluded.description,
        brand_name = excluded.brand_name,
        product_url = excluded.product_url,
        affiliate_url = excluded.affiliate_url,
        image_url = excluded.image_url,
        additional_images = excluded.additional_images,
        price_minor = excluded.price_minor,
        compare_at_price_minor = excluded.compare_at_price_minor,
        currency = excluded.currency,
        availability = excluded.availability,
        stock_quantity = excluded.stock_quantity,
        merchant_category = excluded.merchant_category,
        category_path = excluded.category_path,
        colour_text = excluded.colour_text,
        material_text = excluded.material_text,
        dimensions_text = excluded.dimensions_text,
        width_mm = excluded.width_mm,
        height_mm = excluded.height_mm,
        depth_mm = excluded.depth_mm,
        ean = excluded.ean,
        mpn = excluded.mpn,
        source_updated_at = excluded.source_updated_at,
        normalized_category_slug = excluded.normalized_category_slug,
        inferred_style_slugs = excluded.inferred_style_slugs,
        inferred_material_slugs = excluded.inferred_material_slugs,
        inferred_colour_slugs = excluded.inferred_colour_slugs,
        quality_score = excluded.quality_score,
        raw = excluded.raw,
        updated_at = now()
      where public.catalog_feed_candidates.candidate_status <> 'imported'`,
      [JSON.stringify(rows), source.source_id, source.retailer_id],
    );

    staged += batch.length;
  }

  return staged;
}
