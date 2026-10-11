import type { ProductSelection } from '@/lib/catalog/selection';
export type RoomHotspot = { variantId: string; visibility: 'visible' | 'hidden' | 'missing' | 'uncertain'; x?: number; y?: number };
export type HotspotRecord = { generationId: string; resultAssetId: string; reviewedAt: string; items: RoomHotspot[] };
export function validHotspots(items: unknown, selection: ProductSelection): items is RoomHotspot[] {
  if (!Array.isArray(items) || items.length !== selection.products.length) return false;
  const ids = new Set(selection.products.map(p => p.selected.variantId));
  return items.every(p => {
    if (!p || !ids.delete(p.variantId) || !['visible','hidden','missing','uncertain'].includes(p.visibility)) return false;
    return p.visibility === 'visible' ? [p.x,p.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100) : p.x === undefined && p.y === undefined;
  }) && ids.size === 0;
}
export function checkedHotspots(record: HotspotRecord | undefined, generationId: string, assetId: string, selection: ProductSelection): RoomHotspot[] {
  return record?.generationId === generationId && record.resultAssetId === assetId && record.reviewedAt && validHotspots(record.items, selection) ? record.items : [];
}
