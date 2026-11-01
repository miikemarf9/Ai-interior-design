import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { isAdminAccount, isAdminEmail } from "@/lib/auth/admin";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isAdminAccount(account)) return NextResponse.json({ error: "Admin access is not enabled for this account." }, { status: 403 });

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
  const sql = getCatalogDb();
  const rows = await sql.query(
    `select a.id::text as id,a.email,a.display_name,a.status,a.email_verified_at::text as verified_at,
       a.created_at::text as created_at,a.last_login_at::text as last_login_at,
       coalesce(w.balance,0)::int as credit_balance,
       coalesce(room_counts.rooms,0)::int as rooms,
       coalesce(render_counts.renders,0)::int as renders,
       coalesce(render_counts.cost_usd_micros,0)::bigint as cost_usd_micros,
       activity.last_seen_at::text as last_seen_at
     from public.customer_accounts a
     left join public.design_credit_wallets w on w.account_id=a.id
     left join lateral (select count(*)::int as rooms from public.room_designs d where d.account_id=a.id) room_counts on true
     left join lateral (select count(*)::int as renders,coalesce(sum(g.cost_usd_micros),0)::bigint as cost_usd_micros
       from public.render_generations g join public.room_designs d on d.id=g.design_id where d.account_id=a.id) render_counts on true
     left join lateral (select max(s.last_seen_at) as last_seen_at from public.customer_auth_sessions s
       where s.account_id=a.id and s.revoked_at is null) activity on true
     where ($1='' or a.email ilike '%' || $1 || '%' or coalesce(a.display_name,'') ilike '%' || $1 || '%')
     order by a.created_at desc limit 50`,
    [search],
  ) as Array<Record<string, unknown>>;

  return NextResponse.json({ accounts: rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    lastSeenAt: row.last_seen_at,
    creditBalance: row.credit_balance,
    siteCreditExempt: Boolean(row.verified_at && isAdminEmail(String(row.email))),
    rooms: row.rooms,
    renders: row.renders,
    costUsdMicros: row.cost_usd_micros,
  })) });
}
