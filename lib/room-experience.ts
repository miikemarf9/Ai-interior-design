import type { RoomHotspot } from '@/lib/room-hotspots';
import type { ProductSelection, ProductAlternative } from "@/lib/catalog/selection";

export type DesignedRoomPayload = {
  designId: string;
  generationId: string;
  resultAssetId?: string;
  hotspots?: RoomHotspot[];
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
    (sum, product) => sum + product.selected.offer.priceMinor * (product.quantity || 1),
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
