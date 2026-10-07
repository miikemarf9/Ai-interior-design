import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { Availability, ProductDimensions, UkDeliveryStatus } from "@/lib/catalog/types";

export type SelectionCandidate = {
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
  slot: string;
  slotLabel: string;
  budgetMinor: number;
  selected: SelectionCandidate;
  score: number;
  reasons: string[];
  alternatives: ProductAlternative[];
};

export type ProductSelection = {
  version: 1;
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
  return [...intake.keep, brief.keep].join(" ").toLowerCase();
}

function shouldSkipForRetention(slot: SlotDefinition, retained: string) {
  return slot.keywords.some((keyword) => retained.includes(keyword));
}

function buildSlots(intake: IntakeForBrief, brief: DesignBrief) {
  const retained = retainedText(intake, brief);
  const needs = new Set(intake.uses.map(normalize));

  const eligible = SLOT_DEFINITIONS.filter((slot) => {
    if (shouldSkipForRetention(slot, retained)) return false;

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

  if (width && width > room.longest) {
    return { allowed: false, score: 0, reason: "Too wide for the supplied room dimensions." };
  }
  if (depth && depth > room.shortest) {
    return { allowed: false, score: 0, reason: "Too deep for the supplied room dimensions." };
  }

  if (width && depth) {
    return { allowed: true, score: 12, reason: "Dimensions fit within the supplied room envelope." };
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
  if (candidate.offer.priceMinor > slotBudgetMinor) return null;

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
    colourMatches ? "Works with the selected colour direction." : "Colour is compatible rather than an exact palette match.",
    materialMatches ? "Uses one or more preferred materials." : "Material choice does not conflict with the brief.",
    fit.reason,
    candidate.offer.availability === "in_stock" ? "Currently in stock with UK delivery." : "Currently orderable with UK delivery.",
  ];

  return {
    score: Math.round(styleScore + colourScore + materialScore + budgetScore + fit.score + qualityScore + curationScore + freshScore + availabilityScore),
    reasons,
  };
}

function eligibleForSlot(candidate: SelectionCandidate, category: string) {
  return candidate.category === category
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
  const slots = buildSlots(intake, brief);
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
      .filter((item): item is ProductAlternative => Boolean(item));

    products.push({
      slot: slot.category,
      slotLabel: slot.label,
      budgetMinor: slot.budgetMinor,
      selected: selected.candidate,
      score: selected.score,
      reasons: selected.reasons,
      alternatives,
    });
  }

  const totalMinor = products.reduce((sum, product) => sum + product.selected.offer.priceMinor, 0);
  const budgetMinor = intake.budget * 100;

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    totalMinor,
    budgetMinor,
    remainingMinor: budgetMinor - totalMinor,
    catalogueCandidates: candidates.length,
    retainedItems: intake.keep,
    requirements: intake.uses,
    products,
    notes: [
      "Only active, curated catalogue products with a live UK offer are eligible.",
      "Selection happens before image generation, so changing products costs no design credits.",
      "A product set is not considered render-ready until every selected item is accepted.",
    ],
  };
}
