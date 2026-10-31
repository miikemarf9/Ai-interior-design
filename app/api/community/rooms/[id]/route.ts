import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function DELETE(
  _request:Request,
  context:{params:Promise<{id:string}>},
){
  const account=await getCurrentAccount();
  if(!account) return NextResponse.json({error:"Sign in to manage your room."},{status:401});
  const {id}=await context.params;
  if(!validUuid(id)) return NextResponse.json({error:"Room not found."},{status:404});

  const sql=getCatalogDb();
  const rows=await sql.query(
    "update public.community_rooms set status='hidden',updated_at=now() where id=$1::uuid and account_id=$2::uuid and status='published' returning id::text as id",
    [id,account.id],
  );
  if(!rows.length) return NextResponse.json({error:"Published room not found."},{status:404});
  return NextResponse.json({ok:true});
}
