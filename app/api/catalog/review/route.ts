import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";
import { promoteFeedCandidate } from "@/lib/catalog/ingest/promote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CATALOG_REVIEW_SECRET;
  const supplied = request.headers.get("x-catalog-review-key");
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function unauthorized() {
  return NextResponse.json({ error: "Passcode is incorrect." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!authorized(request)) return unauthorized();

  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
       c.id::text as id,
       c.title,
       c.description,
       c.brand_name,
       c.image_url,
       c.additional_images,
       c.price_minor,
       c.compare_at_price_minor,
       c.currency,
       c.availability::text as availability,
       c.merchant_category,
       c.category_path,
       c.normalized_category_slug,
       c.colour_text,
       c.material_text,
       c.dimensions_text,
       c.quality_score,
       c.product_url,
       c.affiliate_url,
       c.review_notes,
       r.name as retailer_name
     from public.catalog_feed_candidates c
     join public.retailers r on r.id = c.retailer_id
     where c.candidate_status = 'pending'
       and r.slug = 'aosom-uk'
     order by c.normalized_category_slug, c.quality_score desc, c.title
     limit 200`,
  ) as Array<Record<string, unknown>>;

  const progressRows = await sql.query(
    `select
       coalesce((run.metadata->>'scan_offset')::integer + run.records_seen, 1_000)::integer as next_scan_offset,
       coalesce((run.metadata->>'reached_end')::boolean, false) as feed_complete
     from public.catalog_sync_runs run
     join public.catalog_sources source on source.id = run.source_id
     join public.retailers retailer on retailer.id = source.retailer_id
     where retailer.slug = 'aosom-uk'
       and run.status = 'succeeded'
       and run.metadata ? 'scan_offset'
     order by run.finished_at desc
     limit 1`,
  ) as Array<{ next_scan_offset: number; feed_complete: boolean }>;
  const progress = progressRows[0];

  return NextResponse.json(
    {
      candidates: rows,
      count: rows.length,
      nextScanOffset: progress?.next_scan_offset ?? 1_000,
      feedComplete: progress?.feed_complete ?? false,
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) return unauthorized();

  let body: { candidateId?: string; action?: string };
  try {
    body = await request.json() as { candidateId?: string; action?: string };
  } catch {
    return NextResponse.json({ error: "A valid request body is required." }, { status: 400 });
  }

  const candidateId = body.candidateId?.trim();
  if (!candidateId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId)) {
    return NextResponse.json({ error: "A valid candidate ID is required." }, { status: 400 });
  }

  const sql = getCatalogDb();
  const eligibleRows = await sql.query(
    `select c.id::text as id
     from public.catalog_feed_candidates c
     join public.retailers r on r.id = c.retailer_id
     where c.id = $1::uuid
       and c.candidate_status = 'pending'
       and r.slug = 'aosom-uk'
     limit 1`,
    [candidateId],
  ) as Array<{ id: string }>;

  if (!eligibleRows.length) {
    return NextResponse.json({ error: "This Aosom item is no longer pending review." }, { status: 409 });
  }

  if (body.action === "keep") {
    const promoted = await promoteFeedCandidate(candidateId);
    if (!promoted) {
      return NextResponse.json(
        { error: "This product did not pass the catalogue checks, so it was not added." },
        { status: 409 },
      );
    }
    return NextResponse.json({ action: "kept", candidateId, promoted });
  }

  if (body.action === "reject") {
    const rows = await sql.query(
      `update public.catalog_feed_candidates c
       set candidate_status = 'rejected',
           review_notes = concat_ws(E'\\\\n', nullif(c.review_notes, ''), 'Rejected during manual catalogue review.'),
           updated_at = now()
       from public.retailers r
       where c.retailer_id = r.id
         and c.id = $1::uuid
         and c.candidate_status = 'pending'
         and r.slug = 'aosom-uk'
       returning c.id::text as id`,
      [candidateId],
    ) as Array<{ id: string }>;

    if (!rows.length) {
      return NextResponse.json({ error: "This item is no longer pending review." }, { status: 409 });
    }
    return NextResponse.json({ action: "rejected", candidateId });
  }

  return NextResponse.json({ error: "Choose keep or reject." }, { status: 400 });
}
