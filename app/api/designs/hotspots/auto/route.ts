import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth';
import { getCatalogDb } from '@/lib/catalog/neon';
import { clearedImageSelection } from '@/lib/room-exploration-server';
import { checkedHotspots, validHotspots, type RoomHotspot } from '@/lib/room-hotspots';

export const runtime = 'nodejs';
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const ownerPattern = /^[a-zA-Z0-9_-]{20,100}$/;

type Row = { metadata: any; result_asset_id: string; mime_type: string; base64: string | null };
type Detection = { items?: Array<{ variantId?: string; visibility?: string; x?: number; y?: number }> };

/** Detect candidate shopping positions, without claiming the AI image is an exact product photograph. */
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }

  if (!uuid(body?.designId) || !uuid(body?.generationId) || !uuid(body?.resultAssetId)) {
    return NextResponse.json({ error: 'A completed room image is required.' }, { status: 400 });
  }
  const account = await getCurrentAccount();
  const ownerKey = account?.ownerKey || body?.ownerKey;
  if (typeof ownerKey !== 'string' || !ownerPattern.test(ownerKey)) {
    return NextResponse.json({ error: 'Room access required.' }, { status: 401 });
  }

  try {
    const sql = getCatalogDb();
    const rows = await sql.query(
      `select g.metadata, g.result_asset_id::text as result_asset_id, a.mime_type,
              case when a.data is null then null else encode(a.data,'base64') end as base64
       from public.render_generations g
       join public.room_designs d on d.id=g.design_id
       join public.design_assets a on a.id=g.result_asset_id
       where g.id=$1::uuid and d.id=$2::uuid and d.owner_key=$3
         and g.result_asset_id=$4::uuid and g.status='succeeded'
       limit 1`,
      [body.generationId, body.designId, ownerKey, body.resultAssetId],
    ) as Row[];
    const row = rows[0];
    const selection = row && clearedImageSelection(row.metadata);
    if (!row || !selection || !selection.products.length || selection.products.length > 6) {
      return NextResponse.json({ error: 'A finished room with approved products is required.' }, { status: 404 });
    }

    const saved = row.metadata?.hotspots;
    if (saved?.generationId === body.generationId && saved?.resultAssetId === body.resultAssetId
      && (saved.reviewedAt || saved.detectedAt) && validHotspots(saved.items, selection)) {
      return NextResponse.json({ hotspots: checkedHotspots(saved, body.generationId, body.resultAssetId, selection), prepared: true });
    }

    if (!row.base64 || !['image/jpeg', 'image/png', 'image/webp'].includes(row.mime_type)) {
      return NextResponse.json({ error: 'The room image cannot be analysed automatically. You can still position the dots manually.' }, { status: 422 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Automatic product tagging is not configured.' }, { status: 503 });

    // Reserve the attempt before sending any billable request, so repeated page loads cannot start duplicates.
    const claim = await sql.query(
      `update public.render_generations
       set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{hotspotDetection}',
          jsonb_build_object('startedAt',now(),'state','processing'))
       where id=$1::uuid and result_asset_id=$2::uuid
         and metadata->'hotspots' is null
         and (metadata->'hotspotDetection' is null
           or (metadata#>>'{hotspotDetection,startedAt}')::timestamptz < now() - interval '5 minutes')
       returning id`,
      [body.generationId, body.resultAssetId],
    ) as Array<{ id: string }>;
    if (!claim.length) return NextResponse.json({ pending: true }, { status: 202 });

    const productList = selection.products.map(product => ({
      variantId: product.selected.variantId,
      type: product.slotLabel,
      name: product.selected.productName,
      variant: product.selected.variantName,
      colours: product.selected.colours,
      materials: product.selected.materials,
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model: process.env.OPENAI_HOTSPOT_MODEL || 'gpt-4.1-mini',
        temperature: 0,
        max_tokens: 650,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You locate visible furniture in an interior photograph for approximate shopping hotspots. Return ONLY a JSON object: {"items":[{"variantId":"id","visibility":"visible","x":50,"y":50}]}. Coordinates are percentages of actual image width and height, 0 to 100, pointing to the centre of the item. Only mark a product visible when a plausible item of that type is identifiable; otherwise mark it "uncertain" with no x or y. Do not invent furniture, duplicate a physical item for different products, or place dots in empty space. These are approximate links to suggested retailer items, not exact-match certifications.' },
          { role: 'user', content: [
            { type: 'text', text: `Locate these selected furniture pieces in the resulting room image. Provide one item for every listed variantId: ${JSON.stringify(productList)}` },
            { type: 'image_url', image_url: { url: `data:${row.mime_type};base64,${row.base64.replace(/\s/g, '')}`, detail: 'high' } },
          ] },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Vision provider returned ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const detected = JSON.parse(payload.choices?.[0]?.message?.content || '{}') as Detection;
    const matches = new Map((detected.items || []).map(item => [item.variantId, item]));
    const items: RoomHotspot[] = selection.products.map(product => {
      const variantId = product.selected.variantId;
      const marker = matches.get(variantId);
      if (marker?.visibility === 'visible'
        && typeof marker.x === 'number' && Number.isFinite(marker.x) && marker.x >= 0 && marker.x <= 100
        && typeof marker.y === 'number' && Number.isFinite(marker.y) && marker.y >= 0 && marker.y <= 100) {
        return { variantId, visibility: 'visible', x: Math.round(marker.x * 10) / 10, y: Math.round(marker.y * 10) / 10 };
      }
      return { variantId, visibility: 'uncertain' };
    });

    if (!validHotspots(items, selection)) throw new Error('Invalid detected positions');
    const record = { generationId: body.generationId, resultAssetId: body.resultAssetId, detectedAt: new Date().toISOString(), source: 'automatic', items };
    // Never replace a human-corrected set of positions if it was saved during detection.
    const updated = await sql.query(
      `update public.render_generations
       set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{hotspots}',$2::jsonb)
       where id=$1::uuid and result_asset_id=$3::uuid and metadata->'hotspots' is null
       returning id`,
      [body.generationId, JSON.stringify(record), body.resultAssetId],
    ) as Array<{ id: string }>;
    if (!updated.length) return NextResponse.json({ pending: true }, { status: 202 });
    return NextResponse.json({ hotspots: items, prepared: true });
  } catch {
    return NextResponse.json({ error: 'We could not place the product dots automatically. You can still add them manually.' }, { status: 503 });
  }
}
