'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

type JourneyIntake = { furniturePair?: { title: string; itemLabels?: string[] }; roomType?: string; projectGoal?: string; styles?: string[]; budget?: number; colours?: string[]; materials?: string[]; dislikes?: string; uses?: string[]; keep?: string[]; change?: string[]; retainedFurniture?: Array<{ label?: string }> };

type CreditStatus = {
  balance: number;
  verificationStatus: string;
  verifiedRequired: boolean;
  siteCreditExempt: boolean;
  freeCreditAvailable?: boolean;
};

type JourneyAssistantProps = {
  intake?: JourneyIntake;
  visible?: boolean;
  defaultOpen?: boolean;
  currentStep: number;
  nextTitle: string;
  nextDescription: string;
  nextLabel: string;
  nextHref?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextDisclaimer?: { text: string; label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean };
  ownerKey?: string;
  refreshKey?: number | string | null;
  onStageClick?: (stage: number) => void;
};

const DISMISS_KEY = 'transform-my-room-journey-assistant-dismissed-v1';

const stages = [
  { label: 'Your room', detail: 'Room type and photograph', href: '/design?step=0' },
  { label: 'Style and budget', detail: 'Choose the look and allowance', href: '/design?step=1' },
  { label: 'Furniture collection', detail: 'Choose real products', href: '/products' },
  { label: 'Room visual', detail: 'Create your room design', href: '/render' },
];

function creditSummary(status: CreditStatus | null) {
  if (!status) return 'Images · …';
  if (status.siteCreditExempt) return 'Owner access';
  if (status.verifiedRequired) return 'Free image · verify';
  if (status.freeCreditAvailable && status.balance === 1) return '1 free image';
  return status.balance + (status.balance === 1 ? ' image left' : ' images left');
}

function creditDescription(status: CreditStatus | null) {
  if (!status) return 'Checking your image balance.';
  if (status.siteCreditExempt) return 'Owner access: image generation does not deduct customer image uses.';
  if (status.verifiedRequired) return 'Verify your email to activate your free image.';
  if (status.balance > 0) return 'One image use is deducted when generation starts and returned if it fails. View your balance or buy more.';
  return 'No images left. Add more from your account.';
}

