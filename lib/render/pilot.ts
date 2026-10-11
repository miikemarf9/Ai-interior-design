import type { ProductSelection } from '@/lib/catalog/selection';

export const MAX_CORRECTIONS = 2;
export type Placement = { variantId: string; instruction: string };
export type Check = 'pass' | 'fail' | 'uncertain';
export type PilotReview = {
  architecture: Check;
  retainedFurniture: Check;
  products: Array<{ variantId: string; quantity: Check; shape: Check; finish: Check; placement: Check }>;
  notes: string;
};
export function validPlacements(value: unknown, selection: ProductSelection): value is Placement[] {
  return Array.isArray(value) && value.length === selection.products.length
    && new Set(value.map(item => item?.variantId)).size === value.length
    && value.every(item => selection.products.some(product => product.selected.variantId === item?.variantId)
      && typeof item.instruction === 'string' && item.instruction.trim().length >= 5 && item.instruction.length <= 600);
}
export function validReview(value: unknown, selection: ProductSelection): value is PilotReview {
  const review = value as PilotReview;
  const check = (v: unknown) => ['pass', 'fail', 'uncertain'].includes(String(v));
  return !!review && check(review.architecture) && check(review.retainedFurniture)
    && typeof review.notes === 'string' && review.notes.length <= 2000
    && Array.isArray(review.products) && review.products.length === selection.products.length
    && new Set(review.products.map(item => item?.variantId)).size === review.products.length
    && review.products.every(item => item && selection.products.some(product => product.selected.variantId === item.variantId)
      && [item.quantity, item.shape, item.finish, item.placement].every(check));
}
export function reviewPassed(review: PilotReview) {
  return review.architecture === 'pass' && review.retainedFurniture === 'pass'
    && review.products.every(item => [item.quantity, item.shape, item.finish, item.placement].every(value => value === 'pass'));
}
export function pilotSummary(attempts: Array<{ cost_usd_micros: number | null; duration_ms: number | null; metadata?: { correctionAttempt?: number } }>) {
  return {
    attempts: attempts.length,
    corrections: attempts.filter(item => (item.metadata?.correctionAttempt || 0) > 0).length,
    knownCostUsdMicros: attempts.reduce((sum, item) => sum + Number(item.cost_usd_micros || 0), 0),
    unknownCostAttempts: attempts.filter(item => item.cost_usd_micros === null).length,
    knownDurationMs: attempts.reduce((sum, item) => sum + Number(item.duration_ms || 0), 0),
  };
}
