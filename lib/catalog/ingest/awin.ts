import type { Availability } from "@/lib/catalog/types";

export type FeedCandidate = {
  externalProductId: string;
  parentProductId: string | null;
  title: string;
  description: string | null;
  brandName: string | null;
  productUrl: string;
  affiliateUrl: string | null;
  imageUrl: string | null;
  additionalImages: string[];
  priceMinor: number | null;
  compareAtPriceMinor: number | null;
  currency: string;
  availability: Availability;
  stockQuantity: number | null;
  merchantCategory: string | null;
  categoryPath: string | null;
  colourText: string | null;
  materialText: string | null;
  dimensionsText: string | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  ean: string | null;
  mpn: string | null;
  sourceUpdatedAt: string | null;
  normalizedCategorySlug: string | null;
  inferredStyleSlugs: string[];
  inferredMaterialSlugs: string[];
  inferredColourSlugs: string[];
  qualityScore: number;
  raw: Record<string, unknown>;
};

const CATEGORY_RULES: Array<{ slug: string; terms: string[] }> = [
  { slug: "sofas", terms: ["sofa", "settee", "couch"] },
  { slug: "armchairs", terms: ["armchair", "accent chair", "lounge chair", "wing chair"] },
  { slug: "footstools-pouffes", terms: ["footstool", "ottoman", "pouffe"] },
  { slug: "coffee-tables", terms: ["coffee table"] },
  { slug: "side-tables", terms: ["side table", "end table", "lamp table"] },
  { slug: "tv-units", terms: ["tv unit", "tv stand", "media unit", "media console"] },
  { slug: "storage-cabinets", terms: ["sideboard", "cabinet", "cupboard", "storage cabinet"] },
  { slug: "shelving", terms: ["shelving", "shelf unit", "bookcase"] },
  { slug: "rugs", terms: ["rug"] },
  { slug: "floor-lamps", terms: ["floor lamp", "standard lamp"] },
  { slug: "table-lamps", terms: ["table lamp", "desk lamp"] },
  { slug: "ceiling-lighting", terms: ["ceiling light", "pendant light", "chandelier"] },
  { slug: "curtains-blinds", terms: ["curtain", "blind"] },
  { slug: "mirrors", terms: ["mirror"] },
  { slug: "artwork", terms: ["wall art", "art print", "canvas"] },
  { slug: "cushions", terms: ["cushion"] },
  { slug: "throws", terms: ["throw", "blanket"] },
];

const MATERIALS = ["oak", "walnut", "ash", "pine", "linen", "cotton", "velvet", "boucle", "wool", "leather", "rattan", "cane", "stone", "marble", "glass", "steel", "brass"];
const COLOURS: Array<[string, string[]]> = [
  ["warm-white", ["warm white", "ivory"]],
  ["cream", ["cream"]],
  ["beige", ["beige", "natural"]],
  ["taupe", ["taupe", "greige"]],
  ["brown", ["brown", "chocolate"]],
  ["black", ["black"]],
  ["charcoal", ["charcoal", "anthracite"]],
  ["grey", ["grey", "gray"]],
  ["olive", ["olive"]],
  ["forest-green", ["forest green", "dark green"]],
  ["sage", ["sage", "grey green", "gray green"]],
  ["navy", ["navy", "dark blue"]],
  ["dusty-blue", ["dusty blue", "pale blue"]],
  ["terracotta", ["terracotta", "rust"]],
  ["ochre", ["ochre", "mustard"]],
  ["burgundy", ["burgundy", "wine"]],
  ["dusty-pink", ["dusty pink", "blush", "rose"]],
];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function first(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function boolish(value: unknown) {
  const text = clean(value).toLowerCase();
  return ["1", "true", "yes", "y", "in_stock", "in stock"].includes(text);
}

function moneyMinor(value: unknown) {
  const text = clean(value).replace(/[^0-9.-]/g, "");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
}

function integer(value: unknown) {
  const number = Number(clean(value));
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function normalizeAvailability(row: Record<string, unknown>): Availability {
  const stockStatus = first(row.stock_status, row.availability).toLowerCase().replace(/\s+/g, "_");
  if (["in_stock", "low_stock", "preorder", "backorder", "out_of_stock"].includes(stockStatus)) return stockStatus as Availability;
  if (boolish(row.pre_order)) return "preorder";
  if (clean(row.in_stock)) return boolish(row.in_stock) ? "in_stock" : "out_of_stock";
  return "unknown";
}

function mapCategory(text: string) {
  const haystack = text.toLowerCase();
  return CATEGORY_RULES.find((rule) => rule.terms.some((term) => haystack.includes(term)))?.slug ?? null;
}

function inferMaterials(text: string) {
  const haystack = text.toLowerCase().replace(/bouclé/g, "boucle");
  return MATERIALS.filter((material) => haystack.includes(material));
}

function inferColours(text: string) {
  const haystack = text.toLowerCase();
  return COLOURS.filter(([, terms]) => terms.some((term) => haystack.includes(term))).map(([slug]) => slug);
}

function inferStyles(text: string) {
  const haystack = text.toLowerCase();
  const styles = new Set<string>();
  if (/mid[- ]?century|retro|1960|1970|tapered leg/.test(haystack)) styles.add("mid-century");
  if (/scandi|scandinavian|nordic|pale oak|light oak/.test(haystack)) styles.add("scandi");
  if (/industrial|black steel|metal frame|reclaimed/.test(haystack)) styles.add("industrial");
  if (/traditional|classic|chesterfield|button back|wingback/.test(haystack)) styles.add("classic");
  if (/contemporary|modern|clean line|sleek/.test(haystack)) styles.add("contemporary");
  if (/boucle|bouclé|warm neutral|natural texture|soft beige|minimal/.test(haystack)) styles.add("warm-minimal");
  if (/colourful|colorful|statement colour|statement color|bold colour|bold color/.test(haystack)) styles.add("colourful");
  if (/heritage|british|tailored|turned leg/.test(haystack)) styles.add("modern-british");
  return [...styles];
}

function unitToMm(value: number, unit: string) {
  if (unit.startsWith("mm")) return Math.round(value);
  if (unit.startsWith("cm")) return Math.round(value * 10);
  if (unit.startsWith("in")) return Math.round(value * 25.4);
  if (unit === "m") return Math.round(value * 1000);
  return null;
}

export function parseDimensions(text: string | null) {
  if (!text) return { widthMm: null, heightMm: null, depthMm: null };

  const labelled = (label: string) => {
    const match = text.match(new RegExp(`${label}\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*(mm|cm|inches|inch|in|m)\\b`, "i"));
    return match ? unitToMm(Number(match[1]), match[2].toLowerCase()) : null;
  };

  const widthMm = labelled("width|w");
  const heightMm = labelled("height|h");
  const depthMm = labelled("depth|d|length|l");

  if (widthMm || heightMm || depthMm) return { widthMm, heightMm, depthMm };

  const compact = text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|inches|inch|in|m)\b/i);
  if (compact) {
    return {
      widthMm: unitToMm(Number(compact[1]), compact[4].toLowerCase()),
      depthMm: unitToMm(Number(compact[2]), compact[4].toLowerCase()),
      heightMm: unitToMm(Number(compact[3]), compact[4].toLowerCase()),
    };
  }

  const two = text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|inches|inch|in|m)\b/i);
  if (two) {
    return {
      widthMm: unitToMm(Number(two[1]), two[3].toLowerCase()),
      depthMm: unitToMm(Number(two[2]), two[3].toLowerCase()),
      heightMm: null,
    };
  }

  return { widthMm: null, heightMm: null, depthMm: null };
}

