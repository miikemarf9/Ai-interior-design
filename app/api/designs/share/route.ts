import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validOwnerKey(value: string) {
  return /^[a-zA-Z0-9_-]{20,100}$/.test(value);
}

export async function POST(request: Request) {
  const body = await request.json() as {
    ownerKey?: string;
    designId?: string;
    generationId?: string;
  };

  const ownerKey = body.ownerKey || "";
  const designId = body.designId || "";
  const generationId = body.generationId || "";

  if (!validOwnerKey(ownerKey) || !validUuid(designId) || !validUuid(generationId)) {
    return NextResponse.json({ error: "Invalid share request." }, { status: 400 });
  }

  const sql = getCatalogDb();

  const rows = await sql.query(
    `with eligible as (
      select g.id
      from public.render_generations g
      join public.room_designs d on d.id = g.design_id
      where g.id = $1::uuid
        and g.design_id = $2::uuid
        and d.owner_key = $3
        and g.status = 'succeeded'
        and g.result_asset_id is not null
      limit 1
    ),
    existing as (
      select rs.share_token
      from public.room_shares rs
      join eligible e on e.id = rs.generation_id
      where rs.is_active
      limit 1
    ),
    inserted as (
      insert into public.room_shares (design_id, generation_id)
      select $2::uuid, e.id
      from eligible e
      where not exists (select 1 from existing)
      returning share_token
    )
    select share_token::text as share_token from existing
    union all
    select share_token::text from inserted
    limit 1`,
    [generationId, designId, ownerKey],
  ) as Array<{ share_token: string }>;

  const token = rows[0]?.share_token;
  if (!token) {
    return NextResponse.json({ error: "This room cannot be shared yet." }, { status: 404 });
  }

  return NextResponse.json({
    token,
    path: `/room/share/${token}`,
  });
}
