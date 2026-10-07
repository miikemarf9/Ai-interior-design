import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

const allowedEvents=new Set([
  "page_view",
  "design_started",
  "brief_approved",
  "products_approved",
  "render_started",
  "render_succeeded",
  "render_failed",
  "room_shared",
  "retailer_clicked",
  "web_vital",
]);

function cleanText(value:unknown,max:number){
  return typeof value==="string" ? value.slice(0,max) : null;
}

function validUuid(value:unknown){
  return typeof value==="string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request:Request){
  const cookieStore=await cookies();
  if(cookieStore.get("roomfound_consent")?.value!=="analytics"){
    return new NextResponse(null,{status:204});
  }

  const body=await request.json() as {
    eventName?:string;
    path?:string;
    referrerHost?:string;
    designId?:string;
    generationId?:string;
    properties?:Record<string,unknown>;
  };

  const eventName=body.eventName || "";
  if(!allowedEvents.has(eventName)){
    return NextResponse.json({error:"Unsupported analytics event."},{status:400});
  }

  const existingSession=cookieStore.get("roomfound_analytics")?.value;
  const sessionKey=/^[a-zA-Z0-9_-]{16,100}$/.test(existingSession || "")
    ? existingSession!
    : `a_${randomUUID().replaceAll("-","")}`;

  const account=await getCurrentAccount();
  const properties=body.properties && typeof body.properties==="object"
    ? Object.fromEntries(Object.entries(body.properties).slice(0,20))
    : {};

  const sql=getCatalogDb();
  await sql.query(
    `insert into public.analytics_events (
      session_key,account_id,design_id,generation_id,event_name,path,referrer_host,properties
    )
    values ($1,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8::jsonb)`,
    [
      sessionKey,
      account?.id ?? null,
      validUuid(body.designId) ? body.designId : null,
      validUuid(body.generationId) ? body.generationId : null,
      eventName,
      cleanText(body.path,300),
      cleanText(body.referrerHost,180),
      JSON.stringify(properties),
    ],
  );

  const response=NextResponse.json({ok:true});
  if(!existingSession){
    response.cookies.set("roomfound_analytics",sessionKey,{
      httpOnly:true,
      sameSite:"lax",
      secure:process.env.NODE_ENV==="production",
      path:"/",
      maxAge:60*60*24*30,
    });
  }
  return response;
}
