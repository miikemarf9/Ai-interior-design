import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

const allowed=new Set(["access","deletion","correction","restriction","objection"]);

export async function GET(){
  const account=await getCurrentAccount();
  if(!account) return NextResponse.json({error:"Sign in first."},{status:401});
  const sql=getCatalogDb();
  const rows=await sql.query(
    `select id::text,request_type,status,requested_at::text,completed_at::text
     from public.privacy_requests
     where account_id=$1::uuid
     order by requested_at desc`,
    [account.id],
  );
  return NextResponse.json({requests:rows});
}

export async function POST(request:Request){
  const account=await getCurrentAccount();
  if(!account) return NextResponse.json({error:"Sign in first."},{status:401});

  const body=await request.json() as {type?:string};
  const type=body.type || "";
  if(!allowed.has(type)) return NextResponse.json({error:"Unsupported privacy request."},{status:400});

  const sql=getCatalogDb();
  const existing=await sql.query(
    `select id::text,status
     from public.privacy_requests
     where account_id=$1::uuid and request_type=$2 and status in ('open','in_progress')
     order by requested_at desc limit 1`,
    [account.id,type],
  ) as Array<{id:string;status:string}>;

  if(existing[0]) return NextResponse.json({ok:true,request:existing[0],reused:true});

  const rows=await sql.query(
    `insert into public.privacy_requests (account_id,request_type,metadata)
     values ($1::uuid,$2,jsonb_build_object('source','self_service'))
     returning id::text,request_type,status,requested_at::text`,
    [account.id,type],
  );

  return NextResponse.json({ok:true,request:rows[0],reused:false});
}
