'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand';

export function Header(_props: { preview?: boolean; anchorBase?: string }) {
  const [atTop, setAtTop] = useState(true);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const initialY = window.scrollY;
    lastScrollY.current = initialY;
    setAtTop(initialY <= 8);
    setVisible(initialY <= 8);

    const onScroll = () => {
      const currentY = window.scrollY;
      const previousY = lastScrollY.current;

      if (currentY <= 8) {
        setAtTop(true);
        setVisible(true);
      } else {
        setAtTop(false);

        if (currentY > previousY) {
          setVisible(false);
        } else if (currentY < previousY) {
          setVisible(true);
        }
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`siteHeader ${atTop ? 'isAtTop' : 'isScrolled'} ${visible ? 'isVisible' : 'isHidden'}`}>
      <div className="siteHeaderInner shellWide">
        <Brand />
        <nav className="headerActions" aria-label="Primary navigation">
          <Link className="headerAccountLink" href="/explore-furniture">Explore Collection</Link>
          <Link className="headerAccountLink" href="/community">Community Rooms</Link>
          <Link className="headerAccountLink" href="/account">My rooms</Link>
        </nav>
        <nav className="headerAuthActions" aria-label="Account access">
          <Link className="headerCreateAccount" href="/account?auth=signup">Create account</Link>
          <Link className="headerLogin" href="/account?auth=login">Log in</Link>
        </nav>
      </div>
    </header>
  );
}