function qualityScore(candidate: Omit<FeedCandidate, "qualityScore" | "raw">) {
  let score = 0;
  if (candidate.normalizedCategorySlug) score += 18;
  if (candidate.imageUrl) score += 18;
  if (candidate.priceMinor !== null && candidate.currency === "GBP") score += 14;
  if (["in_stock", "low_stock", "preorder"].includes(candidate.availability)) score += 10;
  if (candidate.productUrl) score += 8;
  if (candidate.affiliateUrl) score += 8;
  if (candidate.brandName) score += 5;
  if (candidate.description && candidate.description.length > 40) score += 5;
  if (candidate.widthMm || candidate.heightMm || candidate.depthMm) score += 7;
  if (candidate.inferredStyleSlugs.length) score += 4;
  if (candidate.inferredMaterialSlugs.length) score += 2;
  if (candidate.inferredColourSlugs.length) score += 1;
  return Math.min(score, 100);
}

export function normalizeLegacyAwinRow(row: Record<string, unknown>): FeedCandidate | null {
  const externalProductId = first(row.merchant_product_id, row.aw_product_id, row.ean, row.mpn);
  const title = first(row.product_name);
  const productUrl = first(row.merchant_deep_link, row.aw_deep_link);
  if (!externalProductId || !title || !productUrl) return null;

  const description = first(row.description, row.product_short_description) || null;
  const categoryPath = first(row.merchant_product_category_path, row.merchant_category, row.category_name) || null;
  const colourText = first(row.colour) || null;
  const materialText = first(row.material, row.specifications) || null;
  const dimensionsText = first(row.dimensions, row.specifications) || null;
  const searchText = [title, description, categoryPath, colourText, materialText, first(row.keywords)].filter(Boolean).join(" ");
  const dimensions = parseDimensions(dimensionsText);

  const base = {
    externalProductId,
    parentProductId: first(row.parent_product_id) || null,
    title,
    description,
    brandName: first(row.brand_name) || null,
    productUrl: first(row.merchant_deep_link, row.aw_deep_link),
    affiliateUrl: first(row.aw_deep_link) || null,
    imageUrl: first(row.large_image, row.merchant_image_url, row.aw_image_url) || null,
    additionalImages: [row.alternate_image, row.alternate_image_two, row.alternate_image_three].map(clean).filter(Boolean),
    priceMinor: moneyMinor(first(row.store_price, row.search_price)),
    compareAtPriceMinor: moneyMinor(first(row.rrp_price, row.product_price_old)),
    currency: (first(row.currency) || "GBP").toUpperCase(),
    availability: normalizeAvailability(row),
    stockQuantity: integer(row.stock_quantity),
    merchantCategory: first(row.merchant_category, row.category_name) || null,
    categoryPath,
    colourText,
    materialText,
    dimensionsText,
    ...dimensions,
    ean: first(row.ean, row.product_GTIN) || null,
    mpn: first(row.mpn, row.model_number) || null,
    sourceUpdatedAt: first(row.last_updated) || null,
    normalizedCategorySlug: mapCategory(searchText),
    inferredStyleSlugs: inferStyles(searchText),
    inferredMaterialSlugs: inferMaterials(searchText),
    inferredColourSlugs: inferColours(searchText),
  };

  return { ...base, qualityScore: qualityScore(base), raw: row };
}

export function isUsefulLivingRoomCandidate(candidate: FeedCandidate) {
  return Boolean(
    candidate.normalizedCategorySlug
    && candidate.qualityScore >= 55
    && candidate.priceMinor !== null
    && candidate.imageUrl
    && candidate.currency === "GBP"
    && ["in_stock", "low_stock", "preorder"].includes(candidate.availability),
  );
}
