import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { RecommendationSample } from '@/components/RecommendationSample';

export default function StyleGuidePage() {
  return (
    <main className="styleGuidePage">
      <header className="entryHeader shellWide">
        <Brand />
        <Link className="textLink" href="/">Back to site</Link>
      </header>

      <section className="styleGuideHero shell">
        <p className="eyebrow">Internal design system · Stage 1</p>
        <h1>Accessible premium.</h1>
        <p>
          Warm, editorial and highly visual. Premium does not mean intimidating, and accessible does not mean cheap-looking.
        </p>
      </section>

      <section className="styleSection shell">
        <div className="styleSectionTitle"><span>01</span><h2>Colour</h2></div>
        <div className="swatchGrid">
          <div className="swatch"><span className="swatchColour chalk" /><strong>Chalk</strong><small>#F6F2EA</small></div>
          <div className="swatch"><span className="swatchColour bone" /><strong>Bone</strong><small>#E9E1D3</small></div>
          <div className="swatch"><span className="swatchColour ink" /><strong>Soft black</strong><small>#20221D</small></div>
          <div className="swatch"><span className="swatchColour forest" /><strong>Forest</strong><small>#35483D</small></div>
          <div className="swatch"><span className="swatchColour clay" /><strong>Clay</strong><small>#9A624D</small></div>
        </div>
      </section>

      <section className="styleSection shell">
        <div className="styleSectionTitle"><span>02</span><h2>Typography</h2></div>
        <div className="typeSpecimen">
          <h3>Rooms should feel considered, not generated.</h3>
          <p>Interface copy stays neutral, concise and highly legible. Editorial headings can carry more character.</p>
          <span className="microLabel">REAL PRODUCT · UK AVAILABLE · £1,095</span>
        </div>
      </section>

      <section className="styleSection shell">
        <div className="styleSectionTitle"><span>03</span><h2>Actions</h2></div>
        <div className="buttonSamples">
          <button className="button buttonPrimary" type="button">Design my room</button>
          <button className="button buttonSecondary" type="button">View product</button>
          <button className="textArrowLink buttonAsText" type="button">See why this works <span>→</span></button>
        </div>
      </section>

      <section className="styleSection shell">
        <div className="styleSectionTitle"><span>04</span><h2>Recommendation reasoning</h2></div>
        <RecommendationSample />
      </section>

      <section className="styleSection shell finalStyleRule">
        <div className="styleSectionTitle"><span>05</span><h2>Rules</h2></div>
        <div className="ruleGrid">
          <div><strong>Do</strong><p>Use generous whitespace, large photography, one dominant action and short confident copy.</p></div>
          <div><strong>Avoid</strong><p>Generic SaaS gradients, crowded feature-card grids, excessive pill labels and explaining every feature at once.</p></div>
        </div>
      </section>
    </main>
  );
}
