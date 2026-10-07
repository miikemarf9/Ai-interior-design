import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sql = getCatalogDb();

  try {
    const rows = await sql.query(
      \`select
        mime_type,
        external_url,
        case when data is null then null else encode(data,'base64') end as base64
       from public.design_assets
       where id=$1::uuid
       limit 1\`,
      [id],
    ) as Array<{
      mime_type: string;
      external_url: string | null;
      base64: string | null;
    }>;

    const asset = rows[0];
    if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });

    if (asset.external_url) {
      return NextResponse.redirect(asset.external_url, 302);
    }

    if (!asset.base64) {
      return NextResponse.json({ error: "Asset has no content." }, { status: 404 });
    }

    return new Response(Buffer.from(asset.base64, "base64"), {
      headers: {
        "Content-Type": asset.mime_type,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}
