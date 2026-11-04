'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DesignBrief, IntakeForBrief } from '@/lib/brief';
import { approvalSnapshot, type ProductSelection, type ProposedProduct } from '@/lib/catalog/selection';
import { JourneyAssistant } from '@/components/JourneyAssistant';
import { trackRoomfound } from '@/components/PrivacyAnalytics';
import styles from './RoomReview.module.css';

function money(minor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(minor / 100);
}

export function RoomReviewExperience() {
  const [room, setRoom] = useState<IntakeForBrief | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [roomPhotoUrl, setRoomPhotoUrl] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const continuing = useRef(false);

  useEffect(() => {
    try {
      const intakeSaved = JSON.parse(localStorage.getItem('roomfound-intake-v1') || 'null');
      const briefSaved = JSON.parse(localStorage.getItem('roomfound-brief-v1') || 'null');
      const productSaved = JSON.parse(localStorage.getItem('roomfound-product-selection-v1') || 'null');
      const runtime = JSON.parse(localStorage.getItem('roomfound-design-runtime-v1') || 'null');
      if (intakeSaved?.state) setRoom(intakeSaved.state);
      if (briefSaved?.brief) setBrief(briefSaved.brief);
      if (productSaved?.selection?.version === 2 && Array.isArray(productSaved.selection.products)) setSelection(productSaved.selection);
      if (runtime?.roomAssetId && runtime?.ownerKey) setRoomPhotoUrl('/api/assets/' + encodeURIComponent(runtime.roomAssetId) + '?ownerKey=' + encodeURIComponent(runtime.ownerKey));
      if (typeof runtime?.ownerKey === 'string') setOwnerKey(runtime.ownerKey);
    } catch {
      setError('Your saved room review could not be opened. Return to your furniture choices and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function continueToRender() {
    if (continuing.current || busy || navigating || !room || !brief || !selection?.products.length || !acknowledged) return;
    continuing.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/products/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake: room,
          brief,
          choices: selection.products.map(product => ({ slot: product.slot, variantId: product.selected.variantId, quantity: product.quantity })),
          includedSlots: selection.products.map(product => product.slot),
          approve: true,
          acknowledgeLimitations: acknowledged,
          expectedSnapshot: approvalSnapshot(selection),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.selection?.version !== 2) throw new Error(data.error || 'We couldn’t recheck these products. Return to your collection and try again.');
      setSelection(data.selection);
      localStorage.setItem('roomfound-product-selection-v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('roomfound-product-selection-v1') || '{}'), selection: data.selection, approved: Boolean(data.approved), updatedAt: new Date().toISOString() }));
      if (!data.approved) {
        setAcknowledged(false);
        setError(data.warning || 'Prices or availability changed. Review the updated collection before continuing.');
        return;
      }
      trackRoomfound('products_approved', {
        roomType: room.roomType || 'living_room',
        styles: room.styles,
        selectedProducts: data.selection.products.map((product: ProposedProduct) => ({ productId: product.selected.productId, category: product.slot })),
        totalMinor: data.selection.totalMinor,
      });
      setNavigating(true);
      window.location.assign('/render');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      continuing.current = false;
      setBusy(false);
      setNavigating(false);
    }
  }

  if (loading) return <section className="selectionLoading shell"><p className="eyebrow">Room review</p><h1>Preparing your room review.</h1><p>No image-generation use is spent yet.</p></section>;
  if (!room || !brief || !selection?.products.length) return <section className="selectionMissing shell"><p className="eyebrow">Room review</p><h1>Your furniture collection is not ready yet.</h1><p>{error || 'Choose a furniture group and review your collection before continuing.'}</p><Link className="button buttonPrimary" href="/products">Back to furniture choices</Link></section>;

  const overBudgetMinor = Math.max(0, -selection.remainingMinor);
  const disclaimer = overBudgetMinor
    ? `This collection is ${money(overBudgetMinor)} over your furniture budget. Continuing uses these products for your room image. No furniture is purchased or reserved. Check measurements, retailer prices, stock, delivery costs and any missing products before buying.`
    : 'Check measurements, retailer prices, stock and delivery before buying. Saving these products creates no order or furniture payment.';

  return <div className={'productSelectionExperience shell ' + styles.experience} aria-busy={busy || navigating}>
    <section className="selectionHero"><div><p className="eyebrow">Step 3 · Room review</p><h1>Review your room and collection</h1><p>Check the room photo and collection total before generating your image. Your furniture stays available to edit on step 2.</p></div></section>
    <div className={styles.reviewLayout}>
      <figure className={styles.roomPhoto}>
        {roomPhotoUrl ? <img src={roomPhotoUrl} alt="Your uploaded room photograph" /> : <div className={styles.photoMissing}>Your room photo is unavailable here. <Link href="/design?step=0">Return to your photo</Link></div>}
        <figcaption><span>Your room photo</span><Link href="/design?step=0">Change photo or notes</Link></figcaption>
      </figure>
      <section className={styles.collectionSummary} aria-label="Furniture collection summary">
        <p className="microLabel">Your furniture collection</p>
        <h2>{selection.products.length} pieces · {money(selection.totalMinor)}</h2>
        <p>Prices and stock will be rechecked before image generation. No furniture is purchased here.</p>
        {overBudgetMinor ? <p className={styles.reviewBudgetWarning} role="alert">Over your furniture budget by {money(overBudgetMinor)}. Return to step 2 to remove or swap items.</p> : null}
        <Link className="button buttonSecondary" href="/products">Change products · Step 2</Link>
      </section>
    </div>
    {error ? <p className={styles.reviewError} role="alert">{error}</p> : null}
    <JourneyAssistant
      visible={Boolean(room && brief && selection)}
      currentStep={3}
      intake={room}
      ownerKey={ownerKey}
      nextTitle="Generate your room image"
      nextDescription={'Furniture total: ' + money(selection.totalMinor) + '. The next page starts generating your room image using one image use. No furniture is purchased here.'}
      nextDisclaimer={{
        text: disclaimer,
        label: overBudgetMinor ? `I understand this collection is ${money(overBudgetMinor)} over budget and needs checking before I buy.` : 'I’ll check measurements, prices and delivery before buying.',
        checked: acknowledged,
        onChange: setAcknowledged,
        disabled: busy || navigating,
      }}
      nextLabel={navigating ? 'Opening image generation…' : 'Generate image · furniture ' + money(selection.totalMinor)}
      onNext={continueToRender}
      nextDisabled={busy || navigating || !acknowledged}
      refreshKey={`${selection.totalMinor}:${selection.products.map(product => product.slot + ':' + product.quantity).join(',')}`}
    />
    <p className="affiliateDisclosure"><strong>Partner links · Ad.</strong> We may earn commission from partner links at no extra cost to you. Prices and stock can change; confirm details with the retailer before buying.</p>
  </div>;
}
