import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

const EVENT_TYPES = new Set(["product_viewed", "swap_viewed"]);
const ALTERNATIVES = new Set(["cheaper", "similar", "premium"]);

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validSession(value: string) {
  return /^[a-zA-Z0-9_-]{16,100}$/.test(value);
}

export async function POST(request: Request) {
  const body = await request.json() as {
    eventType?: string;
    sessionKey?: string;
    designId?: string;
    generationId?: string;
    shareToken?: string;
    productId?: string;
    variantId?: string;
    offerId?: string;
    alternativeKind?: string | null;
    surface?: string;
  };

  const eventType = body.eventType || "";
  const sessionKey = body.sessionKey || "";
  const productId = body.productId || "";
  const variantId = body.variantId || "";
  const offerId = body.offerId || "";
  const surface = (body.surface || "designed_room").slice(0, 80);

  if (
    !EVENT_TYPES.has(eventType)
    || !validSession(sessionKey)
    || !validUuid(productId)
    || !validUuid(variantId)
    || !validUuid(offerId)
  ) {
    return NextResponse.json({ error: "Invalid commerce event." }, { status: 400 });
  }

  const alternativeKind = body.alternativeKind && ALTERNATIVES.has(body.alternativeKind)
    ? body.alternativeKind
    : null;

  const sql = getCatalogDb();
  const rows = await sql.query(
    `insert into public.commerce_events (
      session_key, event_type, design_id, generation_id, share_id,
      product_id, variant_id, offer_id, retailer_id,
      alternative_kind, surface
    )
    select
      $1,
      $2,
      (select id from public.room_designs where id = nullif($3,'')::uuid),
      (select id from public.render_generations where id = nullif($4,'')::uuid),
      (select id from public.room_shares where share_token = nullif($5,'')::uuid and is_active),
      p.id,
      v.id,
      ro.id,
      ro.retailer_id,
      $9,
      $10
    from public.retailer_offers ro
    join public.product_variants v on v.id = ro.variant_id
    join public.products p on p.id = v.product_id
    where ro.id = $8::uuid
      and v.id = $7::uuid
      and p.id = $6::uuid
    returning id::text as id`,
    [
      sessionKey,
      eventType,
      validUuid(body.designId || "") ? body.designId : "",
      validUuid(body.generationId || "") ? body.generationId : "",
      validUuid(body.shareToken || "") ? body.shareToken : "",
      productId,
      variantId,
      offerId,
      alternativeKind,
      surface,
    ],
  ) as Array<{ id: string }>;

  if (!rows[0]) {
    return NextResponse.json({ error: "Commerce event target not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, eventId: rows[0].id });
}
