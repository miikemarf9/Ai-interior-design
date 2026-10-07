import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const sql = getCatalogDb();

  try {
    const rows = await sql.query(
      `select
        d.id::text as design_id,
        d.brief,
        d.product_selection,
        g.id::text as generation_id,
        g.completed_at
      from public.room_shares rs
      join public.room_designs d on d.id = rs.design_id
      join public.render_generations g
        on g.id = rs.generation_id
        and g.design_id = d.id
        and g.status = 'succeeded'
        and g.result_asset_id is not null
      where rs.share_token = $1::uuid
        and rs.is_active
      limit 1`,
      [token],
    ) as Array<{
      design_id: string;
      brief: unknown;
      product_selection: unknown;
      generation_id: string;
      completed_at: string | null;
    }>;

    const row = rows[0];
    if (!row || !row.brief || !row.product_selection) {
      return NextResponse.json({ error: "Shared room not found." }, { status: 404 });
    }

    return NextResponse.json({
      designId: row.design_id,
      generationId: row.generation_id,
      brief: row.brief,
      selection: row.product_selection,
      resultUrl: `/api/shared-room/${token}/image`,
      generatedAt: row.completed_at,
      shared: true,
    });
  } catch {
    return NextResponse.json({ error: "Shared room not found." }, { status: 404 });
  }
}
