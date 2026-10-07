'use client';

import { useState } from 'react';

const beforeImage =
  'https://images.unsplash.com/photo-1753911372198-50b1b254ad4d?auto=format&fit=crop&q=82&w=1800';
const afterImage =
  'https://images.unsplash.com/photo-1726090401458-7abb00f7450c?auto=format&fit=crop&q=82&w=1800';

export function BeforeAfter() {
  const [position, setPosition] = useState(46);

  return (
    <div className="beforeAfter">
      <div className="beforeAfterFrame">
        <img className="beforeAfterImage" src={afterImage} alt="Designed living room example" />
        <div className="beforeLayer" style={{ width: `${position}%` }}>
          <img className="beforeAfterImage beforeImage" src={beforeImage} alt="Original unfurnished room example" />
        </div>

        <span className="imageTag imageTagLeft">Original</span>
        <span className="imageTag imageTagRight">Reimagined</span>

        <div className="beforeAfterDivider" style={{ left: `${position}%` }} aria-hidden="true">
          <span>↔</span>
        </div>

        <input
          className="beforeAfterRange"
          type="range"
          min="12"
          max="88"
          value={position}
          aria-label="Compare original and redesigned room"
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
      <p className="demoNote">Illustrative transformation preview · your design starts with your own photograph.</p>
    </div>
  );
}
