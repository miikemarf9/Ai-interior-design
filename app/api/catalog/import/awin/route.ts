import { NextResponse } from "next/server";
import { isUsefulLivingRoomCandidate, normalizeLegacyAwinRow, type FeedCandidate } from "@/lib/catalog/ingest/awin";
import { readCsvObjects } from "@/lib/catalog/ingest/csv";
import { getFeedSource, rejectFeedCandidates, stageFeedCandidates } from "@/lib/catalog/ingest/stage";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";
export const maxDuration = 60;

const PER_CATEGORY_LIMIT = 80;
const SCAN_LIMIT = 1_000;

async function decompressGzipIfNeeded(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const first = await reader.read();
  if (first.done) {
    return new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } });
  }

  const prefix = first.value;
  const replay = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(prefix);
    },
    async pull(controller) {
      const next = await reader.read();
      if (next.done) controller.close();
      else controller.enqueue(next.value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  if (prefix.length >= 2 && prefix[0] === 0x1f && prefix[1] === 0x8b) {
    return replay.pipeThrough(new DecompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  }

  return replay;
}

function authorized(request: Request) {
  const secret = process.env.CATALOG_IMPORT_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json() as { retailerSlug?: string };
  const retailerSlug = body.retailerSlug?.trim();
  if (!retailerSlug) {
    return NextResponse.json({ error: "retailerSlug is required." }, { status: 400 });
  }

  const source = await getFeedSource(retailerSlug);
  if (!source) {
    return NextResponse.json({ error: "No active affiliate feed source exists for this retailer." }, { status: 404 });
  }

  const secretEnv = typeof source.public_config.secret_env === "string"
    ? source.public_config.secret_env
    : null;
  const feedUrl = secretEnv ? process.env[secretEnv] : null;

  if (!feedUrl) {
    return NextResponse.json({
      error: `Feed credential is not configured. Expected server env: ${secretEnv ?? "unknown"}.`,
    }, { status: 409 });
  }

  const sql = getCatalogDb();
  const runRows = await sql.query(
    `insert into public.catalog_sync_runs (source_id, status)
     values ($1::uuid, 'running')
     returning id::text as id`,
    [source.source_id],
  ) as Array<{ id: string }>;
  const runId = runRows[0].id;

  let scanned = 0;
  let accepted = 0;
  let mappedRows = 0;
  let withCategory = 0;
  let withPrice = 0;
  let withImage = 0;
  let withGbp = 0;
  let available = 0;
  let qualityAtLeast55 = 0;
  let sampleColumns: string[] = [];
  const byCategory = new Map<string, FeedCandidate[]>();
  const ineligibleExternalIds: string[] = [];

  try {
    const response = await fetch(feedUrl, {
      headers: { "user-agent": "RoomfoundCatalog/1.0" },
      cache: "no-store",
    });
    if (!response.ok || !response.body) {
      throw new Error(`Awin feed returned HTTP ${response.status}`);
    }

    const csvBody = await decompressGzipIfNeeded(response.body);
    for await (const row of readCsvObjects(csvBody)) {
      scanned += 1;
      if (sampleColumns.length === 0) sampleColumns = Object.keys(row);
      if (scanned > SCAN_LIMIT) break;

      const candidate = normalizeLegacyAwinRow(row);
      if (!candidate) continue;
      mappedRows += 1;
      if (candidate.normalizedCategorySlug) withCategory += 1;
      if (candidate.priceMinor !== null) withPrice += 1;
      if (candidate.imageUrl) withImage += 1;
      if (candidate.currency === "GBP") withGbp += 1;
      if (["in_stock", "low_stock", "preorder"].includes(candidate.availability)) available += 1;
      if (candidate.qualityScore >= 55) qualityAtLeast55 += 1;

      if (!isUsefulLivingRoomCandidate(candidate) || !candidate.normalizedCategorySlug) {
        ineligibleExternalIds.push(candidate.externalProductId);
        continue;
      }

      const bucket = byCategory.get(candidate.normalizedCategorySlug) ?? [];
      if (bucket.length >= PER_CATEGORY_LIMIT) continue;
      bucket.push(candidate);
      byCategory.set(candidate.normalizedCategorySlug, bucket);
      accepted += 1;
    }

    const candidates = [...byCategory.values()].flat();
    const staged = await stageFeedCandidates(source, candidates);
    const rejected = await rejectFeedCandidates(source, ineligibleExternalIds);

    await sql.query(
      `update public.catalog_sync_runs
       set status='succeeded',
           finished_at=now(),
           records_seen=$2,
           records_inserted=$3,
           metadata=jsonb_build_object('retailer_slug',$4::text,'category_counts',$5::jsonb)
       where id=$1::uuid`,
      [runId, scanned, staged, retailerSlug, JSON.stringify(Object.fromEntries([...byCategory].map(([key, value]) => [key, value.length])))],
    );

    await sql.query(
      `update public.catalog_sources
       set last_sync_started_at=coalesce(last_sync_started_at, now()),
           last_sync_succeeded_at=now(),
           updated_at=now()
       where id=$1::uuid`,
      [source.source_id],
    );

    return NextResponse.json({
      retailerSlug,
      scanned,
      accepted,
      staged,
      rejected,
      categories: Object.fromEntries([...byCategory].map(([key, value]) => [key, value.length])),
      diagnostics: {
        feedColumns: sampleColumns,
        mappedRows,
        withCategory,
        withPrice,
        withImage,
        gbp: withGbp,
        available,
        qualityAtLeast55,
      },
      promoted: 0,
      message: "Candidates staged for curation. Nothing was made customer-visible automatically.",
    });
  } catch (error) {
    await sql.query(
      `update public.catalog_sync_runs
       set status='failed',
           finished_at=now(),
           records_seen=$2,
           error_summary=$3
       where id=$1::uuid`,
      [runId, scanned, error instanceof Error ? error.message.slice(0, 1000) : "Unknown import error"],
    );

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Feed import failed.",
      scanned,
      accepted,
    }, { status: 500 });
  }
}
