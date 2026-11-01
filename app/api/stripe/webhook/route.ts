import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function validStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((item) => item.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return signatures.some((signature) => {
    try {
      const actual = Buffer.from(signature, "hex");
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch { return false; }
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature") || "";
  if (!secret) return NextResponse.json({ error: "Payment webhook is not configured." }, { status: 503 });

  const payload = await request.text();
  if (!validStripeSignature(payload, signature, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  let event: any;
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: "Invalid event." }, { status: 400 }); }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });

  const session = event.data?.object;
  const accountId = session?.metadata?.account_id;
  const idempotencyKey = `stripe-checkout:${session?.id || ""}`;
  if (
    session?.payment_status !== "paid"
    || session?.mode !== "payment"
    || session?.currency !== "gbp"
    || session?.amount_total !== 200
    || session?.metadata?.product !== "image_credit_pack_10"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId || "")
    || !session?.id
  ) return NextResponse.json({ received: true });

  const sql = getCatalogDb();
  await sql.query(
    `with wallet as (
       select id from public.design_credit_wallets where account_id=$1::uuid for update
     ), credited as (
       update public.design_credit_wallets w
       set balance=w.balance+10,updated_at=now()
       from wallet
       where w.id=wallet.id
         and not exists (select 1 from public.design_credit_ledger where idempotency_key=$2)
       returning w.id
     )
     insert into public.design_credit_ledger (
       wallet_id,event_type,amount,idempotency_key,metadata
     )
     select id,'credit_pack_purchase',10,$2,jsonb_build_object(
       'provider','stripe','checkout_session_id',$3,'pack_images',10,'amount_gbp_minor',200
     ) from credited
     on conflict (idempotency_key) do nothing`,
    [accountId, idempotencyKey, session.id],
  );

  return NextResponse.json({ received: true });
}
