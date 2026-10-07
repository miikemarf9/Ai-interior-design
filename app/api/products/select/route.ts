import { NextResponse } from "next/server";
import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import { getLiveSelectionCandidates } from "@/lib/catalog/repository";
import { buildProductSelection } from "@/lib/catalog/selection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      intake?: IntakeForBrief;
      brief?: DesignBrief;
    };

    if (!body.intake || !body.brief) {
      return NextResponse.json({ error: "Approved intake and brief are required." }, { status: 400 });
    }

    const candidates = await getLiveSelectionCandidates();
    const selection = buildProductSelection(body.intake, body.brief, candidates);

    return NextResponse.json({
      selection,
      source: "live-neon-catalogue",
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
