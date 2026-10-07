import Link from 'next/link';
import { Brand } from './Brand';

export function Header() {
  return (
    <header className="siteHeader shellWide">
      <Brand />
      <nav className="desktopNav" aria-label="Primary navigation">
        <a href="#reimagined">How it works</a>
        <a href="#shop-room">Shop the room</a>
        <a href="#verified-room">Verified Room</a>
      </nav>
      <div className="headerActions">
        <Link className="headerAccountLink" href="/account">My rooms</Link>
        <Link className="button buttonPrimary buttonCompact" href="/design">Design my room</Link>
      </div>
    </header>
  );
}
