'use client';

import { useState } from 'react';
import { WhyChosen } from './WhyChosen';

const image =
  'https://images.unsplash.com/photo-1771888703723-01d85da1dae1?auto=format&fit=crop&q=86&w=1800';

const products = {
  sofa: {
    type: 'Sofa',
    price: '£1,295',
    retailer: 'John Lewis',
    size: '210 × 94 × 86 cm',
    x: '44%',
    y: '66%',
    reasons: ['comfort', 'design', 'lasting-style'] as const,
  },
  table: {
    type: 'Coffee table',
    price: '£245',
    retailer: 'UK retailer',
    size: '90 × 55 × 38 cm',
    x: '63%',
    y: '78%',
    reasons: ['design', 'budget-fit', 'room-fit'] as const,
  },
  lamp: {
    type: 'Floor lamp',
    price: '£165',
    retailer: 'UK retailer',
    size: '42 × 42 × 158 cm',
    x: '82%',
    y: '47%',
    reasons: ['design', 'lasting-style'] as const,
  },
};

type ProductKey = keyof typeof products;

export function ProductHotspots() {
  const [active, setActive] = useState<ProductKey>('sofa');
  const product = products[active];

  return (
    <div className="hotspotExperience">
      <div className="hotspotRoom">
        <img src={image} alt="Warm contemporary living room with purchasable product hotspots" />
        <span className="roomDemoFlag">Explore the room</span>

        {(Object.keys(products) as ProductKey[]).map((key) => (
          <button
            className={`hotspot ${active === key ? 'isActive' : ''}`}
            style={{ left: products[key].x, top: products[key].y }}
            type="button"
            key={key}
            aria-label={`View ${products[key].type}`}
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            <span>＋</span>
          </button>
        ))}

        <div className="hotspotCard">
          <div className="hotspotCardTop">
            <span className="microLabel">Product details</span>
            <span className="demoData">Example</span>
          </div>
          <h3>{product.type}</h3>
          <div className="hotspotPriceRow">
            <strong>{product.price}</strong>
            <span>{product.retailer}</span>
          </div>
          <p>{product.size}</p>
          <div className="hotspotReason">
            <span>Why it works here</span>
            <WhyChosen reasons={[...product.reasons]} />
          </div>
        </div>
      </div>
    </div>
  );
}
