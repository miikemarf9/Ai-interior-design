'use client';

import { useState } from 'react';

const levels = [
  {
    value: 1500,
    label: '£1,500',
    tone: 'Focused refresh',
    split: ['Sofa £699', 'Table £179', 'Rug £160', 'Lighting £145', 'Accessories £217'],
    total: '£1,400',
  },
  {
    value: 2500,
    label: '£2,500',
    tone: 'Balanced room',
    split: ['Sofa £899', 'Chair £349', 'Table £199', 'Rug £180', 'Lighting + styling £455'],
    total: '£2,082',
  },
  {
    value: 5000,
    label: '£5,000',
    tone: 'Elevated finish',
    split: ['Sofa £1,795', '2 chairs £898', 'Table £475', 'Rug £495', 'Lighting + styling £742'],
    total: '£4,405',
  },
];

export function BudgetShowcase() {
  const [selected, setSelected] = useState(1);
  const level = levels[selected];

  return (
    <div className="budgetExperience">
      <div className="budgetChoices" role="group" aria-label="Example room budgets">
        {levels.map((item, index) => (
          <button
            key={item.value}
            type="button"
            className={selected === index ? 'isActive' : ''}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <strong>{item.label}</strong>
            <span>{item.tone}</span>
          </button>
        ))}
      </div>

      <div className="budgetVisual">
        <div className="budgetImage">
          <img
            src="https://images.unsplash.com/photo-1761330439741-3dcf41ee766b?auto=format&fit=crop&q=84&w=1600"
            alt="Neutral contemporary living room"
          />
          <div className="budgetOverlay">
            <span>Target budget</span>
            <strong>{level.label}</strong>
          </div>
        </div>
        <div className="budgetBreakdown" aria-live="polite">
          <span className="microLabel">{level.tone}</span>
          {level.split.map((item) => <span key={item}>{item}</span>)}
          <div className="budgetTotal"><span>Example total</span><strong>{level.total}</strong></div>
        </div>
      </div>
    </div>
  );
}
