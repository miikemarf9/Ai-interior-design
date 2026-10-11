import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { Availability, ProductDimensions, UkDeliveryStatus } from "@/lib/catalog/types";

export type SelectionCandidate = {
  clearedForSelection?: true;
  commercial?: { packSize: number; unitLabel: string; deliveryBasis: 'per_unit' | 'per_order' | 'unknown'; deliveryDetails: string };
  productId: string;
  variantId: string;
  productName: string;
  variantName: string | null;
  brandName: string | null;
  category: string;
  categoryName: string;
  designSummary: string | null;
  dimensions: ProductDimensions;
  styles: string[];
  materials: string[];
  colours: string[];
  curationScore: number;
  qualityScore: number;
  offer: {
    id: string;
    retailerName: string;
    retailerSlug: string;
    priceMinor: number;
    compareAtPriceMinor: number | null;
    availability: Availability;
    ukDeliveryStatus: UkDeliveryStatus;
    deliveryPriceMinor: number | null;
    productUrl: string;
    affiliateUrl: string | null;
    lastCheckedAt: string;
  };
  image: {
    url: string;
    altText: string | null;
  } | null;
};

export type ProductAlternative = {
  kind: "cheaper" | "similar" | "premium";
  candidate: SelectionCandidate;
  score: number;
  reasons: string[];
};

export type ProposedProduct = {
  quantity: number;
  slot: string;
  slotLabel: string;
  budgetMinor: number;
  selected: SelectionCandidate;
  score: number;
  reasons: string[];
  alternatives: ProductAlternative[];
};

export type ProductSelection = {
  version: 2;
  missingItems: string[];
  productSubtotalMinor: number;
  knownDeliveryMinor: number;
  unknownDelivery: boolean;
  createdAt: string;
  totalMinor: number;
  budgetMinor: number;
  remainingMinor: number;
  catalogueCandidates: number;
  retainedItems: string[];
  requirements: string[];
  products: ProposedProduct[];
  notes: string[];
};

type SlotDefinition = {
  category: string;
  label: string;
  weight: number;
  keywords: string[];
  minBudget?: number;
};

const SLOT_DEFINITIONS: SlotDefinition[] = [
  { category: "sofas", label: "Sofa", weight: 0.38, keywords: ["sofa", "settee", "couch"] },
  { category: "armchairs", label: "Armchair", weight: 0.16, keywords: ["armchair", "chair"], minBudget: 1200 },
  { category: "coffee-tables", label: "Coffee table", weight: 0.09, keywords: ["coffee table"] },
  { category: "side-tables", label: "Side table", weight: 0.055, keywords: ["side table", "end table"], minBudget: 1000 },
  { category: "rugs", label: "Rug", weight: 0.11, keywords: ["rug"] },
  { category: "floor-lamps", label: "Floor lamp", weight: 0.055, keywords: ["floor lamp", "lamp"], minBudget: 900 },
  { category: "table-lamps", label: "Table lamp", weight: 0.035, keywords: ["table lamp"], minBudget: 1800 },
  { category: "storage-cabinets", label: "Storage", weight: 0.115, keywords: ["storage", "cabinet", "sideboard"], minBudget: 2300 },
];

const STYLE_ALIASES: Record<string, string> = {
  "warm minimal": "warm-minimal",
  "modern british": "modern-british",
  "mid-century": "mid-century",
  "mid century": "mid-century",
  contemporary: "contemporary",
  classic: "classic",
  scandi: "scandi",
  colourful: "colourful",
  industrial: "industrial",
};

const COLOUR_ALIASES: Record<string, string> = {
  "warm white": "warm-white",
  cream: "cream",
  beige: "beige",
  taupe: "taupe",
  brown: "brown",
  black: "black",
  charcoal: "charcoal",
  grey: "grey",
  olive: "olive",
  "forest green": "forest-green",
  sage: "sage",
  navy: "navy",
  "dusty blue": "dusty-blue",
  terracotta: "terracotta",
  ochre: "ochre",
  burgundy: "burgundy",
  "dusty pink": "dusty-pink",
};

