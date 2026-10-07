import { getCatalogDb } from "@/lib/catalog/neon";

export type GrowthCollection = {
  id:string;
  slug:string;
  title:string;
  eyebrow:string|null;
  intro:string;
  metaTitle:string;
  metaDescription:string;
  tagSlug:string;
  minRoomsForIndex:number;
  roomCount:number;
  indexable:boolean;
  rooms:GrowthRoomCard[];
};

export type GrowthRoomCard = {
  slug:string;
  title:string;
  excerpt:string;
  designId:string;
  generationId:string;
  roomTotalMinor:number|null;
  productCount:number;
  tags:string[];
  verificationStatus:string|null;
  imageUrl:string;
};

export type GrowthPublication = GrowthRoomCard & {
  publishedAt:string|null;
  brief:any;
  selection:any;
  verificationId:string|null;
  verificationStatus:string|null;
};

export function siteUrl(){
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/,"");
}

export function slugify(value:string){
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,80) || "room";
}

export async function listGrowthCollections():Promise<GrowthCollection[]>{
  const sql=getCatalogDb();
  const rows=await sql.query(
    `select
      c.id::text as id,c.slug,c.title,c.eyebrow,c.intro,c.meta_title,c.meta_description,
      c.tag_slug,c.min_rooms_for_index,
      count(gp.id)::int as room_count
     from public.growth_collections c
     left join public.growth_collection_publications gcp on gcp.collection_id=c.id
     left join public.growth_publications gp
       on gp.id=gcp.publication_id and gp.status='published'
     where c.status='active'
     group by c.id
     order by c.sort_order,c.title`,
    [],
  ) as Array<any>;

  return rows.map((row)=>({
    id:row.id,
    slug:row.slug,
    title:row.title,
    eyebrow:row.eyebrow,
    intro:row.intro,
    metaTitle:row.meta_title,
    metaDescription:row.meta_description,
    tagSlug:row.tag_slug,
    minRoomsForIndex:row.min_rooms_for_index,
    roomCount:row.room_count,
    indexable:row.room_count>=row.min_rooms_for_index,
    rooms:[],
  }));
}

export async function getGrowthCollection(slug:string):Promise<GrowthCollection|null>{
  const sql=getCatalogDb();
  const rows=await sql.query(
    `select
      c.id::text as id,c.slug,c.title,c.eyebrow,c.intro,c.meta_title,c.meta_description,
      c.tag_slug,c.min_rooms_for_index,
      count(gp.id) filter (where gp.status='published')::int as room_count
     from public.growth_collections c
     left join public.growth_collection_publications gcp on gcp.collection_id=c.id
     left join public.growth_publications gp on gp.id=gcp.publication_id
     where c.slug=$1 and c.status='active'
     group by c.id
     limit 1`,
    [slug],
  ) as Array<any>;
  const row=rows[0];
  if(!row) return null;

  const roomRows=await sql.query(
    `select
      gp.slug,gp.title,gp.excerpt,gp.design_id::text as design_id,
      gp.generation_id::text as generation_id,gp.room_total_minor,gp.product_count,gp.tags,
      rv.overall_status as verification_status
     from public.growth_collection_publications gcp
     join public.growth_publications gp
       on gp.id=gcp.publication_id and gp.status='published'
     left join public.room_verifications rv on rv.id=gp.verification_id
     where gcp.collection_id=$1::uuid
     order by gcp.is_featured desc,gcp.relevance_score desc,gcp.sort_order,gp.published_at desc`,
    [row.id],
  ) as Array<any>;

  const rooms=roomRows.map((room)=>({
    slug:room.slug,
    title:room.title,
    excerpt:room.excerpt,
    designId:room.design_id,
    generationId:room.generation_id,
    roomTotalMinor:room.room_total_minor,
    productCount:room.product_count,
    tags:room.tags || [],
    verificationStatus:room.verification_status,
    imageUrl:`/api/growth/rooms/${encodeURIComponent(room.slug)}/image`,
  }));

  return {
    id:row.id,
    slug:row.slug,
    title:row.title,
    eyebrow:row.eyebrow,
    intro:row.intro,
    metaTitle:row.meta_title,
    metaDescription:row.meta_description,
    tagSlug:row.tag_slug,
    minRoomsForIndex:row.min_rooms_for_index,
    roomCount:row.room_count,
    indexable:row.room_count>=row.min_rooms_for_index,
    rooms,
  };
}

export async function getGrowthPublication(slug:string):Promise<GrowthPublication|null>{
  const sql=getCatalogDb();
  const rows=await sql.query(
    `select
      gp.slug,gp.title,gp.excerpt,gp.design_id::text as design_id,
      gp.generation_id::text as generation_id,gp.room_total_minor,gp.product_count,gp.tags,
      gp.published_at::text,gp.verification_id::text as verification_id,
      d.brief,d.product_selection as selection,
      rv.overall_status as verification_status
     from public.growth_publications gp
     join public.room_designs d on d.id=gp.design_id
     join public.render_generations g
       on g.id=gp.generation_id and g.status='succeeded' and g.result_asset_id is not null
     join public.room_shares rs
       on rs.id=gp.share_id and rs.is_active and rs.generation_id=gp.generation_id
     left join public.room_verifications rv on rv.id=gp.verification_id
     where gp.slug=$1 and gp.status='published'
     limit 1`,
    [slug],
  ) as Array<any>;
  const room=rows[0];
  if(!room) return null;
  return {
    slug:room.slug,
    title:room.title,
    excerpt:room.excerpt,
    designId:room.design_id,
    generationId:room.generation_id,
    roomTotalMinor:room.room_total_minor,
    productCount:room.product_count,
    tags:room.tags || [],
    verificationStatus:room.verification_status,
    imageUrl:`/api/growth/rooms/${encodeURIComponent(room.slug)}/image`,
    publishedAt:room.published_at,
    brief:room.brief,
    selection:room.selection,
    verificationId:room.verification_id,
  };
}

export async function growthSitemapEntries(){
  const sql=getCatalogDb();
  const [collections,rooms]=await Promise.all([
    sql.query(
      `select c.slug,max(c.updated_at)::text as updated_at
       from public.growth_collections c
       join public.growth_collection_publications gcp on gcp.collection_id=c.id
       join public.growth_publications gp on gp.id=gcp.publication_id and gp.status='published'
       where c.status='active'
       group by c.id
       having count(gp.id) >= c.min_rooms_for_index`,
      [],
    ),
    sql.query(
      `select slug,updated_at::text as updated_at
       from public.growth_publications
       where status='published'`,
      [],
    ),
  ]);

  return {collections,rooms} as {
    collections:Array<{slug:string;updated_at:string}>;
    rooms:Array<{slug:string;updated_at:string}>;
  };
}
