import { getCatalogDb } from "@/lib/catalog/neon";
import type { SelectionCandidate } from "@/lib/catalog/selection";

type CandidateRow = {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string | null;
  brand_name: string | null;
  category_slug: string;
  category_name: string;
  design_summary: string | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  seat_width_mm: number | null;
  seat_depth_mm: number | null;
  seat_height_mm: number | null;
  curation_score: number;
  quality_score: number;
  styles: string[];
  materials: string[];
  colours: string[];
  offer_id: string;
  retailer_name: string;
  retailer_slug: string;
  price_minor: number;
  compare_at_price_minor: number | null;
  availability: SelectionCandidate["offer"]["availability"];
  uk_delivery_status: SelectionCandidate["offer"]["ukDeliveryStatus"];
  delivery_price_minor: number | null;
  product_url: string;
  affiliate_url: string | null;
  last_checked_at: string;
  image_url: string | null;
  image_alt: string | null;
};

export async function getLiveSelectionCandidates(): Promise<SelectionCandidate[]> {
  const sql = getCatalogDb();

  const rows = await sql.query(
    `select
      p.id::text as product_id,
      v.id::text as variant_id,
      p.name as product_name,
      v.name as variant_name,
      b.name as brand_name,
      c.slug as category_slug,
      c.name as category_name,
      p.design_summary,
      v.width_mm,
      v.height_mm,
      v.depth_mm,
      v.seat_width_mm,
      v.seat_depth_mm,
      v.seat_height_mm,
      p.curation_score::int,
      v.quality_score::int,
      coalesce((
        select jsonb_agg(s.slug order by s.slug)
        from public.variant_styles vs
        join public.styles s on s.id = vs.style_id
        where vs.variant_id = v.id and s.is_active
      ), '[]'::jsonb) as styles,
      coalesce((
        select jsonb_agg(m.slug order by m.slug)
        from public.variant_materials vm
        join public.materials m on m.id = vm.material_id
        where vm.variant_id = v.id and m.is_active
      ), '[]'::jsonb) as materials,
      coalesce((
        select jsonb_agg(col.slug order by col.slug)
        from public.variant_colours vc
        join public.colours col on col.id = vc.colour_id
        where vc.variant_id = v.id and col.is_active
      ), '[]'::jsonb) as colours,
      offer.id::text as offer_id,
      offer.retailer_name,
      offer.retailer_slug,
      offer.price_minor,
      offer.compare_at_price_minor,
      offer.availability,
      offer.uk_delivery_status,
      offer.delivery_price_minor,
      offer.product_url,
      offer.affiliate_url,
      offer.last_checked_at::text,
      image.image_url,
      image.alt_text as image_alt
    from public.products p
    join public.product_variants v
      on v.product_id = p.id
      and v.status = 'active'
    join public.product_categories pc
      on pc.product_id = p.id
      and pc.is_primary
    join public.categories c
      on c.id = pc.category_id
      and c.is_active
    left join public.brands b
      on b.id = p.brand_id
    join lateral (
      select
        ro.id,
        r.name as retailer_name,
        r.slug as retailer_slug,
        ro.price_minor,
        ro.compare_at_price_minor,
        ro.availability,
        ro.uk_delivery_status,
        ro.delivery_price_minor,
        ro.product_url,
        ro.affiliate_url,
        ro.last_checked_at
      from public.retailer_offers ro
      join public.retailers r on r.id = ro.retailer_id
      where ro.variant_id = v.id
        and ro.is_active
        and r.status = 'active'
        and r.ships_to_uk
        and ro.currency = 'GBP'
        and ro.availability in ('in_stock', 'low_stock', 'preorder')
        and ro.uk_delivery_status in ('available', 'restricted')
      order by
        case ro.availability when 'in_stock' then 0 when 'low_stock' then 1 else 2 end,
        ro.price_minor asc,
        ro.quality_score desc
      limit 1
    ) offer on true
    left join lateral (
      select pi.image_url, pi.alt_text
      from public.product_images pi
      where pi.product_id = p.id
        and (pi.variant_id is null or pi.variant_id = v.id)
        and pi.image_url is not null
      order by pi.is_primary desc, (pi.variant_id = v.id) desc, pi.sort_order asc
      limit 1
    ) image on true
    where p.status = 'active'
      and p.is_curated
    order by p.curation_score desc, v.quality_score desc
    limit 1200`,
    [],
  ) as CandidateRow[];

  return rows.map((row) => ({
    productId: row.product_id,
    variantId: row.variant_id,
    productName: row.product_name,
    variantName: row.variant_name,
    brandName: row.brand_name,
    category: row.category_slug,
    categoryName: row.category_name,
    designSummary: row.design_summary,
    dimensions: {
      widthMm: row.width_mm,
      heightMm: row.height_mm,
      depthMm: row.depth_mm,
      seatWidthMm: row.seat_width_mm,
      seatDepthMm: row.seat_depth_mm,
      seatHeightMm: row.seat_height_mm,
    },
    styles: Array.isArray(row.styles) ? row.styles : [],
    materials: Array.isArray(row.materials) ? row.materials : [],
    colours: Array.isArray(row.colours) ? row.colours : [],
    curationScore: row.curation_score,
    qualityScore: row.quality_score,
    offer: {
      id: row.offer_id,
      retailerName: row.retailer_name,
      retailerSlug: row.retailer_slug,
      priceMinor: row.price_minor,
      compareAtPriceMinor: row.compare_at_price_minor,
      availability: row.availability,
      ukDeliveryStatus: row.uk_delivery_status,
      deliveryPriceMinor: row.delivery_price_minor,
      productUrl: row.product_url,
      affiliateUrl: row.affiliate_url,
      lastCheckedAt: row.last_checked_at,
    },
    image: row.image_url ? { url: row.image_url, altText: row.image_alt } : null,
  }));
}
