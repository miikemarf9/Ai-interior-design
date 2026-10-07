import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret=process.env.CRM_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if(!authorized(request)) return NextResponse.json({error:"Unauthorized."},{status:401});

  const endpoint=process.env.GRABANDBOOK_CRM_ENDPOINT;
  const bridgeSecret=process.env.GRABANDBOOK_BRIDGE_SECRET;
  if(!endpoint || !bridgeSecret){
    return NextResponse.json({
      error:"Grab&Book CRM bridge is not configured.",
      pending:true,
    },{status:503});
  }

  const sql=getCatalogDb();
  const rows=await sql.query(
    `select
      o.id::text as id,
      o.account_id::text as account_id,
      o.event_type,
      o.aggregate_type,
      o.aggregate_id::text as aggregate_id,
      o.payload,
      o.attempts,
      o.created_at::text as created_at,
      a.email,
      a.display_name
    from public.crm_outbox o
    join public.customer_accounts a on a.id=o.account_id
    where o.status in ('pending','failed')
      and o.available_at <= now()
    order by o.created_at
    limit 25`,
    [],
  ) as Array<{
    id:string;
    account_id:string;
    event_type:string;
    aggregate_type:string;
    aggregate_id:string|null;
    payload:Record<string,unknown>;
    attempts:number;
    created_at:string;
    email:string;
    display_name:string|null;
  }>;

  let processed=0;
  const failed:Array<{id:string;error:string}>=[];

  for(const row of rows){
    await sql.query(
      `update public.crm_outbox
       set status='processing',attempts=attempts+1
       where id=$1::uuid`,
      [row.id],
    );

    try{
      const response=await fetch(endpoint,{
        method:"POST",
        headers:{
          Authorization:`Bearer ${bridgeSecret}`,
          "Content-Type":"application/json",
        },
        body:JSON.stringify({
          source:"roomfound",
          eventId:row.id,
          eventType:row.event_type,
          account:{
            id:row.account_id,
            email:row.email,
            displayName:row.display_name,
          },
          aggregate:{
            type:row.aggregate_type,
            id:row.aggregate_id,
          },
          payload:row.payload,
          occurredAt:row.created_at,
        }),
      });

      if(!response.ok){
        const detail=await response.text().catch(()=>"");
        throw new Error(`Grab&Book HTTP ${response.status}: ${detail.slice(0,300)}`);
      }

      await sql.query(
        `update public.crm_outbox
         set status='processed',processed_at=now(),last_error=null
         where id=$1::uuid`,
        [row.id],
      );
      await sql.query(
        `update public.crm_contact_links
         set sync_status='synced',last_synced_at=now(),last_error=null,updated_at=now()
         where account_id=$1::uuid and provider='grabandbook'`,
        [row.account_id],
      );
      processed+=1;
    }catch(error){
      const message=error instanceof Error ? error.message : "CRM sync failed.";
      failed.push({id:row.id,error:message});
      await sql.query(
        `update public.crm_outbox
         set status='failed',
             available_at=now() + interval '15 minutes',
             last_error=$2
         where id=$1::uuid`,
        [row.id,message.slice(0,1500)],
      );
      await sql.query(
        `update public.crm_contact_links
         set sync_status='failed',last_error=$2,updated_at=now()
         where account_id=$1::uuid and provider='grabandbook'`,
        [row.account_id,message.slice(0,1500)],
      );
    }
  }

  return NextResponse.json({
    seen:rows.length,
    processed,
    failed,
  });
}
