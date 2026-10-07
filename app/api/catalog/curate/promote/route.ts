import { NextResponse } from "next/server";
import { promoteFeedCandidate } from "@/lib/catalog/ingest/promote";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CATALOG_IMPORT_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json() as { candidateIds?: string[] };
  const candidateIds = [...new Set(body.candidateIds ?? [])].slice(0, 50);

  if (!candidateIds.length) {
    return NextResponse.json({ error: "candidateIds is required." }, { status: 400 });
  }

  const promoted = [];
  const rejected = [];

  for (const candidateId of candidateIds) {
    try {
      const result = await promoteFeedCandidate(candidateId);
      if (result) promoted.push(result);
      else rejected.push({ candidateId, reason: "Candidate did not pass the promotion gate." });
    } catch (error) {
      rejected.push({
        candidateId,
        reason: error instanceof Error ? error.message : "Promotion failed.",
      });
    }
  }

  return NextResponse.json({
    requested: candidateIds.length,
    promoted,
    rejected,
  });
}
