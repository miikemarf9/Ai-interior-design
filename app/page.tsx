import Link from 'next/link';
import { Header } from '@/components/Header';
import { BeforeAfter } from '@/components/BeforeAfter';
import { ProductHotspots } from '@/components/ProductHotspots';
import { BudgetShowcase } from '@/components/BudgetShowcase';
import { ScrollMotion } from '@/components/ScrollMotion';
import { RoomfoundPillars } from '@/components/RoomfoundPillars';
import { site } from '@/lib/site';


export default function HomePage() {
  return (
    <main>
      <Header />
      <ScrollMotion />

      <section className="homeHero">
        <img
          className="homeHeroImage"
          src="/api/assets/roomfound-hero"
          alt="Warm, high-end contemporary living room in golden natural light"
          fetchPriority="high"
          decoding="async"
        />
        <div className="homeHeroShade" />
        <div className="homeHeroContent shellWide">
          <p className="eyebrow eyebrowLight heroLine heroLineOne">Your room · real products · UK prices</p>
          <h1 className="heroLine heroLineTwo">
            Design a room<br />
            you can actually<br />
            buy.
          </h1>
          <p className="heroLine heroLineThree">Upload a photo of your room. We’ll design around your space, style and budget using furniture you can actually buy.</p>
          <Link className="button buttonPrimary heroLine heroLineFour" href="/design">Design my room</Link>
        </div>
        <div className="heroProof shellWide">
          <span>01 Upload your room</span>
          <span>02 Set your brief</span>
          <span>03 See the design</span>
          <span>04 Shop the room</span>
        </div>
      </section>

      <RoomfoundPillars />

      <section className="reimaginedSection shellWide" id="reimagined" data-reveal>
        <div className="sectionHeading splitHeading">
          <div>
            <p className="eyebrow">Start with your space</p>
            <h2><em className="titleGold">Your room.</em><br /><span>Seen differently.</span></h2>
          </div>
          <p>No blank canvas required. We start with the room you already have and design around the things you want to keep.</p>
        </div>
        <BeforeAfter />
      </section>

      <section className="actualRoomSection" id="shop-room">
        <div className="shellWide actualRoomIntro" data-reveal>
          <p className="eyebrow">Designed to be shoppable</p>
          <h2><em className="titleGold">A room you can</em><br /><span>actually recreate.</span></h2>
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
          <h2><em className="titleGold">Keep what you love.</em><br /><span>Change what you don’t.</span></h2>
          <p>Tell us what stays, what can go and what the room needs to work around. The design starts with your life, not a showroom.</p>
          <Link className="textArrowLink" href="/design">Start with my room <span>→</span></Link>
        </div>
      </section>

      <section className="budgetSection">
        <div className="shellWide" data-reveal>
          <div className="sectionHeading budgetHeading">
            <div>
              <p className="eyebrow">Designed around your budget</p>
              <h2><em className="titleGold">Set the spend.</em><br /><span>Then shape the room.</span></h2>
            </div>
            <p>Choose the budget for the whole room first. We can then balance the sofa, lighting, tables, rug and finishing pieces around it.</p>
          </div>
          <BudgetShowcase />
        </div>
      </section>

      <section className="verifiedSection" id="verified-room">
        <div className="shellWide verifiedGrid" data-reveal>
          <div className="verifiedTitle">
            <p className="eyebrow">Before you buy</p>
            <h2><em className="titleGold">Check the details.</em><br /><span>Not just the look.</span></h2>
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
          <h2><em className="titleGold">One room.</em><br /><span>One clear total.</span></h2>
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
          <h2 className="imageEditorialTitle"><em>See what it</em><br /><span>could become.</span></h2>
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
