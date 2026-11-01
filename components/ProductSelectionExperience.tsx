'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DesignBrief, IntakeForBrief } from '@/lib/brief';
import { applySelectionChoices, approvalSnapshot, type ProductAlternative, type ProductSelection, type ProposedProduct, type SelectionCandidate, type SelectionChoice } from '@/lib/catalog/selection';
import { InventoryPicker } from '@/components/InventoryPicker';
import { trackRoomfound } from '@/components/PrivacyAnalytics';
import { JourneyAssistant } from '@/components/JourneyAssistant';
import styles from './ProductSelection.module.css';

function money(minor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(minor / 100);
}
function name(item: SelectionCandidate) { return `${item.productName} · ${item.variantName}`; }
function dimensions(item: SelectionCandidate) {
  return [item.dimensions.widthMm, item.dimensions.depthMm, item.dimensions.heightMm].map(value => value && value > 0 ? `${value / 10} cm` : 'unknown').join(' × ');
}
function checked(value: string) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-GB') : 'Unknown'; }
const choices = (selection: ProductSelection) => selection.products.map(product => ({ slot: product.slot, variantId: product.selected.variantId, quantity: product.quantity }));

function getCommerceSession() {
  const existing = window.localStorage.getItem('roomfound-commerce-session-v1');
  if (existing && /^[a-zA-Z0-9_-]{16,100}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem('roomfound-commerce-session-v1', created);
  return created;
}

export function ProductSelectionExperience() {
  const [intake, setIntake] = useState<IntakeForBrief | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [approved, setApproved] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [browseProduct, setBrowseProduct] = useState<ProposedProduct | null>(null);
  const started = useRef(false);
  const fingerprint = useRef('');

  function retailerHref(offerId: string) {
    const params = new URLSearchParams({ session: getCommerceSession(), surface: 'product_selection' });
    try {
      const runtime = JSON.parse(localStorage.getItem('roomfound-design-runtime-v1') || '{}');
      if (runtime.designId) params.set('designId', runtime.designId);
    } catch { /* The affiliate click still works without a room identifier. */ }
    return `/go/${offerId}?${params.toString()}`;
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const intakeSaved = JSON.parse(localStorage.getItem('roomfound-intake-v1') || 'null');
      const briefSaved = JSON.parse(localStorage.getItem('roomfound-brief-v1') || 'null');
      if (!intakeSaved?.state || !briefSaved?.brief || !briefSaved.approved) { setLoading(false); return; }
      setIntake(intakeSaved.state); setBrief(briefSaved.brief);
      fingerprint.current = JSON.stringify([intakeSaved.state, briefSaved.brief]);
      let saved: { selection?: ProductSelection; fingerprint?: string } | null = null;
      try { saved = JSON.parse(localStorage.getItem('roomfound-product-selection-v1') || 'null'); } catch { /* Rebuild malformed saved data. */ }
      // Never display cached photographs or restore approval before server clearance/price checks.
      const previous = saved?.selection?.version === 2 && saved.fingerprint === fingerprint.current ? saved.selection : undefined;
      loadSelection(intakeSaved.state, briefSaved.brief, previous);
    } catch { setLoading(false); }
  }, []);

  function save(next: ProductSelection, accepted: boolean) {
    localStorage.setItem('roomfound-product-selection-v1', JSON.stringify({ selection: next, approved: accepted, fingerprint: fingerprint.current, updatedAt: new Date().toISOString() }));
  }
  async function loadSelection(room: IntakeForBrief, direction: DesignBrief, previous?: ProductSelection, approve = false, choiceOverride?: SelectionChoice[]) {
    setBusy(true); setError(''); setNotice(''); setApproved(false);
    if (previous) save(previous, false); else localStorage.removeItem('roomfound-product-selection-v1');
    try {
      const response = await fetch('/api/products/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intake: room, brief: direction, choices: choiceOverride || (previous ? choices(previous) : undefined), approve, acknowledgeLimitations: acknowledged, expectedSnapshot: previous ? approvalSnapshot(previous) : undefined }) });
      const data = await response.json();
      if (!response.ok || data.selection?.version !== 2) throw new Error(data.error || 'The collection could not be checked. Your brief is still saved.');
      setSelection(data.selection); setApproved(Boolean(data.approved)); setNotice(data.warning || ''); save(data.selection, Boolean(data.approved));
      if (data.approved) trackRoomfound('products_approved', {
        roomType: room.roomType || 'living_room',
        styles: room.styles,
        selectedProducts: data.selection.products.map((product: ProposedProduct) => ({
          productId: product.selected.productId,
          category: product.slot,
        })),
        totalMinor: data.selection.totalMinor,
      });
      if (data.warning) setAcknowledged(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { setLoading(false); setBusy(false); }
  }
  function change(slot: string, variantId: string, quantity: number) {
    if (!selection) return;
    const next = applySelectionChoices(structuredClone(selection), [{ slot, variantId, quantity }]);
    setSelection(next); setApproved(false); setAcknowledged(false); setNotice('Collection updated. Review the total before approving.'); save(next, false);
  }

  if (loading) return <section className="selectionLoading shell"><p className="eyebrow">Your furniture collection</p><h1>Checking products for your room.</h1><div className="briefLoadingLine"><i /></div><p>No image-generation credit is used.</p></section>;
  if (!intake || !brief) return <section className="selectionMissing shell"><p className="eyebrow">Your furniture collection</p><h1>Agree your room brief first.</h1><p>We use your preferences and the furniture you are keeping to recommend a small collection.</p><Link className="button buttonPrimary" href="/brief">Return to brief</Link></section>;
  if (intake.roomType === 'bedroom') return <section className="selectionMissing shell"><h1>Your bedroom brief is saved.</h1><p>Bedroom furniture selection is not available yet.</p><Link className="button buttonPrimary" href="/brief">Back to my brief</Link></section>;
  if (error) return <section className="selectionMissing shell"><h1>We couldn’t check your collection.</h1><p role="alert">{error}</p><button className="button buttonPrimary" disabled={busy} onClick={() => loadSelection(intake, brief, selection || undefined)}>Try again</button><p><Link href="/brief">Back to my brief</Link></p></section>;
  if (!selection?.products.length) return <section className="selectionEmpty shell">
    <p className="eyebrow">Your furniture collection</p><h1>No reviewed products match this combination yet.</h1>
    <p>We checked the selected item types against your style, budget and room measurements. A room design is only available when it includes at least one reviewed retailer product.</p>
    <p>Your brief is saved. No image-generation credit has been used. Adjust your choices to see products that are available now.</p>
    {selection?.missingItems.length ? <p>Still to source: {selection.missingItems.join(', ')}.</p> : null}
    {selection?.notes.filter(note => note.includes('missing or invalid prices')).map(note => <p key={note}>{note}</p>)}
    <Link className="button buttonPrimary" href="/design">Adjust my style, budget or item choices</Link>
    <Link className="textButton" href="/brief">Review my brief</Link>
    <button className="textButton" disabled={busy} onClick={() => loadSelection(intake, brief)}>Check collection again</button>
  </section>;
  const over = selection.remainingMinor < 0;
  return <div className="productSelectionExperience shell" aria-busy={busy}>
    <section className="selectionHero"><div><p className="eyebrow">Recommended for your room</p><h1>A considered collection. Your final say.</h1><p>Review the exact variants below, or swap a piece from a small shortlist. We use your style and furniture allowance to guide the collection; you can check practical details before accepting it.</p><Link href="/brief">Edit my brief</Link></div>
      <aside className="selectionBudget"><span className="microLabel">Furniture allowance · {money(selection.budgetMinor)}</span>
        <strong>{money(selection.totalMinor)} <small>{selection.unknownDelivery ? 'known total' : 'collection total'}</small></strong>
        <dl className={styles.totals}><div><dt>Products</dt><dd>{money(selection.productSubtotalMinor)}</dd></div><div><dt>Known delivery</dt><dd>{money(selection.knownDeliveryMinor)}</dd></div><div><dt>Other delivery</dt><dd>{selection.unknownDelivery ? 'To confirm' : 'None listed'}</dd></div></dl>
        <p className={over ? 'isOver' : ''}>{over ? `${money(-selection.remainingMinor)} above your allowance. Swap an item or reduce quantity.` : `${money(selection.remainingMinor)} left before any unconfirmed costs or missing items.`}</p>
        <p>Design-generation charges are separate. Retailer prices and availability can change.</p>
      </aside>
    </section>
    <div className={styles.notice} role="status">{notice || 'Review each item before approving. No purchase is made here.'}</div>
    <section className={styles.checks} aria-label="Outstanding checks">
      <h2>Before you decide</h2>
      <p><strong>Fit is not verified.</strong> {intake.measurements.accuracy === 'measured' ? 'Room measurements are customer supplied.' : 'Room measurements are approximate or unknown.'} Check clear wall space, walkways, existing furniture, doorways and delivery access.</p>
      <p><strong>Keeping:</strong> {selection.retainedItems.join(', ') || 'No furniture specified.'} Photo markers identify items, not their dimensions. Check that every retained item is accounted for.</p>
      {selection.missingItems.length > 0 && <p><strong>Not included in this total:</strong> {selection.missingItems.join(', ')}. This is a partial collection.</p>}
      {selection.unknownDelivery && <p><strong>Delivery is incomplete.</strong> Fees, postcode restrictions, lead times and assembly must be confirmed with the retailer.</p>}
      {selection.notes.map(note => <p key={note}>{note}</p>)}
    </section>
    <section className="selectedProducts" aria-label="Recommended furniture">
      {selection.products.map((product, index) => <ProductCard key={product.slot} product={product} index={index} disabled={busy} onChange={(variantId, quantity) => change(product.slot, variantId, quantity)} onBrowse={() => setBrowseProduct(product)} retailerHref={retailerHref} />)}
    </section>
    {browseProduct && intake && brief && selection ? <InventoryPicker category={browseProduct.slot} categoryLabel={browseProduct.slotLabel} initialStyle={intake.styles[0] || ''} onClose={() => setBrowseProduct(null)} onChoose={(variantId) => {
      const nextChoices = choices(selection).map(choice => choice.slot === browseProduct.slot ? { ...choice, variantId } : choice);
      setBrowseProduct(null);
      void loadSelection(intake, brief, selection, false, nextChoices);
    }} /> : null}
    <section id="selection-approval" className={`selectionApproval ${approved ? 'isApproved' : ''}`}>
      <div><span className="microLabel">{approved ? 'Collection accepted' : 'Your decision'}</span><h2>{approved ? 'Your chosen furniture is saved.' : 'Happy with this collection?'}</h2>
        <p>Approval saves these variants and quantities for your design. It does not place an order, reserve stock or confirm that everything fits.</p>
        {!approved && <label className={styles.acknowledge}><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} />I understand that fit, retailer availability and any missing costs or products still need checking.</label>}
      </div>
      {approved ? <Link className="button buttonLight" href="/render">Continue to design</Link> : <button className="button buttonLight" disabled={busy || over || !acknowledged} onClick={() => loadSelection(intake, brief, selection, true)}>{busy ? 'Checking collection…' : 'Accept this collection · Free'}</button>}
    </section>
    <JourneyAssistant
      visible={Boolean(intake && brief && selection)}
      currentStep={4}
      nextTitle={approved ? 'Create your room visual' : 'Approve your furniture collection'}
      nextDescription={approved
        ? 'Your chosen real products are saved. The next step creates an illustrative design in your room.'
        : 'Check the selected variants, quantities, prices and delivery notes before approving your collection.'}
      nextLabel={approved ? 'Continue to room visual' : 'Review my collection'}
      nextHref={approved ? '/render' : '#selection-approval'}
    />
  </div>;
}

function ProductPhoto({ item }: { item: SelectionCandidate }) {
  const [failed, setFailed] = useState(false);
  return !failed && item.image ? <img src={item.image.url} alt={item.image.altText || name(item)} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <div className="imagePending">Product photograph unavailable. Check the retailer before deciding.</div>;
}
function ProductCard({ product, index, disabled, onChange, onBrowse, retailerHref }: { product: ProposedProduct; index: number; disabled: boolean; onChange: (variantId: string, quantity: number) => void; onBrowse: () => void; retailerHref: (offerId: string) => string }) {
  const [open, setOpen] = useState(false);
  const item = product.selected;
  return <article className="selectedProductCard">
    <div className="selectedProductIndex">{String(index + 1).padStart(2, '0')}</div>
    <div className={`selectedProductImage ${styles.productPhoto}`}><ProductPhoto key={item.variantId} item={item} /><span>{product.slotLabel}</span></div>
    <div className="selectedProductMain">
      <div className="selectedProductHeading"><div><small>{item.brandName || item.offer.retailerName}</small><h2>{name(item)}</h2></div><strong>{money(item.offer.priceMinor * product.quantity)}</strong></div>
      <p>{money(item.offer.priceMinor)} per {item.commercial!.unitLabel} · {item.commercial!.packSize} item{item.commercial!.packSize === 1 ? '' : 's'} per pack</p>
      <div className={`selectedProductMeta ${styles.productMeta}`}><span>W × D × H: {dimensions(item)}</span><span>{item.offer.retailerName}</span><span>{item.offer.availability.replace(/_/g, ' ')} when checked {checked(item.offer.lastCheckedAt)}</span></div>
      <p>Materials: {item.materials.length ? item.materials.join(', ').replace(/-/g, ' ') : 'Not confirmed'}.</p>
      <p>Delivery: {item.offer.deliveryPriceMinor === null || item.commercial!.deliveryBasis === 'unknown' ? 'Price to confirm' : `${money(item.offer.deliveryPriceMinor)} ${item.commercial!.deliveryBasis === 'per_order' ? 'per retailer order' : 'per pack'}`}. {item.commercial!.deliveryDetails || 'Timing, postcode eligibility and assembly to confirm.'}</p>
      <p className="selectedProductWhy">{product.reasons.filter(reason => !reason.includes('stock') && !reason.includes('orderable')).slice(0, 2).join(' ')}</p>
      <label className={styles.quantity}>Quantity of {item.commercial!.unitLabel}<select aria-label={`Quantity for ${product.slotLabel}`} disabled={disabled} value={product.quantity} onChange={event => onChange(item.variantId, Number(event.target.value))}>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
      <div className={`selectedProductActions ${styles.actions}`}><button type="button" className="textButton" disabled={disabled} aria-expanded={open} aria-controls={`alternatives-${product.slot}`} onClick={() => setOpen(!open)}>{open ? 'Hide alternatives' : 'Swap this item'}</button><button type="button" className="textButton" disabled={disabled} onClick={onBrowse}>Browse cleared inventory</button><a className="textButton" href={retailerHref(item.offer.id)} target="_blank" rel="noopener noreferrer">View exact variant at retailer ↗</a></div>
      {open && <div id={`alternatives-${product.slot}`} className={styles.alternatives}>
        {!product.alternatives.length && <p>No other cleared variants match this brief yet.</p>}
        {product.alternatives.map((alternative: ProductAlternative) => <div className={styles.alternative} key={alternative.candidate.variantId}>
          <ProductPhoto item={alternative.candidate} /><div><strong>{name(alternative.candidate)}</strong><p>{money(alternative.candidate.offer.priceMinor)} per {alternative.candidate.commercial!.unitLabel} · {alternative.candidate.commercial!.packSize} item(s) per pack</p><p>W × D × H: {dimensions(alternative.candidate)}</p><button type="button" disabled={disabled} className="textButton" onClick={() => { onChange(alternative.candidate.variantId, product.quantity); setOpen(false); }}>Use this variant</button></div>
        </div>)}
      </div>}
    </div>
  </article>;
}
