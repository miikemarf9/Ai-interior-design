import { currentClearances } from "@/lib/catalog/clearance";
import { getCatalogDb } from "@/lib/catalog/neon";
import type { ProductSelection } from "@/lib/catalog/selection";
import type { RenderProductReference } from "@/lib/render/prompt";

type RequestedProduct = {
  position: number;
  product_id: string;
  variant_id: string;
  offer_id: string;
  image_url: string;
};

export async function getVerifiedRenderProducts(
  selection: ProductSelection,
): Promise<RenderProductReference[]> {
  const clearances = currentClearances();
  if (selection.version !== 2 || selection.products.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10 || !clearances.some(entry => entry.productId === item.selected.productId && entry.variantId === item.selected.variantId && entry.offerId === item.selected.offer.id))) {
    throw new Error('This collection contains products that are not currently cleared for use. Return to product selection.');
  }
  const requested: RequestedProduct[] = selection.products.map((item, position) => ({
    position,
    product_id: item.selected.productId,
    variant_id: item.selected.variantId,
    offer_id: item.selected.offer.id,
    image_url: clearances.find(entry => entry.variantId === item.selected.variantId && entry.offerId === item.selected.offer.id)!.imageUrl,
  }));

  if (!requested.length) return [];

  const sql = getCatalogDb();
  const rows = await sql.query(
    `with requested as (
      select *
      from jsonb_to_recordset($1::jsonb) as x(
        position integer,
        product_id uuid,
        variant_id uuid,
        offer_id uuid,
        image_url text
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
      req.image_url
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
    order by req.position asc`,
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
    variantName: clearances.find(entry => entry.variantId === row.variant_id && entry.offerId === row.offer_id)!.exactVariantName,
    brandName: row.brand_name,
    categoryName: row.category_name,
    widthMm: row.width_mm,
    heightMm: row.height_mm,
    depthMm: row.depth_mm,
    imageUrl: row.image_url,
    quantity: selection.products[row.position].quantity * clearances.find(entry => entry.variantId === row.variant_id && entry.offerId === row.offer_id)!.packSize,
  }));
}
