import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(
  _request:Request,
  context:{params:Promise<{id:string}>},
){
  const account=await getCurrentAccount();
  if(!account) return NextResponse.json({error:"Sign in to vote."},{status:401});
  const {id}=await context.params;
  if(!validUuid(id)) return NextResponse.json({error:"Room not found."},{status:404});

  const sql=getCatalogDb();
  const removed=await sql.query(
    "delete from public.community_room_votes v using public.community_rooms r where v.community_room_id=$1::uuid and v.account_id=$2::uuid and r.id=v.community_room_id and r.status='published' returning v.community_room_id",
    [id,account.id],
  );

  let voted=false;
  if(!removed.length){
    const inserted=await sql.query(
      "insert into public.community_room_votes (community_room_id,account_id) select r.id,$2::uuid from public.community_rooms r where r.id=$1::uuid and r.status='published' on conflict (community_room_id,account_id) do nothing returning community_room_id",
      [id,account.id],
    );
    if(!inserted.length){
      const exists=await sql.query(
        "select 1 from public.community_rooms where id=$1::uuid and status='published'",
        [id],
      );
      if(!exists.length) return NextResponse.json({error:"Room not found."},{status:404});
    }
    voted=true;
  }

  const countRows=await sql.query(
    "select count(*)::int as votes from public.community_room_votes where community_room_id=$1::uuid",
    [id],
  ) as Array<{votes:number}>;
  return NextResponse.json({voted,votes:countRows[0]?.votes || 0});
}
