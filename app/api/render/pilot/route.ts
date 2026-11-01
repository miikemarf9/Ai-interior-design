import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth';
import { getCatalogDb } from '@/lib/catalog/neon';
import { pilotSummary, validReview, reviewPassed } from '@/lib/render/pilot';

export const runtime = 'nodejs';
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const account = await getCurrentAccount();
    const designId = params.get('designId') || '';
    const ownerKey = account?.ownerKey || params.get('ownerKey') || '';
    if (!uuid(designId) || !ownerKey) return NextResponse.json({ error: 'Room access required.' }, { status: 400 });
    const rows = await getCatalogDb().query(
      `select g.id::text as generation_id,g.status,g.result_asset_id::text as result_asset_id,
       g.cost_usd_micros,g.cost_gbp_minor,g.duration_ms,g.created_at::text,g.failure_message,g.metadata
       from public.render_generations g join public.room_designs d on d.id=g.design_id
       where d.id=$1::uuid and d.owner_key=$2 and g.prompt_version in ('living-room-pilot-v2','living-room-illustrative-v3','room-illustrative-v1')
       order by g.created_at desc limit 20`, [designId, ownerKey],
    ) as any[];
    return NextResponse.json({ available: true, attempts: rows.map(row => ({ ...row, resultUrl: row.result_asset_id ? `/api/assets/${row.result_asset_id}?ownerKey=${encodeURIComponent(ownerKey)}` : null })), summary: pilotSummary(rows) });
  } catch { return NextResponse.json({ error: 'Pilot history could not be loaded. No new generation has started.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const account = await getCurrentAccount();
    const ownerKey = account?.ownerKey || body.ownerKey || '';
    if (!uuid(body.generationId || '') || !uuid(body.designId || '') || !ownerKey) return NextResponse.json({ error: 'Invalid review target.' }, { status: 400 });
    const sql = getCatalogDb();
    const rows = await sql.query(`select g.metadata from public.render_generations g join public.room_designs d on d.id=g.design_id where g.id=$1::uuid and d.id=$2::uuid and d.owner_key=$3 and g.status='succeeded' and g.prompt_version in ('living-room-pilot-v2','living-room-illustrative-v3','room-illustrative-v1')`, [body.generationId, body.designId, ownerKey]) as any[];
    const selection = rows[0]?.metadata?.snapshot?.selection;
    if (!selection) return NextResponse.json({ error: 'Completed pilot not found.' }, { status: 404 });
    if (!validReview(body.review, selection)) return NextResponse.json({ error: 'Complete every room and product review field.' }, { status: 400 });
    const humanReview = { ...body.review, outcome: reviewPassed(body.review) ? 'visually_reviewed' : 'needs_correction', reviewedAt: new Date().toISOString(), reviewer: 'customer', fitVerified: false, exactMatchVerified: false };
    await sql.query(`update public.render_generations set metadata=jsonb_set(metadata,'{humanReview}',$2::jsonb) where id=$1::uuid`, [body.generationId, JSON.stringify(humanReview)]);
    return NextResponse.json({ humanReview });
  } catch { return NextResponse.json({ error: 'The review could not be saved. Please try again.' }, { status: 500 }); }
}
