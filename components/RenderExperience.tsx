'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DesignBrief, IntakeForBrief } from '@/lib/brief';
import { approvalSnapshot, buildProductSelection, type ProductSelection } from '@/lib/catalog/selection';
import { MAX_CORRECTIONS, reviewPassed, type Placement, type PilotReview, type Check } from '@/lib/render/pilot';
import styles from './RenderPilot.module.css';
import { trackRoomfound } from '@/components/PrivacyAnalytics';
import { JourneyAssistant } from '@/components/JourneyAssistant';

type Runtime = { ownerKey: string; designId: string; roomAssetId: string };
type Attempt = { generation_id: string; status: string; resultUrl: string | null; cost_usd_micros: number | null; duration_ms: number | null; metadata: { correctionAttempt: number; parentGenerationId?: string; snapshot: { placements: Placement[]; selection: ProductSelection; intake: IntakeForBrief; brief: DesignBrief; roomAssetId: string }; humanReview?: PilotReview & { outcome: string } } };

async function parseRenderResponse(response: Response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const isHtml = response.headers.get('content-type')?.includes('text/html') || /^\s*</.test(body);
    throw new Error(
      isHtml
        ? 'The rendering service returned an HTML error page (HTTP ' + response.status + '). Your generation was not confirmed. Check the attempt history before retrying.'
        : 'The rendering service returned an unreadable response (HTTP ' + response.status + '). Your generation was not confirmed. Check the attempt history before retrying.',
    );
  }
}

