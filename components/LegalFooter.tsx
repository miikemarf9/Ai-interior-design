import Link from "next/link";

export function LegalFooter(){
  return (
    <footer className="legalFooter">
      <div className="shellWide legalFooterInner">
        <span>Seemori · UK living-room beta</span>
        <nav aria-label="Legal and privacy">
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <span>Affiliate links may earn Seemori a commission.</span>
      </div>
    </footer>
  );
}
