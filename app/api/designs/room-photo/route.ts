import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { ensurePrimaryHome } from "@/lib/auth/account";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

const MAX_ROOM_BYTES = 8 * 1024 * 1024;
const ROOM_ASSET_CHUNK_BYTES = 512 * 1024;
const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);

function validOwnerKey(value: string) {
  return /^[a-zA-Z0-9_-]{20,100}$/.test(value);
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const databaseError = error as Error & {
      code?: string;
      detail?: string;
      hint?: string;
      constraint?: string;
      status?: number;
    };
    return {
      name: error.name,
      message: error.message,
      code: databaseError.code,
      detail: databaseError.detail,
      hint: databaseError.hint,
      constraint: databaseError.constraint,
      status: databaseError.status,
    };
  }
  return { message: String(error) };
}

async function ensureDesign(args: {
  ownerKey: string;
  requestedDesignId?: string | null;
  roomType?: 'living_room' | 'bedroom';
  accountId?: string | null;
  homeId?: string | null;
}) {
  const sql = getCatalogDb();

  if (args.requestedDesignId && validUuid(args.requestedDesignId)) {
    const existing = await sql.query(
      `select id::text as id
       from public.room_designs
       where id=$1::uuid
         and (
           ($3::uuid is not null and account_id=$3::uuid)
           or owner_key=$2
         )
       limit 1`,
      [args.requestedDesignId, args.ownerKey, args.accountId ?? null],
    ) as Array<{ id: string }>;

    if (existing[0]) {
      await sql.query('update public.room_designs set room_type=$2,room_name=$3,updated_at=now() where id=$1::uuid', [existing[0].id, args.roomType || 'living_room', args.roomType === 'bedroom' ? 'Bedroom' : 'Living room']);
      return existing[0].id;
    }
  }

  const created = await sql.query(
    `insert into public.room_designs (
      owner_key,status,account_id,home_id,room_name,room_type
    )
    values ($1,'intake',$2::uuid,$3::uuid,$4,$5)
    returning id::text as id`,
    [args.ownerKey, args.accountId ?? null, args.homeId ?? null, args.roomType === 'bedroom' ? 'Bedroom' : 'Living room', args.roomType || 'living_room'],
  ) as Array<{ id: string }>;

  return created[0].id;
}

async function saveExternalExample(args: {
  ownerKey: string;
  designId: string | null;
  url: string;
  accountId?: string | null;
  homeId?: string | null;
}) {
  const parsed = new URL(args.url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "images.unsplash.com") {
    throw new Error("Unsupported example-room host.");
  }

  const sql = getCatalogDb();
  const id = await ensureDesign({
    ownerKey: args.ownerKey,
    requestedDesignId: args.designId,
    accountId: args.accountId,
    homeId: args.homeId,
  });

  const rows = await sql.query(
    `with asset as (
      insert into public.design_assets (
        design_id,asset_kind,mime_type,byte_size,external_url,
        storage_backend,metadata
      )
      values (
        $1::uuid,'room_original','image/jpeg',0,$2,
        'external_reference','{"source":"example_room"}'::jsonb
      )
      returning id
    )
    update public.room_designs d
    set original_room_asset_id=a.id,status='intake',updated_at=now()
    from asset a
    where d.id=$1::uuid
    returning a.id::text as asset_id`,
    [id,args.url],
  ) as Array<{ asset_id:string }>;

  return { designId:id,assetId:rows[0].asset_id };
}

