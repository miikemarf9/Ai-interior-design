import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeLegacyAwinRow } from "@/lib/catalog/ingest/awin";
import { readCsvObjects } from "@/lib/catalog/ingest/csv";
import { getFeedSource } from "@/lib/catalog/ingest/stage";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RETAILER_SLUG = "aosom-uk";
const MAX_FEED_ROWS = 100_000;

type ExistingOffer = { id: string; external_product_id: string };

function matchesSecret(expected: string | undefined, supplied: string | null) {
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function authorized(request: Request) {
  return matchesSecret(
    process.env.CATALOG_IMPORT_SECRET,
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? null,
  );
}

async function decompressGzipIfNeeded(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const first = await reader.read();
  if (first.done) return new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } });

  const replay = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(first.value); },
    async pull(controller) {
      const next = await reader.read();
      if (next.done) controller.close();
      else controller.enqueue(next.value);
    },
    cancel(reason) { return reader.cancel(reason); },
  });

  if (first.value.length >= 2 && first.value[0] === 0x1f && first.value[1] === 0x8b) {
    return replay.pipeThrough(new DecompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  }
  return replay;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const source = await getFeedSource(RETAILER_SLUG);
  if (!source) return NextResponse.json({ error: "No active Aosom affiliate feed source exists." }, { status: 404 });

  const envName = typeof source.public_config.secret_env === "string" ? source.public_config.secret_env : null;
  const feedUrl = envName ? process.env[envName] : null;
  if (!feedUrl) return NextResponse.json({ error: "The Aosom Awin feed credential is not configured." }, { status: 503 });

  const sql = getCatalogDb();
  const runRows = await sql.query(
    `insert into public.catalog_sync_runs (source_id, status, metadata)
     values ($1::uuid, 'running', jsonb_build_object('retailer_slug',$2::text,'sync_type','price_refresh'))
     returning id::text as id`,
    [source.source_id, RETAILER_SLUG],
  ) as Array<{ id: string }>;
  const runId = runRows[0]?.id;
  if (!runId) return NextResponse.json({ error: "Could not start the Aosom price refresh." }, { status: 500 });

  await sql.query(
    `update public.catalog_sources set last_sync_started_at=now(), updated_at=now() where id=$1::uuid`,
    [source.source_id],
  );

  let scanned = 0;
  try {
    const existingOffers = await sql.query(
      `select id::text as id, external_product_id
       from public.retailer_offers
       where retailer_id = $1::uuid
         and is_active
         and external_product_id is not null`,
      [source.retailer_id],
    ) as ExistingOffer[];
    const pendingCandidates = await sql.query(
      `select id::text as id, external_product_id
       from public.catalog_feed_candidates
       where retailer_id=$1::uuid
         and candidate_status='pending'
         and external_product_id is not null`,
      [source.retailer_id],
    ) as ExistingOffer[];
    const wanted = new Set([...existingOffers, ...pendingCandidates].map((item) => item.external_product_id));
    const feedUrlParsed = new URL(feedUrl);
    if (!["https:", "http:"].includes(feedUrlParsed.protocol)) throw new Error("The configured Awin feed URL is invalid.");

    const response = await fetch(feedUrlParsed, {
      headers: { "user-agent": "TransformMyRoomPriceSync/1.0" },
      cache: "no-store",
    });
    if (!response.ok || !response.body) throw new Error(`Awin Aosom feed returned HTTP ${response.status}.`);

    const found = new Map<string, {
      external_product_id: string;
      price_minor: number;
      compare_at_price_minor: number | null;
      availability: string;
      stock_quantity: number | null;
      product_url: string;
      affiliate_url: string | null;
      source_updated_at: string | null;
    }>();

    const csvBody = await decompressGzipIfNeeded(response.body);
    for await (const row of readCsvObjects(csvBody)) {
      scanned += 1;
      if (scanned > MAX_FEED_ROWS) break;
      const candidate = normalizeLegacyAwinRow(row);
      if (!candidate || !wanted.has(candidate.externalProductId)) continue;
      if (candidate.priceMinor === null || candidate.priceMinor <= 0 || candidate.currency !== "GBP" || !candidate.productUrl) continue;

      const parsedSourceDate = candidate.sourceUpdatedAt ? Date.parse(candidate.sourceUpdatedAt) : Number.NaN;
      found.set(candidate.externalProductId, {
        external_product_id: candidate.externalProductId,
        price_minor: candidate.priceMinor,
        compare_at_price_minor: candidate.compareAtPriceMinor,
        availability: candidate.availability,
        stock_quantity: candidate.stockQuantity,
        product_url: candidate.productUrl,
        affiliate_url: candidate.affiliateUrl,
        source_updated_at: Number.isFinite(parsedSourceDate) ? new Date(parsedSourceDate).toISOString() : null,
      });

      if (found.size === wanted.size) break;
    }

    const updates = [...found.values()];
    let offersUpdated = 0;
    let candidatesUpdated = 0;
    let historyRows = 0;
    if (updates.length) {
      const result = await sql.query(
        `with incoming as (
          select * from jsonb_to_recordset($2::jsonb) as x(
            external_product_id text,
            price_minor integer,
            compare_at_price_minor integer,
            availability text,
            stock_quantity integer,
            product_url text,
            affiliate_url text,
            source_updated_at timestamptz
          )
        ),
        before as materialized (
          select ro.id, ro.price_minor, ro.compare_at_price_minor, ro.availability, ro.stock_quantity
          from public.retailer_offers ro
          join incoming i on i.external_product_id = ro.external_product_id
          where ro.retailer_id = $1::uuid and ro.is_active
        ),
        changed as (
          update public.retailer_offers ro
          set price_minor = i.price_minor,
              compare_at_price_minor = i.compare_at_price_minor,
              availability = i.availability::public.offer_availability,
              stock_quantity = i.stock_quantity,
              product_url = i.product_url,
              affiliate_url = coalesce(i.affiliate_url, ro.affiliate_url),
              last_price_checked_at = now(),
              last_availability_checked_at = now(),
              last_checked_at = now(),
              source_updated_at = i.source_updated_at,
              updated_at = now()
          from incoming i
          where ro.retailer_id = $1::uuid
            and ro.is_active
            and ro.external_product_id = i.external_product_id
          returning ro.id, ro.price_minor, ro.compare_at_price_minor, ro.availability, ro.stock_quantity
        ),
        history as (
          insert into public.offer_price_history (
            offer_id, price_minor, compare_at_price_minor, availability, stock_quantity, checked_at
          )
          select c.id, c.price_minor, c.compare_at_price_minor, c.availability, c.stock_quantity, now()
          from changed c
          join before b on b.id = c.id
          where (b.price_minor, b.compare_at_price_minor, b.availability, b.stock_quantity)
            is distinct from (c.price_minor, c.compare_at_price_minor, c.availability, c.stock_quantity)
          returning offer_id
        )
        select (select count(*)::integer from changed) as updated,
               (select count(*)::integer from history) as history_rows`,
        [source.retailer_id, JSON.stringify(updates)],
      ) as Array<{ updated: number; history_rows: number }>;
      offersUpdated = result[0]?.updated ?? 0;
      historyRows = result[0]?.history_rows ?? 0;

      const candidateResult = await sql.query(
        `with incoming as (
          select * from jsonb_to_recordset($2::jsonb) as x(
            external_product_id text,
            price_minor integer,
            compare_at_price_minor integer,
            availability text,
            stock_quantity integer,
            product_url text,
            affiliate_url text,
            source_updated_at timestamptz
          )
        )
        update public.catalog_feed_candidates c
        set price_minor=i.price_minor,
            compare_at_price_minor=i.compare_at_price_minor,
            availability=i.availability::public.offer_availability,
            stock_quantity=i.stock_quantity,
            product_url=i.product_url,
            affiliate_url=coalesce(i.affiliate_url,c.affiliate_url),
            source_updated_at=i.source_updated_at,
            updated_at=now()
        from incoming i
        where c.retailer_id=$1::uuid
          and c.candidate_status='pending'
          and c.external_product_id=i.external_product_id
        returning c.id`,
        [source.retailer_id, JSON.stringify(updates)],
      ) as Array<{ id: string }>;
      candidatesUpdated = candidateResult.length;
    }

    const missing = Math.max(0, wanted.size - found.size);
    const complete = found.size === wanted.size;
    const metadata = {
      retailer_slug: RETAILER_SLUG,
      sync_type: "price_refresh",
      scanned,
      active_offers: existingOffers.length,
      pending_candidates: pendingCandidates.length,
      matched_offers: found.size,
      unmatched_offers: missing,
      offers_updated: offersUpdated,
      pending_candidates_updated: candidatesUpdated,
      history_rows: historyRows,
      complete,
      feed_limit_reached: scanned > MAX_FEED_ROWS,
    };

    await sql.query(
      `update public.catalog_sync_runs
       set status='succeeded', finished_at=now(), records_seen=$2, records_updated=$3, metadata=$4::jsonb
       where id=$1::uuid`,
      [runId, scanned, offersUpdated + candidatesUpdated, JSON.stringify(metadata)],
    );
    await sql.query(
      `update public.catalog_sources
       set last_sync_succeeded_at=now(), sync_frequency_minutes=60, updated_at=now()
       where id=$1::uuid`,
      [source.source_id],
    );

    return NextResponse.json({ retailerSlug: RETAILER_SLUG, scanned, activeOffers: existingOffers.length, pendingCandidates: pendingCandidates.length, matched: found.size, offersUpdated, candidatesUpdated, historyRows, complete });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown price sync error.";
    await sql.query(
      `update public.catalog_sync_runs
       set status='failed', finished_at=now(), records_seen=$2, error_summary=$3,
           metadata=jsonb_build_object('retailer_slug',$4::text,'sync_type','price_refresh')
       where id=$1::uuid`,
      [runId, scanned, message, RETAILER_SLUG],
    );
    await sql.query(
      `update public.catalog_sources set sync_frequency_minutes=60, updated_at=now() where id=$1::uuid`,
      [source.source_id],
    );
    return NextResponse.json({ error: "Aosom price refresh failed.", detail: message, scanned }, { status: 500 });
  }
}
