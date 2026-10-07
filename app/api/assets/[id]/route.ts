import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ownerKey = new URL(request.url).searchParams.get("ownerKey") || "";

  if (!/^[a-zA-Z0-9_-]{20,100}$/.test(ownerKey)) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const sql = getCatalogDb();

  try {
    const rows = await sql.query(
      `select
        a.mime_type,
        a.external_url,
        case when a.data is null then null else encode(a.data,'base64') end as base64
       from public.design_assets a
       join public.room_designs d on d.id = a.design_id
       where a.id=$1::uuid
         and d.owner_key=$2
       limit 1`,
      [id, ownerKey],
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
