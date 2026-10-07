import Link from 'next/link';
import { Header } from '@/components/Header';
import { BeforeAfter } from '@/components/BeforeAfter';
import { ProductHotspots } from '@/components/ProductHotspots';
import { BudgetShowcase } from '@/components/BudgetShowcase';
import { site } from '@/lib/site';

const heroImage =
  'https://images.unsplash.com/photo-1761330439741-3dcf41ee766b?auto=format&fit=crop&q=88&w=2200';

export default function HomePage() {
  return (
    <main>
      <Header />

      <section className="homeHero">
        <img className="homeHeroImage" src={heroImage} alt="Warm contemporary living room with natural textures" />
        <div className="homeHeroShade" />
        <div className="homeHeroContent shellWide">
          <p className="eyebrow eyebrowLight">Your room · real products · UK prices</p>
          <h1>{site.proposition}</h1>
          <p>Photograph your living room. Shape the brief. See it redesigned with products you can actually shop.</p>
          <Link className="button buttonLight" href="/design">Design my room</Link>
        </div>
        <div className="heroProof shellWide" aria-label="How the service works">
          <span>01 Upload your room</span>
          <span>02 Approve the brief</span>
          <span>03 See real products</span>
          <span>04 Shop the design</span>
        </div>
      </section>

      <section className="reimaginedSection shellWide" id="reimagined">
        <div className="sectionHeading splitHeading">
          <div>
            <p className="eyebrow">From photograph to room</p>
            <h2>Your room.<br /><em>Reimagined.</em></h2>
          </div>
          <p>Start with the space you already have, not a generic template. The design is built around your room, your taste and your budget.</p>
        </div>
        <BeforeAfter />
      </section>

      <section className="actualRoomSection" id="shop-room">
        <div className="shellWide actualRoomIntro">
          <p className="eyebrow eyebrowLight">The important difference</p>
          <h2>Not just inspiration.<br />The actual room.</h2>
          <p>Products in the visual are tied back to the real things: price, retailer, dimensions and availability.</p>
        </div>
        <div className="shellWide">
          <ProductHotspots />
        </div>
      </section>

      <section className="keepSection shellWide">
        <div className="keepImageWrap">
          <img
            src="https://images.unsplash.com/photo-1726090401458-7abb00f7450c?auto=format&fit=crop&q=84&w=1800"
            alt="Characterful living room with fireplace and existing architectural features"
          />
          <span className="keepTag keepFireplace"><i /> Keep the fireplace</span>
          <span className="keepTag keepFloor"><i /> Keep the floor</span>
          <span className="keepTag replaceSofa"><i /> Replace the sofa</span>
          <span className="keepTag replaceRug"><i /> Replace the rug</span>
        </div>
        <div className="keepCopy">
          <p className="eyebrow">Designed around real life</p>
          <h2>Keep what works.<br />Change what doesn’t.</h2>
          <p>Your room does not need to start from zero. Tell us what stays, what can change and what the design needs to work around.</p>
          <Link className="textArrowLink" href="/design">Start with my room <span>→</span></Link>
        </div>
      </section>

      <section className="budgetSection">
        <div className="shellWide">
          <div className="sectionHeading budgetHeading">
            <div>
              <p className="eyebrow">Budget before rendering</p>
              <h2>Set the budget<br />before we design it.</h2>
            </div>
            <p>We design the room as a whole, so one statement piece does not quietly consume the budget meant for everything else.</p>
          </div>
          <BudgetShowcase />
        </div>
      </section>

      <section className="verifiedSection" id="verified-room">
        <div className="shellWide verifiedGrid">
          <div className="verifiedTitle">
            <p className="eyebrow eyebrowLight">Future trust layer</p>
            <h2>Verified<br />Room.</h2>
            <p>Before you spend serious money, the design should be checked against the products and the room behind it.</p>
          </div>

          <div className="verificationPanel">
            <div className="verificationTop">
              <span>Room verification</span>
              <span className="verificationState">Example</span>
            </div>
            <div className="verificationRows">
              <div><span>Real product</span><strong>Checked</strong></div>
              <div><span>UK availability</span><strong>Checked</strong></div>
              <div><span>Price</span><strong>Checked</strong></div>
              <div><span>Product dimensions</span><strong>Checked</strong></div>
              <div><span>Room measurements</span><strong className="warn">More data needed</strong></div>
              <div><span>Visual representation</span><strong className="warn">Confidence check</strong></div>
            </div>
            <p className="verificationNote">Verified Room will communicate confidence and warnings, not make unsupported “guaranteed to fit” claims.</p>
          </div>
        </div>
      </section>

      <section className="wholeRoomSection shellWide">
        <div className="wholeRoomImage">
          <img
            src="https://images.unsplash.com/photo-1771888703723-01d85da1dae1?auto=format&fit=crop&q=84&w=1800"
            alt="Finished warm contemporary living room"
          />
          <span className="roomCostBadge">Complete room · £1,782</span>
        </div>
        <div className="wholeRoomCopy">
          <p className="eyebrow">One design. One total.</p>
          <h2>The whole room.<br />One price.</h2>
          <div className="roomPriceList">
            <div><span>Sofa</span><strong>£899</strong></div>
            <div><span>Chair</span><strong>£349</strong></div>
            <div><span>Coffee table</span><strong>£199</strong></div>
            <div><span>Rug</span><strong>£180</strong></div>
            <div><span>Lighting</span><strong>£155</strong></div>
          </div>
          <div className="roomGrandTotal"><span>Room total</span><strong>£1,782</strong></div>
          <button className="button buttonPrimary" type="button">Explore this room</button>
          <p className="futureBuy">Later: <strong>Buy this room</strong></p>
        </div>
      </section>

      <section className="finalDesignCta">
        <img
          src="https://images.unsplash.com/photo-1761330439741-3dcf41ee766b?auto=format&fit=crop&q=86&w=2200"
          alt=""
          aria-hidden="true"
        />
        <div className="finalDesignShade" />
        <div className="finalDesignContent shell">
          <p className="eyebrow eyebrowLight">Start with one photograph</p>
          <h2>See what your room<br />could become.</h2>
          <Link className="button buttonLight" href="/design">Design my room</Link>
        </div>
      </section>

      <footer className="siteFooter shellWide">
        <span>{site.name} · working name</span>
        <span>UK living-room MVP</span>
        <span>Real room → real products → better buying confidence</span>
      </footer>
    </main>
  );
}
