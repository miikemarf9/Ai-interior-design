import { currentClearances } from "@/lib/catalog/clearance";
import { getCatalogDb } from "@/lib/catalog/neon";

export type RenderClearance = {
  productId: string;
  variantId: string;
  offerId: string;
  imageUrl: string;
  exactVariantName: string;
  packSize: number;
  unitLabel: string;
  deliveryBasis: "per_unit" | "per_order" | "unknown";
  deliveryDetails: string;
};

export async function currentRenderClearances(): Promise<RenderClearance[]> {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `select product_id::text, variant_id::text, offer_id::text, image_url,
            exact_variant_name, pack_size::int, unit_label, delivery_basis, delivery_details
     from public.catalog_image_clearances
     where display_approved and ai_reference_approved
       and approved_at <= now() and expires_at > now()`,
  ) as Array<{
    product_id: string; variant_id: string; offer_id: string; image_url: string;
    exact_variant_name: string; pack_size: number; unit_label: string;
    delivery_basis: RenderClearance["deliveryBasis"]; delivery_details: string;
  }>;
  const staticEntries = currentClearances().map(entry => ({
    productId: entry.productId, variantId: entry.variantId, offerId: entry.offerId,
    imageUrl: entry.imageUrl, exactVariantName: entry.exactVariantName,
    packSize: entry.packSize, unitLabel: entry.unitLabel,
    deliveryBasis: entry.deliveryBasis, deliveryDetails: entry.deliveryDetails,
  }));
  return [...staticEntries, ...rows.map(row => ({
    productId: row.product_id, variantId: row.variant_id, offerId: row.offer_id,
    imageUrl: row.image_url, exactVariantName: row.exact_variant_name,
    packSize: row.pack_size, unitLabel: row.unit_label,
    deliveryBasis: row.delivery_basis, deliveryDetails: row.delivery_details,
  }))];
}
