import { NextResponse } from "next/server";
import { getLiveSelectionCandidates } from "@/lib/catalog/repository";
import type { SelectionCandidate } from "@/lib/catalog/selection";

export const runtime = "nodejs";

const pairCategories = [
  { first: "sofas", second: "coffee-tables", labels: ["Sofa", "Coffee table"] },
  { first: "sofas", second: "armchairs", labels: ["Sofa", "Armchairs"] },
  { first: "sofas", second: "tv-units", labels: ["Sofa", "TV unit"] },
] as const;

function current(candidate: SelectionCandidate, now: number) {
  const age = now - Date.parse(candidate.offer.lastCheckedAt);
  return candidate.clearedForSelection === true && !!candidate.image && !!candidate.variantName
    && Number.isSafeInteger(candidate.offer.priceMinor) && candidate.offer.priceMinor > 0
    && Number.isFinite(age) && age >= 0 && age <= 7 * 86400000
    && ["in_stock", "low_stock", "preorder"].includes(candidate.offer.availability)
    && ["available", "restricted"].includes(candidate.offer.ukDeliveryStatus);
}

function words(candidate: SelectionCandidate) {
  return [candidate.productName, candidate.variantName, candidate.designSummary, ...candidate.styles, ...candidate.materials, ...candidate.colours]
    .filter(Boolean).join(" ").toLowerCase();
}

function matchScore(a: SelectionCandidate, b: SelectionCandidate) {
  const sharedMaterials = a.materials.filter(value => b.materials.includes(value)).length;
  const sharedStyles = a.styles.filter(value => b.styles.includes(value)).length;
  const sharedColours = a.colours.filter(value => b.colours.includes(value)).length;
  const textA = words(a);
  const textB = words(b);
  const warmTimber = /oak|wood|timber|mango/.test(textA) && /oak|wood|timber|mango/.test(textB);
  const softNeutral = /beige|cream|tan|brown|neutral/.test(textA) && /beige|cream|tan|brown|neutral/.test(textB);
  const greenNeutral = (/green|olive/.test(textA) && /beige|cream|brown|neutral/.test(textB)) || (/green|olive/.test(textB) && /beige|cream|brown|neutral/.test(textA));
  const sharedTextiles = /chenille|corduroy|linen|boucle|bouclé|velvet/.test(textA) && /chenille|corduroy|linen|boucle|bouclé|velvet/.test(textB);
  return Math.min(sharedMaterials, 2) * 3 + Math.min(sharedStyles, 2) * 2 + Math.min(sharedColours, 2) * 2
    + (warmTimber ? 2 : 0) + (softNeutral ? 2 : 0) + (greenNeutral ? 2 : 0) + (sharedTextiles ? 2 : 0);
}

function item(candidate: SelectionCandidate) {
  return {
    productId: candidate.productId,
    variantId: candidate.variantId,
    category: candidate.category,
    name: candidate.productName,
    variantName: candidate.variantName,
    retailerName: candidate.offer.retailerName,
    priceMinor: candidate.offer.priceMinor,
    availability: candidate.offer.availability,
    lastCheckedAt: candidate.offer.lastCheckedAt,
    imageUrl: candidate.image?.url || "",
    imageAlt: candidate.image?.altText || candidate.productName,
    styles: candidate.styles,
    colours: candidate.colours,
    materials: candidate.materials,
  };
}

export async function GET() {
  try {
    const now = Date.now();
    const candidates = (await getLiveSelectionCandidates()).filter(candidate => current(candidate, now));
    const ranked = pairCategories.flatMap(definition => {
      const first = candidates.filter(candidate => candidate.category === definition.first);
      const second = candidates.filter(candidate => candidate.category === definition.second);
      return first.flatMap(a => second.filter(b => a.productId !== b.productId).map(b => ({
        id: [a.variantId, b.variantId].sort().join(":"),
        itemCategories: [...definition.labels],
        items: [a, b] as [SelectionCandidate, SelectionCandidate],
        score: matchScore(a, b),
      })));
    }).filter(pair => pair.score >= 2)
      .sort((a, b) => b.score - a.score || a.items.reduce((sum, value) => sum + value.offer.priceMinor, 0) - b.items.reduce((sum, value) => sum + value.offer.priceMinor, 0));

    const pairs: Array<(typeof ranked)[number]> = [];
    const usedPrimary = new Set<string>();
    const usedCategories = new Set<string>();
    for (const pair of ranked) {
      const category = pair.items[1].category;
      if (usedPrimary.has(pair.items[0].productId) || usedCategories.has(category)) continue;
      pairs.push(pair);
      usedPrimary.add(pair.items[0].productId);
      usedCategories.add(category);
      if (pairs.length === 3) break;
    }
    for (const pair of ranked) {
      if (pairs.length === 3) break;
      if (pairs.some(existing => existing.id === pair.id)) continue;
      pairs.push(pair);
    }

    return NextResponse.json({
      pairs: pairs.map(pair => {
        const [a, b] = pair.items;
        return {
          id: pair.id,
          title: `${a.variantName || a.productName} + ${b.variantName || b.productName}`,
          note: /green|olive/.test(words(a)) || /green|olive/.test(words(b)) ? "Forest green balances a soft neutral" : /oak|wood|timber|mango/.test(words(a)) || /oak|wood|timber|mango/.test(words(b)) ? "Warm timber grounds the upholstery tone" : "Shared colour and material cues keep the pair cohesive",
          itemCategories: pair.itemCategories,
          styles: [...new Set(a.styles.filter(value => b.styles.includes(value)))],
          colours: [...new Set([...a.colours, ...b.colours])],
          materials: [...new Set([...a.materials, ...b.materials])],
          totalMinor: a.offer.priceMinor + b.offer.priceMinor,
          items: pair.items.map(item),
        };
      }),
      checkedAt: new Date(now).toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Furniture pair suggestions failed", error);
    return NextResponse.json({ error: "We could not check current furniture matches." }, { status: 500 });
  }
}
