import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

export async function GET(
  _request:Request,
  context:{params:Promise<{slug:string}>},
){
  const {slug}=await context.params;
  const sql=getCatalogDb();
  const rows=await sql.query(
    `select a.mime_type,a.external_url,
      case when a.data is null then null else encode(a.data,'base64') end as base64
     from public.growth_publications gp
     join public.render_generations g on g.id=gp.generation_id and g.status='succeeded'
     join public.design_assets a on a.id=g.result_asset_id
     where gp.slug=$1 and gp.status='published'
     limit 1`,
    [slug],
  ) as Array<{mime_type:string;external_url:string|null;base64:string|null}>;
  const asset=rows[0];
  if(!asset) return NextResponse.json({error:"Image not found."},{status:404});
  if(asset.external_url) return NextResponse.redirect(asset.external_url,302);
  if(!asset.base64) return NextResponse.json({error:"Image not found."},{status:404});
  return new Response(Buffer.from(asset.base64,"base64"),{
    headers:{
      "Content-Type":asset.mime_type,
      "Cache-Control":"public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options":"nosniff",
    },
  });
}
