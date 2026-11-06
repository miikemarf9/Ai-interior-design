import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { applySessionCookie, createSession, hashPassword, issueAuthToken, normalizeEmail } from "@/lib/auth";
import { claimAnonymousRooms, enqueueCrmEvent, ensureAccountWallet, ensurePrimaryHome } from "@/lib/auth/account";
import { sendVerificationEmail } from "@/lib/auth/email";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function POST(request: NextRequest) {
  const raw = request.cookies.get("tmr_oauth_pending")?.value;
  if (!raw) return NextResponse.json({ error: "Your sign-in has expired. Please try again." }, { status: 400 });
  const pending = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { provider: "x" | "facebook" | "google"; subject: string; name: string; ownerKey: string };
  const body = await request.json() as { displayName?: string; email?: string };
  const displayName = (body.displayName || pending.name || "").trim().slice(0, 80);
  const email = normalizeEmail(body.email || "");
  if (!displayName) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const rate = await checkAuthRateLimit({ request, action: "signup", identity: email, limit: 5 });
  if (!rate.allowed) return NextResponse.json({ error: "Too many account attempts. Try again later." }, { status: 429 });
  const sql = getCatalogDb();
  const existing = await sql.query(`select id from public.customer_accounts where lower(email)=lower($1) limit 1`, [email]);
  if (existing.length) return NextResponse.json({ error: "An account already uses this email. Sign in with that account first." }, { status: 409 });

  const rows = await sql.query(
    `insert into public.customer_accounts (email,password_hash,display_name) values ($1,$2,$3) returning id::text as id`,
    [email, hashPassword(randomBytes(48).toString("base64url")), displayName],
  ) as Array<{ id: string }>;
  const accountId = rows[0].id;
  await sql.query(
    `insert into public.customer_auth_identities (account_id,provider,provider_subject,email_at_link) values ($1::uuid,$2,$3,$4)`,
    [accountId, pending.provider, pending.subject, email],
  );
  const homeId = await ensurePrimaryHome(accountId);
  await ensureAccountWallet(accountId, false);
  await sql.query(`insert into public.crm_contact_links (account_id,provider) values ($1::uuid,'grabandbook') on conflict (account_id,provider) do nothing`, [accountId]);
  await enqueueCrmEvent(accountId, "account_created", "customer", accountId, { email, displayName, primaryHomeId: homeId, authProvider: pending.provider });
  await claimAnonymousRooms(accountId, pending.ownerKey || null);
  const verificationToken = await issueAuthToken(accountId, "verify_email", 24);
  const emailResult = await sendVerificationEmail(email, verificationToken, request.nextUrl.origin);
  const session = await createSession(accountId);
  const response = NextResponse.json({ ok: true, emailSent: emailResult.sent });
  response.cookies.set("tmr_oauth_pending", "", { ...cookieOptions, maxAge: 0 });
  applySessionCookie(response, session.token, session.expiresAt);
  return response;
}
