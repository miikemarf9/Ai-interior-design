'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { buildFallbackBrief, type DesignBrief, type IntakeForBrief } from '@/lib/brief';
import { applySelectionChoices, approvalSnapshot, selectionTotals, type ProductAlternative, type ProductSelection, type ProposedProduct, type SelectionCandidate, type SelectionChoice } from '@/lib/catalog/selection';
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

const catalogueCategories = [
  { category: 'sofas', label: 'Sofas' },
  { category: 'armchairs', label: 'Armchairs' },
  { category: 'coffee-tables', label: 'Coffee tables' },
  { category: 'tv-units', label: 'TV units' },
  { category: 'side-tables', label: 'Side tables' },
  { category: 'rugs', label: 'Rugs' },
  { category: 'floor-lamps', label: 'Floor lamps' },
  { category: 'table-lamps', label: 'Table lamps' },
  { category: 'storage-cabinets', label: 'Storage' },
];

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
  const [addProductOpen, setAddProductOpen] = useState(false);\n  const [addingCategory, setAddingCategory] = useState<{ category: string; label: string } | null>(null);
  const [excludedProducts, setExcludedProducts] = useState<ProposedProduct[]>([]);
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
      if (!intakeSaved?.state) { setLoading(false); return; }
      const storedBrief = JSON.parse(localStorage.getItem('roomfound-brief-v1') || 'null');
      const brief = storedBrief?.brief || buildFallbackBrief(intakeSaved.state);
      const briefSaved = { ...storedBrief, brief, approved: true, source: storedBrief?.source || 'preview' };
      localStorage.setItem('roomfound-brief-v1', JSON.stringify(briefSaved));
      setIntake(intakeSaved.state); setBrief(brief);
      fingerprint.current = JSON.stringify([intakeSaved.state, brief]);
      let saved: { selection?: ProductSelection; fingerprint?: string; excludedProducts?: ProposedProduct[] } | null = null;
      try { saved = JSON.parse(localStorage.getItem('roomfound-product-selection-v1') || 'null'); } catch { /* Rebuild malformed saved data. */ }
      // Never display cached photographs or restore approval before server clearance/price checks.
      const previous = saved?.selection?.version === 2 && saved.fingerprint === fingerprint.current ? saved.selection : undefined;
      const sameBrief = saved?.selection?.version === 2 && saved.fingerprint === fingerprint.current;
      const omitted = sameBrief && Array.isArray(saved?.excludedProducts) ? saved.excludedProducts : [];
      setExcludedProducts(omitted);
      loadSelection(intakeSaved.state, briefSaved.brief, previous, false, undefined, omitted);
    } catch { setLoading(false); }
  }, []);

  function save(next: ProductSelection, accepted: boolean, omitted: ProposedProduct[] = excludedProducts) {
    localStorage.setItem('roomfound-product-selection-v1', JSON.stringify({ selection: next, excludedProducts: omitted, approved: accepted, fingerprint: fingerprint.current, updatedAt: new Date().toISOString() }));
  }
  async function loadSelection(room: IntakeForBrief, direction: DesignBrief, previous?: ProductSelection, approve = false, choiceOverride?: SelectionChoice[], omitted: ProposedProduct[] = excludedProducts) {
    setBusy(true); setError(''); setNotice(''); setApproved(false);
    if (previous) save(previous, false, omitted); else localStorage.removeItem('roomfound-product-selection-v1');
    try {
      const response = await fetch('/api/products/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intake: room, brief: direction, choices: choiceOverride || (previous ? choices(previous) : undefined), includedSlots: previous ? Array.from(new Set([...previous.products.map(product => product.slot), ...(choiceOverride || []).map(choice => choice.slot)])) : undefined, approve, acknowledgeLimitations: acknowledged, expectedSnapshot: previous ? approvalSnapshot(previous) : undefined }) });
      const data = await response.json();
      if (!response.ok || data.selection?.version !== 2) throw new Error(data.error || 'The collection could not be checked. Your brief is still saved.');
      setSelection(data.selection); setApproved(Boolean(data.approved)); setNotice(data.warning || ''); save(data.selection, Boolean(data.approved), omitted);
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
  function toggleProduct(product: ProposedProduct, include: boolean) {
    if (!selection) return;
    const omitted = include
      ? excludedProducts.filter(item => item.slot !== product.slot)
      : [...excludedProducts.filter(item => item.slot !== product.slot), product];
    const products = include
      ? [...selection.products, product]
      : selection.products.filter(item => item.slot !== product.slot);
    const next = { ...selection, products, ...selectionTotals(products, selection.budgetMinor) };
    setSelection(next); setExcludedProducts(omitted); setApproved(false); setAcknowledged(false);
    setNotice(include ? 'Item added back. The furniture total has been updated.' : 'Item removed from the room. The furniture total has been updated.');
    save(next, false, omitted);
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
  if (!selection || (!selection.products.length && !excludedProducts.length)) return <section className="selectionEmpty shell">
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
    <section className="selectionHero"><div><p className="eyebrow">Real products for your room</p><h1>Choose the products you want in your room</h1><p>Select the real furniture you’d like to see in your room design. Review your choices and estimated total in Your progress; you can decide whether to buy from a retailer after you see the design.</p><Link href="/design?step=1">Edit room and style choices</Link></div></section>
    <div className={styles.notice} role="status">{notice || 'Review each item before approving. No purchase is made here.'}</div>
    <section className="selectedProducts" aria-label="Recommended furniture">
      {selection.products.map((product, index) => <ProductCard key={product.slot} product={product} index={index} disabled={busy} onChange={(variantId, quantity) => change(product.slot, variantId, quantity)} onToggle={() => toggleProduct(product, false)} onBrowse={() => setBrowseProduct(product)} retailerHref={retailerHref} />)}
    </section>
    <section className={styles.addCatalogue}>
      <button type="button" className={styles.addCatalogueButton} disabled={busy} onClick={() => setAddProductOpen(true)}>
        <span aria-hidden="true">＋</span><strong>Add a product</strong><small>Search the catalogue by category</small>
      </button>
    </section>
    {addProductOpen ? (
      <div className={styles.categoryBackdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAddProductOpen(false); }}>
        <section className={styles.categoryDialog} role="dialog" aria-modal="true" aria-labelledby="catalogue-category-title">
          <button type="button" className={styles.categoryClose} aria-label="Close categories" onClick={() => setAddProductOpen(false)}>×</button>
          <p className={styles.categoryEyebrow}>Cleared catalogue</p>
          <h2 id="catalogue-category-title">What would you like to add?</h2>
          <p>Choose a category, then search the available products.</p>
          <div className={styles.categoryGrid}>
            {catalogueCategories.filter(item => !selection.products.some(product => product.slot === item.category)).map(item => (
              <button key={item.category} type="button" onClick={() => { setAddingCategory(item); setAddProductOpen(false); }}>
                <span aria-hidden="true">＋</span>{item.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    ) : null}
    {excludedProducts.length ? <section className="excludedProducts" aria-label="Products not included"><p className="microLabel">Not included in your room</p><ul>{excludedProducts.map(product => <li key={product.slot}><span>{product.slotLabel}</span><button type="button" className="textButton" disabled={busy} onClick={() => toggleProduct(product, true)}>Add back · {money(product.selected.offer.priceMinor * product.quantity)}</button></li>)}</ul></section> : null}
    {(browseProduct || addingCategory) && intake && brief && selection ? <InventoryPicker
      category={addingCategory?.category || browseProduct!.slot}
      categoryLabel={addingCategory?.label || browseProduct!.slotLabel}
      initialStyle={intake.styles[0] || ''}
      onClose={() => { setBrowseProduct(null); setAddingCategory(null); }}
      onChoose={(variantId) => {
        if (addingCategory) {
          const nextChoices = [...choices(selection).filter(choice => choice.slot !== addingCategory.category), { slot: addingCategory.category, variantId, quantity: 1 }];
          const omitted = excludedProducts.filter(item => item.slot !== addingCategory.category);
          setAddingCategory(null);
          setAcknowledged(false);
          void loadSelection(intake, brief, selection, false, nextChoices, omitted);
          return;
        }
        if (!browseProduct) return;
        const nextChoices = choices(selection).map(choice => choice.slot === browseProduct.slot ? { ...choice, variantId } : choice);
        setBrowseProduct(null);
        setAcknowledged(false);
        void loadSelection(intake, brief, selection, false, nextChoices);
      }}
    /> : null}
    <JourneyAssistant
      visible={Boolean(intake && brief && selection)}
      currentStep={3}
      nextTitle={approved ? 'Create your room visual' : 'Disclaimer'}
      nextDescription={approved
        ? 'Your chosen real products are saved. The next step creates an illustrative design in your room.'
        : 'Please review the disclaimer before saving these products for your room design.'}
      nextDisclaimer={approved ? undefined : {
        text: 'Fit is not verified. Retailer prices, stock, delivery costs and missing products may still need checking. Approval saves this collection for your design; it does not place an order or reserve stock.',
        label: 'I understand these details need checking before I buy.',
        checked: acknowledged,
        onChange: setAcknowledged,
        disabled: busy,
      }}
      nextLabel={approved ? 'Continue to room visual' : 'Review my collection · ' + money(selection.totalMinor)}
      nextHref={approved ? '/render' : undefined}
      onNext={!approved ? () => loadSelection(intake, brief, selection, true) : undefined}
      nextDisabled={!approved && (busy || over || !acknowledged || !selection.products.length)}
      refreshKey={`${selection.totalMinor}:${selection.products.map(product => product.slot + ':' + product.quantity).join(',')}`} 
    />
  </div>;
}

function ProductPhoto({ item }: { item: SelectionCandidate }) {
  const [failed, setFailed] = useState(false);
  return !failed && item.image ? <img src={item.image.url} alt={item.image.altText || name(item)} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <div className="imagePending">Product photograph unavailable. Check the retailer before deciding.</div>;
}
function ProductCard({ product, index, disabled, onChange, onToggle, onBrowse, retailerHref }: { product: ProposedProduct; index: number; disabled: boolean; onChange: (variantId: string, quantity: number) => void; onToggle: () => void; onBrowse: () => void; retailerHref: (offerId: string) => string }) {
  const [open, setOpen] = useState(false);
  const item = product.selected;
  return <article className="selectedProductCard">
    <div className="selectedProductIndex">{String(index + 1).padStart(2, '0')}</div>
    <div className={`selectedProductImage ${styles.productPhoto}`}><ProductPhoto key={item.variantId} item={item} /><span>{product.slotLabel}</span></div>
    <div className="selectedProductMain">
      <div className="selectedProductHeading"><div><small>{item.brandName || item.offer.retailerName}</small><h2>{item.productName}</h2></div><strong>{money(item.offer.priceMinor * product.quantity)}</strong></div>
      <p className={styles.productShortDescription}>{[item.variantName, item.materials[0]?.replace(/-/g, ' '), dimensions(item)].filter(Boolean).join(' · ')}</p>
      <button type="button" className="textButton productIncludeToggle" disabled={disabled} onClick={onToggle}>Remove from room</button>
      <details className={styles.productDetails}>
        <summary>Product details and options</summary>
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
      </details>
    </div>
  </article>
}
