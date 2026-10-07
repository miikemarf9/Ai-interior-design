'use client';

import { useEffect } from 'react';

export function ScrollMotion() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (!items.length || typeof IntersectionObserver === 'undefined') {
      items.forEach((item) => item.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.14,
      },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return null;
}