export function RenderExperience() {
  const [room, setRoom] = useState<IntakeForBrief | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [siteCreditExempt, setSiteCreditExempt] = useState(false);
  const [verified, setVerified] = useState(false);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const started = useRef(false);
  const autoStarted = useRef(false);
  useEffect(() => {
    if (started.current) return; started.current = true;
    (async () => {
      try {
        const savedRoom = JSON.parse(localStorage.getItem('roomfound-intake-v1') || '{}').state;
        const savedBrief = JSON.parse(localStorage.getItem('roomfound-brief-v1') || '{}');
        const savedSelection = JSON.parse(localStorage.getItem('roomfound-product-selection-v1') || '{}');
        const savedRuntime = JSON.parse(localStorage.getItem('roomfound-design-runtime-v1') || '{}');
        if (!savedRoom || !savedBrief.approved || !savedBrief.brief || !savedRuntime.roomAssetId || !savedRuntime.designId || !savedRuntime.ownerKey) { setBlocked('Upload your room photo and approve your room brief first.'); return; }
        if (savedRoom.roomType === 'bedroom') { setBlocked('The first pilot is living-room only. Bedroom generation remains unavailable.'); return; }
        setRoom(savedRoom); setBrief(savedBrief.brief); setRuntime(savedRuntime);
        const history = await readHistory(savedRuntime);
        if (!history.available) { setBlocked(history.reason); return; }
        let nextSelection = buildProductSelection(savedRoom, savedBrief.brief, []);
        if (savedSelection.selection?.version === 2 && savedSelection.selection.products?.length) {
          try {
            const response = await fetch('/api/products/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intake: savedRoom, brief: savedBrief.brief, choices: savedSelection.selection.products.map((p: any) => ({ slot: p.slot, variantId: p.selected.variantId, quantity: p.quantity })), approve: true, acknowledgeLimitations: true, expectedSnapshot: approvalSnapshot(savedSelection.selection) }) });
            const checked = await response.json();
            if (response.ok && checked.approved) {
              nextSelection = checked.selection;
              localStorage.setItem('roomfound-product-selection-v1', JSON.stringify({ ...savedSelection, selection: checked.selection, approved: true, updatedAt: new Date().toISOString() }));
            }
          } catch { /* Keep rendering locked until a product collection is approved. */ }
        }
        if (!nextSelection.products.length) {
          setBlocked('Your room details are saved, but your furniture collection still needs approval. Approve it on the furniture page and your room visual will start automatically.');
          return;
        }
        setSelection(nextSelection);
        const prior = history.attempts?.find((item: Attempt) => item.status === 'succeeded' && item.metadata?.snapshot?.roomAssetId === savedRuntime.roomAssetId && approvalSnapshot(item.metadata.snapshot.selection) === approvalSnapshot(nextSelection) && JSON.stringify([item.metadata.snapshot.intake, item.metadata.snapshot.brief]) === JSON.stringify([savedRoom, savedBrief.brief]));
        const savedPlan: Placement[] = prior?.metadata.snapshot.placements || JSON.parse(localStorage.getItem(`roomfound-placements:${savedRuntime.designId}`) || '[]') as Placement[];
        const nextPlacements: Placement[] = nextSelection.products.map((p: any) => ({
          variantId: p.selected.variantId,
          instruction: savedPlan.find(item => item.variantId === p.selected.variantId)?.instruction || `Place the ${p.slotLabel.toLowerCase()} naturally in the room while keeping walkways clear.`,
        }));
        setPlacements(nextPlacements);
        localStorage.setItem(`roomfound-placements:${savedRuntime.designId}`, JSON.stringify(nextPlacements));
        await loadCredits(savedRuntime);
      } catch { setBlocked('We could not prepare the pilot. Your saved brief and furniture choices have not been changed.'); }
      finally { setReady(true); }
    })();
  }, []);
  async function loadCredits(context: Runtime) {
    const response = await fetch(`/api/credits/status?ownerKey=${encodeURIComponent(context.ownerKey)}`, { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) { setBalance(data.balance); setSiteCreditExempt(Boolean(data.siteCreditExempt)); setVerified(!data.verifiedRequired); }
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
  useEffect(() => {
    if (!ready || blocked || !selection?.products.length || !runtime || !room || !brief || !verified || busy || processing || result || autoStarted.current) return;
    if (!siteCreditExempt && (balance === null || balance < 1)) return;
    if (placements.some(item => item.instruction.trim().length < 5)) return;
    autoStarted.current = true;
    void generate();
    // Start only once for this page load; a failure is shown for the user to review before retrying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, blocked, selection, runtime, room, brief, verified, busy, processing, result, siteCreditExempt, balance, placements]);
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
      const data = await parseRenderResponse(response);
      if (!response.ok) {
        if (data.code?.endsWith('_REFUNDED')) localStorage.removeItem(key);
        throw new Error(data.error || 'Generation could not be confirmed. Reload the saved attempt before retrying.');
      }
      localStorage.removeItem(key); setCorrection('');
      const history = await readHistory(runtime);
      const savedAttempt = history.attempts?.[0] as Attempt | undefined;
      if (savedAttempt?.status === 'succeeded' && savedAttempt.generation_id) {
        const saveKey = `roomfound-saved-analytics:${runtime.designId}:${savedAttempt.generation_id}`;
        if (!localStorage.getItem(saveKey)) {
          trackRoomfound('room_saved', {
            roomType: room.roomType || 'living_room',
            styles: room.styles,
            selectedProducts: selection.products.map(product => ({ productId: product.selected.productId, category: product.slot })),
          });
          localStorage.setItem(saveKey, '1');
        }
      }
      await loadCredits(runtime);
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
  if (blocked || !selection || !runtime) return <section className="renderMissing shell"><p className="eyebrow">Living-room pilot</p><h1>Choose the furniture before creating your room visual.</h1><p>{blocked || 'The pilot is not ready.'}</p><Link className="button buttonPrimary" href="/products">Review available products</Link></section>;
  const originalUrl = `/api/assets/${runtime.roomAssetId}?ownerKey=${encodeURIComponent(runtime.ownerKey)}`;
  const reviewed = result?.metadata.humanReview;
  const correctionReady = !!result && reviewed?.outcome === 'needs_correction' && result.metadata.correctionAttempt < MAX_CORRECTIONS && !failedCorrection;
  return <div className="renderExperience shell">
    <section className="renderHero"><div className="renderHeroCopy"><p className="eyebrow">Living-room pilot</p><h1>See your room. Check the details.</h1><p>The photograph and approved brief guide an illustrative design. Furniture shown is a concept, not an exact product match or a guarantee of physical fit. Any retailer products are shown separately with their own photos and links.</p></div></section>
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
    {busy && !result && <p role="status">Your room visual is starting now. Your image use is only charged after a successful generation.</p>}
    {processing && <div className={styles.panel}><p>An attempt is processing. Refresh its status before starting another.</p><button className="button buttonSecondary" onClick={() => readHistory(runtime).catch(error => setError(error.message))}>Refresh attempt status</button></div>}
    {!result && !processing && <button className="button buttonPrimary" disabled={busy || !verified || (!siteCreditExempt && (balance === null || balance < 1)) || placements.some(item => item.instruction.trim().length < 5)} onClick={generate}>{busy ? 'Generating…' : `Generate illustrative room design · ${siteCreditExempt ? 'API allowance' : '1 credit'}`}</button>}
    {!siteCreditExempt && verified && balance === 0 && <p>You’ve used your free image. <Link href="/account">Buy 10 more for £2</Link>.</p>}
    {!verified && <p>A verified account and available credit balance are required before generating.</p>}
    {correctionReady && <section className={styles.panel}><h2>Make a controlled correction</h2><p>Describe the specific failed checks. We reuse the original room, approved references and previous result. A correction costs one credit and must be checked again.</p><label>What needs correcting?<textarea rows={3} maxLength={2000} value={correction} onChange={event => setCorrection(event.target.value)} /></label><button className="button buttonPrimary" disabled={busy || processing || !verified || (!siteCreditExempt && !balance) || correction.trim().length < 10} onClick={generate}>{busy ? 'Correcting…' : `Generate correction · ${siteCreditExempt ? 'API allowance' : '1 credit'}`}</button></section>}
    {result && (failedCorrection || result.metadata.correctionAttempt >= MAX_CORRECTIONS) && <p>The correction limit or a technical failure has stopped this sequence. Review the saved attempts manually before authorising further work.</p>}
    {reviewed?.outcome === 'visually_reviewed' && <div className={styles.panel}><h2>Visual review saved</h2><p>This records your visual assessment, not an exact-match certificate or a fit guarantee.</p><Link className="button buttonPrimary" href="/room">Open my designed room</Link></div>}
    {result && <section className={styles.purchaseChecks} aria-labelledby="purchase-checks-title">
      <h2 id="purchase-checks-title">Before you decide to buy</h2>
      <p className={styles.purchaseChecksIntro}>The room visual is illustrative. Check these practical details and the retailer’s current information before purchasing.</p>
      <div className={styles.purchaseCheckGrid}>
        <article><h3>Check fit and access</h3><p>{room?.measurements.accuracy === 'measured' ? 'Measurements were supplied by you.' : 'Room measurements are approximate or unknown.'} Check wall space, walkways, doorways, existing furniture and delivery access.</p></article>
        <article><h3>Check what stays</h3><p>{selection.retainedItems.length ? selection.retainedItems.join(', ') : 'No existing furniture was specified.'} Photo markers show item positions, not dimensions. Make sure each item is accounted for.</p></article>
        {selection.missingItems.length > 0 && <article><h3>Items not included</h3><p>{selection.missingItems.join(', ')} These items are not part of the product total.</p></article>}
        {selection.unknownDelivery && <article><h3>Confirm delivery</h3><p>Ask the retailer to confirm delivery fees, postcode restrictions, lead times and assembly.</p></article>}
        {selection.notes.length > 0 && <article><h3>Other checks</h3><ul>{selection.notes.map(note => <li key={note}>{note}</li>)}</ul></article>}
        <article><h3>Prices and availability</h3><p>Retailer prices and stock can change. Confirm the current details with the retailer before buying.</p></article>
      </div>
    </section>}
    {summary && <section className={styles.panel}><h2>Pilot attempt record</h2><p>{summary.attempts} recent attempts · {summary.corrections} corrections · {Math.round(summary.knownDurationMs / 1000)} seconds recorded</p><p>Known image-generation cost estimate: ${(summary.knownCostUsdMicros / 1e6).toFixed(4)} USD. {summary.unknownCostAttempts} attempt(s) with unknown cost. This excludes human review, hosting and any unreported provider usage; it is not a final invoice.</p><ol>{attempts.map(item => <li key={item.generation_id}>{item.generation_id.slice(0, 8)} · {item.status} · correction {item.metadata.correctionAttempt || 0} · {item.cost_usd_micros === null ? 'cost unknown' : `${(item.cost_usd_micros / 1e6).toFixed(4)} estimated`} · {item.duration_ms === null ? 'time unknown' : `${Math.round(item.duration_ms / 1000)}s`}</li>)}</ol></section>}
    <JourneyAssistant
      visible={true}
      currentStep={4}
      ownerKey={runtime.ownerKey}
      refreshKey={balance}
      nextTitle={result
        ? reviewed?.outcome === 'visually_reviewed' ? 'Your room is ready' : 'Review your room visual'
        : !verified ? 'Verify your account'
          : !siteCreditExempt && balance === 0 ? 'Add image uses'
            : 'Create your room visual'}
      nextDescription={result
        ? reviewed?.outcome === 'visually_reviewed'
          ? 'Your room visual has been reviewed and is ready to open in your saved room.'
          : 'Compare the generated image with your original room and selected products before continuing.'
        : !verified
          ? 'Verify your email to activate your free room image.'
          : !siteCreditExempt && balance === 0
            ? 'Your free image has been used. Add another 10 image uses for £2.'
            : 'Your approved furniture is ready. One image use is deducted only after a successful generation.'}
      nextLabel={result
        ? reviewed?.outcome === 'visually_reviewed' ? 'Open my designed room' : 'Review generated image'
        : !verified ? 'Verify my account'
          : !siteCreditExempt && balance === 0 ? 'Buy 10 uses · £2'
            : 'Generate room design · ' + (siteCreditExempt ? 'API allowance' : '1 use')}
      nextHref={result
        ? reviewed?.outcome === 'visually_reviewed' ? '/room' : '#render-review'
        : !verified || (!siteCreditExempt && balance === 0) ? '/account' : undefined}
      onNext={!result && verified && (siteCreditExempt || (balance !== null && balance > 0)) ? generate : undefined}
      nextDisabled={!result && (busy || processing || !verified || (!siteCreditExempt && (balance === null || balance < 1)) || placements.some(item => item.instruction.trim().length < 5))}
    />
  </div>;
}
function Review({ selection, initial, disabled, onSave }: { selection: ProductSelection; initial?: PilotReview; disabled: boolean; onSave: (review: PilotReview) => void }) {
  const [review, setReview] = useState<PilotReview>(initial || { architecture: 'uncertain', retainedFurniture: 'uncertain', products: selection.products.map(item => ({ variantId: item.selected.variantId, quantity: 'uncertain', shape: 'uncertain', finish: 'uncertain', placement: 'uncertain' })), notes: '' });
  return <section id="render-review" className={styles.panel}><h2>Review the source room and every major product</h2><p>Compare the images above. Check windows, doors, skirting, camera angle and retained furniture, then compare each product with its exact reference. If an item is hidden, choose “Uncertain”. A visual pass does not verify fit.</p>
    <div className={styles.checks}><CheckField label="Architecture and camera perspective" value={review.architecture} disabled={disabled} onChange={value => setReview({ ...review, architecture: value })} /><CheckField label="Retained furniture preserved" value={review.retainedFurniture} disabled={disabled} onChange={value => setReview({ ...review, retainedFurniture: value })} />
    {review.products.map((product, index) => <fieldset key={product.variantId}><legend>{selection.products[index].selected.productName} · {selection.products[index].selected.variantName}</legend>{(['quantity', 'shape', 'finish', 'placement'] as const).map(key => <CheckField key={key} label={{ quantity: 'Correct count; no missing items', shape: 'Silhouette and shape', finish: 'Material, finish and colour', placement: 'Plausible intended placement' }[key]} value={product[key]} disabled={disabled} onChange={value => setReview({ ...review, products: review.products.map(item => item.variantId === product.variantId ? { ...item, [key]: value } : item) })} />)}</fieldset>)}</div>
    <label>Observed issues and review notes<textarea rows={3} maxLength={2000} value={review.notes} disabled={disabled} onChange={event => setReview({ ...review, notes: event.target.value })} /></label><button className="button buttonSecondary" disabled={disabled} onClick={() => onSave(review)}>{reviewPassed(review) ? 'Save visual review' : 'Save issues for correction'}</button>
  </section>;
}
function CheckField({ label, value, disabled, onChange }: { label: string; value: Check; disabled: boolean; onChange: (value: Check) => void }) { return <label>{label}<select value={value} disabled={disabled} onChange={event => onChange(event.target.value as Check)}><option value="uncertain">Uncertain / not checked</option><option value="pass">Visually acceptable</option><option value="fail">Needs correction</option></select></label>; }
