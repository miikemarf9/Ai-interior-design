import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.COMMERCE_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 90);
  const days = Number.isInteger(requestedDays) ? Math.max(7, Math.min(365, requestedDays)) : 90;
  const sql = getCatalogDb();
  const [rows, stylesChosen, itemTypesChosen, productsChosen, roomsSaved, clicksByCategory, topClickedProducts] = await Promise.all([
    sql.query(
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
    ),
    sql.query(
      `select style.value as style, count(*)::int as submissions,
        count(distinct e.session_key)::int as sessions
       from public.analytics_events e
       cross join lateral jsonb_array_elements_text(
         case when jsonb_typeof(e.properties->'styles')='array' then e.properties->'styles' else '[]'::jsonb end
       ) style(value)
       where e.event_name='style_choices_submitted'
         and e.created_at >= now() - ($1::int * interval '1 day')
       group by style.value order by sessions desc,submissions desc,style.value`,
      [days],
    ),
    sql.query(
      `select category.value as category, count(*)::int as submissions,
        count(distinct e.session_key)::int as sessions
       from public.analytics_events e
       cross join lateral jsonb_array_elements_text(
         case when jsonb_typeof(e.properties->'categories')='array' then e.properties->'categories' else '[]'::jsonb end
       ) category(value)
       where e.event_name='item_choices_submitted'
         and e.created_at >= now() - ($1::int * interval '1 day')
       group by category.value order by sessions desc,submissions desc,category.value`,
      [days],
    ),
    sql.query(
      `select cat.slug as category,p.id::text as product_id,p.name as product,
        count(*)::int as selections,count(distinct e.session_key)::int as sessions
       from public.analytics_events e
       cross join lateral jsonb_array_elements(
         case when jsonb_typeof(e.properties->'selectedProducts')='array' then e.properties->'selectedProducts' else '[]'::jsonb end
       ) selected(item)
       join public.products p on p.id=(selected.item->>'productId')::uuid
       left join public.product_categories pc on pc.product_id=p.id and pc.is_primary
       left join public.categories cat on cat.id=pc.category_id
       where e.event_name in ('products_approved','room_saved')
         and e.created_at >= now() - ($1::int * interval '1 day')
       group by cat.slug,p.id,p.name
       order by sessions desc,selections desc,p.name limit 20`,
      [days],
    ),
    sql.query(
      `select coalesce(e.properties->>'roomType','unknown') as room_type,
        count(*)::int as saves,count(distinct e.session_key)::int as sessions
       from public.analytics_events e
       where e.event_name='room_saved'
         and e.created_at >= now() - ($1::int * interval '1 day')
       group by coalesce(e.properties->>'roomType','unknown')
       order by saves desc,room_type`,
      [days],
    ),
    sql.query(
      `select cat.slug as category,count(*)::int as clicks,
        count(distinct ac.session_key)::int as sessions
       from public.affiliate_clicks ac
       join public.products p on p.id=ac.product_id
       left join public.product_categories pc on pc.product_id=p.id and pc.is_primary
       left join public.categories cat on cat.id=pc.category_id
       where ac.clicked_at >= now() - ($1::int * interval '1 day')
       group by cat.slug order by clicks desc,cat.slug`,
      [days],
    ),
    sql.query(
      `select p.id::text as product_id,p.name as product,r.name as retailer,
        count(*)::int as clicks,count(distinct ac.session_key)::int as sessions
       from public.affiliate_clicks ac
       join public.products p on p.id=ac.product_id
       join public.retailers r on r.id=ac.retailer_id
       where ac.clicked_at >= now() - ($1::int * interval '1 day')
       group by p.id,p.name,r.name order by clicks desc,sessions desc,p.name limit 20`,
      [days],
    ),
  ]);

  return NextResponse.json({
    metrics: rows[0],
    interest: {
      windowDays: days,
      stylesChosen: stylesChosen,
      itemTypesChosen: itemTypesChosen,
      productsChosen: productsChosen,
      roomsSaved: roomsSaved,
      retailerClicksByCategory: clicksByCategory,
      topClickedProducts,
    },
  });
}
