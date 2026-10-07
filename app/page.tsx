import Link from 'next/link';
import { Header } from '@/components/Header';
import { RecommendationSample } from '@/components/RecommendationSample';
import { site } from '@/lib/site';

export default function HomePage() {
  return (
    <main>
      <Header />

      <section className="stageHero shellWide">
        <div className="stageHeroCopy">
          <p className="eyebrow">UK-first interior design + commerce</p>
          <h1>{site.proposition}</h1>
          <p className="heroLead">
            Start with your real room. Build the brief before we render. Then turn the design into a room made from products you can actually buy.
          </p>
          <div className="heroActions">
            <Link className="button buttonPrimary" href="/design">Design my room</Link>
            <Link className="textArrowLink" href="/style-guide">See the design direction <span>→</span></Link>
          </div>
          <div className="brandPrinciples" aria-label="Product principles">
            <span>Real room</span><i />
            <span>Real products</span><i />
            <span>Real UK prices</span>
          </div>
        </div>

        <div className="heroEditorialVisual" aria-label="Stage one visual language preview">
          <div className="editorialWall" />
          <div className="editorialWindow" />
          <div className="editorialSofa" />
          <div className="editorialTable" />
          <div className="editorialLamp" />
          <div className="editorialArt" />
          <span className="visualCaption">Visual placeholder · photography comes in Stage 2</span>
        </div>
      </section>

      <section className="designPosition" id="accessible-premium">
        <div className="shell sectionGrid">
          <div>
            <p className="eyebrow">Design position</p>
            <h2>Premium enough to inspire. Accessible enough to use.</h2>
          </div>
          <div className="positionCopy">
            <p>
              The brand should feel closer to an interiors publication and a beautifully curated furniture store than an AI software tool. The technology stays quiet; the room and the buying decision stay in focus.
            </p>
            <div className="principleRows">
              <div><span>01</span><strong>Editorial space</strong><p>Large imagery, confident type and enough whitespace for the room to do the selling.</p></div>
              <div><span>02</span><strong>Useful restraint</strong><p>Fewer boxes, fewer claims and fewer competing calls to action.</p></div>
              <div><span>03</span><strong>Buying confidence</strong><p>Recommendations explain themselves when customers want the reasoning.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="trustPreview shell sectionPad" id="trust-layer">
        <div className="trustIntro">
          <p className="eyebrow">Recommendation language</p>
          <h2>We should be able to explain why something belongs in the room.</h2>
          <p>
            Not every reason needs to be visible all the time. A quiet hover or tap can reveal the logic behind a recommendation without cluttering the shopping experience.
          </p>
        </div>
        <RecommendationSample />
      </section>

      <section className="stageOneBoundary">
        <div className="shell stageOneBoundaryInner">
          <div>
            <p className="eyebrow eyebrowLight">Stage 1 boundary</p>
            <h2>The foundations are set. The homepage itself comes next.</h2>
          </div>
          <p>
            Stage 2 will replace these visual placeholders with the full premium homepage: room photography, before/after storytelling, real-product interaction, budget communication and the first Verified Room introduction.
          </p>
        </div>
      </section>

      <footer className="siteFooter shellWide">
        <span>{site.name} · working name</span>
        <span>UK living-room MVP</span>
        <Link href="/style-guide">Design system</Link>
      </footer>
    </main>
  );
}
