import Link from 'next/link';
import { Header } from '@/components/Header';
import { BeforeAfter } from '@/components/BeforeAfter';
import { ProductHotspots } from '@/components/ProductHotspots';
import { BudgetShowcase } from '@/components/BudgetShowcase';
import { ScrollMotion } from '@/components/ScrollMotion';
import { site } from '@/lib/site';

const heroImage =
  'https://images.unsplash.com/photo-1761330439741-3dcf41ee766b?auto=format&fit=crop&q=88&w=2200';

export default function HomePage() {
  return (
    <main>
      <Header />
      <ScrollMotion />

      <section className="homeHero">
        <img className="homeHeroImage" src={heroImage} alt="Warm contemporary living room with natural textures" fetchPriority="high" decoding="async" />
        <div className="homeHeroShade" />
        <div className="homeHeroContent shellWide">
          <p className="eyebrow eyebrowLight heroLine heroLineOne">Your room · real products · one clear budget</p>
          <h1 className="heroLine heroLineTwo">{site.proposition}</h1>
          <p className="heroLine heroLineThree">Upload a photo of your living room and tell us what you want to change. We’ll redesign it around your style, space and budget using furniture you can actually buy.</p>
          <Link className="button buttonLight heroLine heroLineFour" href="/design">Design my room</Link>
        </div>
        <div className="heroProof shellWide">
          <span>01 Share your room</span>
          <span>02 Set your style &amp; budget</span>
          <span>03 See your design</span>
          <span>04 Shop the pieces</span>
        </div>
      </section>

      <section className="reimaginedSection shellWide" id="reimagined" data-reveal>
        <div className="sectionHeading splitHeading">
          <div>
            <p className="eyebrow">Start with your space</p>
            <h2>Your room.<br /><em>Seen differently.</em></h2>
          </div>
          <p>No blank canvas required. We start with the room you already have and design around the things you want to keep.</p>
        </div>
        <BeforeAfter />
      </section>

      <section className="actualRoomSection" id="shop-room">
        <div className="shellWide actualRoomIntro" data-reveal>
          <p className="eyebrow eyebrowLight">Designed to be shoppable</p>
          <h2>A room you can<br />actually recreate.</h2>
          <p>Every recommended piece links back to a real product, with price, dimensions, retailer details and availability where we can verify them.</p>
        </div>
        <div className="shellWide" data-reveal>
          <ProductHotspots />
        </div>
      </section>

      <section className="keepSection shellWide" data-reveal>
        <div className="keepImageWrap revealMedia">
          <img
            src="https://images.unsplash.com/photo-1726090401458-7abb00f7450c?auto=format&fit=crop&q=84&w=1800"
            alt="Characterful living room with fireplace and existing architectural features"
            loading="lazy"
            decoding="async"
          />
          <span className="keepTag keepFireplace"><i /> Keep the fireplace</span>
          <span className="keepTag keepFloor"><i /> Keep the floor</span>
          <span className="keepTag replaceSofa"><i /> Replace the sofa</span>
          <span className="keepTag replaceRug"><i /> Replace the rug</span>
        </div>
        <div className="keepCopy">
          <p className="eyebrow">Make it yours</p>
          <h2>Keep what you love.<br />Change what you don’t.</h2>
          <p>Tell us what stays, what can go and what the room needs to work around. The design starts with your life, not a showroom.</p>
          <Link className="textArrowLink" href="/design">Start with my room <span>→</span></Link>
        </div>
      </section>

      <section className="budgetSection">
        <div className="shellWide" data-reveal>
          <div className="sectionHeading budgetHeading">
            <div>
              <p className="eyebrow">Designed around your budget</p>
              <h2>Set the spend.<br />Then shape the room.</h2>
            </div>
            <p>Choose the budget for the whole room first. We can then balance the sofa, lighting, tables, rug and finishing pieces around it.</p>
          </div>
          <BudgetShowcase />
        </div>
      </section>

      <section className="verifiedSection" id="verified-room">
        <div className="shellWide verifiedGrid" data-reveal>
          <div className="verifiedTitle">
            <p className="eyebrow eyebrowLight">Before you buy</p>
            <h2>Check the details.<br />Not just the look.</h2>
            <p>Verified Room shows what we can confirm about the products and your space, and flags anything that still needs checking.</p>
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
              <div><span>Visual match</span><strong className="warn">Confidence check</strong></div>
            </div>
            <p className="verificationNote">If we cannot verify something confidently, we show that clearly rather than guess.</p>
          </div>
        </div>
      </section>

      <section className="wholeRoomSection shellWide" data-reveal>
        <div className="wholeRoomImage revealMedia">
          <img
            src="https://images.unsplash.com/photo-1771888703723-01d85da1dae1?auto=format&fit=crop&q=84&w=1800"
            alt="Finished warm contemporary living room"
            loading="lazy"
            decoding="async"
          />
          <span className="roomCostBadge">Complete room · £1,782</span>
        </div>
        <div className="wholeRoomCopy">
          <p className="eyebrow">See the full cost</p>
          <h2>One room.<br />One clear total.</h2>
          <div className="roomPriceList">
            <div><span>Sofa</span><strong>£899</strong></div>
            <div><span>Chair</span><strong>£349</strong></div>
            <div><span>Coffee table</span><strong>£199</strong></div>
            <div><span>Rug</span><strong>£180</strong></div>
            <div><span>Lighting</span><strong>£155</strong></div>
          </div>
          <div className="roomGrandTotal"><span>Room total</span><strong>£1,782</strong></div>
          <Link className="button buttonPrimary" href="#shop-room">See the products</Link>
        </div>
      </section>

      <section className="finalDesignCta" data-reveal>
        <img
          src="https://images.unsplash.com/photo-1761330439741-3dcf41ee766b?auto=format&fit=crop&q=86&w=2200"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <div className="finalDesignShade" />
        <div className="finalDesignContent shell">
          <p className="eyebrow eyebrowLight">Your room is the starting point</p>
          <h2>See what it<br />could become.</h2>
          <Link className="button buttonLight" href="/design">Design my room</Link>
        </div>
      </section>

      <footer className="siteFooter shellWide">
        <span>{site.name}</span>
        <span>Interior design you can shop</span>
        <span>Designed for real UK homes</span>
      </footer>
    </main>
  );
}