export async function POST(request: Request) {
  const contentType=request.headers.get("content-type") || "";
  if(contentType.includes("application/json")){
    return NextResponse.json({error:"Example rooms are for inspiration only. Upload a photo of your own living room to create a product-backed design."},{status:409});
  }
  const account=await getCurrentAccount();
  const accountHomeId=account ? await ensurePrimaryHome(account.id) : null;

  try {
    if(contentType.includes("application/json")){
      const body=await request.json() as {
        ownerKey?:string;
        designId?:string|null;
        exampleUrl?:string;
      };

      const resolvedOwnerKey=account?.ownerKey || body.ownerKey || "";
      if(!validOwnerKey(resolvedOwnerKey) || !body.exampleUrl){
        return NextResponse.json({error:"Invalid room-photo request."},{status:400});
      }

      const result=await saveExternalExample({
        ownerKey:resolvedOwnerKey,
        designId:body.designId ?? null,
        url:body.exampleUrl,
        accountId:account?.id ?? null,
        homeId:accountHomeId,
      });

      return NextResponse.json({
        ...result,
        ownerKey:resolvedOwnerKey,
        url:account
          ? `/api/assets/${result.assetId}`
          : `/api/assets/${result.assetId}?ownerKey=${encodeURIComponent(resolvedOwnerKey)}`,
      });
    }

    const form=await request.formData();
    const submittedOwnerKey=String(form.get("ownerKey") || "");
    const resolvedOwnerKey=account?.ownerKey || submittedOwnerKey;
    const requestedDesignId=String(form.get("designId") || "");
    const file=form.get("file");

    if(!validOwnerKey(resolvedOwnerKey) || !(file instanceof File)){
      return NextResponse.json({error:"A valid room image is required."},{status:400});
    }
    if(!allowedMime.has(file.type)){
      return NextResponse.json({error:"Use a JPG, PNG or WebP room photograph."},{status:415});
    }
    if(file.size<=0 || file.size>MAX_ROOM_BYTES){
      return NextResponse.json({error:"Room photographs must be 8 MB or smaller."},{status:413});
    }

    const designId=await ensureDesign({
      ownerKey:resolvedOwnerKey,
      requestedDesignId:requestedDesignId || null,
      roomType:form.get('roomType') === 'bedroom' ? 'bedroom' : 'living_room',
      accountId:account?.id ?? null,
      homeId:accountHomeId,
    });

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length !== file.size) {
      throw new Error("The received room photograph was incomplete.");
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const sql = getCatalogDb();
    let assetId: string | null = null;

    try {
      const created = await sql.query(
        `insert into public.design_assets (
          design_id,asset_kind,mime_type,byte_size,data,
          sha256,storage_backend,metadata
        )
        values (
          $1::uuid,'room_original',$2,0,''::bytea,
          null,'postgres_bytea_mvp',jsonb_build_object('original_name',$3,'expected_byte_size',$4)
        )
        returning id::text as asset_id`,
        [designId, file.type, file.name, file.size],
      ) as Array<{ asset_id: string }>;

      assetId = created[0]?.asset_id ?? null;
      if (!assetId) {
        throw new Error("Room photo asset record could not be created.");
      }

      // Keep each Neon HTTP query small; one Base64 parameter for the whole
      // photograph can exceed the SQL-over-HTTP request limit.
      let storedBytes = 0;
      for (let offset = 0; offset < bytes.length; offset += ROOM_ASSET_CHUNK_BYTES) {
        const chunk = bytes.subarray(offset, Math.min(offset + ROOM_ASSET_CHUNK_BYTES, bytes.length));
        const chunkBase64 = chunk.toString("base64");
        const progress = await sql.query(
          `update public.design_assets
           set data = data || decode($2,'base64')
           where id=$1::uuid
           returning octet_length(data)::int as stored_bytes`,
          [assetId, chunkBase64],
        ) as Array<{ stored_bytes: number }>;

        storedBytes += chunk.length;
        if (progress[0]?.stored_bytes !== storedBytes) {
          throw new Error("Room photo storage did not write the complete chunk.");
        }
      }

      if (storedBytes !== file.size) {
        throw new Error("Room photo storage size did not match the upload.");
      }

      const rows = await sql.query(
        `with asset as (
          update public.design_assets
          set byte_size=$2,sha256=$3,metadata=jsonb_build_object('original_name',$4)
          where id=$1::uuid and octet_length(data)=$2
          returning id
        )
        update public.room_designs d
        set original_room_asset_id=a.id,status='intake',updated_at=now()
        from asset a
        where d.id=$5::uuid
        returning a.id::text as asset_id`,
        [assetId, file.size, sha256, file.name, designId],
      ) as Array<{ asset_id: string }>;

      if (!rows[0]?.asset_id) {
        throw new Error("Room photo storage did not pass its final size check.");
      }

      return NextResponse.json({
        designId,
        assetId: rows[0].asset_id,
        ownerKey: resolvedOwnerKey,
        url: account
          ? `/api/assets/${rows[0].asset_id}`
          : `/api/assets/${rows[0].asset_id}?ownerKey=${encodeURIComponent(resolvedOwnerKey)}`,
      });
    } catch (error) {
      if (assetId) {
        try {
          await sql.query("delete from public.design_assets where id=$1::uuid", [assetId]);
        } catch (cleanupError) {
          console.error("Room photo cleanup failed", JSON.stringify(errorDetails(cleanupError)));
        }
      }
      throw error;
    }
  } catch(error){
    console.error("Room photo upload failed", JSON.stringify(errorDetails(error)));
    return NextResponse.json({error:"The room photograph could not be stored."},{status:500});
  }
}

// Reclassify an uploaded room without replacing its photograph.
export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { designId?: string; ownerKey?: string; roomType?: string };
    if (!body.designId || !validUuid(body.designId) || !['living_room', 'bedroom'].includes(body.roomType || '')) {
      return NextResponse.json({ error: 'Choose a valid room type.' }, { status: 400 });
    }
    const account = await getCurrentAccount();
    const ownerKey = account?.ownerKey || body.ownerKey || '';
    if (!validOwnerKey(ownerKey)) return NextResponse.json({ error: 'Room access required.' }, { status: 403 });
    const rows = await getCatalogDb().query(
      `update public.room_designs set room_type=$4,room_name=$5,updated_at=now()
       where id=$1::uuid and (owner_key=$2 or ($3::uuid is not null and account_id=$3::uuid))
       returning id`,
      [body.designId, ownerKey, account?.id ?? null, body.roomType, body.roomType === 'bedroom' ? 'Bedroom' : 'Living room'],
    ) as Array<{ id: string }>;
    if (!rows.length) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Room type could not be saved. Please try again.' }, { status: 500 });
  }
}
