import { NextResponse } from "next/server";
import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import { getLiveSelectionCandidates } from "@/lib/catalog/repository";
import { applySelectionChoices, approvalSnapshot, buildProductSelection, selectionTotals, type SelectionChoice } from "@/lib/catalog/selection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      intake?: IntakeForBrief;
      brief?: DesignBrief;
      choices?: SelectionChoice[];
      approve?: boolean;
      acknowledgeLimitations?: boolean;
      expectedSnapshot?: string;\n      includedSlots?: string[];
    };

    if (body.intake?.roomType === 'bedroom') return NextResponse.json({ error: 'Bedroom briefs can be saved, but bedroom product selection is not available yet.' }, { status: 409 });
    if (!body.intake || !body.brief) {
      return NextResponse.json({ error: "Approved intake and brief are required." }, { status: 400 });
    }

    if (!Array.isArray(body.intake.keep) || !Array.isArray(body.intake.change) || !Array.isArray(body.intake.styles) || !Array.isArray(body.intake.uses) || !Array.isArray(body.intake.colours) || !Array.isArray(body.intake.materials) || !body.intake.measurements || typeof body.intake.dislikes !== 'string' || !Number.isFinite(body.intake.budget) || body.intake.budget <= 0 || typeof body.brief.keep !== 'string') {
      return NextResponse.json({ error: 'Please review your room answers before selecting furniture.' }, { status: 400 });
    }
    const candidates = await getLiveSelectionCandidates();
    let selection = buildProductSelection(body.intake, body.brief, candidates);
    try {
      if (body.choices) selection = applySelectionChoices(selection, body.choices, candidates);
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
    const approved = Boolean(body.approve && body.acknowledgeLimitations && selection.products.length && selection.remainingMinor >= 0 && body.expectedSnapshot === approvalSnapshot(selection));
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
