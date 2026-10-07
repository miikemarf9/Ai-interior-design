import Link from 'next/link';
import { Brand } from '@/components/Brand';

export default function DesignPage() {
  return (
    <main className="entryPage">
      <header className="entryHeader shellWide">
        <Brand />
        <Link className="textLink" href="/">Close</Link>
      </header>
      <section className="entryShell">
        <p className="eyebrow">Design my room</p>
        <h1>Start with the room you already have.</h1>
        <p>
          The full guided intake is intentionally reserved for Stage 3. This route is already in place so the homepage, analytics and future project flow can point to a stable destination from day one.
        </p>
        <div className="uploadPlaceholder" aria-hidden="true">
          <span>＋</span>
          <strong>Room-photo upload lives here</strong>
          <small>Stage 3: photo → preferences → budget → measurements → brief</small>
        </div>
        <Link className="textArrowLink" href="/">← Back to the site</Link>
      </section>
    </main>
  );
}
