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
  "style_choices_submitted",
  "item_choices_submitted",
  "room_saved",
  "web_vital",
]);

function cleanText(value:unknown,max:number){
  return typeof value==="string" ? value.slice(0,max) : null;
}

const roomTypes=new Set(["living_room","bedroom"]);
const styleSlugs=new Set(["modern-organic","modern-country","japandi","mid-century-modern","bold-colourful","contemporary-classic"]);
const categorySlugs=new Set(["sofas","armchairs","coffee-tables","tv-units","side-tables","rugs","floor-lamps","table-lamps","storage-cabinets","beds","bedside-tables","wardrobes","chest-of-drawers","lighting","footstools-pouffes","ceiling-lighting"]);

function cleanList(value:unknown,allowed:Set<string>,limit=12){
  if(!Array.isArray(value)) return [];
  return [...new Set(value.filter((item):item is string=>typeof item==="string"&&allowed.has(item)))].slice(0,limit);
}
function cleanStyles(value:unknown){
  if(!Array.isArray(value)) return [];
  const aliases:Record<string,string>={
    "Modern Organic":"modern-organic","Modern Country":"modern-country","Japandi":"japandi",
    "Mid-Century Modern":"mid-century-modern","Bold & Colourful":"bold-colourful",
    "Contemporary Classic":"contemporary-classic",
  };
  return [...new Set(value.flatMap(item=>{
    if(typeof item!=="string") return [];
    const normalized=aliases[item]||item;
    return styleSlugs.has(normalized)?[normalized]:[];
  }))].slice(0,6);
}
function cleanProducts(value:unknown){
  if(!Array.isArray(value)) return [];
  return value.flatMap(item=>{
    if(!item||typeof item!=="object") return [];
    const row=item as Record<string,unknown>;
    return validUuid(row.productId)&&typeof row.category==="string"&&categorySlugs.has(row.category)
      ? [{productId:row.productId,category:row.category}]
      : [];
  }).slice(0,12);
}
function cleanProperties(eventName:string,raw:Record<string,unknown>){
  const roomType=typeof raw.roomType==="string"&&roomTypes.has(raw.roomType)?raw.roomType:null;
  if(eventName==="style_choices_submitted"){
    const styles=cleanStyles(raw.styles);
    return {roomType,styles,styleCount:styles.length};
  }
  if(eventName==="item_choices_submitted"){
    return {roomType,categories:cleanList(raw.categories,categorySlugs),keptCategories:cleanList(raw.keptCategories,categorySlugs)};
  }
  if(eventName==="products_approved"||eventName==="room_saved"){
    const selectedProducts=cleanProducts(raw.selectedProducts);
    return {
      roomType,
      styles:cleanStyles(raw.styles),
      categories:[...new Set(selectedProducts.map(item=>item.category))],
      selectedProducts,
      productCount:selectedProducts.length,
      ...(Number.isSafeInteger(raw.totalMinor)&&Number(raw.totalMinor)>=0?{totalMinor:Number(raw.totalMinor)}:{}),
    };
  }
  return Object.fromEntries(Object.entries(raw).slice(0,20));
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
  const properties=cleanProperties(eventName,body.properties && typeof body.properties==="object" ? body.properties : {});

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