export function JourneyAssistant({
  visible = true,
  defaultOpen = true,
  currentStep,
  nextTitle,
  nextDescription,
  nextLabel,
  nextHref,
  onNext,
  nextDisabled = false,
  nextDisclaimer,
  ownerKey,
  refreshKey,
  onStageClick,
  intake: currentIntake,
}: JourneyAssistantProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [intakeSummary, setIntakeSummary] = useState<JourneyIntake | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [productSummary, setProductSummary] = useState('');

  useEffect(() => {
    if (!visible) return;
    // Reopen the contextual assistant when the customer reaches a new journey screen.
    setOpen(defaultOpen);
  }, [visible, defaultOpen, currentStep]);

  useEffect(() => {
    document.body.classList.toggle('journeyAssistantOpen', visible && open);
    return () => document.body.classList.remove('journeyAssistantOpen');
  }, [visible, open]);

  useEffect(() => {
    if (!visible) return;
    try {
      const intake = JSON.parse(window.localStorage.getItem('roomfound-intake-v1') || 'null');
      const runtime = JSON.parse(window.localStorage.getItem('roomfound-design-runtime-v1') || 'null');
      const savedProducts = JSON.parse(window.localStorage.getItem('roomfound-product-selection-v1') || 'null');
      setIntakeSummary(intake?.state || null);
      setPhotoName(typeof runtime?.photoName === 'string' ? runtime.photoName : '');
      const products = Array.isArray(savedProducts?.selection?.products)
        ? savedProducts.selection.products.map((item: { slot?: string; slotLabel?: string; selected?: { productName?: string }; quantity?: number }) =>
            (item.slotLabel || item.slot || item.selected?.productName || '').replace(/_/g, ' ') + (item.quantity && item.quantity > 1 ? ' × ' + item.quantity : ''))
        : [];
      setProductSummary(products.filter(Boolean).join(', '));
    } catch {
      setIntakeSummary(null);
      setPhotoName('');
      setProductSummary('');
    }
  }, [visible, currentStep, refreshKey]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let loading = false;

    async function loadCredits() {
      let key = ownerKey || '';
      if (!key) {
        try {
          const raw = window.localStorage.getItem('roomfound-design-runtime-v1');
          const runtime = raw ? JSON.parse(raw) as { ownerKey?: string } : {};
          key = runtime.ownerKey || '';
        } catch {
          key = '';
        }
      }
      if (!key || loading) return;
      loading = true;
      try {
        const response = await fetch('/api/credits/status?ownerKey=' + encodeURIComponent(key), { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as CreditStatus;
        if (!cancelled) setCreditStatus(data);
      } catch {
        // Keep the last known balance visible if a refresh is temporarily unavailable.
      } finally { loading = false; }
    }

    void loadCredits();
    const refresh = () => { void loadCredits(); };
    const timer = window.setInterval(() => { if (!document.hidden) refresh(); }, currentStep === 4 ? 1500 : 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('roomfound-credit-balance-changed', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('roomfound-credit-balance-changed', refresh);
    };
  }, [visible, ownerKey, refreshKey, currentStep]);

  function closePanel() {
    setOpen(false);
  }

  function openPanel() {
    setOpen(true);
    try {
      window.localStorage.removeItem(DISMISS_KEY);
    } catch {
      // The panel still opens for this page if storage is unavailable.
    }
  }

  if (!visible) return null;

  const isChoosingProducts = currentStep === 3 && Boolean(nextDisclaimer);
  const chosenIntake = currentIntake || intakeSummary;
  const readable = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const stageSummaries = [
    chosenIntake
      ? [chosenIntake.roomType === 'living_room' ? 'Living room' : chosenIntake.roomType, photoName ? 'Photo added' : ''].filter(Boolean).join(' · ')
      : '',
    chosenIntake
      ? [
          chosenIntake.furniturePair ? 'Group: ' + (chosenIntake.furniturePair.itemLabels?.join(' + ') || chosenIntake.furniturePair.title)
            : chosenIntake.styles?.length ? 'Style: ' + chosenIntake.styles.map(readable).join(', ') : 'Style: Open to recommendations',
          chosenIntake.colours?.length ? 'Colours: ' + chosenIntake.colours.map(readable).join(', ') : '',
          chosenIntake.materials?.length ? 'Materials: ' + chosenIntake.materials.map(readable).join(', ') : '',
          typeof chosenIntake.budget === 'number' ? 'Group budget: ' + new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(chosenIntake.budget) : '',
        ].filter(Boolean).join('\n')
      : '',
    productSummary,
    '',
  ];

  return (
    <>
      {open ? (
        <aside
          id={panelId}
          className={'journeyAssistantPanel' + (isChoosingProducts ? ' isProductChoosing' : '')}
          aria-label="Your progress and next step"
        >
            <div className="journeyAssistantHeader">
              <div>
                <p className="eyebrow">Your progress</p>
                <span>{String(Math.min(4, Math.max(1, currentStep))).padStart(2, '0')} / 04</span>
              </div>
              <Link href="/account" className="journeyAssistantBalance" title={creditDescription(creditStatus)} aria-label={creditSummary(creditStatus) + '. ' + creditDescription(creditStatus)}>
                <span role="status" aria-live="polite" aria-atomic="true"><strong key={creditSummary(creditStatus)}>{creditSummary(creditStatus)}</strong></span>
              </Link>
              {currentStep !== 3 ? <button type="button" className="journeyAssistantClose" aria-label="Close progress panel" onClick={closePanel}>×</button> : null}
            </div>

            <ol className="journeyAssistantSteps">
              {stages.map((stage, index) => {
                const number = index + 1;
                const complete = number < currentStep;
                const current = number === currentStep;
                const className = 'journeyAssistantStep' + (complete ? ' isComplete' : '') + (current ? ' isCurrent' : '');
                const availableNext = number === currentStep + 1 && currentStep === 3 && !nextDisclaimer && Boolean(nextHref);

                return (
                  <li key={stage.label}>
                    {availableNext ? (
                      <Link className={className + ' isAvailableNext'} href={nextHref!}>
                        <span className="journeyAssistantStepNumber">{number}</span>
                        <span><strong>{stage.label}</strong><small>{stageSummaries[index] || stage.detail}</small></span>
                      </Link>
                    ) : complete && onStageClick && number <= 3 ? (
                      <button type="button" className={className} onClick={() => onStageClick(number)}>
                        <span className="journeyAssistantStepNumber">✓</span>
                        <span><strong>{stage.label}</strong><small>{stageSummaries[index] || stage.detail}</small></span>
                      </button>
                    ) : complete ? (
                      <Link className={className} href={stage.href}>
                        <span className="journeyAssistantStepNumber">✓</span>
                        <span><strong>{stage.label}</strong><small>{stageSummaries[index] || stage.detail}</small></span>
                      </Link>
                    ) : (
                      <span className={className} aria-current={current ? 'step' : undefined} aria-disabled={!current}>
                        <span className="journeyAssistantStepNumber">{number}</span>
                        <span><strong>{stage.label}</strong><small>{stageSummaries[index] || stage.detail}</small></span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>


            <section className="journeyAssistantNext" aria-live="polite">
              <p className="microLabel">Up next</p>
              <h2 id={panelId + '-title'}>{nextTitle}</h2>
              <p>{nextDescription}</p>
              {nextDisclaimer ? (
                <section className="journeyAssistantDisclaimer" aria-label="Disclaimer">
                  <p>{nextDisclaimer.text}</p>
                  <label><input type="checkbox" checked={nextDisclaimer.checked} disabled={nextDisclaimer.disabled} onChange={event => nextDisclaimer.onChange(event.target.checked)} />{nextDisclaimer.label}</label>
                </section>
              ) : null}
              {nextHref ? (
                <Link className="button buttonPrimary" href={nextHref}>{nextLabel}</Link>
              ) : (
                <button className="button buttonPrimary" type="button" onClick={onNext} disabled={nextDisabled || !onNext}>
                  {nextLabel}
                </button>
              )}
            </section>
        </aside>
      ) : (
        <button
          type="button"
          className="journeyAssistantToggle"
          aria-controls={panelId}
          aria-expanded={open}
          onClick={openPanel}
        >
          <span>Your progress</span>
          <strong>{creditSummary(creditStatus)}</strong>
          <span aria-hidden="true">＋</span>
        </button>
      )}
    </>
  );
}
