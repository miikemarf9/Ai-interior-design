import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { BriefExperience } from '@/components/BriefExperience';

export default function BriefPage() {
  return (
    <main className="briefPage">
      <header className="designHeader shellWide">
        <Brand />
        <span className="designHeaderNote">Step 4 of 6 · About 1 minute · Free</span>
        <Link className="textLink" href="/design">Back to answers</Link>
      </header>
      <BriefExperience />
    </main>
  );
}
