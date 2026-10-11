import { currentClearances } from '@/lib/catalog/clearance';
import type { ProductSelection, SelectionCandidate } from '@/lib/catalog/selection';
// Never associate a mutable design collection with an older generated image.
export function clearedImageSelection(metadata: any): ProductSelection | null {
  const selection = metadata?.snapshot?.selection as ProductSelection | undefined;
  if (!selection || selection.version !== 2 || !selection.products?.length) return null;
  const cleared = currentClearances();
  const allowed = (p: SelectionCandidate) => cleared.some(c => c.productId === p.productId && c.variantId === p.variantId && c.offerId === p.offer.id && c.imageUrl === p.image?.url);
  if (!selection.products.every(p => allowed(p.selected))) return null;
  return {...selection,products:selection.products.map(p=>({...p,alternatives:p.alternatives.filter(a=>allowed(a.candidate))}))};
}
