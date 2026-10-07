import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";
import { amountObject, normalizeTransactionStatus, stringField } from "@/lib/commerce/awin";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.COMMERCE_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function apiDate(value: Date) {
  return value.toISOString().slice(0, 19);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const token = process.env.AWIN_API_TOKEN;
  const publisherId = process.env.AWIN_PUBLISHER_ID;
  if (!token || !publisherId) {
    return NextResponse.json({ error: "Awin API credentials are not configured." }, { status: 503 });
  }

  const supplied = await request.json().catch(() => ({})) as { startDate?: string; endDate?: string };
  const end = supplied.endDate ? new Date(supplied.endDate) : new Date();
  const start = supplied.startDate ? new Date(supplied.startDate) : new Date(end.getTime() - 7 * 86_400_000);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }
  if (end.getTime() - start.getTime() > 31 * 86_400_000) {
    return NextResponse.json({ error: "Awin transaction sync supports at most 31 days per request." }, { status: 400 });
  }

  const sql = getCatalogDb();
  const run = await sql.query(
    `insert into public.affiliate_sync_runs (network, sync_type, metadata)
     values ('awin','transactions',jsonb_build_object('start',$1,'end',$2))
     returning id::text as id`,
    [start.toISOString(), end.toISOString()],
  ) as Array<{ id: string }>;
  const runId = run[0].id;

  const programmes = await sql.query(
    `select ap.advertiser_id, ap.retailer_id::text as retailer_id
     from public.affiliate_programs ap
     where ap.network='awin'
     order by ap.advertiser_id`,
    [],
  ) as Array<{ advertiser_id: string; retailer_id: string }>;

  let seen = 0;
  let matched = 0;
  let unmatched = 0;
  const errors: string[] = [];

  for (const programme of programmes) {
    try {
      const endpoint = new URL(`https://api.awin.com/publishers/${publisherId}/transactions/`);
      endpoint.searchParams.set("advertiserId", programme.advertiser_id);
      endpoint.searchParams.set("startDate", apiDate(start));
      endpoint.searchParams.set("endDate", apiDate(end));
      endpoint.searchParams.set("dateType", "transaction");
      endpoint.searchParams.set("timezone", "UTC");
      endpoint.searchParams.set("showBasketProducts", "false");

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`Advertiser ${programme.advertiser_id}: HTTP ${response.status}`);
      const payload = await response.json();
      const transactions = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { transactions?: unknown[] }).transactions)
          ? (payload as { transactions: unknown[] }).transactions
          : [];

      for (const rawTransaction of transactions) {
        if (!rawTransaction || typeof rawTransaction !== "object") continue;
        const transaction = rawTransaction as Record<string, unknown>;
        const externalId = stringField(transaction, "id", "transactionId");
        if (!externalId) continue;

        seen += 1;
        const clickRef = stringField(transaction, "clickRef", "clickref");
        const sale = amountObject(transaction.saleAmount);
        const commission = amountObject(transaction.commissionAmount);
        const currency = (commission.currency || sale.currency || "GBP").slice(0,3);

        const upserted = await sql.query(
          `insert into public.affiliate_conversions (
            network, external_transaction_id, advertiser_id, publisher_id,
            click_ref, click_id, retailer_id, status, transaction_type,
            order_ref, sale_amount_minor, commission_amount_minor, currency,
            transaction_at, validation_at, raw
          )
          values (
            'awin',$1,$2,$3,$4,
            (select id from public.affiliate_clicks where click_ref=$4 limit 1),
            $5::uuid,$6,$7,$8,$9,$10,$11,
            $12::timestamptz,$13::timestamptz,$14::jsonb
          )
          on conflict (network, external_transaction_id) do update
          set
            advertiser_id=excluded.advertiser_id,
            publisher_id=excluded.publisher_id,
            click_ref=excluded.click_ref,
            click_id=coalesce(excluded.click_id,public.affiliate_conversions.click_id),
            retailer_id=excluded.retailer_id,
            status=excluded.status,
            transaction_type=excluded.transaction_type,
            order_ref=excluded.order_ref,
            sale_amount_minor=excluded.sale_amount_minor,
            commission_amount_minor=excluded.commission_amount_minor,
            currency=excluded.currency,
            transaction_at=excluded.transaction_at,
            validation_at=excluded.validation_at,
            raw=excluded.raw,
            updated_at=now()
          returning (click_id is not null) as matched_click`,
          [
            externalId,
            stringField(transaction, "advertiserId") || programme.advertiser_id,
            publisherId,
            clickRef,
            programme.retailer_id,
            normalizeTransactionStatus(transaction.status),
            stringField(transaction, "type"),
            stringField(transaction, "orderRef"),
            sale.minor,
            commission.minor,
            currency,
            stringField(transaction, "transactionDate"),
            stringField(transaction, "validationDate"),
            JSON.stringify(transaction),
          ],
        ) as Array<{ matched_click: boolean }>;

        if (upserted[0]?.matched_click) matched += 1;
        else unmatched += 1;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Transaction sync failed.");
    }
  }

  await sql.query(
    `update public.affiliate_sync_runs
     set completed_at=now(),
         status=$2,
         records_seen=$3,
         records_matched=$4,
         records_unmatched=$5,
         error_summary=$6
     where id=$1::uuid`,
    [
      runId,
      errors.length ? (seen ? "partially_succeeded" : "failed") : "succeeded",
      seen,
      matched,
      unmatched,
      errors.length ? errors.join("; ").slice(0,2000) : null,
    ],
  );

  return NextResponse.json({
    runId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    seen,
    matchedToRoomfoundClick: matched,
    unmatched,
    errors,
  });
}
