'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DesignBrief, IntakeForBrief } from '@/lib/brief';
import { approvalSnapshot, buildProductSelection, type ProductSelection } from '@/lib/catalog/selection';
import { MAX_CORRECTIONS, reviewPassed, type Placement, type PilotReview, type Check } from '@/lib/render/pilot';
import styles from './RenderPilot.module.css';

type Runtime = { ownerKey: string; designId: string; roomAssetId: string };
type Attempt = { generation_id: string; status: string; resultUrl: string | null; cost_usd_micros: number | null; duration_ms: number | null; metadata: { correctionAttempt: number; parentGenerationId?: string; snapshot: { placements: Placement[]; selection: ProductSelection; intake: IntakeForBrief; brief: DesignBrief; roomAssetId: string }; humanReview?: PilotReview & { outcome: string } } };
export function RenderExperience() {
  const [room, setRoom] = useState<IntakeForBrief | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; started.current = true;
    (async () => {
      try {
        const savedRoom = JSON.parse(localStorage.getItem('roomfound-intake-v1') || '{}').state;
        const savedBrief = JSON.parse(localStorage.getItem('roomfound-brief-v1') || '{}');
        const savedSelection = JSON.parse(localStorage.getItem('roomfound-product-selection-v1') || '{}');
        const savedRuntime = JSON.parse(localStorage.getItem('roomfound-design-runtime-v1') || '{}');
        if (!savedRoom || !savedBrief.approved || !savedBrief.brief || !savedRuntime.roomAssetId || !savedRuntime.designId || !savedRuntime.ownerKey) { setBlocked('Upload your room photo and approve your room brief first.'); return; }
        setRoom(savedRoom); setBrief(savedBrief.brief); setRuntime(savedRuntime);
        const history = await readHistory(savedRuntime);
        if (!history.available) { setBlocked(history.reason); return; }
        let nextSelection = buildProductSelection(savedRoom, savedBrief.brief, []);
        if (savedSelection.approved && savedSelection.selection?.version === 2) {
          try {
            const response = await fetch('/api/products/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intake: savedRoom, brief: savedBrief.brief, choices: savedSelection.selection.products.map((p: any) => ({ slot: p.slot, variantId: p.selected.variantId, quantity: p.quantity })), approve: true, acknowledgeLimitations: true, expectedSnapshot: approvalSnapshot(savedSelection.selection) }) });
            const checked = await response.json();
            if (response.ok && checked.approved) nextSelection = checked.selection;
          } catch { /* A room-only illustrative render can continue without a product collection. */ }
        }
        setSelection(nextSelection);
        const prior = history.attempts?.find((item: Attempt) => item.status === 'succeeded' && item.metadata?.snapshot?.roomAssetId === savedRuntime.roomAssetId && approvalSnapshot(item.metadata.snapshot.selection) === approvalSnapshot(nextSelection) && JSON.stringify([item.metadata.snapshot.intake, item.metadata.snapshot.brief]) === JSON.stringify([savedRoom, savedBrief.brief]));
        const savedPlan: Placement[] = prior?.metadata.snapshot.placements || JSON.parse(localStorage.getItem(`roomfound-placements:${savedRuntime.designId}`) || '[]') as Placement[];
        setPlacements(nextSelection.products.map((p: any) => ({ variantId: p.selected.variantId, instruction: savedPlan.find(item => item.variantId === p.selected.variantId)?.instruction || '' })));
        await loadCredits(savedRuntime);
      } catch { setBlocked('We could not prepare the pilot. Your saved brief and furniture choices have not been changed.'); }
      finally { setReady(true); }
    })();
  }, []);
  async function loadCredits(context: Runtime) {
    const response = await fetch(`/api/credits/status?ownerKey=${encodeURIComponent(context.ownerKey)}`, { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) { setBalance(data.balance); setVerified(!data.verifiedRequired); }
  }
  async function readHistory(context: Runtime) {
    const response = await fetch(`/api/render/pilot?designId=${context.designId}&ownerKey=${encodeURIComponent(context.ownerKey)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Pilot history unavailable.');
    setAttempts(data.attempts || []); setSummary(data.summary || null); return data;
  }
  const result = attempts.find(item => item.status === 'succeeded' && item.resultUrl && selection && item.metadata?.snapshot?.roomAssetId === runtime?.roomAssetId && approvalSnapshot(item.metadata.snapshot.selection) === approvalSnapshot(selection) && JSON.stringify([item.metadata.snapshot.intake, item.metadata.snapshot.brief]) === JSON.stringify([room, brief]));
  const processing = attempts.some(item => item.status === 'processing');
  const failedCorrection = attempts.some(item => item.status === 'failed' && item.metadata?.parentGenerationId === result?.generation_id);
  async function generate() {
    if (!runtime || !room || !brief || !selection) return;
    setBusy(true); setError('');
    const key = `roomfound-pilot-request:${runtime.designId}`;
    const requestState = JSON.stringify([approvalSnapshot(selection), placements, result?.generation_id, correction]);
    try {
      const old = JSON.parse(localStorage.getItem(key) || 'null');
      const requestId = old?.state === requestState ? old.id : crypto.randomUUID();
      localStorage.setItem(key, JSON.stringify({ id: requestId, state: requestState }));
      const response = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...runtime, requestId, intake: room, brief, selection, placements, parentGenerationId: result?.generation_id, correction: result ? correction : undefined }) });
      const data = await response.json();
      if (!response.ok) {
        if (data.code?.endsWith('_REFUNDED')) localStorage.removeItem(key);
        throw new Error(data.error || 'Generation could not be confirmed. Reload the saved attempt before retrying.');
      }
      localStorage.removeItem(key); setCorrection('');
      await readHistory(runtime); await loadCredits(runtime);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Generation unavailable.');
      try { await readHistory(runtime); await loadCredits(runtime); } catch { /* Keep the original error and stable request ID. */ }
    } finally { setBusy(false); }
  }
  async function saveReview(review: PilotReview) {
    if (!runtime || !result) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/render/pilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...runtime, generationId: result.generation_id, review }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      await readHistory(runtime);
    } catch (error) { setError(error instanceof Error ? error.message : 'Review could not be saved.'); }
    finally { setBusy(false); }
  }
  if (!ready) return <section className="renderLoading shell"><h1>Preparing your room visualisation.</h1><p>Checking your room photograph and approved brief.</p></section>;
  if (blocked || !selection || !runtime) return <section className="renderMissing shell"><p className="eyebrow">Living-room pilot</p><h1>There is still something to prepare.</h1><p>{blocked || 'The pilot is not ready.'}</p><Link className="button buttonPrimary" href="/products">Review my furniture collection</Link></section>;
  const originalUrl = `/api/assets/${runtime.roomAssetId}?ownerKey=${encodeURIComponent(runtime.ownerKey)}`;
  const reviewed = result?.metadata.humanReview;
  const correctionReady = !!result && reviewed?.outcome === 'needs_correction' && result.metadata.correctionAttempt < MAX_CORRECTIONS && !failedCorrection;
  return <div className="renderExperience shell">
    <section className="renderHero"><div><p className="eyebrow">Living-room pilot</p><h1>See your room. Check the details.</h1><p>The photograph and approved brief guide an illustrative design. Furniture shown is a concept, not an exact product match or a guarantee of physical fit. Any retailer products are shown separately with their own photos and links.</p></div><aside className="renderCreditPanel"><strong>{balance ?? '—'} credits available</strong><p>One credit per successful generation or correction. Technical failures are refunded when the failure is recorded. Check the attempt history after a lost connection.</p></aside></section>
    <div className={styles.comparison}><figure><img src={originalUrl} alt="Original room photograph used as the architectural reference" /><figcaption>Original room</figcaption></figure>{result && <figure><img src={result.resultUrl!} alt="Generated living-room pilot awaiting or undergoing human review" /><figcaption>Generated attempt · correction {result.metadata.correctionAttempt || 0} of {MAX_CORRECTIONS}</figcaption></figure>}</div>
    <section className={styles.panel}><h2>Your room-design cues</h2><p>Optional guidance for selected products. The generated room is illustrative and does not promise an exact match to retailer products.</p>
      <div className={styles.products}>{selection.products.map(product => <article key={product.selected.variantId}>
        {product.selected.image && <img src={product.selected.image.url} alt={`${product.selected.productName} — ${product.selected.variantName}`} />}
        <div><h3>{product.selected.productName}</h3><p>{product.selected.variantName} · Quantity: {product.quantity * (product.selected.commercial?.packSize || 1)}</p><p>W × D × H: {[product.selected.dimensions.widthMm, product.selected.dimensions.depthMm, product.selected.dimensions.heightMm].map(value => value ? `${value / 10} cm` : 'unknown').join(' × ')}</p>
        <label>Intended placement<textarea disabled={busy || !!result || processing} rows={2} maxLength={600} value={placements.find(item => item.variantId === product.selected.variantId)?.instruction || ''} onChange={event => { const next = placements.map(item => item.variantId === product.selected.variantId ? { ...item, instruction: event.target.value } : item); setPlacements(next); localStorage.setItem(`roomfound-placements:${runtime.designId}`, JSON.stringify(next)); }} /></label></div>
      </article>)}</div><Link href="/products">Review products and prices</Link><p>Retailer photos, prices and product labels stay outside the generated image.</p>
    </section>
    {result && <Review key={result.generation_id} selection={result.metadata.snapshot.selection} initial={reviewed} disabled={busy} onSave={saveReview} />}
    {error && <p role="alert" className="renderError">{error}</p>}
    {processing && <div className={styles.panel}><p>An attempt is processing. Refresh its status before starting another.</p><button className="button buttonSecondary" onClick={() => readHistory(runtime).catch(error => setError(error.message))}>Refresh attempt status</button></div>}
    {!result && !processing && <button className="button buttonPrimary" disabled={busy || !verified || balance === null || balance < 1 || placements.some(item => item.instruction.trim().length < 5)} onClick={generate}>{busy ? 'Generating…' : 'Generate illustrative room design · 1 credit'}</button>}
    {!verified && <p>A verified account and available credit balance are required before generating.</p>}
    {correctionReady && <section className={styles.panel}><h2>Make a controlled correction</h2><p>Describe the specific failed checks. We reuse the original room, approved references and previous result. A correction costs one credit and must be checked again.</p><label>What needs correcting?<textarea rows={3} maxLength={2000} value={correction} onChange={event => setCorrection(event.target.value)} /></label><button className="button buttonPrimary" disabled={busy || processing || !verified || !balance || correction.trim().length < 10} onClick={generate}>{busy ? 'Correcting…' : 'Generate correction · 1 credit'}</button></section>}
    {result && (failedCorrection || result.metadata.correctionAttempt >= MAX_CORRECTIONS) && <p>The correction limit or a technical failure has stopped this sequence. Review the saved attempts manually before authorising further work.</p>}
    {reviewed?.outcome === 'visually_reviewed' && <div className={styles.panel}><h2>Visual review saved</h2><p>This records your visual assessment, not an exact-match certificate or a fit guarantee.</p><Link className="button buttonPrimary" href="/room">Open my designed room</Link></div>}
    {summary && <section className={styles.panel}><h2>Pilot attempt record</h2><p>{summary.attempts} recent attempts · {summary.corrections} corrections · {Math.round(summary.knownDurationMs / 1000)} seconds recorded</p><p>Known image-generation cost estimate: ${(summary.knownCostUsdMicros / 1e6).toFixed(4)} USD. {summary.unknownCostAttempts} attempt(s) with unknown cost. This excludes human review, hosting and any unreported provider usage; it is not a final invoice.</p><ol>{attempts.map(item => <li key={item.generation_id}>{item.generation_id.slice(0, 8)} · {item.status} · correction {item.metadata.correctionAttempt || 0} · {item.cost_usd_micros === null ? 'cost unknown' : `$${(item.cost_usd_micros / 1e6).toFixed(4)} estimated`} · {item.duration_ms === null ? 'time unknown' : `${Math.round(item.duration_ms / 1000)}s`}</li>)}</ol></section>}
  </div>;
}
function Review({ selection, initial, disabled, onSave }: { selection: ProductSelection; initial?: PilotReview; disabled: boolean; onSave: (review: PilotReview) => void }) {
  const [review, setReview] = useState<PilotReview>(initial || { architecture: 'uncertain', retainedFurniture: 'uncertain', products: selection.products.map(item => ({ variantId: item.selected.variantId, quantity: 'uncertain', shape: 'uncertain', finish: 'uncertain', placement: 'uncertain' })), notes: '' });
  return <section className={styles.panel}><h2>Review the source room and every major product</h2><p>Compare the images above. Check windows, doors, skirting, camera angle and retained furniture, then compare each product with its exact reference. If an item is hidden, choose “Uncertain”. A visual pass does not verify fit.</p>
    <div className={styles.checks}><CheckField label="Architecture and camera perspective" value={review.architecture} disabled={disabled} onChange={value => setReview({ ...review, architecture: value })} /><CheckField label="Retained furniture preserved" value={review.retainedFurniture} disabled={disabled} onChange={value => setReview({ ...review, retainedFurniture: value })} />
    {review.products.map((product, index) => <fieldset key={product.variantId}><legend>{selection.products[index].selected.productName} · {selection.products[index].selected.variantName}</legend>{(['quantity', 'shape', 'finish', 'placement'] as const).map(key => <CheckField key={key} label={{ quantity: 'Correct count; no missing items', shape: 'Silhouette and shape', finish: 'Material, finish and colour', placement: 'Plausible intended placement' }[key]} value={product[key]} disabled={disabled} onChange={value => setReview({ ...review, products: review.products.map(item => item.variantId === product.variantId ? { ...item, [key]: value } : item) })} />)}</fieldset>)}</div>
    <label>Observed issues and review notes<textarea rows={3} maxLength={2000} value={review.notes} disabled={disabled} onChange={event => setReview({ ...review, notes: event.target.value })} /></label><button className="button buttonSecondary" disabled={disabled} onClick={() => onSave(review)}>{reviewPassed(review) ? 'Save visual review' : 'Save issues for correction'}</button>
  </section>;
}
function CheckField({ label, value, disabled, onChange }: { label: string; value: Check; disabled: boolean; onChange: (value: Check) => void }) { return <label>{label}<select value={value} disabled={disabled} onChange={event => onChange(event.target.value as Check)}><option value="uncertain">Uncertain / not checked</option><option value="pass">Visually acceptable</option><option value="fail">Needs correction</option></select></label>; }
