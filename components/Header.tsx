'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand';

export function Header({ preview = false, anchorBase = "" }: { preview?: boolean; anchorBase?: string }) {
  const [atTop, setAtTop] = useState(true);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const previousY = lastScrollY.current;

      if (currentY <= 8) {
        setAtTop(true);
        setVisible(true);
      } else {
        setAtTop(false);

        if (currentY > previousY + 4) {
          setVisible(false);
        } else if (currentY < previousY - 4) {
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
        <nav className="desktopNav" aria-label="Primary navigation">
          <a href={`${anchorBase}#reimagined`}>How it works</a>
          <a href={`${anchorBase}#shop-room`}>{preview ? 'Explore the room' : 'Shop the room'}</a>
          <Link href="/ideas">Ideas</Link>
          <a href={`${anchorBase}#verified-room`}>{preview ? 'Your questions' : 'Verified Room'}</a>
        </nav>
        <div className="headerActions">
          <Link className="headerAccountLink" href="/account">My rooms</Link>
          <Link className="button buttonPrimary buttonCompact" href="/design">Upload my room</Link>
        </div>
      </div>
    </header>
  );
}
