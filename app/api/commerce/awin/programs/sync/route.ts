import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";
import { moneyToMinor, percentageEstimate, type AwinProgramDetails } from "@/lib/commerce/awin";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.COMMERCE_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const token = process.env.AWIN_API_TOKEN;
  const publisherId = process.env.AWIN_PUBLISHER_ID;
  if (!token || !publisherId) {
    return NextResponse.json({ error: "Awin API credentials are not configured." }, { status: 503 });
  }

  const sql = getCatalogDb();
  const run = await sql.query(
    `insert into public.affiliate_sync_runs (network, sync_type)
     values ('awin','program_details')
     returning id::text as id`,
    [],
  ) as Array<{ id: string }>;
  const runId = run[0].id;

  const programmes = await sql.query(
    `select id::text as id, advertiser_id
     from public.affiliate_programs
     where network='awin'
     order by advertiser_id`,
    [],
  ) as Array<{ id: string; advertiser_id: string }>;

  let seen = 0;
  let matched = 0;
  const errors: string[] = [];

  for (const programme of programmes) {
    seen += 1;
    try {
      const endpoint = new URL(`https://api.awin.com/publishers/${publisherId}/programmedetails`);
      endpoint.searchParams.set("advertiserId", programme.advertiser_id);
      endpoint.searchParams.set("relationship", "any");

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`Advertiser ${programme.advertiser_id}: HTTP ${response.status}`);
      const details = await response.json() as AwinProgramDetails;
      const rate = percentageEstimate(details.commissionRange);
      const currency = details.programmeInfo?.currencyCode?.toUpperCase() || "GBP";

      await sql.query(
        `update public.affiliate_programs
         set
           publisher_id=$2,
           relationship_status=$3,
           commission_range=$4::jsonb,
           estimated_commission_rate_percent=$5,
           conversion_rate_percent=$6,
           approval_percentage=$7,
           epc_minor=$8,
           currency=$9,
           source_synced_at=now(),
           metadata=jsonb_build_object(
             'programme_name',$10,
             'deeplink_enabled',$11,
             'validation_days',$12,
             'estimate_basis','midpoint_of_percentage_commission_range'
           ),
           updated_at=now()
         where id=$1::uuid`,
        [
          programme.id,
          publisherId,
          details.programmeInfo?.membershipStatus ?? null,
          JSON.stringify(details.commissionRange ?? []),
          rate,
          details.kpi?.conversionRate ?? null,
          details.kpi?.approvalPercentage ?? null,
          moneyToMinor(details.kpi?.epc),
          currency.slice(0,3),
          details.programmeInfo?.name ?? null,
          details.programmeInfo?.deeplinkEnabled ?? null,
          details.kpi?.validationDays ?? null,
        ],
      );
      matched += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Programme sync failed.");
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
      errors.length ? (matched ? "partially_succeeded" : "failed") : "succeeded",
      seen,
      matched,
      seen - matched,
      errors.length ? errors.join("; ").slice(0,2000) : null,
    ],
  );

  return NextResponse.json({ runId, seen, updated: matched, errors });
}
