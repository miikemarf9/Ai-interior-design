import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";
import { slugify } from "@/lib/growth";

export const runtime = "nodejs";

const roomTypes = new Set(["living_room","bedroom"]);
const styles = new Set([
  "Modern Organic",
  "Modern Country",
  "Japandi",
  "Mid-Century Modern",
  "Bold & Colourful",
  "Contemporary Classic",
]);

function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const generationId=params.get("generationId");
  const account=await getCurrentAccount();
  const sql=getCatalogDb();

  if(generationId){
    if(!account) return NextResponse.json({error:"Sign in to manage your room."},{status:401});
    if(!validUuid(generationId)) return NextResponse.json({error:"Invalid room."},{status:400});
    const ownRows=await sql.query(
      "select id::text as id,slug,title from public.community_rooms where generation_id=$1::uuid and account_id=$2::uuid and status='published' limit 1",
      [generationId,account.id],
    ) as Array<{id:string;slug:string;title:string}>;
    return NextResponse.json({room:ownRows[0] || null});
  }

  const type=params.get("type") || null;
  const style=params.get("style") || null;
  const requestedSort=params.get("sort") || "trending";
  const sort=["trending","top","new"].includes(requestedSort) ? requestedSort : "trending";
  const roomType=type && roomTypes.has(type) ? type : null;
  const styleName=style && styles.has(style) ? style : null;

  const rows=await sql.query(
    "select cr.id::text as id,cr.slug,cr.title,cr.room_type as room_type,cr.styles,rs.share_token::text as share_token,cr.published_at::text as published_at,count(v.account_id)::int as votes,count(v.account_id) filter (where v.created_at>=now()-interval '7 days')::int as recent_votes,coalesce(bool_or(v.account_id=$1::uuid),false) as voted from public.community_rooms cr join public.room_shares rs on rs.id=cr.share_id and rs.is_active join public.render_generations g on g.id=cr.generation_id and jsonb_array_length(coalesce(g.metadata #> '{snapshot,selection,products}','[]'::jsonb))>0 left join public.community_room_votes v on v.community_room_id=cr.id where cr.status='published' and ($2::text is null or cr.room_type=$2) and ($3::text is null or $3=any(cr.styles)) group by cr.id,rs.share_token order by case when $4='top' then count(v.account_id) end desc nulls last,case when $4='trending' then count(v.account_id) filter (where v.created_at>=now()-interval '7 days') end desc nulls last,cr.published_at desc limit 60",
    [account?.id ?? null,roomType,styleName,sort],
  ) as Array<Record<string,unknown>>;

  const rooms=rows.map(row=>({
    id:row.id,
    slug:row.slug,
    title:row.title,
    roomType:row.room_type,
    styles:row.styles,
    shareToken:row.share_token,
    publishedAt:row.published_at,
    votes:row.votes,
    recentVotes:row.recent_votes,
    voted:row.voted,
  }));
  return NextResponse.json({rooms});
}

export async function POST(request:Request){
  const account=await getCurrentAccount();
  if(!account) return NextResponse.json({error:"Sign in to publish a room."},{status:401});

  const body=await request.json() as {
    designId?:string;
    generationId?:string;
    title?:string;
    publicConsent?:boolean;
  };
  const designId=body.designId || "";
  const generationId=body.generationId || "";
  const title=(body.title || "").trim().slice(0,80);

  if(!validUuid(designId) || !validUuid(generationId)){
    return NextResponse.json({error:"This room could not be identified."},{status:400});
  }
  if(!body.publicConsent){
    return NextResponse.json({error:"Please confirm that you want to publish this room publicly."},{status:400});
  }
  if(!title){
    return NextResponse.json({error:"Add a short name for your room."},{status:400});
  }

  const sql=getCatalogDb();
  const sourceRows=await sql.query(
    "select d.room_type,d.intake,jsonb_array_length(coalesce(g.metadata #> '{snapshot,selection,products}','[]'::jsonb))>0 as has_products,exists (select 1 from public.room_verifications rv where rv.generation_id=g.id and rv.status in ('complete','partial') and rv.overall_status<>'failed') as verified from public.room_designs d join public.render_generations g on g.id=$2::uuid and g.design_id=d.id and g.status='succeeded' and g.result_asset_id is not null where d.id=$1::uuid and d.account_id=$3::uuid limit 1",
    [designId,generationId,account.id],
  ) as Array<{room_type:string;intake:any;has_products:boolean;verified:boolean}>;

  const source=sourceRows[0];
  if(!source) return NextResponse.json({error:"Finished room not found in your account."},{status:404});
  if(!source.has_products) return NextResponse.json({error:"Only room designs with reviewed products can be published to the community."},{status:409});
  if(!source.verified){
    return NextResponse.json({error:"Complete the room check before publishing it."},{status:409});
  }
  if(!roomTypes.has(source.room_type)){
    return NextResponse.json({error:"This room type is not available in the community gallery yet."},{status:409});
  }

  await sql.query(
    "insert into public.room_shares (design_id,generation_id) values ($1::uuid,$2::uuid) on conflict (generation_id) where is_active do nothing",
    [designId,generationId],
  );
  const shareRows=await sql.query(
    "select id::text as id,share_token::text as token from public.room_shares where generation_id=$1::uuid and is_active limit 1",
    [generationId],
  ) as Array<{id:string;token:string}>;
  const share=shareRows[0];
  if(!share) return NextResponse.json({error:"A public room link could not be created."},{status:500});

  const selectedStyles=Array.isArray(source.intake?.styles)
    ? source.intake.styles.filter((value:unknown):value is string=>typeof value==="string" && styles.has(value))
    : [];
  const slug=slugify(title)+"-"+generationId.slice(0,8).toLowerCase();
  const rows=await sql.query(
    "insert into public.community_rooms (design_id,generation_id,share_id,account_id,slug,title,room_type,styles,status,consent_at,published_at,updated_at) values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,'published',now(),now(),now()) on conflict (generation_id) do update set share_id=excluded.share_id,slug=excluded.slug,title=excluded.title,room_type=excluded.room_type,styles=excluded.styles,status='published',consent_at=now(),published_at=coalesce(public.community_rooms.published_at,now()),updated_at=now() where public.community_rooms.account_id=excluded.account_id returning id::text as id,slug,title",
    [designId,generationId,share.id,account.id,slug,title,source.room_type,selectedStyles],
  ) as Array<{id:string;slug:string;title:string}>;

  if(!rows[0]) return NextResponse.json({error:"This finished room could not be published."},{status:409});
  return NextResponse.json({room:rows[0],sharePath:"/room/share/"+share.token});
}
