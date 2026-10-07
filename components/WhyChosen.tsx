'use client';

import { useId, useState } from 'react';
import { recommendationReasons, type RecommendationReasonKey } from '@/lib/site';

export function WhyChosen({ reasons }: { reasons: RecommendationReasonKey[] }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const selected = recommendationReasons.filter((reason) => reasons.includes(reason.key));

  return (
    <span className="whyChosen">
      <button
        type="button"
        className="whyChosenTrigger"
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        Why this works <span aria-hidden="true">＋</span>
      </button>
      <span className={`whyChosenPopover ${open ? 'isOpen' : ''}`} id={tooltipId} role="tooltip">
        {selected.map((reason) => (
          <span className="reasonRow" key={reason.key}>
            <strong>{reason.label}</strong>
            <span>{reason.copy}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
