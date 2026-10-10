'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import beforeRoom from '@/public/images/hero-room-before.webp';
import afterRoom from '@/public/images/hero-room-after.webp';

export function HomeHeroImage() {
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [pricesReady, setPricesReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const prices = useRef<HTMLDivElement>(null);
  const loaded = beforeLoaded && afterLoaded;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Only image readiness and animation completion update React, never animation frames.
  // ResizeObserver maps original-image coordinates through object-fit and the final zoom.
  useEffect(() => {
    const container = frame.current;
    const labels = prices.current;
    if (!container || !labels) return;
    const positionLabels = () => {
      const { width, height } = container.getBoundingClientRect();
      const mobile = window.matchMedia('(max-width: 680px)').matches;
      const cover = Math.max(width / afterRoom.width, height / afterRoom.height);
      const imageWidth = afterRoom.width * cover;
      const imageHeight = afterRoom.height * cover;
      const zoom = reducedMotion ? 1 : mobile ? 1.065 : 1.085;
      const px = reducedMotion ? (mobile ? .61 : .5) : mobile ? .68 : .66;
      const py = reducedMotion ? .5 : mobile ? .38 : .31;
      const ox = width * (mobile ? .76 : .72);
      const oy = height * (mobile ? .30 : .24);
      for (const label of labels.querySelectorAll<HTMLElement>('[data-image-x]')) {
        const x = ((width - imageWidth) * px + Number(mobile ? label.dataset.mobileX || label.dataset.imageX : label.dataset.imageX) * imageWidth - ox) * zoom + ox;
        const y = ((height - imageHeight) * py + Number(label.dataset.imageY) * imageHeight - oy) * zoom + oy;
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        // Never float a label over a different product when its anchor is cropped out.
        label.hidden = x < 0 || x > width || y < 0 || y > height;
      }
    };
    const observer = new ResizeObserver(positionLabels);
    observer.observe(container);
    positionLabels();
    return () => observer.disconnect();
  }, [reducedMotion]);

  const showPrices = afterLoaded && (pricesReady || reducedMotion);
  return (
    <>
      <div ref={frame} className={`heroRoomFrame${loaded ? ' isReady' : ''}`}>
        <div
          className="homeHeroImage heroRoomZoom"
          style={{ animationPlayState: loaded ? 'running' : 'paused' }}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setPricesReady(true);
          }}
        >
          <Image
            className="heroRoomPhoto heroRoomBefore"
            src={beforeRoom} fill sizes="100vw" priority quality={85}
            alt="Empty British living room with a bay window, ready to transform"
            onLoad={() => setBeforeLoaded(true)}
          />
          <div className="heroRoomReveal" style={{ animationPlayState: loaded ? 'running' : 'paused' }}>
            <Image
              className="heroRoomPhoto"
              src={afterRoom} fill sizes="100vw" priority quality={85}
              alt="The same room furnished with an ivory sofa, walnut coffee table and terracotta lounge chair"
              onLoad={() => setAfterLoaded(true)}
            />
          </div>
        </div>
      </div>
      <div ref={prices} className={`heroPrices heroRoomPrices${showPrices ? ' isVisible' : ''}`} aria-hidden={!showPrices}>
        <p className="heroPricesCaption">Example room prices</p>
        <div className="heroPrice heroPricePendant" data-image-x="0.60" data-image-y="0.19">
          <span>Pendant light</span><strong>£165</strong>
        </div>
        <div className="heroPrice heroPriceSofa" data-image-x="0.49" data-mobile-x="0.56" data-image-y="0.62">
          <span>Three-seater sofa</span><strong>£1,295</strong>
        </div>
        <div className="heroPrice heroPriceTable" data-image-x="0.62" data-image-y="0.76">
          <span>Coffee table</span><strong>£245</strong>
        </div>
      </div>
    </>
  );
}
