export type CatalogQualityInput = {
  hasPrimaryCategory: boolean;
  hasPrimaryImage: boolean;
  dimensionsRequired: boolean;
  hasWidth: boolean;
  hasHeight: boolean;
  hasDepth: boolean;
  hasActiveUkOffer: boolean;
  hasCurrentGbpPrice: boolean;
  hasAvailability: boolean;
  hasUkDeliveryState: boolean;
  hasStyle: boolean;
  hasColour: boolean;
  hasMaterial: boolean;
  lastCheckedAt: string | null;
};

export type CatalogQualityResult = {
  score: number;
  blocking: string[];
  warnings: string[];
};

const FRESHNESS_DAYS = 7;

export function assessCatalogQuality(input: CatalogQualityInput): CatalogQualityResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (!input.hasPrimaryCategory) blocking.push('missing_primary_category');
  if (!input.hasPrimaryImage) blocking.push('missing_primary_image');
  if (!input.hasActiveUkOffer) blocking.push('missing_active_uk_offer');
  if (!input.hasCurrentGbpPrice) blocking.push('missing_current_gbp_price');

  if (input.dimensionsRequired && (!input.hasWidth || !input.hasHeight || !input.hasDepth)) {
    blocking.push('missing_required_dimensions');
  }

  if (!input.hasAvailability) warnings.push('availability_unknown');
  if (!input.hasUkDeliveryState) warnings.push('uk_delivery_unknown');
  if (!input.hasStyle) warnings.push('missing_style');
  if (!input.hasColour) warnings.push('missing_colour');
  if (!input.hasMaterial) warnings.push('missing_material');

  if (!input.lastCheckedAt) {
    warnings.push('never_checked');
  } else {
    const ageMs = Date.now() - new Date(input.lastCheckedAt).getTime();
    const ageDays = ageMs / 86_400_000;
    if (!Number.isFinite(ageDays) || ageDays > FRESHNESS_DAYS) warnings.push('stale_offer_check');
  }

  const score = Math.max(0, 100 - blocking.length * 20 - warnings.length * 5);

  return { score, blocking, warnings };
}
