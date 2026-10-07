import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.COMMERCE_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      (select count(*) from public.commerce_events where event_type='product_viewed')::int as product_views,
      (select count(*) from public.commerce_events where event_type='swap_viewed')::int as swap_views,
      (select count(*) from public.affiliate_clicks)::int as retailer_clicks,
      (select count(*) from public.affiliate_clicks where expected_revenue_minor is not null)::int as modeled_clicks,
      (select coalesce(sum(expected_revenue_minor),0) from public.affiliate_clicks)::bigint as expected_revenue_minor,
      (select count(*) from public.affiliate_conversions)::int as conversions,
      (select count(*) from public.affiliate_conversions where click_id is not null)::int as attributed_conversions,
      (select coalesce(sum(commission_amount_minor),0) from public.affiliate_conversions where status='pending')::bigint as pending_commission_minor,
      (select coalesce(sum(commission_amount_minor),0) from public.affiliate_conversions where status='approved')::bigint as approved_commission_minor,
      (select coalesce(sum(sale_amount_minor),0) from public.affiliate_conversions where status in ('pending','approved'))::bigint as tracked_sales_minor`,
    [],
  );

  return NextResponse.json({ metrics: rows[0] });
}
