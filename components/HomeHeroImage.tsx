'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import homepageHero from '@/public/images/homepage-hero.webp';

export function HomeHeroImage() {
  const [loaded, setLoaded] = useState(false);
  const [pricesReady, setPricesReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => setPricesReady(true), 5000);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  const showPrices = loaded && (pricesReady || reducedMotion);
  return (
    <>
      <Image
        className="homeHeroImage"
        src={homepageHero}
        fill
        sizes="100vw"
        priority
        quality={85}
        alt="Warm, high-end contemporary living room in golden natural light"
        decoding="async"
        style={{ animationPlayState: loaded ? 'running' : 'paused' }}
        onLoad={() => setLoaded(true)}
      />
      <div className={`heroPrices${showPrices ? ' isVisible' : ''}`} aria-hidden={!showPrices}>
        <svg className="heroDemoCursor" viewBox="0 0 28 36" aria-hidden="true" focusable="false">
          <path d="M3 2v27l7-7 6 12 5-2-6-12h10L3 2Z" fill="#fffaf2" stroke="#29241e" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <p className="heroPricesCaption">Example room prices</p>
        <div className="heroPrice heroPricePendant">
          <span>Pendant light</span><strong>£165</strong>
        </div>
        <div className="heroPrice heroPriceSofa">
          <span>Curved sofa</span>
          <span className="heroPriceQualities">Soft silhouette<br />Textured upholstery</span>
          <strong>£1,295</strong>
        </div>
        <div className="heroPrice heroPriceTable">
          <span>Coffee table</span><strong>£245</strong>
        </div>
      </div>
    </>
  );
}
