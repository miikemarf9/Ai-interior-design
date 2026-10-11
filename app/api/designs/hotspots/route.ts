import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth';
import { getCatalogDb } from '@/lib/catalog/neon';
import { currentClearances } from '@/lib/catalog/clearance';
import { validHotspots } from '@/lib/room-hotspots';
export const runtime = 'nodejs';
const uuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!uuid(body?.designId) || !uuid(body?.generationId) || !uuid(body?.resultAssetId) || body?.confirmed !== true) return NextResponse.json({error:'Confirm the positions for this generated image.'},{status:400});
    const account = await getCurrentAccount();
    const ownerKey = account?.ownerKey || body.ownerKey;
    if (typeof ownerKey !== 'string' || !/^[a-zA-Z0-9_-]{20,100}$/.test(ownerKey)) return NextResponse.json({error:'Room access required.'},{status:401});
    const sql = getCatalogDb();
    const rows = await sql.query(`select g.metadata from public.render_generations g join public.room_designs d on d.id=g.design_id where g.id=$1::uuid and d.id=$2::uuid and d.owner_key=$3 and g.result_asset_id=$4::uuid and g.status='succeeded'`,[body.generationId,body.designId,ownerKey,body.resultAssetId]) as any[];
    const selection = rows[0]?.metadata?.snapshot?.selection;
    if (!selection) return NextResponse.json({error:'This image has no saved product references. Generate a reviewed pilot first.'},{status:404});
    const cleared = currentClearances();
    if (selection.products.some((p:any) => !cleared.some(c => c.variantId === p.selected.variantId && c.offerId === p.selected.offer.id))) return NextResponse.json({error:'The product collection needs clearance before positions can be saved.'},{status:409});
    if (!validHotspots(body.items,selection)) return NextResponse.json({error:'Check every product and place visible markers inside the photograph.'},{status:400});
    const hotspots = {generationId:body.generationId,resultAssetId:body.resultAssetId,reviewedAt:new Date().toISOString(),items:body.items.map((p:any)=>p.visibility==='visible'?{variantId:p.variantId,visibility:p.visibility,x:p.x,y:p.y}:{variantId:p.variantId,visibility:p.visibility})};
    await sql.query(`update public.render_generations set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{hotspots}',$2::jsonb) where id=$1::uuid and result_asset_id=$3::uuid`,[body.generationId,JSON.stringify(hotspots),body.resultAssetId]);
    return NextResponse.json({hotspots:hotspots.items});
  } catch { return NextResponse.json({error:'Positions could not be saved. Please try again.'},{status:503}); }
}