const MATERIAL_ALIASES: Record<string, string> = {
  oak: "oak",
  walnut: "walnut",
  ash: "ash",
  pine: "pine",
  linen: "linen",
  cotton: "cotton",
  velvet: "velvet",
  "bouclé": "boucle",
  boucle: "boucle",
  wool: "wool",
  leather: "leather",
  rattan: "rattan",
  cane: "cane",
  stone: "stone",
  marble: "marble",
  glass: "glass",
  steel: "steel",
  brass: "brass",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function mapped(values: string[], aliases: Record<string, string>) {
  return values.map((value) => aliases[normalize(value)] ?? normalize(value).replace(/\s+/g, "-"));
}

function retainedText(intake: IntakeForBrief, brief: DesignBrief) {
  return [...intake.keep, ...(intake.retainedFurniture || []).map(item => item.label), brief.keep].join(" ").toLowerCase();
}

function shouldSkipForRetention(slot: SlotDefinition, retained: string) {
  return slot.keywords.some((keyword) => retained.includes(keyword));
}

function buildSlots(intake: IntakeForBrief, brief: DesignBrief) {
  const retained = retainedText(intake, brief);
  const needs = new Set(intake.uses.map(normalize));

  const eligible = SLOT_DEFINITIONS.filter((slot) => {
    if (shouldSkipForRetention(slot, retained) || (intake.keep.some(item => normalize(item) === 'lighting') && slot.category.includes('lamps'))) return false;
    if (intake.change.length && !intake.change.some(item => slot.keywords.some(keyword => normalize(item).includes(keyword)) || (normalize(item) === 'lighting' && slot.category.includes('lamps')))) return false;

    const requirementOverride =
      (slot.category === "armchairs" && needs.has("entertaining"))
      || (slot.category === "side-tables" && needs.has("entertaining"))
      || (slot.category === "floor-lamps" && needs.has("reading"))
      || (slot.category === "storage-cabinets" && needs.has("storage"));

    return requirementOverride || !slot.minBudget || intake.budget >= slot.minBudget;
  }).map((slot) => {
    let weight = slot.weight;
    if (slot.category === "armchairs" && needs.has("entertaining")) weight += 0.05;
    if (slot.category === "side-tables" && needs.has("entertaining")) weight += 0.02;
    if (slot.category === "floor-lamps" && needs.has("reading")) weight += 0.03;
    if (slot.category === "storage-cabinets" && needs.has("storage")) weight += 0.06;
    if (slot.category === "sofas" && needs.has("tv watching")) weight += 0.04;
    return { ...slot, weight };
  });

  const totalWeight = eligible.reduce((sum, slot) => sum + slot.weight, 0) || 1;
  return eligible.map((slot) => ({
    ...slot,
    budgetMinor: Math.round((intake.budget * 100 * slot.weight) / totalWeight),
  }));
}

function roomDimensionsMm(intake: IntakeForBrief) {
  const width = Number(intake.measurements.width);
  const length = Number(intake.measurements.length);
  if (!Number.isFinite(width) || !Number.isFinite(length) || width <= 0 || length <= 0) return null;
  return {
    shortest: Math.min(width, length) * 10,
    longest: Math.max(width, length) * 10,
  };
}

function dimensionFit(candidate: SelectionCandidate, intake: IntakeForBrief) {
  const room = roomDimensionsMm(intake);
  if (!room) return { allowed: true, score: 6, reason: "Fit remains provisional until room dimensions are confirmed." };

  const width = candidate.dimensions.widthMm;
  const depth = candidate.dimensions.depthMm;
  const height = candidate.dimensions.heightMm;
  const ceiling = Number(intake.measurements.height) * 10;
  if (height && ceiling > 0 && height > ceiling) return { allowed: false, score: 0, reason: 'Too tall for the supplied ceiling height.' };

  if (width && width > room.longest) {
    return { allowed: false, score: 0, reason: "Too wide for the supplied room dimensions." };
  }
  if (depth && depth > room.shortest) {
    return { allowed: false, score: 0, reason: "Too deep for the supplied room dimensions." };
  }

  if (width && depth) {
    return { allowed: true, score: 12, reason: "No room-envelope conflict found; layout, clearance and delivery access are still unverified." };
  }
  return { allowed: true, score: 7, reason: "No obvious fit conflict, but some product dimensions are missing." };
}

function freshnessScore(lastCheckedAt: string) {
  const ageMs = Date.now() - new Date(lastCheckedAt).getTime();
  if (!Number.isFinite(ageMs)) return 0;
  const days = ageMs / 86_400_000;
  if (days <= 1) return 5;
  if (days <= 3) return 4;
  if (days <= 7) return 2;
  return 0;
}

function scoreCandidate(
  candidate: SelectionCandidate,
  intake: IntakeForBrief,
  slotBudgetMinor: number,
) {
  if (!Number.isSafeInteger(candidate.offer.priceMinor) || candidate.offer.priceMinor <= 0 || candidate.offer.priceMinor > slotBudgetMinor) return null;
  const terms = intake.dislikes.toLowerCase();
  const tags = [...candidate.materials, ...candidate.colours, candidate.brandName || '', candidate.offer.retailerName].map(normalize).filter(Boolean);
  if (tags.some(tag => terms.includes(tag.replace(/-/g, ' ')))) return null;

  const wantedStyles = mapped(intake.styles, STYLE_ALIASES);
  const wantedColours = mapped(intake.colours, COLOUR_ALIASES);
  const wantedMaterials = mapped(intake.materials, MATERIAL_ALIASES);

  const styleMatches = candidate.styles.filter((style) => wantedStyles.includes(style)).length;
  const colourMatches = candidate.colours.filter((colour) => wantedColours.includes(colour)).length;
  const materialMatches = candidate.materials.filter((material) => wantedMaterials.includes(material)).length;

  const styleScore = wantedStyles.length ? Math.min(25, (styleMatches / wantedStyles.length) * 25) : 12;
  const colourScore = wantedColours.length ? Math.min(13, (colourMatches / wantedColours.length) * 13) : 6;
  const materialScore = wantedMaterials.length ? Math.min(10, (materialMatches / wantedMaterials.length) * 10) : 5;

  const priceRatio = candidate.offer.priceMinor / Math.max(slotBudgetMinor, 1);
  const budgetScore = priceRatio <= 0.78 ? 12 : priceRatio <= 1 ? 15 : priceRatio <= 1.12 ? 8 : 0;

  const fit = dimensionFit(candidate, intake);
  if (!fit.allowed) return null;

  const qualityScore = (candidate.qualityScore / 100) * 9;
  const curationScore = (candidate.curationScore / 100) * 8;
  const freshScore = freshnessScore(candidate.offer.lastCheckedAt);
  const availabilityScore = candidate.offer.availability === "in_stock" ? 3 : candidate.offer.availability === "low_stock" ? 2 : 1;

  const reasons = [
    styleMatches ? `Matches ${styleMatches} selected style signal${styleMatches === 1 ? "" : "s"}.` : "Chosen for overall catalogue fit rather than an exact style tag.",
    colourMatches ? "Works with the selected colour direction." : "Check the colour against your preferred palette.",
    materialMatches ? "Uses one or more preferred materials." : "Check the material against your practical needs.",
    fit.reason,
    candidate.offer.availability === "in_stock" ? "Listed in stock when last checked; confirm your postcode with the retailer." : "Listed as orderable when last checked; confirm delivery with the retailer.",
  ];

  return {
    score: Math.round(styleScore + colourScore + materialScore + budgetScore + fit.score + qualityScore + curationScore + freshScore + availabilityScore),
    reasons,
  };
}

function eligibleForSlot(candidate: SelectionCandidate, category: string) {
  const age = Date.now() - Date.parse(candidate.offer.lastCheckedAt);
  return candidate.clearedForSelection === true && !!candidate.image && !!candidate.variantName && !!candidate.commercial
    && /^https:\/\//.test(candidate.offer.productUrl)
    && Number.isFinite(age) && age >= 0 && age <= 7 * 86400000
    && candidate.category === category
    && ["in_stock", "low_stock", "preorder"].includes(candidate.offer.availability)
    && ["available", "restricted"].includes(candidate.offer.ukDeliveryStatus);
}

function chooseAlternative(
  kind: ProductAlternative["kind"],
  selected: { candidate: SelectionCandidate; score: number },
  ranked: Array<{ candidate: SelectionCandidate; score: number; reasons: string[] }>,
) {
  const selectedPrice = selected.candidate.offer.priceMinor;

  const filtered = ranked.filter(({ candidate }) => {
    if (candidate.variantId === selected.candidate.variantId) return false;
    if (kind === "cheaper") return candidate.offer.priceMinor <= selectedPrice * 0.88;
    if (kind === "premium") return candidate.offer.priceMinor >= selectedPrice * 1.12 && candidate.offer.priceMinor <= selectedPrice * 1.8;
    return candidate.offer.priceMinor >= selectedPrice * 0.82 && candidate.offer.priceMinor <= selectedPrice * 1.18;
  });

  const best = filtered[0];
  return best ? { kind, candidate: best.candidate, score: best.score, reasons: best.reasons } : null;
}

export function buildProductSelection(
  intake: IntakeForBrief,
  brief: DesignBrief,
  candidates: SelectionCandidate[],
): ProductSelection {
  const slots = intake.roomType === 'bedroom' ? [] : buildSlots(intake, brief);
  const usedProducts = new Set<string>();
  const products: ProposedProduct[] = [];

  for (const slot of slots) {
    const ranked = candidates
      .filter((candidate) => eligibleForSlot(candidate, slot.category))
      .map((candidate) => {
        const result = scoreCandidate(candidate, intake, slot.budgetMinor);
        return result ? { candidate, ...result } : null;
      })
      .filter((item): item is { candidate: SelectionCandidate; score: number; reasons: string[] } => Boolean(item))
      .sort((a, b) => b.score - a.score || a.candidate.offer.priceMinor - b.candidate.offer.priceMinor);

    const selected = ranked.find(({ candidate }) => !usedProducts.has(candidate.productId));
    if (!selected) continue;

    usedProducts.add(selected.candidate.productId);

    const alternatives = (["cheaper", "similar", "premium"] as const)
      .map((kind) => chooseAlternative(kind, selected, ranked))
      .filter((item): item is ProductAlternative => Boolean(item))
      .filter((item, index, all) => all.findIndex(other => other.candidate.variantId === item.candidate.variantId) === index);

    products.push({
      quantity: 1,
      slot: slot.category,
      slotLabel: slot.label,
      budgetMinor: slot.budgetMinor,
      selected: selected.candidate,
      score: selected.score,
      reasons: selected.reasons,
      alternatives,
    });
  }

  const budgetMinor = intake.budget * 100;

  return {
    version: 2,
    missingItems: [...slots.filter(slot => !products.some(product => product.slot === slot.category)).map(slot => slot.label), ...intake.change.filter(item => !SLOT_DEFINITIONS.some(slot => slot.keywords.some(keyword => normalize(item).includes(keyword)) || (normalize(item) === 'lighting' && slot.category.includes('lamps'))))],
    ...selectionTotals(products, budgetMinor),
    createdAt: new Date().toISOString(),
    budgetMinor,
    catalogueCandidates: candidates.length,
    retainedItems: [...new Set([...intake.keep, ...(intake.retainedFurniture || []).map(item => item.label)])],
    requirements: intake.uses,
    products,
    notes: [
      ...(candidates.some(item => !Number.isSafeInteger(item.offer.priceMinor) || item.offer.priceMinor <= 0) ? ['Products with missing or invalid prices have been left out. Their cost is not included in this total.'] : []),
      ...(intake.dislikes.trim() ? ['Your exclusions: ' + intake.dislikes + '. Tagged matches are excluded; check any requirements not covered by the product details.'] : []),
      "Only products cleared for photography display and the real-product pilot are included. Prices and stock can change.",
      "Selection happens before image generation, so changing products costs no design credits.",
      "Room and product dimensions do not verify layout, walkways, assembly or delivery access. Measure before buying.",
    ],
  };
}

export function selectionTotals(products: ProposedProduct[], budgetMinor: number) {
  const productSubtotalMinor = products.reduce((sum, product) => sum + product.selected.offer.priceMinor * product.quantity, 0);
  let knownDeliveryMinor = 0;
  let unknownDelivery = false;
  const retailers = new Map<string, ProposedProduct[]>();
  for (const product of products) retailers.set(product.selected.offer.retailerSlug, [...(retailers.get(product.selected.offer.retailerSlug) || []), product]);
  for (const group of retailers.values()) {
    if (group.some(item => item.selected.offer.deliveryPriceMinor === null || !Number.isSafeInteger(item.selected.offer.deliveryPriceMinor) || item.selected.offer.deliveryPriceMinor! < 0 || !item.selected.commercial || item.selected.commercial.deliveryBasis === 'unknown')) {
      unknownDelivery = true; continue;
    }
    if (group.every(item => item.selected.commercial!.deliveryBasis === 'per_unit')) {
      knownDeliveryMinor += group.reduce((sum, item) => sum + item.selected.offer.deliveryPriceMinor! * item.quantity, 0);
    } else if (group.every(item => item.selected.commercial!.deliveryBasis === 'per_order' && item.selected.offer.deliveryPriceMinor === group[0].selected.offer.deliveryPriceMinor)) {
      knownDeliveryMinor += group[0].selected.offer.deliveryPriceMinor!;
    } else { unknownDelivery = true; }
  }
  const totalMinor = productSubtotalMinor + knownDeliveryMinor;
  return { productSubtotalMinor, knownDeliveryMinor, unknownDelivery, totalMinor, remainingMinor: budgetMinor - totalMinor };
}

export type SelectionChoice = { slot: string; variantId: string; quantity: number };
export function applySelectionChoices(selection: ProductSelection, choices: SelectionChoice[]) {
  if (choices.length > 15 || new Set(choices.map(item => item.slot)).size !== choices.length) throw new Error('Invalid product choices.');
  for (const choice of choices) {
    const product = selection.products.find(item => item.slot === choice.slot);
    if (!product || !Number.isInteger(choice.quantity) || choice.quantity < 1 || choice.quantity > 10) throw new Error('Your saved collection has changed. Please review a fresh recommendation.');
    if (choice.variantId !== product.selected.variantId) {
      const alternative = product.alternatives.find(item => item.candidate.variantId === choice.variantId);
      if (!alternative) throw new Error('A selected variant is no longer available for this brief. Please refresh the collection.');
      const previous = { kind: alternative.kind, candidate: product.selected, score: product.score, reasons: product.reasons };
      product.selected = alternative.candidate;
      product.score = alternative.score;
      product.reasons = alternative.reasons;
      product.alternatives = [previous, ...product.alternatives.filter(item => item.candidate.variantId !== choice.variantId)].slice(0, 3);
    }
    product.quantity = choice.quantity;
  }
  return { ...selection, ...selectionTotals(selection.products, selection.budgetMinor) };
}

/** Material changes require another review even if two price changes cancel out. */
export function approvalSnapshot(selection: ProductSelection) {
  return JSON.stringify({ totalMinor: selection.totalMinor, missingItems: selection.missingItems, unknownDelivery: selection.unknownDelivery, products: selection.products.map(product => ({ slot: product.slot, quantity: product.quantity, variant: product.selected.variantId, offer: product.selected.offer, dimensions: product.selected.dimensions, commercial: product.selected.commercial, image: product.selected.image })) });
}
