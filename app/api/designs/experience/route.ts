import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validOwnerKey(value: string) {
  return /^[a-zA-Z0-9_-]{20,100}$/.test(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const designId = url.searchParams.get("designId") || "";
  const ownerKey = url.searchParams.get("ownerKey") || "";

  if (!validUuid(designId) || !validOwnerKey(ownerKey)) {
    return NextResponse.json({ error: "Designed room not found." }, { status: 404 });
  }

  const sql = getCatalogDb();

  const rows = await sql.query(
    `select
      d.id::text as design_id,
      d.intake,
      d.brief,
      d.product_selection,
      d.original_room_asset_id::text as original_room_asset_id,
      g.id::text as generation_id,
      g.result_asset_id::text as result_asset_id,
      g.completed_at,
      g.model,
      g.prompt_version
    from public.room_designs d
    join lateral (
      select id, result_asset_id, completed_at, model, prompt_version
      from public.render_generations
      where design_id = d.id
        and status = 'succeeded'
        and result_asset_id is not null
      order by completed_at desc nulls last, created_at desc
      limit 1
    ) g on true
    where d.id = $1::uuid
      and d.owner_key = $2
    limit 1`,
    [designId, ownerKey],
  ) as Array<{
    design_id: string;
    intake: unknown;
    brief: unknown;
    product_selection: unknown;
    original_room_asset_id: string | null;
    generation_id: string;
    result_asset_id: string;
    completed_at: string | null;
    model: string;
    prompt_version: string;
  }>;

  const row = rows[0];
  if (!row || !row.product_selection || !row.brief) {
    return NextResponse.json({ error: "No completed room design is available yet." }, { status: 404 });
  }

  const owner = encodeURIComponent(ownerKey);

  return NextResponse.json({
    designId: row.design_id,
    generationId: row.generation_id,
    intake: row.intake,
    brief: row.brief,
    selection: row.product_selection,
    originalUrl: row.original_room_asset_id
      ? `/api/assets/${row.original_room_asset_id}?ownerKey=${owner}`
      : null,
    resultUrl: `/api/assets/${row.result_asset_id}?ownerKey=${owner}`,
    generatedAt: row.completed_at,
    model: row.model,
    promptVersion: row.prompt_version,
  });
}
