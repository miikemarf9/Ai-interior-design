import { getCatalogDb } from "@/lib/catalog/neon";
import type { ProductSelection } from "@/lib/catalog/selection";
import type { RenderProductReference } from "@/lib/render/prompt";

type RequestedProduct = {
  position: number;
  product_id: string;
  variant_id: string;
  offer_id: string;
};

export async function getVerifiedRenderProducts(
  selection: ProductSelection,
): Promise<RenderProductReference[]> {
  const requested: RequestedProduct[] = selection.products.map((item, position) => ({
    position,
    product_id: item.selected.productId,
    variant_id: item.selected.variantId,
    offer_id: item.selected.offer.id,
  }));

  if (!requested.length) return [];

  const sql = getCatalogDb();
  const rows = await sql.query(
    \`with requested as (
      select *
      from jsonb_to_recordset($1::jsonb) as x(
        position integer,
        product_id uuid,
        variant_id uuid,
        offer_id uuid
      )
    )
    select
      req.position,
      p.id::text as product_id,
      v.id::text as variant_id,
      ro.id::text as offer_id,
      p.name,
      v.name as variant_name,
      b.name as brand_name,
      c.name as category_name,
      v.width_mm,
      v.height_mm,
      v.depth_mm,
      pi.image_url
    from requested req
    join public.products p
      on p.id = req.product_id
      and p.status = 'active'
      and p.is_curated
    join public.product_variants v
      on v.id = req.variant_id
      and v.product_id = p.id
      and v.status = 'active'
    join public.retailer_offers ro
      on ro.id = req.offer_id
      and ro.variant_id = v.id
      and ro.is_active
      and ro.currency = 'GBP'
      and ro.availability in ('in_stock','low_stock','preorder')
      and ro.uk_delivery_status in ('available','restricted')
    join public.retailers r
      on r.id = ro.retailer_id
      and r.status = 'active'
      and r.ships_to_uk
    join public.product_categories pc
      on pc.product_id = p.id
      and pc.is_primary
    join public.categories c
      on c.id = pc.category_id
      and c.is_active
    left join public.brands b on b.id = p.brand_id
    join lateral (
      select image_url
      from public.product_images image
      where image.product_id = p.id
        and (image.variant_id is null or image.variant_id = v.id)
        and image.image_url is not null
      order by image.is_primary desc, (image.variant_id = v.id) desc, image.sort_order asc
      limit 1
    ) pi on true
    order by req.position asc\`,
    [JSON.stringify(requested)],
  ) as Array<{
    position: number;
    product_id: string;
    variant_id: string;
    offer_id: string;
    name: string;
    variant_name: string | null;
    brand_name: string | null;
    category_name: string;
    width_mm: number | null;
    height_mm: number | null;
    depth_mm: number | null;
    image_url: string;
  }>;

  if (rows.length !== requested.length) {
    throw new Error("One or more approved products are no longer render-ready. Refresh the product selection.");
  }

  return rows.map((row) => ({
    productId: row.product_id,
    variantId: row.variant_id,
    offerId: row.offer_id,
    name: row.name,
    variantName: row.variant_name,
    brandName: row.brand_name,
    categoryName: row.category_name,
    widthMm: row.width_mm,
    heightMm: row.height_mm,
    depthMm: row.depth_mm,
    imageUrl: row.image_url,
  }));
}
