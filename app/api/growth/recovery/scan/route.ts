import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

function authorized(request:Request){
  const secret=process.env.GROWTH_CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization")===`Bearer ${secret}`);
}

export async function POST(request:Request){
  if(!authorized(request)) return NextResponse.json({error:"Unauthorized."},{status:401});

  const hours=Math.max(24,Math.min(336,Number(process.env.GROWTH_ABANDONED_HOURS || 48) || 48));
  const sql=getCatalogDb();

  const recovered=await sql.query(
    `update public.growth_recovery_candidates grc
     set state='recovered',recovered_at=now(),updated_at=now()
     from public.room_designs d
     where d.id=grc.design_id
       and grc.state in ('detected','queued')
       and (d.status='rendered' or d.updated_at > grc.abandoned_at)
     returning grc.id`,
    [],
  );

  const candidates=await sql.query(
    `with eligible as (
      select d.id as design_id,d.account_id,d.status,d.updated_at
      from public.room_designs d
      join public.customer_accounts a on a.id=d.account_id
      where d.account_id is not null
        and d.status in ('intake','brief','products','render_ready')
        and d.updated_at < now() - ($1 || ' hours')::interval
        and a.status='active'
        and a.email_verified_at is not null
        and a.marketing_email_consent_at is not null
        and a.marketing_email_opted_out_at is null
        and not exists (
          select 1 from public.growth_recovery_candidates existing
          where existing.design_id=d.id
        )
    ),
    inserted as (
      insert into public.growth_recovery_candidates (
        design_id,account_id,state,stage,abandoned_at,metadata
      )
      select design_id,account_id,'detected',status,updated_at,
        jsonb_build_object('threshold_hours',$1)
      from eligible
      returning id,design_id,account_id,stage,abandoned_at
    ),
    outbox as (
      insert into public.crm_outbox (
        account_id,event_type,aggregate_type,aggregate_id,payload
      )
      select
        i.account_id,'design_abandoned','room',i.design_id,
        jsonb_build_object(
          'designId',i.design_id,
          'stage',i.stage,
          'abandonedAt',i.abandoned_at,
          'campaignEligible',true,
          'source','roomfound_growth'
        )
      from inserted i
      returning id,aggregate_id
    )
    update public.growth_recovery_candidates grc
    set state='queued',queued_at=now(),crm_outbox_id=o.id,updated_at=now()
    from outbox o
    where grc.design_id=o.aggregate_id
    returning grc.id::text as id,grc.design_id::text as design_id,grc.stage`,
    [String(hours)],
  ) as Array<{id:string;design_id:string;stage:string}>;

  return NextResponse.json({
    thresholdHours:hours,
    recovered:recovered.length,
    queued:candidates.length,
    candidates,
    note:"Only verified accounts with explicit marketing-email consent are eligible.",
  });
}
