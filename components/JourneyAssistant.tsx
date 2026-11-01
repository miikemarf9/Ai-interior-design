'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

type CreditStatus = {
  balance: number;
  verificationStatus: string;
  verifiedRequired: boolean;
  siteCreditExempt: boolean;
  freeCreditAvailable?: boolean;
};

type JourneyAssistantProps = {
  visible?: boolean;
  defaultOpen?: boolean;
  currentStep: number;
  nextTitle: string;
  nextDescription: string;
  nextLabel: string;
  nextHref?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  ownerKey?: string;
  refreshKey?: number | string | null;
  onStageClick?: (stage: number) => void;
};

const DISMISS_KEY = 'transform-my-room-journey-assistant-dismissed-v1';

const stages = [
  { label: 'Your room', detail: 'Room type and photograph', href: '/design?step=0' },
  { label: 'Style and budget', detail: 'Choose the look and allowance', href: '/design?step=1' },
  { label: 'Furniture choices', detail: 'Keep, add or replace pieces', href: '/design?step=2' },
  { label: 'Design brief', detail: 'Review and approve the direction', href: '/brief' },
  { label: 'Furniture collection', detail: 'Choose real products', href: '/products' },
  { label: 'Room visual', detail: 'Create your room design', href: '/render' },
];

function creditSummary(status: CreditStatus | null) {
  if (!status) return 'Image uses';
  if (status.siteCreditExempt) return 'API allowance';
  if (status.verifiedRequired || status.freeCreditAvailable) return '1 free use';
  if (status.balance > 0) return status.balance + (status.balance === 1 ? ' use' : ' uses');
  return '0 uses';
}

function creditTitle(status: CreditStatus | null) {
  if (!status) return 'Checking your balance';
  if (status.siteCreditExempt) return 'Image API allowance';
  if (status.verifiedRequired) return '1 free use';
  if (status.freeCreditAvailable && status.balance === 1) return '1 free use remaining';
  if (status.balance > 0) return status.balance + (status.balance === 1 ? ' use remaining' : ' uses remaining');
  return 'No image uses remaining';
}

function creditDescription(status: CreditStatus | null) {
  if (!status) return 'Your image-use balance will appear here once your room session is ready.';
  if (status.siteCreditExempt) return 'Your account uses the connected image API allowance rather than customer credits.';
  if (status.verifiedRequired) return 'Verify your email to activate your free room image.';
  if (status.freeCreditAvailable) return 'Your first room image is included. Each successful generation uses one credit.';
  if (status.balance > 0) return 'One credit is used for each successful room image. Technical failures are refunded.';
  return 'You have no image uses remaining. You can buy 10 more for £2.';
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
  ownerKey,
  refreshKey,
  onStageClick,
}: JourneyAssistantProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);

  useEffect(() => {
    if (!visible) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      dismissed = false;
    }
    setOpen(defaultOpen && !dismissed);
  }, [visible, defaultOpen]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

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
      if (!key) return;

      try {
        const response = await fetch('/api/credits/status?ownerKey=' + encodeURIComponent(key), { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as CreditStatus;
        if (!cancelled) setCreditStatus(data);
      } catch {
        // Keep the last known balance visible if a refresh is temporarily unavailable.
      }
    }

    void loadCredits();
    const refresh = () => { void loadCredits(); };
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
    };
  }, [visible, ownerKey, refreshKey]);

  function closePanel() {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // The panel still closes for this page if storage is unavailable.
    }
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

  return (
    <>
      {open ? (
        <>
          <button
            type="button"
            className="journeyAssistantBackdrop"
            aria-label="Close your progress panel"
            onClick={closePanel}
          />
          <aside
            id={panelId}
            className="journeyAssistantPanel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelId + '-title'}
          >
            <div className="journeyAssistantHeader">
              <div>
                <p className="eyebrow">Your progress</p>
                <span>{String(Math.min(6, Math.max(1, currentStep))).padStart(2, '0')} / 06</span>
              </div>
              <button type="button" className="journeyAssistantClose" aria-label="Close progress panel" onClick={closePanel}>×</button>
            </div>

            <ol className="journeyAssistantSteps">
              {stages.map((stage, index) => {
                const number = index + 1;
                const complete = number < currentStep;
                const current = number === currentStep;
                const className = 'journeyAssistantStep' + (complete ? ' isComplete' : '') + (current ? ' isCurrent' : '');

                return (
                  <li key={stage.label}>
                    {complete && onStageClick && number <= 3 ? (
                      <button type="button" className={className} onClick={() => onStageClick(number)}>
                        <span className="journeyAssistantStepNumber">✓</span>
                        <span><strong>{stage.label}</strong><small>{stage.detail}</small></span>
                      </button>
                    ) : complete ? (
                      <Link className={className} href={stage.href}>
                        <span className="journeyAssistantStepNumber">✓</span>
                        <span><strong>{stage.label}</strong><small>{stage.detail}</small></span>
                      </Link>
                    ) : (
                      <span className={className} aria-current={current ? 'step' : undefined} aria-disabled={!current}>
                        <span className="journeyAssistantStepNumber">{number}</span>
                        <span><strong>{stage.label}</strong><small>{stage.detail}</small></span>
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
              {nextHref ? (
                <Link className="button buttonPrimary" href={nextHref}>{nextLabel}</Link>
              ) : (
                <button className="button buttonPrimary" type="button" onClick={onNext} disabled={nextDisabled || !onNext}>
                  {nextLabel}
                </button>
              )}
            </section>

            <section className="journeyAssistantCredits" aria-label="Image-use balance">
              <div className="journeyAssistantCreditHeading">
                <span>Image uses</span>
                <strong>{creditTitle(creditStatus)}</strong>
              </div>
              <p>{creditDescription(creditStatus)}</p>
              {creditStatus?.verifiedRequired ? (
                <Link href="/account" className="journeyAssistantCreditLink">Verify email to unlock your free use</Link>
              ) : creditStatus && !creditStatus.siteCreditExempt && creditStatus.balance === 0 ? (
                <Link href="/account" className="journeyAssistantCreditLink">Buy 10 more uses · £2</Link>
              ) : null}
            </section>
          </aside>
        </>
      ) : (
        <button
          type="button"
          className="journeyAssistantToggle"
          aria-controls={panelId}
          aria-expanded="false"
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
