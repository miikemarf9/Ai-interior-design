'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand';

export function Header(_props: { preview?: boolean; anchorBase?: string }) {
  const [atTop, setAtTop] = useState(true);
  const [visible, setVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);

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
          setMobileMenuOpen(false);
        } else if (currentY < previousY) {
          setVisible(true);
        }
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileMenuOpen(false);
      mobileMenuButton.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`siteHeader ${atTop ? 'isAtTop' : 'isScrolled'} ${visible ? 'isVisible' : 'isHidden'}`}>
      <div className="siteHeaderInner shellWide">
        <Brand />
        <nav className="headerActions" aria-label="Primary navigation">
          <Link className="headerAccountLink" href="/explore-furniture">Explore Collection</Link>
          <Link className="headerAccountLink" href="/community">Community Rooms</Link>
          <Link className="headerAccountLink" href="/account">My Rooms</Link>
        </nav>
        <nav className="headerAuthActions" aria-label="Account access">
          <Link className="headerCreateAccount" href="/account?auth=signup">Create Account</Link>
          <Link className="headerLogin" href="/account?auth=login">Log In</Link>
        </nav>
        <button
          ref={mobileMenuButton}
          type="button"
          className={`mobileMenuToggle${mobileMenuOpen ? ' isOpen' : ''}`}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen(open => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="mobile-navigation"
          className={`mobileNavigation${mobileMenuOpen ? ' isOpen' : ''}`}
          aria-label="Mobile navigation"
          hidden={!mobileMenuOpen}
        >
          <Link href="/explore-furniture" onClick={closeMobileMenu}>Explore Collection</Link>
          <Link href="/community" onClick={closeMobileMenu}>Community Rooms</Link>
          <Link href="/account" onClick={closeMobileMenu}>My Rooms</Link>
          <Link className="mobileMenuSignup" href="/account?auth=signup" onClick={closeMobileMenu}>Create account</Link>
          <Link className="mobileMenuLogin" href="/account?auth=login" onClick={closeMobileMenu}>Log in</Link>
        </nav>
      </div>
    </header>
  );
}
