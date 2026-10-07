import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

const MAX_ROOM_BYTES = 8 * 1024 * 1024;
const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);

function validOwnerKey(value: string) {
  return /^[a-zA-Z0-9_-]{20,100}$/.test(value);
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function ensureDesign(ownerKey: string, requestedDesignId?: string | null) {
  const sql = getCatalogDb();

  if (requestedDesignId && validUuid(requestedDesignId)) {
    const existing = await sql.query(
      `select id::text as id
       from public.room_designs
       where id=$1::uuid and owner_key=$2
       limit 1`,
      [requestedDesignId, ownerKey],
    ) as Array<{ id: string }>;

    if (existing[0]) return existing[0].id;
  }

  const created = await sql.query(
    `insert into public.room_designs (owner_key, status)
     values ($1, 'intake')
     returning id::text as id`,
    [ownerKey],
  ) as Array<{ id: string }>;

  return created[0].id;
}

async function saveExternalExample(ownerKey: string, designId: string | null, url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "images.unsplash.com") {
    throw new Error("Unsupported example-room host.");
  }

  const sql = getCatalogDb();
  const id = await ensureDesign(ownerKey, designId);

  const rows = await sql.query(
    `with asset as (
      insert into public.design_assets (
        design_id, asset_kind, mime_type, byte_size, external_url,
        storage_backend, metadata
      )
      values (
        $1::uuid, 'room_original', 'image/jpeg', 0, $2,
        'external_reference', '{"source":"example_room"}'::jsonb
      )
      returning id
    )
    update public.room_designs d
    set original_room_asset_id=a.id, status='intake', updated_at=now()
    from asset a
    where d.id=$1::uuid
    returning a.id::text as asset_id`,
    [id, url],
  ) as Array<{ asset_id: string }>;

  return { designId: id, assetId: rows[0].asset_id };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await request.json() as {
        ownerKey?: string;
        designId?: string | null;
        exampleUrl?: string;
      };

      if (!body.ownerKey || !validOwnerKey(body.ownerKey) || !body.exampleUrl) {
        return NextResponse.json({ error: "Invalid room-photo request." }, { status: 400 });
      }

      const result = await saveExternalExample(body.ownerKey, body.designId ?? null, body.exampleUrl);
      return NextResponse.json({
        ...result,
        url: `/api/assets/${result.assetId}?ownerKey=${encodeURIComponent(body.ownerKey)}`,
      });
    }

    const form = await request.formData();
    const ownerKey = String(form.get("ownerKey") || "");
    const requestedDesignId = String(form.get("designId") || "");
    const file = form.get("file");

    if (!validOwnerKey(ownerKey) || !(file instanceof File)) {
      return NextResponse.json({ error: "A valid room image is required." }, { status: 400 });
    }

    if (!allowedMime.has(file.type)) {
      return NextResponse.json({ error: "Use a JPG, PNG or WebP room photograph." }, { status: 415 });
    }

    if (file.size <= 0 || file.size > MAX_ROOM_BYTES) {
      return NextResponse.json({ error: "Room photographs must be 8 MB or smaller." }, { status: 413 });
    }

    const designId = await ensureDesign(ownerKey, requestedDesignId || null);
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const sql = getCatalogDb();

    const rows = await sql.query(
      `with asset as (
        insert into public.design_assets (
          design_id, asset_kind, mime_type, byte_size, data,
          sha256, storage_backend, metadata
        )
        values (
          $1::uuid, 'room_original', $2, $3, decode($4,'base64'),
          $5, 'postgres_bytea_mvp', jsonb_build_object('original_name',$6)
        )
        returning id
      )
      update public.room_designs d
      set original_room_asset_id=a.id, status='intake', updated_at=now()
      from asset a
      where d.id=$1::uuid
      returning a.id::text as asset_id`,
      [designId, file.type, file.size, base64, sha256, file.name],
    ) as Array<{ asset_id: string }>;

    return NextResponse.json({
      designId,
      assetId: rows[0].asset_id,
      url: `/api/assets/${rows[0].asset_id}?ownerKey=${encodeURIComponent(ownerKey)}`,
    });
  } catch (error) {
    console.error("Room photo upload failed", error);
    return NextResponse.json({ error: "The room photograph could not be stored." }, { status: 500 });
  }
}
