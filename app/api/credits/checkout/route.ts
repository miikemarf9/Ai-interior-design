import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function POST() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Sign in to buy image credits." }, { status: 401 });
  if (!account.emailVerifiedAt) return NextResponse.json({ error: "Verify your email before buying image credits." }, { status: 403 });
  if (isAdminAccount(account)) return NextResponse.json({ error: "Your account uses the image API's own usage limit." }, { status: 403 });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Image credit payments are not configured yet." }, { status: 503 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://transformmyroom.com").replace(/\/$/, "");
  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${siteUrl}/account?purchase=success`,
    cancel_url: `${siteUrl}/account?purchase=cancelled`,
    client_reference_id: account.id,
    customer_email: account.email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": "200",
    "line_items[0][price_data][product_data][name]": "10 Transform My Room image credits",
    "line_items[0][price_data][product_data][description]": "Ten room image generations for your Transform My Room account.",
    "metadata[account_id]": account.id,
    "metadata[product]": "image_credit_pack_10",
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });
  const session = await response.json() as { url?: string; error?: { message?: string } };
  if (!response.ok || !session.url) {
    console.error("Stripe checkout session could not be created.", session.error?.message || response.status);
    return NextResponse.json({ error: "We could not start checkout. Please try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
