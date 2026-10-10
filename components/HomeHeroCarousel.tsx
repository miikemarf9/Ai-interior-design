'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HomeHeroImage } from './HomeHeroImage';

const SLIDE_DURATION = 10000;

export function HomeHeroCarousel() {
  const [active, setActive] = useState(0);
  const [runs, setRuns] = useState([0, 0]);
  const [ready, setReady] = useState([false, false]);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const clock = useRef({ remaining: SLIDE_DURATION });
  const root = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const frozen = useRef<Animation[]>([]);
  const paused = userPaused || hidden || reduced;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(motion.matches);
    const updateVisibility = () => setHidden(document.hidden);
    updateMotion(); updateVisibility();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  const choose = useCallback((index: number) => {
    const next = (index + 2) % 2;
    if (next === active || !ready[next]) return;
    clock.current = { remaining: SLIDE_DURATION };
    setReady(values => values.map((value, i) => i === next ? false : value));
    setRuns(values => values.map((value, i) => i === next ? value + 1 : value));
    setActive(next);
  }, [active, ready]);

  const readyLiving = useCallback(() => setReady(values => values[0] ? values : [true, values[1]]), []);
  const readyBedroom = useCallback(() => setReady(values => values[1] ? values : [values[0], true]), []);

  useEffect(() => {
    if (paused || !ready[active] || !ready[1 - active]) return;
    const currentClock = clock.current;
    const started = performance.now();
    const timer = window.setTimeout(() => choose(1 - active), currentClock.remaining);
    return () => {
      window.clearTimeout(timer);
      currentClock.remaining = Math.max(0, currentClock.remaining - (performance.now() - started));
    };
  }, [active, runs, paused, ready, choose]);

  // Freeze in-flight fades as well as the CSS-controlled room reveal/zoom.
  useEffect(() => {
    if (paused) {
      frozen.current = root.current?.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running') || [];
      frozen.current.forEach(animation => animation.pause());
    } else {
      frozen.current.forEach(animation => {
        if (animation.playState === 'paused') animation.play();
      });
      frozen.current = [];
    }
  }, [paused]);

  return (
    <section ref={root} className={`homeHero homeHeroCarousel${paused ? ' isPaused' : ''}`}
      aria-roledescription="carousel" aria-label="Room transformations"
      onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchEnd={event => {
        if (!touch.current) return;
        const dx = event.changedTouches[0].clientX - touch.current.x;
        const dy = event.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) choose(active + (dx < 0 ? 1 : -1));
      }}
      onKeyDown={event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        choose(active + (event.key === 'ArrowRight' ? 1 : -1));
      }}>
      {[0, 1].map(index => (
        <div key={index} className={`heroSlide${active === index ? ' isActive' : ''}`}
          role="group" aria-roledescription="slide" aria-label={`${index + 1} of 2: ${index === 0 ? 'Furnish an empty living room' : 'Redesign an existing bedroom'}`}
          aria-hidden={active !== index} inert={active !== index}>
          <HomeHeroImage key={runs[index]} room={index === 0 ? 'living' : 'bedroom'}
            paused={paused || active !== index} onReady={index === 0 ? readyLiving : readyBedroom} />
          <div className="homeHeroShade" />
          <div key={`copy-${runs[index]}`} className="homeHeroContent shellWide">
            {index === 0 ? <>
              <p className="eyebrow eyebrowLight heroLine heroLineOne">Your room · real products · UK prices</p>
              <h1 className="heroLine heroLineTwo">Design a room<br />you can actually<br />buy.</h1>
              <p className="heroLine heroLineThree">Upload a photo of your room. We’ll design around your space, style and budget using furniture you can actually buy.</p>
              <Link className="button buttonPrimary heroLine heroLineFour" href="/design">Design my room</Link>
            </> : <>
              <p className="eyebrow eyebrowLight heroLine heroLineOne">YOUR ROOM. REIMAGINED.</p>
              <h1 className="heroLine heroLineTwo">Fall in love with<br />your room again.</h1>
              <p className="heroLine heroLineThree">Your room doesn&apos;t need to be empty. Keep what you love, change what you don&apos;t, and discover a fresh design with furniture to suit your style and budget.</p>
              <Link className="button buttonPrimary heroLine heroLineFour" href="/design">Redesign my room</Link>
            </>}
          </div>
        </div>
      ))}
      <div className="heroProof shellWide">
        <span>01 Upload your room</span><span>02 Set your brief</span>
        <span>03 See the design</span><span>04 Shop the room</span>
      </div>
      <div className="heroCarouselControls" role="group" aria-label="Choose a room transformation">
        <button type="button" onClick={() => choose(active - 1)} aria-label="Previous slide" disabled={!ready[1 - active]}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        {[0, 1].map(index => <button key={index} type="button" className="heroCarouselDot"
          aria-label={`Show ${index === 0 ? 'living room' : 'bedroom'} transformation`} aria-current={active === index ? 'true' : undefined}
          onClick={() => choose(index)} disabled={active !== index && !ready[index]}><span /></button>)}
        <button type="button" onClick={() => choose(active + 1)} aria-label="Next slide" disabled={!ready[1 - active]}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
        </button>
      </div>
      <button type="button" className="heroCarouselPause" disabled={reduced}
        aria-label={reduced ? 'Autoplay disabled for reduced motion' : userPaused ? 'Play room transformations' : 'Pause room transformations'}
        onClick={() => setUserPaused(value => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{userPaused || reduced ? <path d="m9 5 10 7-10 7Z" /> : <><path d="M8 5v14" /><path d="M16 5v14" /></>}</svg>
      </button>
    </section>
  );
}
