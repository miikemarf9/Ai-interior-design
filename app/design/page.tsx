import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { DesignIntake } from '@/components/DesignIntake';

export default function DesignPage() {
  return (
    <main className="designPage">
      <header className="designHeader shellWide">
        <Brand />
        <span className="designHeaderNote">About 2 minutes · no design credit used</span>
        <Link className="textLink" href="/">Save &amp; close</Link>
      </header>
      <DesignIntake />
    </main>
  );
}
