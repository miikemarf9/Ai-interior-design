import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { enqueueCrmEvent } from "@/lib/auth/account";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  if (!validUuid(id)) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      d.id::text as design_id,
      d.home_id::text as home_id,
      d.room_name,
      d.room_type,
      d.status,
      d.intake,
      d.brief,
      d.product_selection,
      d.original_room_asset_id::text as original_room_asset_id,
      g.id::text as generation_id,
      g.result_asset_id::text as result_asset_id,
      g.completed_at::text as generated_at,
      g.model,
      g.prompt_version
    from public.room_designs d
    left join lateral (
      select id,result_asset_id,completed_at,model,prompt_version
      from public.render_generations
      where design_id=d.id
        and status='succeeded'
        and result_asset_id is not null
      order by completed_at desc nulls last,created_at desc
      limit 1
    ) g on true
    where d.id=$1::uuid and d.account_id=$2::uuid
    limit 1`,
    [id, account.id],
  ) as Array<any>;

  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  return NextResponse.json({
    designId: row.design_id,
    homeId: row.home_id,
    roomName: row.room_name,
    roomType: row.room_type,
    status: row.status,
    ownerKey: account.ownerKey,
    intake: row.intake,
    brief: row.brief,
    selection: row.product_selection,
    originalAssetId: row.original_room_asset_id,
    originalUrl: row.original_room_asset_id ? `/api/assets/${row.original_room_asset_id}` : null,
    generationId: row.generation_id,
    resultUrl: row.result_asset_id ? `/api/assets/${row.result_asset_id}` : null,
    generatedAt: row.generated_at,
    model: row.model,
    promptVersion: row.prompt_version,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  if (!validUuid(id)) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const body = await request.json() as { roomName?: string };
  const roomName = (body.roomName || "").trim().slice(0,80);
  if (!roomName) return NextResponse.json({ error: "Room name is required." }, { status: 400 });

  const sql = getCatalogDb();
  const rows = await sql.query(
    `update public.room_designs
     set room_name=$3,updated_at=now()
     where id=$1::uuid and account_id=$2::uuid
     returning id::text as id,room_name`,
    [id,account.id,roomName],
  ) as Array<{ id:string; room_name:string }>;

  if (!rows[0]) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  await enqueueCrmEvent(account.id,"room_updated","room",id,{ roomName });
  return NextResponse.json({ ok:true,roomName:rows[0].room_name });
}
