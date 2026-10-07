import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

export async function GET(){
  const account=await getCurrentAccount();
  if(!account) return NextResponse.json({error:"Sign in first."},{status:401});

  const sql=getCatalogDb();
  const [
    accountRows,
    homes,
    designs,
    credits,
    affiliate,
    analytics,
    feedback,
    requests,
    sessions,
  ]=await Promise.all([
    sql.query(
      `select id::text,email,display_name,status,email_verified_at::text,
              last_login_at::text,created_at::text,updated_at::text,
              marketing_email_consent_at::text,marketing_email_opted_out_at::text,
              analytics_consent_at::text,analytics_opted_out_at::text
       from public.customer_accounts where id=$1::uuid`,
      [account.id],
    ),
    sql.query(
      `select id::text,name,created_at::text,updated_at::text
       from public.customer_homes where account_id=$1::uuid order by created_at`,
      [account.id],
    ),
    sql.query(
      `select id::text,home_id::text,room_name,room_type,status,intake,brief,product_selection,
              approved_brief_at::text,approved_products_at::text,created_at::text,updated_at::text
       from public.room_designs where account_id=$1::uuid order by created_at`,
      [account.id],
    ),
    sql.query(
      `select l.event_type,l.amount,l.design_id::text,l.generation_id::text,l.metadata,l.created_at::text
       from public.design_credit_ledger l
       join public.design_credit_wallets w on w.id=l.wallet_id
       where w.account_id=$1::uuid
       order by l.created_at`,
      [account.id],
    ),
    sql.query(
      `select ac.click_ref,ac.design_id::text,ac.generation_id::text,ac.product_id::text,
              ac.variant_id::text,ac.offer_id::text,ac.retailer_id::text,ac.network,
              ac.sale_value_snapshot_minor,ac.currency,ac.expected_revenue_minor,
              ac.surface,ac.clicked_at::text
       from public.affiliate_clicks ac
       join public.room_designs d on d.id=ac.design_id
       where d.account_id=$1::uuid
       order by ac.clicked_at`,
      [account.id],
    ),
    sql.query(
      `select event_name,path,referrer_host,properties,created_at::text
       from public.analytics_events
       where account_id=$1::uuid
       order by created_at`,
      [account.id],
    ),
    sql.query(
      `select design_id::text,rating,feedback,page_path,created_at::text
       from public.beta_feedback
       where account_id=$1::uuid
       order by created_at`,
      [account.id],
    ),
    sql.query(
      `select id::text,request_type,status,requested_at::text,completed_at::text
       from public.privacy_requests
       where account_id=$1::uuid
       order by requested_at`,
      [account.id],
    ),
    sql.query(
      `select created_at::text,last_seen_at::text,expires_at::text,revoked_at::text
       from public.customer_auth_sessions
       where account_id=$1::uuid
       order by created_at`,
      [account.id],
    ),
  ]);

  const payload={
    exportedAt:new Date().toISOString(),
    account:accountRows[0] || null,
    homes,
    rooms:designs,
    creditLedger:credits,
    retailerInteractions:affiliate,
    optionalAnalytics:analytics,
    betaFeedback:feedback,
    privacyRequests:requests,
    securitySessions:sessions,
    note:"Security token hashes and password hashes are intentionally excluded from this self-service export.",
  };

  return new NextResponse(JSON.stringify(payload,null,2),{
    status:200,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Content-Disposition":`attachment; filename="roomfound-data-${new Date().toISOString().slice(0,10)}.json"`,
      "Cache-Control":"no-store",
    },
  });
}
