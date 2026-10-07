import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";
import { slugify } from "@/lib/growth";

export const runtime="nodejs";

function authorized(request:Request){
  const secret=process.env.GROWTH_ADMIN_SECRET;
  return Boolean(secret && request.headers.get("authorization")===`Bearer ${secret}`);
}

function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request:Request){
  if(!authorized(request)) return NextResponse.json({error:"Unauthorized."},{status:401});

  const body=await request.json() as {
    designId?:string;
    generationId?:string;
    title?:string;
    excerpt?:string;
    slug?:string;
    tags?:string[];
  };
  const designId=body.designId || "";
  const generationId=body.generationId || "";
  if(!validUuid(designId) || !validUuid(generationId)){
    return NextResponse.json({error:"Invalid design."},{status:400});
  }

  const sql=getCatalogDb();
  const rows=await sql.query(
    `select
      d.id::text as design_id,d.intake,d.brief,d.product_selection,
      rs.id::text as share_id,
      rv.id::text as verification_id,rv.overall_status
     from public.room_designs d
     join public.render_generations g
       on g.id=$2::uuid and g.design_id=d.id and g.status='succeeded'
     join public.room_shares rs
       on rs.generation_id=g.id and rs.design_id=d.id and rs.is_active
     join public.room_verifications rv
       on rv.generation_id=g.id and rv.status in ('complete','partial')
     where d.id=$1::uuid
     order by rv.completed_at desc nulls last
     limit 1`,
    [designId,generationId],
  ) as Array<any>;

  const source=rows[0];
  if(!source){
    return NextResponse.json({
      error:"Publish the room via a share link and complete Verified Room before SEO publication.",
    },{status:409});
  }
  if(source.overall_status==="failed"){
    return NextResponse.json({error:"A failed Verified Room cannot be published."},{status:409});
  }

  const allowed=await sql.query(
    `select tag_slug from public.growth_collections where status='active'`,
    [],
  ) as Array<{tag_slug:string}>;
  const allowedTags=new Set(allowed.map((row)=>row.tag_slug));
  const tags=new Set((body.tags || []).filter((tag)=>allowedTags.has(tag)));

  const total=typeof source.product_selection?.totalMinor==="number"
    ? source.product_selection.totalMinor
    : null;
  if(total!==null && total<=150000) tags.add("under-1500");

  const width=Number(source.intake?.measurements?.width);
  const length=Number(source.intake?.measurements?.length);
  if(Number.isFinite(width) && Number.isFinite(length) && width>0 && length>0 && (width*length/10000)<=20){
    tags.add("small-living-room");
  }

  const paletteText=[
    source.brief?.palette,
    ...(Array.isArray(source.intake?.colours) ? source.intake.colours : []),
  ].filter(Boolean).join(" ").toLowerCase();
  if(/warm|neutral|cream|beige|taupe|oat|sand/.test(paletteText)) tags.add("warm-neutral");

  const title=(body.title || source.brief?.title || "Designed living room").trim().slice(0,120);
  const excerpt=(body.excerpt || source.brief?.direction || "A real Roomfound living-room design using shoppable UK products.").trim().slice(0,320);
  const slug=slugify(body.slug || title);
  const productCount=Array.isArray(source.product_selection?.products)
    ? source.product_selection.products.length
    : 0;

  const published=await sql.query(
    `insert into public.growth_publications (
      design_id,generation_id,share_id,verification_id,slug,title,excerpt,
      room_total_minor,product_count,tags,status,published_at
    )
    values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,'published',now())
    on conflict (generation_id) do update
    set share_id=excluded.share_id,
        verification_id=excluded.verification_id,
        slug=excluded.slug,
        title=excluded.title,
        excerpt=excluded.excerpt,
        room_total_minor=excluded.room_total_minor,
        product_count=excluded.product_count,
        tags=excluded.tags,
        status='published',
        published_at=coalesce(public.growth_publications.published_at,now()),
        updated_at=now()
    returning id::text as id,slug`,
    [designId,generationId,source.share_id,source.verification_id,slug,title,excerpt,total,productCount,[...tags]],
  ) as Array<{id:string;slug:string}>;

  const publication=published[0];

  await sql.query(
    `delete from public.growth_collection_publications where publication_id=$1::uuid`,
    [publication.id],
  );
  await sql.query(
    `insert into public.growth_collection_publications (collection_id,publication_id,relevance_score)
     select id,$1::uuid,80
     from public.growth_collections
     where tag_slug=any($2::text[]) and status='active'
     on conflict do nothing`,
    [publication.id,[...tags]],
  );

  return NextResponse.json({
    ok:true,
    slug:publication.slug,
    tags:[...tags],
    path:`/rooms/${publication.slug}`,
  });
}
