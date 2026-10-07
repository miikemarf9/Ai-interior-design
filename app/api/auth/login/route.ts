import { NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";
import {
  applySessionCookie,
  canonicalOwnerKey,
  createSession,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth";
import {
  claimAnonymousRooms,
  ensureAccountWallet,
  ensurePrimaryHome,
} from "@/lib/auth/account";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as {
    email?: string;
    password?: string;
    ownerKey?: string;
  };

  const email = normalizeEmail(body.email || "");
  const password = body.password || "";
  const rate = await checkAuthRateLimit({ request, action: "login", identity: email, limit: 8 });
  if (!rate.allowed) {
    return NextResponse.json({ error: rate.configured ? "Too many sign-in attempts. Try again later." : "Account security is not configured." }, {
      status: rate.configured ? 429 : 503,
      headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : undefined,
    });
  }
  const sql = getCatalogDb();

  const rows = await sql.query(
    `select id::text as id,email,display_name,password_hash,email_verified_at::text
     from public.customer_accounts
     where lower(email)=lower($1) and status='active'
     limit 1`,
    [email],
  ) as Array<{
    id: string;
    email: string;
    display_name: string | null;
    password_hash: string;
    email_verified_at: string | null;
  }>;

  const account = rows[0];
  if (!account || !verifyPassword(password, account.password_hash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await ensurePrimaryHome(account.id);
  await ensureAccountWallet(account.id, Boolean(account.email_verified_at));
  const claimedRoomIds = await claimAnonymousRooms(account.id, body.ownerKey || null);
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
      verified: Boolean(account.email_verified_at),
    },
    claimedRoomIds,
    ownerKey: canonicalOwnerKey(account.id),
  });
  applySessionCookie(response, session.token, session.expiresAt);
  return response;
}
