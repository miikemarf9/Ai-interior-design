'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import homepageHero from '@/public/images/homepage-hero.webp';

export function HomeHeroImage() {
  const [loaded, setLoaded] = useState(false);
  const [settled, setSettled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const showPrices = loaded && (settled || reducedMotion);
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
        onAnimationEnd={(event) => {
          if (event.animationName.startsWith('roomfoundHeroDrift')) setSettled(true);
        }}
      />
      <div className={`heroPrices${showPrices ? ' isVisible' : ''}`} aria-hidden={!showPrices}>
        <p className="heroPricesCaption">Example room prices</p>
        <div className="heroPrice heroPricePendant">
          <span>Pendant light</span><strong>£165</strong>
        </div>
        <div className="heroPrice heroPriceSofa">
          <span>Curved sofa</span><strong>£1,295</strong>
        </div>
        <div className="heroPrice heroPriceTable">
          <span>Coffee table</span><strong>£245</strong>
        </div>
      </div>
    </>
  );
}
