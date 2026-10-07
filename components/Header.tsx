import Link from 'next/link';
import { Brand } from './Brand';

export function Header() {
  return (
    <header className="siteHeader shellWide">
      <Brand />
      <nav className="desktopNav" aria-label="Primary navigation">
        <Link href="/style-guide">Our approach</Link>
        <a href="#accessible-premium">Design direction</a>
        <a href="#trust-layer">Why it works</a>
      </nav>
      <div className="headerActions">
        <Link className="textLink" href="/style-guide">Style guide</Link>
        <Link className="button buttonPrimary buttonCompact" href="/design">Design my room</Link>
      </div>
    </header>
  );
}
