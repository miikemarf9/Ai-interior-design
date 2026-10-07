import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";
import { addAwinClickRef } from "@/lib/commerce/awin";

export const runtime = "nodejs";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validSession(value: string) {
  return /^[a-zA-Z0-9_-]{16,100}$/.test(value);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await context.params;
  if (!validUuid(offerId)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const url = new URL(request.url);
  const sessionKey = validSession(url.searchParams.get("session") || "")
    ? (url.searchParams.get("session") as string)
    : `anon_${randomUUID().replaceAll("-", "")}`;
  const designId = validUuid(url.searchParams.get("designId") || "") ? url.searchParams.get("designId")! : "";
  const generationId = validUuid(url.searchParams.get("generationId") || "") ? url.searchParams.get("generationId")! : "";
  const shareToken = validUuid(url.searchParams.get("shareToken") || "") ? url.searchParams.get("shareToken")! : "";
  const surface = (url.searchParams.get("surface") || "product_drawer").slice(0, 80);

  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      ro.id::text as offer_id,
      ro.variant_id::text as variant_id,
      v.product_id::text as product_id,
      ro.retailer_id::text as retailer_id,
      ro.product_url,
      ro.affiliate_url,
      ro.price_minor,
      ro.currency,
      r.name as retailer_name,
      lower(coalesce(ap.network, r.affiliate_network)) as network,
      coalesce(ap.advertiser_id, r.affiliate_program_id) as advertiser_id,
      ap.publisher_id,
      ap.estimated_commission_rate_percent,
      ap.conversion_rate_percent,
      ap.approval_percentage,
      ap.epc_minor
    from public.retailer_offers ro
    join public.product_variants v on v.id = ro.variant_id
    join public.products p on p.id = v.product_id
    join public.retailers r on r.id = ro.retailer_id
    left join public.affiliate_programs ap on ap.retailer_id = r.id
    where ro.id = $1::uuid
      and p.status = 'active'
      and p.is_curated
      and v.status = 'active'
      and ro.is_active
      and r.status = 'active'
    limit 1`,
    [offerId],
  ) as Array<{
    offer_id: string;
    variant_id: string;
    product_id: string;
    retailer_id: string;
    product_url: string;
    affiliate_url: string | null;
    price_minor: number;
    currency: string;
    retailer_name: string;
    network: string | null;
    advertiser_id: string | null;
    publisher_id: string | null;
    estimated_commission_rate_percent: number | null;
    conversion_rate_percent: number | null;
    approval_percentage: number | null;
    epc_minor: number | null;
  }>;

  const offer = rows[0];
  if (!offer) return NextResponse.redirect(new URL("/", request.url), 302);

  const clickRef = `rf_${randomUUID().replaceAll("-", "")}`;
  const publisherId = offer.publisher_id || process.env.AWIN_PUBLISHER_ID || null;
  const baseDestination = offer.affiliate_url || offer.product_url;

  let trackingUrl = baseDestination;
  if (offer.network === "awin" && offer.affiliate_url) {
    try {
      trackingUrl = addAwinClickRef(offer.affiliate_url, clickRef);
    } catch {
      trackingUrl = offer.affiliate_url;
    }
  }

  const expectedCommission = offer.estimated_commission_rate_percent !== null
    ? Math.round(offer.price_minor * offer.estimated_commission_rate_percent / 100)
    : null;

  const expectedRevenue = offer.epc_minor !== null
    ? offer.epc_minor
    : expectedCommission !== null
      && offer.conversion_rate_percent !== null
      && offer.approval_percentage !== null
        ? Math.round(
            expectedCommission
            * offer.conversion_rate_percent / 100
            * offer.approval_percentage / 100
          )
        : null;

  try {
    await sql.query(
      `with context as (
        select
          (select id from public.room_designs where id = nullif($3,'')::uuid) as design_id,
          (select id from public.render_generations where id = nullif($4,'')::uuid) as generation_id,
          (select id from public.room_shares where share_token = nullif($5,'')::uuid and is_active) as share_id
      ),
      event as (
        insert into public.commerce_events (
          session_key, event_type, design_id, generation_id, share_id,
          product_id, variant_id, offer_id, retailer_id, surface
        )
        select $1, 'retailer_clicked', c.design_id, c.generation_id, c.share_id,
               $6::uuid, $7::uuid, $8::uuid, $9::uuid, $10
        from context c
        returning id, design_id, generation_id, share_id
      )
      insert into public.affiliate_clicks (
        click_ref, event_id, session_key, design_id, generation_id, share_id,
        product_id, variant_id, offer_id, retailer_id,
        network, advertiser_id, publisher_id,
        destination_url, tracking_url,
        sale_value_snapshot_minor, currency, commission_rate_percent,
        expected_commission_minor, expected_revenue_minor, surface,
        metadata
      )
      select
        $2, e.id, $1, e.design_id, e.generation_id, e.share_id,
        $6::uuid, $7::uuid, $8::uuid, $9::uuid,
        $11, $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $10,
        jsonb_build_object('retailer_name',$21,'affiliate_url_present',$22)
      from event e`,
      [
        sessionKey,
        clickRef,
        designId,
        generationId,
        shareToken,
        offer.product_id,
        offer.variant_id,
        offer.offer_id,
        offer.retailer_id,
        surface,
        offer.network,
        offer.advertiser_id,
        publisherId,
        offer.product_url,
        trackingUrl,
        offer.price_minor,
        offer.currency,
        offer.estimated_commission_rate_percent,
        expectedCommission,
        expectedRevenue,
        offer.retailer_name,
        Boolean(offer.affiliate_url),
      ],
    );
  } catch (error) {
    console.error("Affiliate click logging failed", error);
  }

  return NextResponse.redirect(trackingUrl, 302);
}
