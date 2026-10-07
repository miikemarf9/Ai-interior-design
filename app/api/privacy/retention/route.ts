import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

function authorized(request:Request){
  const secret=process.env.PRIVACY_RETENTION_CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization")===`Bearer ${secret}`);
}

export async function POST(request:Request){
  if(!authorized(request)) return NextResponse.json({error:"Unauthorized."},{status:401});
  const sql=getCatalogDb();

  const [sessions,tokens,limits,analytics]=await Promise.all([
    sql.query(
      `delete from public.customer_auth_sessions
       where (expires_at < now() - interval '30 days')
          or (revoked_at is not null and revoked_at < now() - interval '30 days')
       returning id`,
      [],
    ),
    sql.query(
      `delete from public.customer_auth_tokens
       where expires_at < now() - interval '30 days'
          or (used_at is not null and used_at < now() - interval '30 days')
       returning id`,
      [],
    ),
    sql.query(
      `delete from public.security_rate_limits
       where updated_at < now() - interval '7 days'
       returning key_hash`,
      [],
    ),
    sql.query(
      `delete from public.analytics_events
       where created_at < now() - interval '13 months'
       returning id`,
      [],
    ),
  ]);

  return NextResponse.json({
    ok:true,
    deleted:{
      sessions:sessions.length,
      authTokens:tokens.length,
      rateLimits:limits.length,
      analyticsEvents:analytics.length,
    },
  });
}
