import type { ProductSelection, ProposedProduct, ProductAlternative } from "@/lib/catalog/selection";

export type DesignedRoomPayload = {
  designId: string;
  generationId: string;
  brief: {
    title: string;
    direction: string;
    palette: string;
    materials: string;
    designerNote: string;
  };
  selection: ProductSelection;
  resultUrl: string;
  originalUrl?: string | null;
  generatedAt?: string | null;
  shared?: boolean;
};

export type ProductHotspot = {
  x: number;
  y: number;
};

const slotHotspots: Record<string, ProductHotspot> = {
  sofas: { x: 50, y: 66 },
  armchairs: { x: 22, y: 62 },
  "coffee-tables": { x: 50, y: 76 },
  "side-tables": { x: 76, y: 68 },
  rugs: { x: 52, y: 84 },
  "floor-lamps": { x: 16, y: 38 },
  "table-lamps": { x: 80, y: 46 },
  "storage-cabinets": { x: 83, y: 53 },
  "tv-units": { x: 78, y: 58 },
  shelving: { x: 87, y: 42 },
  mirrors: { x: 71, y: 31 },
  artwork: { x: 58, y: 28 },
  cushions: { x: 43, y: 61 },
  throws: { x: 38, y: 64 },
};

export function hotspotForProduct(product: ProposedProduct, index: number): ProductHotspot {
  const known = slotHotspots[product.slot];
  if (known) return known;

  const fallback = [
    { x: 18, y: 28 },
    { x: 34, y: 72 },
    { x: 51, y: 42 },
    { x: 66, y: 73 },
    { x: 82, y: 30 },
  ];

  return fallback[index % fallback.length];
}

export function applyPendingAlternative(
  selection: ProductSelection,
  slot: string,
  alternative: ProductAlternative,
): ProductSelection {
  const products = selection.products.map((product) =>
    product.slot === slot
      ? {
          ...product,
          selected: alternative.candidate,
          score: alternative.score,
          reasons: alternative.reasons,
        }
      : product,
  );

  const totalMinor = products.reduce(
    (sum, product) => sum + product.selected.offer.priceMinor,
    0,
  );

  return {
    ...selection,
    products,
    totalMinor,
    remainingMinor: selection.budgetMinor - totalMinor,
    createdAt: new Date().toISOString(),
  };
}
