/** Reviewed pilot register. Active retailer/product flags are NOT image-use permission.
 * Add entries only after Stage 2 evidence has been checked. No research candidates belong here.
 * Evidence references identify private approval records; never return them to the browser.
 */
export type CatalogueClearance = {
  productId: string;
  variantId: string;
  offerId: string;
  imageUrl: string;
  exactVariantName: string;
  packSize: number;
  unitLabel: string;
  displayEvidence: string;
  aiReferenceEvidence: string;
  customerOutputEvidence: string;
  dataEvidence: string;
  reviewedAt: string;
  expiresAt: string;
  deliveryBasis: 'per_unit' | 'per_order' | 'unknown';
  deliveryDetails: string;
};

// Stage 2 outcome, 11 October 2026: 0 cleared products. Deliberately empty.
export const CLEARED_CATALOGUE: readonly CatalogueClearance[] = [];

export function currentClearances(now = Date.now(), entries = CLEARED_CATALOGUE) {
  return entries.filter(entry => entry.productId && entry.variantId && entry.offerId
    && /^https:\/\//.test(entry.imageUrl) && entry.exactVariantName.trim()
    && Number.isInteger(entry.packSize) && entry.packSize > 0 && entry.unitLabel.trim()
    && entry.displayEvidence && entry.aiReferenceEvidence && entry.customerOutputEvidence && entry.dataEvidence
    && Date.parse(entry.reviewedAt) <= now && Date.parse(entry.expiresAt) > now);
}
