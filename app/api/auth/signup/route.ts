import { NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";
import {
  applySessionCookie,
  createSession,
  hashPassword,
  issueAuthToken,
  normalizeEmail,
} from "@/lib/auth";
import {
  claimAnonymousRooms,
  enqueueCrmEvent,
  ensureAccountWallet,
  ensurePrimaryHome,
} from "@/lib/auth/account";
import { sendVerificationEmail } from "@/lib/auth/email";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as {
    email?: string;
    password?: string;
    displayName?: string;
    ownerKey?: string;
  };

  const email = normalizeEmail(body.email || "");
  const password = body.password || "";
  const displayName = (body.displayName || "").trim().slice(0, 80) || null;

  const rate = await checkAuthRateLimit({ request, action: "signup", identity: email, limit: 5 });
  if (!rate.allowed) {
    return NextResponse.json({ error: rate.configured ? "Too many account attempts. Try again later." : "Account security is not configured." }, {
      status: rate.configured ? 429 : 503,
      headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : undefined,
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 10 || password.length > 200) {
    return NextResponse.json({ error: "Use a password with at least 10 characters." }, { status: 400 });
  }

  const sql = getCatalogDb();
  const existing = await sql.query(
    `select id from public.customer_accounts where lower(email)=lower($1) limit 1`,
    [email],
  );

  if (existing.length) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const rows = await sql.query(
    `insert into public.customer_accounts (
      email,password_hash,display_name
    )
    values ($1,$2,$3)
    returning id::text as id,email,display_name`,
    [email, hashPassword(password), displayName],
  ) as Array<{ id: string; email: string; display_name: string | null }>;

  const account = rows[0];
  const homeId = await ensurePrimaryHome(account.id);
  await ensureAccountWallet(account.id, false);

  await sql.query(
    `insert into public.crm_contact_links (account_id,provider)
     values ($1::uuid,'grabandbook')
     on conflict (account_id,provider) do nothing`,
    [account.id],
  );

  await enqueueCrmEvent(account.id, "account_created", "customer", account.id, {
    email,
    displayName,
    primaryHomeId: homeId,
  });

  const claimedRoomIds = await claimAnonymousRooms(account.id, body.ownerKey || null);
  const verificationToken = await issueAuthToken(account.id, "verify_email", 24);
  const emailResult = await sendVerificationEmail(
    email,
    verificationToken,
    new URL(request.url).origin,
  );

  const session = await createSession(account.id);
  await sql.query(
    `update public.customer_accounts set last_login_at=now(),updated_at=now() where id=$1::uuid`,
    [account.id],
  );

  const response = NextResponse.json({
    account: {
      id: account.id,
      email: account.email,
      displayName: account.display_name,
      verified: false,
    },
    claimedRoomIds,
    emailSent: emailResult.sent,
    ownerKey: `account_${account.id.replaceAll("-","")}`,
  });
  applySessionCookie(response, session.token, session.expiresAt);
  return response;
}
