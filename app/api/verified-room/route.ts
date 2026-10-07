import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";
import { buildVerifiedRoom } from "@/lib/verification/server";

export const runtime = "nodejs";
export const maxDuration = 90;

function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request:Request){
  const account=await getCurrentAccount();
  const body=await request.json() as {
    designId?:string;
    generationId?:string;
    ownerKey?:string;
  };

  const designId=body.designId || "";
  const generationId=body.generationId || "";
  const ownerKey=body.ownerKey || "";

  if(!validUuid(designId) || !validUuid(generationId)){
    return NextResponse.json({error:"Verification target is invalid."},{status:400});
  }

  const sql=getCatalogDb();
  const authorized=await sql.query(
    `select 1
     from public.room_designs d
     join public.render_generations g on g.design_id=d.id and g.id=$2::uuid
     where d.id=$1::uuid
       and (
         ($3::uuid is not null and d.account_id=$3::uuid)
         or ($4 <> '' and d.owner_key=$4)
       )
     limit 1`,
    [designId,generationId,account?.id ?? null,ownerKey],
  );

  if(!authorized.length){
    return NextResponse.json({error:"Designed room not found."},{status:404});
  }

  try{
    const verification=await buildVerifiedRoom({designId,generationId});
    return NextResponse.json({verification});
  }catch(error){
    console.error("Verified Room failed",error);
    return NextResponse.json({
      error:error instanceof Error ? error.message : "Room verification failed.",
    },{status:500});
  }
}
