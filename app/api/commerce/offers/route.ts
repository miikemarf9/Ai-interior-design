import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: Request) {
  const variantId = new URL(request.url).searchParams.get("variantId") || "";
  if (!validUuid(variantId)) {
    return NextResponse.json({ error: "Invalid variant." }, { status: 400 });
  }

  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      ro.id::text as id,
      r.name as retailer_name,
      r.slug as retailer_slug,
      ro.price_minor,
      ro.compare_at_price_minor,
      ro.availability,
      ro.uk_delivery_status,
      ro.delivery_price_minor,
      ro.delivery_min_days,
      ro.delivery_max_days,
      ro.last_checked_at::text,
      (ro.affiliate_url is not null) as affiliate_tracked,
      ap.network,
      ap.advertiser_id,
      ap.publisher_id,
      case
        when ap.estimated_commission_rate_percent is not null
        then round(ro.price_minor * ap.estimated_commission_rate_percent / 100.0)::int
        else null
      end as expected_commission_minor,
      case
        when ap.epc_minor is not null then ap.epc_minor
        when ap.estimated_commission_rate_percent is not null
          and ap.conversion_rate_percent is not null
          and ap.approval_percentage is not null
        then round(
          ro.price_minor
          * ap.estimated_commission_rate_percent / 100.0
          * ap.conversion_rate_percent / 100.0
          * ap.approval_percentage / 100.0
        )::int
        else null
      end as expected_revenue_minor
    from public.retailer_offers ro
    join public.retailers r on r.id = ro.retailer_id
    left join public.affiliate_programs ap on ap.retailer_id = r.id
    join public.product_variants v on v.id = ro.variant_id
    join public.products p on p.id = v.product_id
    where ro.variant_id = $1::uuid
      and p.status = 'active'
      and p.is_curated
      and v.status = 'active'
      and ro.is_active
      and r.status = 'active'
      and r.ships_to_uk
      and ro.currency = 'GBP'
      and ro.availability in ('in_stock','low_stock','preorder')
      and ro.uk_delivery_status in ('available','restricted')
    order by
      case ro.availability when 'in_stock' then 0 when 'low_stock' then 1 else 2 end,
      ro.price_minor asc,
      ro.quality_score desc`,
    [variantId],
  );

  return NextResponse.json({ offers: rows });
}
