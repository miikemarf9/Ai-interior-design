'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import beforeRoom from '@/public/images/hero-room-before.webp';
import afterRoom from '@/public/images/hero-room-after.webp';
import bedroomBefore from '@/public/images/hero-bedroom-before.webp';
import bedroomAfter from '@/public/images/hero-bedroom-after.webp';
import { heroPoint, clearHeroRect, type HeroRect } from '@/lib/hero-layout';

export function HomeHeroImage({ room = 'living', paused = false, onReady }: {
  room?: 'living' | 'bedroom'; paused?: boolean; onReady?: () => void;
}) {
  const before = room === 'living' ? beforeRoom : bedroomBefore;
  const after = room === 'living' ? afterRoom : bedroomAfter;
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [pricesReady, setPricesReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const prices = useRef<HTMLDivElement>(null);
  const loaded = beforeLoaded && afterLoaded;
  useEffect(() => { if (loaded) onReady?.(); }, [loaded, onReady]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPricesReady(true);
    };
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
    const hero = container.closest('.heroSlide') || container.closest('.homeHero');
    const heroRoot = container.closest('.homeHero');
    let disposed = false;
    const positionLabels = () => {
      const bounds = container.getBoundingClientRect();
      const { width, height } = bounds;
      const mobile = width <= 680;
      const obstacles: HeroRect[] = [];
      // Reserve the navigation's original space even while it is hidden on scroll.
      const header = document.querySelector<HTMLElement>('.siteHeader');
      obstacles.push({ left: 0, top: 0, right: width, bottom: header?.offsetHeight || 94 });
      const protectedElements = [...(hero?.querySelectorAll<HTMLElement>('.homeHeroContent > *') || []), ...(heroRoot?.querySelectorAll<HTMLElement>('.heroProof, .heroCarouselControls, .heroCarouselPause') || [])];
      protectedElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        obstacles.push({ left: rect.left - bounds.left, right: rect.right - bounds.left,
          top: rect.top - bounds.top, bottom: rect.bottom - bounds.top });
      });
      const place = (element: HTMLElement, candidates: { x: number; y: number }[]) => {
        element.hidden = false;
        const w = element.offsetWidth, h = element.offsetHeight;
        for (const { x, y } of candidates) {
          const rect = { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
          if (!clearHeroRect(rect, obstacles, width, height)) continue;
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
          obstacles.push(rect);
          return { x, y, height: h };
        }
        element.hidden = true;
        return null;
      };
      // Reserve a quiet disclosure above the bottom proof bar before placing prices.
      const caption = labels.querySelector<HTMLElement>('.heroPricesCaption');
      if (caption) {
        caption.hidden = false;
        const proof = heroRoot?.querySelector<HTMLElement>('.heroProof');
        const bottom = height - (proof?.offsetHeight || 68) - 18 - caption.offsetHeight / 2;
        place(caption, [
          { x: width - caption.offsetWidth / 2 - 20, y: bottom },
          { x: caption.offsetWidth / 2 + 20, y: bottom },
          { x: width - caption.offsetWidth / 2 - 20, y: bottom - 60 },
          { x: caption.offsetWidth / 2 + 20, y: bottom - 60 },
        ]);
      }
      for (const label of labels.querySelectorAll<HTMLElement>('[data-image-x]')) {
        const x = Number(mobile ? label.dataset.mobileX || label.dataset.imageX : label.dataset.imageX);
        const y = Number(label.dataset.imageY);
        // Nearby alternative anchors stay within/beside the same product, never clamp to screen edges.
        const alternatives = label.dataset.candidates ? [[x, y], ...label.dataset.candidates.split(';').map(pair => pair.split(',').map(Number))] : label.classList.contains('heroPricePendant')
          ? [[x, y], [.66, .18], [.65, .23]]
          : label.classList.contains('heroPriceSofa')
            ? [[x, y], [.53, .65], [.54, .70]]
            : [[x, y], [.65, .74], [.59, .77]];
        place(label, alternatives.map(([ax, ay]) => heroPoint(width, height, ax, ay, reducedMotion)));
        if (caption?.hidden) label.hidden = true; // No illustrative price without its disclosure.
      }
    };
    const observer = new ResizeObserver(positionLabels);
    observer.observe(container);
    hero?.querySelectorAll<HTMLElement>('.homeHeroContent').forEach(element => observer.observe(element));
    heroRoot?.querySelectorAll<HTMLElement>('.heroProof, .heroCarouselControls, .heroCarouselPause').forEach(element => observer.observe(element));
    const content = hero?.querySelector('.homeHeroContent');
    content?.addEventListener('animationend', positionLabels);
    document.fonts.ready.then(() => { if (!disposed) positionLabels(); });
    positionLabels();
    return () => {
      disposed = true;
      observer.disconnect();
      content?.removeEventListener('animationend', positionLabels);
    };
  }, [reducedMotion, pricesReady, room]);

  const showPrices = afterLoaded && (pricesReady || reducedMotion);
  return (
    <>
      <div ref={frame} className={`heroRoomFrame${loaded ? ' isReady' : ''}${pricesReady ? ' isComplete' : ''}`}>
        <div
          className="homeHeroImage heroRoomZoom"
          style={{ animationPlayState: loaded && !paused ? 'running' : 'paused' }}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setPricesReady(true);
          }}
        >
          <Image
            className="heroRoomPhoto heroRoomBefore"
            src={before} fill sizes="100vw" priority quality={85}
            alt={room === 'living' ? 'Empty British living room with a bay window, ready to transform' : 'Existing bedroom with purple bedding and mismatched furniture before redesign'}
            onLoad={() => setBeforeLoaded(true)}
          />
          <div className="heroRoomReveal" style={{ animationPlayState: loaded && !paused ? 'running' : 'paused' }}>
            <Image
              className="heroRoomPhoto"
              src={after} fill sizes="100vw" priority quality={85}
              alt={room === 'living' ? 'The same room furnished with an ivory sofa, walnut coffee table and terracotta lounge chair' : 'The same bedroom redesigned with an upholstered bed, modern wardrobe and walnut chest of drawers'}
              onLoad={() => setAfterLoaded(true)}
            />
          </div>
        </div>
      </div>
      <div ref={prices} className={`heroPrices heroRoomPrices${showPrices ? ' isVisible' : ''}`} aria-hidden={!showPrices}>
        {room === 'living' ? <>
        <p className="heroPricesCaption">Illustrative furniture prices</p>
        <div className="heroPrice heroPricePendant" data-image-x="0.66" data-image-y="0.15">
          <span>Pendant light</span><strong>£165</strong>
        </div>
        <div className="heroPrice heroPriceSofa" data-image-x="0.49" data-mobile-x="0.56" data-image-y="0.62">
          <span>Three-seater sofa</span><strong>£1,295</strong>
        </div>
        <div className="heroPrice heroPriceTable" data-image-x="0.65" data-image-y="0.74">
          <span>Coffee table</span><strong>£245</strong>
        </div>
        </> : <>
          <div className="heroPrice heroBedroomBed" data-image-x="0.66" data-image-y="0.72" data-candidates="0.70,0.77;0.58,0.74">
            <span>Upholstered king-size bed</span>
          </div>
          <div className="heroPrice heroBedroomWardrobe" data-image-x="0.92" data-image-y="0.48" data-candidates="0.94,0.60;0.93,0.35">
            <span>Modern wardrobe</span>
          </div>
          <div className="heroPrice heroBedroomChest" data-image-x="0.09" data-image-y="0.70" data-candidates="0.09,0.76;0.10,0.60">
            <span>Walnut chest of drawers</span>
          </div>
        </>}
      </div>
    </>
  );
}
