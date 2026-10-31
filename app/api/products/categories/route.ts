import { NextResponse } from "next/server";
import { getLiveSelectionCandidates } from "@/lib/catalog/repository";

export const runtime = "nodejs";

type ItemDefinition = { label: string; categories: string[]; recommended: boolean };

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
  const roomType = new URL(request.url).searchParams.get("roomType") || "living_room";
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

    const definitions = roomType === "living_room" ? livingRoomItems : bedroomItems;
    const items = definitions.map(definition => {
      const count = current.filter(candidate => definition.categories.includes(candidate.category)).length;
      return { label: definition.label, recommended: definition.recommended, available: count > 0, count };
    });
    return NextResponse.json({ roomType, items });
  } catch (error) {
    console.error("Room product categories failed", error);
    return NextResponse.json({ error: "We could not check the reviewed product list." }, { status: 500 });
  }
}
