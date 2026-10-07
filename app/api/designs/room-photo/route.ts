import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { ensurePrimaryHome } from "@/lib/auth/account";
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

async function ensureDesign(args: {
  ownerKey: string;
  requestedDesignId?: string | null;
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

    if (existing[0]) return existing[0].id;
  }

  const created = await sql.query(
    `insert into public.room_designs (
      owner_key,status,account_id,home_id,room_name,room_type
    )
    values ($1,'intake',$2::uuid,$3::uuid,'Living room','living_room')
    returning id::text as id`,
    [args.ownerKey, args.accountId ?? null, args.homeId ?? null],
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
      accountId:account?.id ?? null,
      homeId:accountHomeId,
    });

    const bytes=Buffer.from(await file.arrayBuffer());
    const base64=bytes.toString("base64");
    const sha256=createHash("sha256").update(bytes).digest("hex");
    const sql=getCatalogDb();

    const rows=await sql.query(
      `with asset as (
        insert into public.design_assets (
          design_id,asset_kind,mime_type,byte_size,data,
          sha256,storage_backend,metadata
        )
        values (
          $1::uuid,'room_original',$2,$3,decode($4,'base64'),
          $5,'postgres_bytea_mvp',jsonb_build_object('original_name',$6)
        )
        returning id
      )
      update public.room_designs d
      set original_room_asset_id=a.id,status='intake',updated_at=now()
      from asset a
      where d.id=$1::uuid
      returning a.id::text as asset_id`,
      [designId,file.type,file.size,base64,sha256,file.name],
    ) as Array<{ asset_id:string }>;

    return NextResponse.json({
      designId,
      assetId:rows[0].asset_id,
      ownerKey:resolvedOwnerKey,
      url:account
        ? `/api/assets/${rows[0].asset_id}`
        : `/api/assets/${rows[0].asset_id}?ownerKey=${encodeURIComponent(resolvedOwnerKey)}`,
    });
  } catch(error){
    console.error("Room photo upload failed",error);
    return NextResponse.json({error:"The room photograph could not be stored."},{status:500});
  }
}
