import { NextResponse } from "next/server";
import {
  applySessionCookie,
  createSession,
  hashToken,
} from "@/lib/auth";
import {
  enqueueCrmEvent,
  ensureAccountWallet,
} from "@/lib/auth/account";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return NextResponse.redirect(new URL("/account?verification=invalid", request.url));

  const sql = getCatalogDb();
  const rows = await sql.query(
    `with consumed as (
      update public.customer_auth_tokens
      set used_at=now()
      where token_hash=$1
        and purpose='verify_email'
        and used_at is null
        and expires_at > now()
      returning account_id
    ),
    verified as (
      update public.customer_accounts a
      set email_verified_at=coalesce(email_verified_at,now()),updated_at=now()
      from consumed c
      where a.id=c.account_id
      returning a.id::text as id,a.email,a.display_name
    )
    select * from verified`,
    [hashToken(token)],
  ) as Array<{ id: string; email: string; display_name: string | null }>;

  const account = rows[0];
  if (!account) {
    return NextResponse.redirect(new URL("/account?verification=invalid", request.url));
  }

  await ensureAccountWallet(account.id, true);
  await enqueueCrmEvent(account.id, "email_verified", "customer", account.id, {
    email: account.email,
  });

  const session = await createSession(account.id);
  const response = NextResponse.redirect(new URL("/account?verified=1", request.url));
  applySessionCookie(response, session.token, session.expiresAt);
  return response;
}
