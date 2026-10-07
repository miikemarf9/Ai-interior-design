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
        a.mime_type,
        case when a.data is null then null else encode(a.data,'base64') end as base64,
        a.external_url
      from public.room_shares rs
      join public.render_generations g
        on g.id = rs.generation_id
        and g.status = 'succeeded'
      join public.design_assets a
        on a.id = g.result_asset_id
        and a.asset_kind = 'render_result'
      where rs.share_token = $1::uuid
        and rs.is_active
      limit 1`,
      [token],
    ) as Array<{
      mime_type: string;
      base64: string | null;
      external_url: string | null;
    }>;

    const asset = rows[0];
    if (!asset) return NextResponse.json({ error: "Image not found." }, { status: 404 });

    if (asset.external_url) {
      return NextResponse.redirect(asset.external_url, 302);
    }

    if (!asset.base64) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    return new Response(Buffer.from(asset.base64, "base64"), {
      headers: {
        "Content-Type": asset.mime_type,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
