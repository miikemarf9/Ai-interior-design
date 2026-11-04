import { NextResponse } from "next/server";
import { getLiveSelectionCandidates } from "@/lib/catalog/repository";
import type { SelectionCandidate } from "@/lib/catalog/selection";

export const runtime = "nodejs";

const PAIR_OPTION_LIMIT = 6;

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
    const usedPairIds = new Set<string>();
    const primaryCounts = new Map<string, number>();
    const companionCounts = new Map<string, number>();
    const primaryCompanions = new Set<string>();
    const addPair = (pair: (typeof ranked)[number]) => {
      const primaryId = pair.items[0].productId;
      const companionId = pair.items[1].productId;
      if (usedPairIds.has(pair.id)) return false;
      pairs.push(pair);
      usedPairIds.add(pair.id);
      primaryCounts.set(primaryId, (primaryCounts.get(primaryId) || 0) + 1);
      companionCounts.set(companionId, (companionCounts.get(companionId) || 0) + 1);
      primaryCompanions.add(`${primaryId}:${companionId}`);
      return true;
    };

    // First show the best match for each distinct sofa, paired with a different
    // type of companion furniture where the live catalogue allows it.
    for (const pair of ranked) {
      const primaryId = pair.items[0].productId;
      if ((primaryCounts.get(primaryId) || 0) > 0) continue;
      if (pairs.some(existing => existing.items[1].category === pair.items[1].category)) continue;
      addPair(pair);
      if (pairs.length === Math.min(PAIR_OPTION_LIMIT, new Set(ranked.map(option => option.items[0].productId)).size)) break;
    }

    // Fill the remaining options with a second, distinct combination per sofa
    // and keep companion pieces balanced across the set.
    const primaryIds = [...new Set(ranked.map(pair => pair.items[0].productId))];
    for (const primaryId of primaryIds) {
      if (pairs.length >= PAIR_OPTION_LIMIT) break;
      const next = ranked.find(pair => pair.items[0].productId === primaryId
        && !usedPairIds.has(pair.id)
        && !primaryCompanions.has(`${primaryId}:${pair.items[1].productId}`)
        && (primaryCounts.get(primaryId) || 0) < 2
        && (companionCounts.get(pair.items[1].productId) || 0) < 2);
      if (next) addPair(next);
    }

    // If stock or compatibility limits leave fewer than six after balancing,
    // use the remaining distinct high-scoring combinations.
    for (const pair of ranked) {
      if (pairs.length >= PAIR_OPTION_LIMIT) break;
      if (!usedPairIds.has(pair.id)) addPair(pair);
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
