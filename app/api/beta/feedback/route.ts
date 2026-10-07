import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

function validUuid(value:unknown){
  return typeof value==="string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request:Request){
  const account=await getCurrentAccount();
  const body=await request.json() as {
    designId?:string;
    rating?:number;
    feedback?:string;
    pagePath?:string;
  };
  const text=(body.feedback || "").trim().slice(0,3000);
  const rating=Number(body.rating);
  if(!text) return NextResponse.json({error:"Feedback cannot be empty."},{status:400});
  if(Number.isFinite(rating) && (rating<1 || rating>5)){
    return NextResponse.json({error:"Rating must be from 1 to 5."},{status:400});
  }

  const sql=getCatalogDb();
  await sql.query(
    `insert into public.beta_feedback (account_id,design_id,rating,feedback,page_path)
     values ($1::uuid,$2::uuid,$3,$4,$5)`,
    [
      account?.id ?? null,
      validUuid(body.designId) ? body.designId : null,
      Number.isFinite(rating) ? Math.round(rating) : null,
      text,
      typeof body.pagePath==="string" ? body.pagePath.slice(0,300) : null,
    ],
  );

  return NextResponse.json({ok:true});
}
