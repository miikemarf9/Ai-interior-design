import type { SelectionCandidate } from '@/lib/catalog/selection';

export const EXPLORE_PAGE_SIZE = 10;
export const styleLabels: Record<string, string> = {
  'warm-minimal': 'Modern Organic', 'modern-british': 'Modern Country', scandi: 'Japandi',
  'mid-century': 'Mid-Century Modern', colourful: 'Bold & Colourful', classic: 'Contemporary Classic',
};
export function label(value: string) { return value.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
export function eligibleForExplore(item: SelectionCandidate, now = Date.now()) {
  const checked = Date.parse(item.offer.lastCheckedAt);
  return item.clearedForSelection === true && Boolean(item.image?.url.startsWith('https://'))
    && ['in_stock', 'low_stock'].includes(item.offer.availability)
    && ['available', 'restricted'].includes(item.offer.ukDeliveryStatus)
    && Number.isSafeInteger(item.offer.priceMinor) && item.offer.priceMinor > 0
    && Number.isFinite(checked) && checked <= now && now - checked < 36 * 60 * 60 * 1000
    && /^https?:\/\//.test(item.offer.productUrl);
}
export function exploreCatalogue(candidates: SelectionCandidate[], params: URLSearchParams, now = Date.now()) {
  const items = candidates.filter(item => eligibleForExplore(item, now));
  const unique = (values: string[]) => Array.from(new Set(values)).sort();
  const facets = {
    categories: Array.from(new Map(items.map(item => [item.category, item.categoryName])).entries()).sort((a,b) => a[1].localeCompare(b[1])),
    retailers: Array.from(new Map(items.map(item => [item.offer.retailerSlug, item.offer.retailerName])).entries()).sort((a,b) => a[1].localeCompare(b[1])),
    styles: unique(items.flatMap(item => item.styles)), materials: unique(items.flatMap(item => item.materials)), colours: unique(items.flatMap(item => item.colours)),
  };
  const q = (params.get('q') || '').trim().slice(0, 100).toLowerCase();
  const price = (key: string) => { const raw=params.get(key); const n=Number(raw); return raw && Number.isFinite(n) && n>=0 ? Math.round(n*100) : null; };
  const min=price('min'), max=price('max');
  const matches = items.filter(item => {
    if (params.get('category') && item.category !== params.get('category')) return false;
    if (params.get('retailer') && item.offer.retailerSlug !== params.get('retailer')) return false;
    if (['style', 'material', 'colour'].some((key, i) => params.get(key) && ![item.styles, item.materials, item.colours][i].includes(params.get(key)!))) return false;
    if (min !== null && item.offer.priceMinor < min || max !== null && item.offer.priceMinor > max) return false;
    return !q || [item.productName, item.variantName, item.brandName, item.categoryName, item.designSummary, item.offer.retailerName, ...item.styles.map(s => styleLabels[s] || s), ...item.materials, ...item.colours].filter(Boolean).join(' ').toLowerCase().includes(q);
  }).sort((a,b) => {
    if (params.get('sort') === 'price-asc') return a.offer.priceMinor-b.offer.priceMinor || a.variantId.localeCompare(b.variantId);
    if (params.get('sort') === 'price-desc') return b.offer.priceMinor-a.offer.priceMinor || a.variantId.localeCompare(b.variantId);
    return b.curationScore-a.curationScore || b.qualityScore-a.qualityScore || a.productId.localeCompare(b.productId) || a.variantId.localeCompare(b.variantId);
  });
  const total=matches.length, pages=Math.max(1, Math.ceil(total/EXPLORE_PAGE_SIZE));
  const raw=Number(params.get('page') || 1);
  const page=Math.min(pages, Number.isSafeInteger(raw) && raw>0 ? raw : 1);
  return { facets, total, pages, page, products: matches.slice((page-1)*EXPLORE_PAGE_SIZE, page*EXPLORE_PAGE_SIZE) };
}
