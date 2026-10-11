import { clearedImageSelection } from '@/lib/room-exploration-server';
import { checkedHotspots } from '@/lib/room-hotspots';
import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";
import { readStoredVerification } from "@/lib/verification/server";

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
        g.metadata,
        g.result_asset_id::text as result_asset_id,
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
      metadata: any;
      result_asset_id: string;
      generation_id: string;
      completed_at: string | null;
    }>;

    const row = rows[0];
    if (!row || !row.brief || !row.product_selection) {
      return NextResponse.json({ error: "Shared room not found." }, { status: 404 });
    }

  const snapshot = row.metadata?.snapshot;
  const selection = clearedImageSelection(row.metadata);
  if (!selection) return NextResponse.json({error:'This image needs a cleared, saved product collection before it can be explored.'},{status:409});
  row.product_selection = selection;
  row.brief = snapshot?.brief || row.brief;
    const verification = await readStoredVerification(row.generation_id);

    return NextResponse.json({
      designId: row.design_id,
      generationId: row.generation_id,
      brief: row.brief,
      selection: row.product_selection,
    resultAssetId: row.result_asset_id,
    hotspots: checkedHotspots(row.metadata?.hotspots,row.generation_id,row.result_asset_id,row.product_selection as any),
      resultUrl: `/api/shared-room/${token}/image`,
      generatedAt: row.completed_at,
      shared: true,
      verification,
    });
  } catch {
    return NextResponse.json({ error: "Shared room not found." }, { status: 404 });
  }
}
