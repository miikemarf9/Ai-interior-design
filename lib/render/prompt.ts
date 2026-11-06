import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductSelection } from "@/lib/catalog/selection";

import type { Placement } from "@/lib/render/pilot";

export const RENDER_PROMPT_VERSION = "residential-bedroom-v7";

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
  if (intake.roomType && intake.roomType !== 'living_room' && intake.roomType !== 'bedroom') throw new Error('Choose a living room or bedroom.');
  const { budget: _budget, ...visualBrief } = brief;
  const productLines = products.map((product, index) => {
    const dimensions = [product.widthMm, product.depthMm, product.heightMm]
      .map((value) => value ? `${Math.round(value / 10)}cm` : "?")
      .join(" × ");
    const selected = selection.products.find((item) => item.selected.variantId === product.variantId)?.selected;
    const colours = selected?.colours.length ? selected.colours.join(", ") : "not confirmed in the feed";
    const materials = selected?.materials.length ? selected.materials.join(", ") : "not confirmed in the feed";

    return [
      `Product reference image ${index + 2} is the exact selected retailer item: ${product.brandName ? `${product.brandName} ` : ""}${product.name}${product.variantName ? ` / ${product.variantName}` : ""} (${product.categoryName}). Match its visible silhouette, proportions, upholstery or finish, colour, legs, cushions and distinctive details as closely as the reference photo allows. Do not replace it with a generic item or change its defining shape or material.`,
      `Supplier colour tags: ${colours}. Supplier material tags: ${materials}. Treat tags as supporting information; use the product photo as the primary appearance reference.`,
      `Intended placement: ${placements.find(item => item.variantId === product.variantId)?.instruction || "Not supplied — place naturally without inventing a specific requested position"}. Quantity: ${product.quantity ?? 1}. Dimensions W × D × H: ${dimensions}. Integrate this selected item naturally into the room; do not reproduce the reference photo background, crop, labels or watermark.`
    ].join(" ");
  });

  const roomName = intake.roomType === 'bedroom' ? 'bedroom' : 'living room';
  const roomArrangement = intake.roomType === 'bedroom'
    ? 'Show a coherent, usable bedroom: position the bed naturally, keep bedside storage reachable, and arrange wardrobe and dressing storage with practical circulation space.'
    : 'Show a coherent, usable living room: arrange seating for the stated activities, keep practical circulation space, and make tables and storage feel naturally reachable.';
  return `Edit reference image 1, which is the customer's real ${roomName}, into a photorealistic image of that room furnished as a comfortable, welcoming home. Reference images 2 onward are the actual retailer product photos listed below, in the same order; use each one to guide the matching item in the room.

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
- ${roomArrangement}
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
Room uses: ${intake.uses.length ? intake.uses.join(", ") : intake.roomType === 'bedroom' ? "general bedroom use" : "general living room use"}.
Dislikes / exclusions: ${intake.dislikes || "none supplied"}.
Room measurements: width ${intake.measurements.width || "unknown"} cm; length ${intake.measurements.length || "unknown"} cm; ceiling ${intake.measurements.height || "unknown"} cm.
Additional room restrictions: ${intake.measurements.notes || "none supplied"}.
Product prices and budgets are not visual content. Never put prices, product information or shopping labels inside the image.

SELECTED FURNITURE AND PRODUCT PHOTO REFERENCES
${productLines.length ? "Use the provided retailer photos as visual references for the corresponding selected items. The room image is illustrative and does not guarantee exact product replication, fit, or retailer availability." : "No retailer products are selected. Furnish the room according to the approved brief using plausible illustrative furniture."}
${productLines.join("\n") || "No retailer-product photo references are supplied."}

COMPOSITION
- Compose the image as a lived-in residential room photograph, with the whole layout reading comfortably and naturally rather than as a collection of featured products.
- Place the selected products shown in the reference photos naturally and at believable scale, leaving sensible open routes through the room and enough breathing space around seating. Preserve each item's recognisable design and finish while fitting it into the whole room.
- Preserve retained furniture and integrate it with the concept.
- Follow the approved palette, materials, style and practical requirements.
- Do not claim the generated furniture is an exact retailer item; the separate product cards remain the authoritative product photographs.
- If a selected product cannot be placed plausibly, prioritise room geometry and realism rather than distorting the room or product.
- Lighting should look natural and photographic, with coherent shadows and reflections.
- Make comfort and everyday usability more important than dramatic styling or product visibility. The finished room must still be recognisably the customer's original room.

${correction ? `CONTROLLED CORRECTION
Reference image ${products.length + 2} is the previous failed result, not an architectural or product reference. Reference image 1 remains the source of truth for the room; images 2 through ${products.length + 1} remain the selected product photos. Correct only these identified issues: ${correction}
Preserve successful areas. Do not inherit distorted architecture or altered products from the failed result.` : `This is the initial ${roomName} image attempt.`} Accuracy to the room and selected products is more important than novelty.`;
}
