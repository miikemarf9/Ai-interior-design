import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";
import { authRateLimitConfigured } from "@/lib/security/rate-limit";

export const runtime="nodejs";

function authorized(request:Request){
  const secret=process.env.BETA_ADMIN_SECRET;
  return Boolean(secret && request.headers.get("authorization")===`Bearer ${secret}`);
}

function configured(value:string|undefined){
  return Boolean(value && value.trim() && !value.includes("localhost"));
}

export async function GET(request:Request){
  if(!authorized(request)) return NextResponse.json({error:"Unauthorized."},{status:401});

  const sql=getCatalogDb();
  const [
    funnelRows,
    renderRows,
    catalogueRows,
    authRows,
    privacyRows,
    economicsRows,
    commerceRows,
    analyticsRows,
  ]=await Promise.all([
    sql.query(
      `select
        count(*)::int as designs_started,
        count(*) filter (where approved_brief_at is not null)::int as briefs_approved,
        count(*) filter (where approved_products_at is not null)::int as products_approved,
        count(*) filter (where exists (
          select 1 from public.render_generations g where g.design_id=d.id and g.status='succeeded'
        ))::int as rooms_rendered,
        count(*) filter (where exists (
          select 1 from public.room_verifications rv where rv.design_id=d.id and rv.status in ('complete','partial')
        ))::int as rooms_verified,
        count(*) filter (where exists (
          select 1 from public.affiliate_clicks ac where ac.design_id=d.id
        ))::int as rooms_with_retailer_click,
        count(*) filter (where exists (
          select 1
          from public.affiliate_conversions conv
          join public.affiliate_clicks ac on ac.id=conv.click_id
          where ac.design_id=d.id and conv.status in ('pending','approved')
        ))::int as rooms_with_conversion
       from public.room_designs d`,
      [],
    ),
    sql.query(
      `select
        count(*) filter (where status='succeeded')::int as succeeded,
        count(*) filter (where status='failed')::int as failed,
        count(*) filter (where status='processing' and created_at < now()-interval '10 minutes')::int as stuck_processing,
        coalesce(sum(cost_usd_micros) filter (where status in ('succeeded','failed')),0)::bigint as cost_usd_micros,
        coalesce(sum(cost_gbp_minor) filter (where status in ('succeeded','failed')),0)::bigint as cost_gbp_minor,
        percentile_cont(0.95) within group (order by duration_ms)
          filter (where duration_ms is not null and status='succeeded') as p95_duration_ms
       from public.render_generations`,
      [],
    ),
    sql.query(
      `select
        count(*) filter (
          where ro.is_active and coalesce(ro.last_checked_at,'epoch'::timestamptz) < now()-interval '7 days'
        )::int as stale_active_offers,
        count(*) filter (
          where ro.is_active and (
            ro.availability in ('out_of_stock','unknown')
            or ro.uk_delivery_status in ('unavailable','unknown')
          )
        )::int as unusable_active_offers,
        count(*) filter (where ro.is_active)::int as active_offers,
        (
          select count(*)::int
          from public.product_variants v
          join public.products p on p.id=v.product_id
          where p.status='active' and p.is_curated and v.status='active'
            and not exists (
              select 1 from public.retailer_offers live
              join public.retailers r on r.id=live.retailer_id
              where live.variant_id=v.id
                and live.is_active
                and live.currency='GBP'
                and live.availability in ('in_stock','low_stock','preorder')
                and live.uk_delivery_status in ('available','restricted')
                and r.status='active' and r.ships_to_uk
            )
        ) as curated_variants_without_live_offer
       from public.retailer_offers ro`,
      [],
    ),
    sql.query(
      `select
        (select count(*) from public.customer_accounts where status='active')::int as active_accounts,
        (select count(*) from public.customer_accounts where email_verified_at is not null and status='active')::int as verified_accounts,
        (select count(*) from public.customer_auth_sessions where revoked_at is null and expires_at>now())::int as active_sessions,
        (select count(*) from public.design_credit_wallets where balance < 0)::int as negative_wallets,
        (
          select count(*)::int
          from public.design_credit_wallets w
          left join lateral (
            select coalesce(sum(l.amount),0)::int as ledger_balance
            from public.design_credit_ledger l
            where l.wallet_id=w.id
          ) ledger on true
          where w.balance <> ledger.ledger_balance
        ) as wallet_ledger_mismatches,
        (
          select count(*)::int
          from public.design_credit_wallets w
          where (
            select count(*)
            from public.design_credit_ledger l
            where l.wallet_id=w.id and l.event_type='signup_grant'
          ) > 1
        ) as duplicate_signup_grants,
        (select coalesce(sum(balance),0) from public.design_credit_wallets where verification_status='verified')::bigint as outstanding_verified_credits`,
      [],
    ),
    sql.query(
      `select
        count(*) filter (where status in ('open','in_progress'))::int as open_requests,
        count(*) filter (where request_type='deletion' and status in ('open','in_progress'))::int as open_deletion_requests
       from public.privacy_requests`,
      [],
    ),
    sql.query(
      `select
        count(*) filter (where successful_renders>0)::int as rendered_rooms,
        coalesce(sum(ai_cost_usd_micros),0)::bigint as ai_cost_usd_micros,
        coalesce(sum(ai_cost_gbp_minor),0)::bigint as ai_cost_gbp_minor,
        coalesce(sum(expected_revenue_gbp_minor),0)::bigint as expected_revenue_gbp_minor,
        coalesce(sum(pending_revenue_gbp_minor),0)::bigint as pending_revenue_gbp_minor,
        coalesce(sum(approved_revenue_gbp_minor),0)::bigint as approved_revenue_gbp_minor,
        coalesce(sum(approved_contribution_gbp_minor),0)::bigint as approved_contribution_gbp_minor,
        avg(ai_cost_gbp_minor) filter (where successful_renders>0 and ai_cost_gbp_minor is not null) as avg_ai_cost_per_rendered_room_gbp_minor,
        avg(approved_revenue_gbp_minor) filter (where successful_renders>0) as avg_approved_revenue_per_rendered_room_gbp_minor
       from public.beta_room_economics`,
      [],
    ),
    sql.query(
      `select
        (select count(*) from public.affiliate_programs where status='active')::int as active_affiliate_programs,
        (select count(*) from public.affiliate_clicks)::int as clicks,
        (select count(*) from public.affiliate_conversions)::int as conversions,
        (select count(*) from public.affiliate_conversions where status='approved')::int as approved_conversions`,
      [],
    ),
    sql.query(
      `select
        count(*)::int as events,
        count(distinct session_key) filter (where session_key is not null)::int as analytics_sessions,
        count(*) filter (where event_name='page_view')::int as page_views
       from public.analytics_events`,
      [],
    ),
  ]);

  const fx=Number(process.env.AI_COST_USD_TO_GBP_RATE || "");
  const config={
    canonicalSiteUrl:configured(process.env.NEXT_PUBLIC_SITE_URL),
    database:Boolean(process.env.DATABASE_URL),
    openAi:Boolean(process.env.OPENAI_API_KEY),
    authRateLimiting:authRateLimitConfigured(),
    transactionalEmail:Boolean(process.env.RESEND_API_KEY && process.env.AUTH_FROM_EMAIL && process.env.APP_URL),
    privacyContact:Boolean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL),
    retentionCron:Boolean(process.env.PRIVACY_RETENTION_CRON_SECRET),
    commerceSync:Boolean(process.env.COMMERCE_SYNC_SECRET),
    growthAdmin:Boolean(process.env.GROWTH_ADMIN_SECRET),
    growthRecovery:Boolean(process.env.GROWTH_CRON_SECRET),
    economicsFx:Number.isFinite(fx) && fx>0,
    finalLegalReview:process.env.LEGAL_REVIEW_COMPLETE==="true",
    controlledBeta:process.env.BETA_CONTROLLED_ACCESS==="true",
    betaSignupCode:Boolean(process.env.BETA_SIGNUP_CODE),
  };

  const renders=renderRows[0] as any;
  const catalogue=catalogueRows[0] as any;
  const auth=authRows[0] as any;
  const attempts=(Number(renders.succeeded)||0)+(Number(renders.failed)||0);
  const renderFailureRate=attempts
    ? Number(renders.failed)/attempts
    : 0;

  const blockers:string[]=[];
  if(!config.canonicalSiteUrl) blockers.push("Set the canonical production URL.");
  if(!config.database) blockers.push("DATABASE_URL is missing.");
  if(!config.openAi) blockers.push("OPENAI_API_KEY is missing.");
  if(!config.authRateLimiting) blockers.push("AUTH_RATE_LIMIT_SECRET is missing.");
  if(!config.transactionalEmail) blockers.push("Transactional account email is not fully configured.");
  if(!config.privacyContact) blockers.push("Publish a privacy contact.");
  if(!config.retentionCron) blockers.push("Configure the privacy-retention job secret.");
  if(!config.economicsFx) blockers.push("Set AI_COST_USD_TO_GBP_RATE so room economics are comparable in GBP.");
  if(!config.finalLegalReview) blockers.push("Final UK legal/data-protection review is not marked complete.");
  if(!config.controlledBeta) blockers.push("Controlled beta access is not enabled.");
  if(config.controlledBeta && !config.betaSignupCode) blockers.push("Controlled beta signup code is missing.");
  if(Number(auth.negative_wallets)>0) blockers.push("A design-credit wallet has a negative balance.");
  if(Number(auth.wallet_ledger_mismatches)>0) blockers.push("A credit wallet balance does not match its immutable ledger.");
  if(Number(auth.duplicate_signup_grants)>0) blockers.push("A wallet has more than one signup credit grant.");
  if(Number(renders.stuck_processing)>0) blockers.push("At least one render is stuck in processing.");
  if(attempts>=10 && renderFailureRate>0.1) blockers.push("Render failure rate is above the 10% beta threshold.");
  if(Number(catalogue.stale_active_offers)>0) blockers.push("Active retailer offers are older than the 7-day beta freshness threshold.");

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    beta:{
      market:"United Kingdom",
      roomScope:"living_room",
      access:"controlled",
      paidCreditCheckout:false,
      launchReady:blockers.length===0,
      blockers,
    },
    config,
    funnel:funnelRows[0],
    renders:{...renders,failure_rate:renderFailureRate},
    catalogue,
    auth,
    privacy:privacyRows[0],
    unitEconomics:economicsRows[0],
    commerce:commerceRows[0],
    analytics:analyticsRows[0],
  });
}
