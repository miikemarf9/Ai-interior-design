import { NextResponse } from "next/server";
import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import { getLiveBrowseCandidates, getLiveSelectionCandidates } from "@/lib/catalog/repository";
import { applySelectionChoices, approvalSnapshot, buildProductSelection, selectionTotals, type SelectionCandidate, type SelectionChoice } from "@/lib/catalog/selection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      intake?: IntakeForBrief;
      brief?: DesignBrief;
      choices?: SelectionChoice[];
      approve?: boolean;
      acknowledgeLimitations?: boolean;
      expectedSnapshot?: string;
      includedSlots?: string[];
    };

    if (!body.intake || !body.brief) {
      return NextResponse.json({ error: "Approved intake and brief are required." }, { status: 400 });
    }

    if (!Array.isArray(body.intake.keep) || !Array.isArray(body.intake.change) || !Array.isArray(body.intake.styles) || !Array.isArray(body.intake.uses) || !Array.isArray(body.intake.colours) || !Array.isArray(body.intake.materials) || !body.intake.measurements || typeof body.intake.dislikes !== 'string' || !Number.isFinite(body.intake.budget) || body.intake.budget <= 0 || typeof body.brief.keep !== 'string') {
      return NextResponse.json({ error: 'Please review your room answers before selecting furniture.' }, { status: 400 });
    }
    const candidates = await getLiveSelectionCandidates();
    const addOnCandidates = Array.isArray(body.choices) && body.intake.roomType !== 'bedroom' ? await getLiveBrowseCandidates() : [];
    const choicePool = Array.from(new Map([...addOnCandidates, ...candidates].map(candidate => [candidate.variantId, candidate])).values());
    const pairIds = body.intake.furniturePair?.variantIds;
    const expectedPairSize = body.intake.roomType === 'bedroom' ? 5 : 2;
    const pairCandidates = Array.isArray(pairIds) && pairIds.length === expectedPairSize && pairIds.every(id => typeof id === 'string') && new Set(pairIds).size === expectedPairSize
      ? pairIds.map(id => candidates.find(candidate => candidate.variantId === id))
      : [];
    const selectedPairCandidates = pairCandidates.filter((candidate): candidate is SelectionCandidate => Boolean(candidate));
    const categorySet = new Set(selectedPairCandidates.map(candidate => candidate.category));
    const allowedBedroomPairIds = [
      ['e312b491-4e5b-43ab-bd44-eae161a0d473','7e8613e9-143f-46f4-99af-5471e60dd71a','93ee7d74-f20c-4220-97d0-727be2a719a9','326b9ca7-6adc-4d6c-b3fc-018f3b14d89f','ed465c6c-943f-43c9-8bdf-f0d9fc433915'],
      ['4d447bef-41f5-46a6-bf60-a4a8a724190f','9395dcd9-1017-4d37-a9c1-431b5d5758ba','04f33136-4360-4b06-bc27-dfe26e1278b0','d0abb5f3-7dd7-446d-b657-abedba17f3bf','4a75bc9d-bf27-4808-8b8a-ad5149cb5d5d'],
    ];
    const exactBedroomSet = body.intake.roomType !== 'bedroom' || allowedBedroomPairIds.some(set => set.length === pairIds?.length && set.every(id => pairIds?.includes(id)));
    const bedroomPairValid = body.intake.roomType === 'bedroom' && pairCandidates.length === 5 && selectedPairCandidates.length === 5
      && exactBedroomSet && categorySet.has('bed-frames') && categorySet.has('wardrobes')
      && categorySet.has('chest-of-drawers') && categorySet.has('dressing-tables')
      && (categorySet.has('bedside-tables') || categorySet.has('storage-cabinets'));
    const livingPairValid = body.intake.roomType === 'living_room' && pairCandidates.length === 2 && selectedPairCandidates.length === 2
      && selectedPairCandidates[0].category === 'sofas'
      && ['coffee-tables', 'armchairs', 'tv-units'].includes(selectedPairCandidates[1].category);
    const pairIsValid = bedroomPairValid || livingPairValid;
    if (body.intake.furniturePair && !pairIsValid) {
      return NextResponse.json({ error: 'That furniture group is no longer available. Refresh the catalogue and choose a current group.' }, { status: 409 });
    }
    const categoryLabels: Record<string, string> = {
      'coffee-tables': 'Coffee table', armchairs: 'Armchairs', 'tv-units': 'TV unit',
      'bed-frames': 'Bed', 'bedside-tables': 'Bedside tables', 'storage-cabinets': 'Bedside tables',
      wardrobes: 'Wardrobe', 'chest-of-drawers': 'Chest of drawers', 'dressing-tables': 'Dressing table',
    };
    const selectionIntake = pairIsValid
      ? { ...body.intake, change: [...new Set([...body.intake.change, ...selectedPairCandidates.map(candidate => categoryLabels[candidate.category] || candidate.categoryName)])] }
      : body.intake;
    let selection = buildProductSelection(selectionIntake, body.brief, candidates);
    try {
      if (pairIsValid) selection = applySelectionChoices(selection, selectedPairCandidates.map(candidate => ({ slot: candidate.category, variantId: candidate.variantId, quantity: 1 })), choicePool);
      if (body.choices) selection = applySelectionChoices(selection, body.choices, choicePool);
      if (body.includedSlots) {
        if (!Array.isArray(body.includedSlots) || body.includedSlots.length > 15 || new Set(body.includedSlots).size !== body.includedSlots.length || body.includedSlots.some(slot => typeof slot !== 'string')) {
          return NextResponse.json({ error: 'Please review which products you want to include.' }, { status: 400 });
        }
        selection.products = selection.products.filter(product => body.includedSlots!.includes(product.slot));
        Object.assign(selection, selectionTotals(selection.products, selection.budgetMinor));
      }
    } catch (error) {
      return NextResponse.json({ selection, approved: false, warning: error instanceof Error ? error.message : 'Please review the refreshed collection.' });
    }
    const approved = Boolean(body.approve && body.acknowledgeLimitations && selection.products.length && body.expectedSnapshot === approvalSnapshot(selection));
    const warning = body.approve && !approved ? 'Please review the refreshed prices and collection, acknowledge the outstanding checks and approve again.' : undefined;

    return NextResponse.json({
      selection,
      approved,
      warning,
      source: "cleared-catalogue",
      renderCreditsUsed: 0,
    });
  } catch (error) {
    console.error("Product selection failed", error);
    return NextResponse.json(
      { error: "We could not build the product set from the live catalogue." },
      { status: 500 },
    );
  }
}
