import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductSelection } from "@/lib/catalog/selection";

import type { Placement } from "@/lib/render/pilot";

export const RENDER_PROMPT_VERSION = "living-room-residential-v5";

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
  const productLines = products.map((product) => {
    const dimensions = [product.widthMm, product.depthMm, product.heightMm]
      .map((value) => value ? `${Math.round(value / 10)}cm` : "?")
      .join(" × ");
    const selected = selection.products.find((item) => item.selected.variantId === product.variantId)?.selected;
    const colours = selected?.colours.length ? selected.colours.join(", ") : "not confirmed in the feed";
    const materials = selected?.materials.length ? selected.materials.join(", ") : "not confirmed in the feed";

    return [
      `Style cue: ${product.categoryName} — ${product.brandName ? `${product.brandName} ` : ""}${product.name}${product.variantName ? ` / ${product.variantName}` : ""}.`,
      `Supplier colour tags: ${colours}. Supplier material tags: ${materials}. Treat these as broad palette cues only, not proof of the exact product finish.`,
      `Intended placement: ${placements.find(item => item.variantId === product.variantId)?.instruction || "Not supplied — do not infer an approved position"}. Quantity: ${product.quantity ?? 1}. Use this only as a broad visual cue; the generated room is illustrative, not an exact product match. Dimensions W × D × H: ${dimensions}.`,
    ].join(" ");
  });

  return `Edit reference image 1, which is the customer's real living room, into a photorealistic image of that room furnished as a comfortable, welcoming home.

NON-NEGOTIABLE ROOM RULES
- Preserve the exact camera viewpoint, perspective, room geometry, ceiling height, windows, doors, openings, fireplace/chimney structure, radiators and fixed architectural features visible in reference image 1.
- This is an edit of the customer's room, not a new imaginary room.
- Preserve every existing item the customer explicitly wants to keep.
- Do not add structural alterations that were not requested.
- Respect all supplied measurements and restrictions. Do not imply exact fit where dimensions are incomplete.
- Keep the result plausible as a real UK home and natural interior photograph.
- No people, logos, labels, product callouts, text overlays or watermarks.

THE FEEL OF THE ROOM
- Make this feel like a real home the customer could relax in every day, not a furniture showroom, catalogue set, product demonstration or empty display suite.
- Show a coherent, usable living room: arrange seating for the stated activities, keep practical circulation space, and make tables and storage feel naturally reachable.
- Use comfortable residential details where they suit the brief: tactile fabrics, soft furnishings, warm layered lighting, and a small amount of personal-scale styling. Keep the room tidy and believable; do not add clutter or decorative props just to fill space.
- Integrate selected furniture into the overall room composition. Do not isolate products, line them up like a catalogue, give every item its own spotlight, or make any one product dominate the room.
- Prefer relaxed, natural placement over rigid symmetry or showroom staging. Keep lighting inviting and photographic rather than dramatic or commercial.
- The room should feel settled and welcoming while remaining faithful to the customer's actual room, approved brief, practical needs and dislikes. Do not invent people, personal photographs, pets, or possessions.

COLOUR AND MATERIAL COORDINATION
- Treat all selected pieces as one considered assortment, not independent products. The sofa or first selected item is the palette anchor; carry at least one colour family or compatible neutral through the other large pieces.
- Keep colour undertones deliberate. Use neutrals as bridges, and add a contrasting accent only when it relates to the approved palette or repeats elsewhere. Avoid unrelated strong colours and competing wood tones.
- Make different materials feel intentional: repeat a key timber or metal finish where it appears, and pair wood naturally with textiles, natural fibres, stone or glass. A coordinated room does not need an identical matching set.
- Follow the approved customer palette first. Supplier colour/material tags below are broad cues and may be incomplete; never invent an exact finish when the feed has not confirmed one.

APPROVED DESIGN BRIEF
${JSON.stringify(visualBrief)}

CUSTOMER CONSTRAINTS
Keep / retained furniture: ${intake.keep.length ? intake.keep.join(", ") : "none explicitly listed"}.
Photo annotations (normalised x/y, visual guidance only, not measurements): ${JSON.stringify(intake.retainedFurniture || [])}. Preserve markers tagged keep and legacy markers with no intent. Treat markers tagged place as requested positions for new items where practical; never treat them as items to remove.
Measurement source: ${intake.measurements.accuracy || "unknown"}; never treat estimates as verified fit.
Allowed to change: ${intake.change.length ? intake.change.join(", ") : "open to the approved brief"}.
Room uses: ${intake.uses.length ? intake.uses.join(", ") : "general living room use"}.
Dislikes / exclusions: ${intake.dislikes || "none supplied"}.
Room measurements: width ${intake.measurements.width || "unknown"} cm; length ${intake.measurements.length || "unknown"} cm; ceiling ${intake.measurements.height || "unknown"} cm.
Additional room restrictions: ${intake.measurements.notes || "none supplied"}.
Product prices and budgets are not visual content. Never put prices, product information or shopping labels inside the image.

ILLUSTRATIVE FURNITURE CUES
${productLines.length ? "The selected products, if any, are broad style cues only. Their exact appearance is not promised; do not depict or label the generated image as an exact product match." : "No retailer products are selected. Furnish the room according to the approved brief using plausible illustrative furniture."}
${productLines.join("\n") || "No exact retailer-product likeness is requested."}

COMPOSITION
- Compose the image as a lived-in residential room photograph, with the whole layout reading comfortably and naturally rather than as a collection of featured products.
- Place illustrative furniture naturally and at believable scale, leaving sensible open routes through the room and enough breathing space around seating.
- Preserve retained furniture and integrate it with the concept.
- Follow the approved palette, materials, style and practical requirements.
- Do not imply that furniture in the render is an exact retailer item.
- If a selected product cannot be placed plausibly, prioritise room geometry and realism rather than distorting the room or product.
- Lighting should look natural and photographic, with coherent shadows and reflections.
- Make comfort and everyday usability more important than dramatic styling or product visibility. The finished room must still be recognisably the customer's original room.

${correction ? `CONTROLLED CORRECTION
Reference image 2 is the previous failed result, not an architectural reference. Reference image 1 remains the source of truth for the room. Correct only these identified issues: ${correction}
Preserve successful areas. Do not inherit distorted architecture or altered products from the failed result.` : 'This is the initial living-room pilot attempt.'} Accuracy to the room and selected products is more important than novelty.`;
}
