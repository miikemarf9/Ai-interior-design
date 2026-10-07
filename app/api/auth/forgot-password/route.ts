import { NextResponse } from "next/server";
import { issueAuthToken, normalizeEmail } from "@/lib/auth";
import { sendResetEmail } from "@/lib/auth/email";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string };
  const email = normalizeEmail(body.email || "");
  const sql = getCatalogDb();

  const rows = await sql.query(
    `select id::text as id,email
     from public.customer_accounts
     where lower(email)=lower($1) and status='active'
     limit 1`,
    [email],
  ) as Array<{ id: string; email: string }>;

  const account = rows[0];
  if (account) {
    const token = await issueAuthToken(account.id, "reset_password", 1);
    await sendResetEmail(account.email, token, new URL(request.url).origin);
  }

  return NextResponse.json({ ok: true });
}
