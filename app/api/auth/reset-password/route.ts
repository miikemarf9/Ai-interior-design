import { NextResponse } from "next/server";
import {
  applySessionCookie,
  createSession,
  hashPassword,
  hashToken,
} from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { token?: string; password?: string };
  const token = body.token || "";
  const password = body.password || "";

  if (password.length < 10 || password.length > 200) {
    return NextResponse.json({ error: "Use a password with at least 10 characters." }, { status: 400 });
  }

  const sql = getCatalogDb();
  const rows = await sql.query(
    `with consumed as (
      update public.customer_auth_tokens
      set used_at=now()
      where token_hash=$1
        and purpose='reset_password'
        and used_at is null
        and expires_at > now()
      returning account_id
    ),
    changed as (
      update public.customer_accounts a
      set password_hash=$2,password_updated_at=now(),updated_at=now()
      from consumed c
      where a.id=c.account_id
      returning a.id::text as id
    )
    select id from changed`,
    [hashToken(token), hashPassword(password)],
  ) as Array<{ id: string }>;

  const account = rows[0];
  if (!account) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  await sql.query(
    `update public.customer_auth_sessions
     set revoked_at=coalesce(revoked_at,now())
     where account_id=$1::uuid`,
    [account.id],
  );

  const session = await createSession(account.id);
  const response = NextResponse.json({ ok: true });
  applySessionCookie(response, session.token, session.expiresAt);
  return response;
}
