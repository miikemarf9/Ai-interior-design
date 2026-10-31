import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductSelection } from "@/lib/catalog/selection";

import type { Placement } from "@/lib/render/pilot";

export const RENDER_PROMPT_VERSION = "living-room-illustrative-v3";

export type RenderProductReference = {
  quantity?: number;
  productId: string;
  variantId: string;
  offerId: string;
  name: string;
  variantName: string | null;
  brandName: string | null;
  categoryName: string;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  imageUrl: string;
};

export function buildRoomRenderPrompt(
  intake: IntakeForBrief,
  brief: DesignBrief,
  selection: ProductSelection,
  products: RenderProductReference[],
  placements: Placement[],
  correction?: string,
) {
  if (intake.roomType && intake.roomType !== 'living_room') throw new Error('Only the living-room pilot is enabled.');
  const { budget: _budget, ...visualBrief } = brief;
  const productLines = products.map((product, index) => {
    const dimensions = [product.widthMm, product.depthMm, product.heightMm]
      .map((value) => value ? `${Math.round(value / 10)}cm` : "?")
      .join(" × ");

    return [
      `Style cue: ${product.categoryName} — ${product.brandName ? `${product.brandName} ` : ""}${product.name}${product.variantName ? ` / ${product.variantName}` : ""}.`,
      `Intended placement: ${placements.find(item => item.variantId === product.variantId)?.instruction || "Not supplied — do not infer an approved position"}. Quantity: ${product.quantity ?? 1}. Use this only as a broad visual cue; the generated room is illustrative, not an exact product match. Dimensions W × D × H: ${dimensions}.`,
    ].join(" ");
  });

  return `Edit reference image 1, which is the customer's real living room, into a photorealistic illustrative interior design concept.

NON-NEGOTIABLE ROOM RULES
- Preserve the exact camera viewpoint, perspective, room geometry, ceiling height, windows, doors, openings, fireplace/chimney structure, radiators and fixed architectural features visible in reference image 1.
- This is an edit of the customer's room, not a new imaginary room.
- Preserve every existing item the customer explicitly wants to keep.
- Do not add structural alterations that were not requested.
- Respect all supplied measurements and restrictions. Do not imply exact fit where dimensions are incomplete.
- Keep the result plausible as a real UK home and natural interior photograph.
- No people, logos, labels, product callouts, text overlays or watermarks.

APPROVED DESIGN BRIEF
${JSON.stringify(visualBrief)}

CUSTOMER CONSTRAINTS
Keep / retained furniture: ${intake.keep.length ? intake.keep.join(", ") : "none explicitly listed"}.
Retained photo markers (normalised x/y, not measurements): ${JSON.stringify(intake.retainedFurniture || [])}. Preserve these items.
Measurement source: ${intake.measurements.accuracy || "unknown"}; never treat estimates as verified fit.
Allowed to change: ${intake.change.length ? intake.change.join(", ") : "open to the approved brief"}.
Room uses: ${intake.uses.length ? intake.uses.join(", ") : "general living room use"}.
Dislikes / exclusions: ${intake.dislikes || "none supplied"}.
Room measurements: width ${intake.measurements.width || "unknown"} cm; length ${intake.measurements.length || "unknown"} cm; ceiling ${intake.measurements.height || "unknown"} cm.
Additional room restrictions: ${intake.measurements.notes || "none supplied"}.
Product prices and budgets are not visual content. Never put prices, product information or shopping labels inside the image.

APPROVED REAL PRODUCT SET
The product reference images start at reference image 2. Use the selected products as the design anchors rather than inventing substitutes.
${productLines.join("\n")}

COMPOSITION
- Place illustrative furniture naturally and at believable scale.
- Preserve retained furniture and integrate it with the concept.
- Follow the approved palette, materials, style and practical requirements.
- Do not imply that furniture in the render is an exact retailer item.
- If a selected product cannot be placed plausibly, prioritise room geometry and realism rather than distorting the room or product.
- Lighting should look natural and photographic, with coherent shadows and reflections.
- The final image should feel premium and editorial but still recognisably be the customer's original room.

${correction ? `CONTROLLED CORRECTION
Reference image 2 is the previous failed result, not an architectural reference. Reference image 1 remains the source of truth for the room. Correct only these identified issues: ${correction}
Preserve successful areas. Do not inherit distorted architecture or altered products from the failed result.` : 'This is the initial living-room pilot attempt.'} Accuracy to the room and selected products is more important than novelty.`;
}
