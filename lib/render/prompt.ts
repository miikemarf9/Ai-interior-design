import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductSelection } from "@/lib/catalog/selection";

export const RENDER_PROMPT_VERSION = "room-render-v1";

export type RenderProductReference = {
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
) {
  const productLines = products.map((product, index) => {
    const dimensions = [product.widthMm, product.depthMm, product.heightMm]
      .map((value) => value ? \`\${Math.round(value / 10)}cm\` : "?")
      .join(" × ");

    return [
      \`Reference image \${index + 2}: \${product.categoryName} — \${product.brandName ? \`\${product.brandName} \` : ""}\${product.name}\${product.variantName ? \` / \${product.variantName}\` : ""}.\`,
      \`Use this exact real product design as faithfully as possible. Dimensions W × D × H: \${dimensions}.\`,
    ].join(" ");
  });

  return \`Edit reference image 1, which is the customer's real living room, into a photorealistic finished interior design.

NON-NEGOTIABLE ROOM RULES
- Preserve the exact camera viewpoint, perspective, room geometry, ceiling height, windows, doors, openings, fireplace/chimney structure, radiators and fixed architectural features visible in reference image 1.
- This is an edit of the customer's room, not a new imaginary room.
- Preserve every existing item the customer explicitly wants to keep.
- Do not add structural alterations that were not requested.
- Respect all supplied measurements and restrictions. Do not imply exact fit where dimensions are incomplete.
- Keep the result plausible as a real UK home and natural interior photograph.
- No people, logos, labels, product callouts, text overlays or watermarks.

APPROVED DESIGN BRIEF
\${JSON.stringify(brief)}

CUSTOMER CONSTRAINTS
Keep / retained furniture: \${intake.keep.length ? intake.keep.join(", ") : "none explicitly listed"}.
Allowed to change: \${intake.change.length ? intake.change.join(", ") : "open to the approved brief"}.
Room uses: \${intake.uses.length ? intake.uses.join(", ") : "general living room use"}.
Dislikes / exclusions: \${intake.dislikes || "none supplied"}.
Room measurements: width \${intake.measurements.width || "unknown"} cm; length \${intake.measurements.length || "unknown"} cm; ceiling \${intake.measurements.height || "unknown"} cm.
Additional room restrictions: \${intake.measurements.notes || "none supplied"}.
Whole-room product budget: £\${intake.budget}.

APPROVED REAL PRODUCT SET
The product reference images start at reference image 2. Use the selected products as the design anchors rather than inventing substitutes.
\${productLines.join("\\n")}

COMPOSITION
- Place the approved products naturally and at believable scale.
- Preserve retained furniture and integrate it with the selected new products.
- Follow the approved palette, materials, style and practical requirements.
- Do not silently replace an approved real product with a different-looking product.
- If a selected product cannot be placed plausibly, prioritise room geometry and realism rather than distorting the room or product.
- Lighting should look natural and photographic, with coherent shadows and reflections.
- The final image should feel premium and editorial but still recognisably be the customer's original room.

This output is the first render for an approved product set. Accuracy to the room and selected products is more important than novelty.\`;
}
