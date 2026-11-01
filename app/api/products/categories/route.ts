import { NextResponse } from "next/server";
import { getLiveSelectionCandidates } from "@/lib/catalog/repository";

export const runtime = "nodejs";

type ItemDefinition = { label: string; categories: string[]; recommended: boolean };

type StyleDefinition = { name: string; slug: string };

const livingRoomStyles: StyleDefinition[] = [
  { name: "Modern Organic", slug: "warm-minimal" },
  { name: "Modern Country", slug: "modern-british" },
  { name: "Japandi", slug: "scandi" },
  { name: "Mid-Century Modern", slug: "mid-century" },
  { name: "Bold & Colourful", slug: "colourful" },
  { name: "Contemporary Classic", slug: "classic" },
];

const livingRoomItems: ItemDefinition[] = [
  { label: "Sofa", categories: ["sofas"], recommended: true },
  { label: "Armchairs", categories: ["armchairs"], recommended: true },
  { label: "Coffee table", categories: ["coffee-tables"], recommended: true },
  { label: "TV unit", categories: ["tv-units"], recommended: true },
  { label: "Side tables", categories: ["side-tables"], recommended: false },
  { label: "Rug", categories: ["rugs"], recommended: true },
  { label: "Lighting", categories: ["floor-lamps", "table-lamps"], recommended: true },
  { label: "Storage", categories: ["storage-cabinets"], recommended: false },
];

const bedroomItems: ItemDefinition[] = [
  { label: "Bed", categories: ["beds", "bed-frames"], recommended: true },
  { label: "Bedside tables", categories: ["bedside-tables"], recommended: true },
  { label: "Wardrobe", categories: ["wardrobes"], recommended: true },
  { label: "Chest of drawers", categories: ["chest-of-drawers"], recommended: true },
  { label: "Rug", categories: ["rugs"], recommended: true },
  { label: "Lighting", categories: ["floor-lamps", "table-lamps"], recommended: true },
];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const roomType = params.get("roomType") || "living_room";
  if (roomType !== "living_room" && roomType !== "bedroom") {
    return NextResponse.json({ error: "Choose a living room or bedroom." }, { status: 400 });
  }

  try {
    const candidates = roomType === "living_room" ? await getLiveSelectionCandidates() : [];
    const now = Date.now();
    const current = candidates.filter(item => item.clearedForSelection === true
      && item.image
      && Number.isSafeInteger(item.offer.priceMinor)
      && item.offer.priceMinor > 0
      && ["in_stock", "low_stock", "preorder"].includes(item.offer.availability)
      && ["available", "restricted"].includes(item.offer.ukDeliveryStatus)
      && Number.isFinite(Date.parse(item.offer.lastCheckedAt))
      && now - Date.parse(item.offer.lastCheckedAt) >= 0
      && now - Date.parse(item.offer.lastCheckedAt) <= 7 * 86400000);

    const styleSlugs: Record<string, string> = {
      "Modern Organic": "warm-minimal",
      "Modern Country": "modern-british",
      Japandi: "scandi",
      "Mid-Century Modern": "mid-century",
      "Bold & Colourful": "colourful",
      "Contemporary Classic": "classic",
    };
    const wantedStyles = (params.get("styles") || "").split(",").map(value => styleSlugs[value.trim()]).filter(Boolean);
    const budget = Number(params.get("budget"));
    const maxPriceMinor = Number.isFinite(budget) && budget > 0 ? Math.round(budget * 100) : null;
    const roomWidth = positiveCm(params.get("roomWidthCm"));
    const roomLength = positiveCm(params.get("roomLengthCm"));
    const ceiling = positiveCm(params.get("ceilingCm"));
    const dislikes = (params.get("dislikes") || "").trim().toLowerCase();
    const hardFiltered = current.filter(item => {
      if (maxPriceMinor !== null && item.offer.priceMinor > maxPriceMinor) return false;
      if (roomWidth !== null && roomLength !== null) {
        const shortest = Math.min(roomWidth, roomLength) * 10;
        const longest = Math.max(roomWidth, roomLength) * 10;
        if (item.dimensions.widthMm && item.dimensions.widthMm > longest) return false;
        if (item.dimensions.depthMm && item.dimensions.depthMm > shortest) return false;
      }
      if (ceiling !== null && item.dimensions.heightMm && item.dimensions.heightMm > ceiling * 10) return false;
      if (dislikes) {
        const tags = [...item.materials, ...item.colours, item.brandName || "", item.offer.retailerName].map(value => value.toLowerCase());
        if (tags.some(tag => tag && dislikes.includes(tag.replace(/-/g, " ")))) return false;
      }
      return true;
    });
    const filtered = hardFiltered.filter(item =>
      !wantedStyles.length || item.styles.some(style => wantedStyles.includes(style))
    );

    const definitions = roomType === "living_room" ? livingRoomItems : bedroomItems;
    const items = definitions.map(definition => {
      const catalogueCount = current.filter(candidate => definition.categories.includes(candidate.category)).length;
      const count = filtered.filter(candidate => definition.categories.includes(candidate.category)).length;
      return { label: definition.label, recommended: definition.recommended, available: count > 0, count, catalogueCount };
    });
    const styles = (roomType === "living_room" ? livingRoomStyles : []).map(style => ({
      name: style.name,
      available: hardFiltered.some(candidate => candidate.styles.includes(style.slug)),
    }));
    return NextResponse.json({ roomType, items, styles });
  } catch (error) {
    console.error("Room product categories failed", error);
    return NextResponse.json({ error: "We could not check the reviewed product list." }, { status: 500 });
  }
}

function positiveCm(value: string | null) {
  const number = Number(value);
  return value && Number.isFinite(number) && number > 0 && number <= 5000 ? number : null;
}
