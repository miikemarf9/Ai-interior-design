import Image from 'next/image';
import Link from 'next/link';
import { HomeRoomExample } from './HomeRoomExample';
import styles from './HomeBelowHero.module.css';

const steps = [
  ['Upload your room','Start with a photograph of the space you have.'],
  ['Set your brief','Choose your style, furniture budget and what stays.'],
  ['Review the design','Check the room and furniture details before moving on.'],
  ['Explore the furniture','Select a piece to see its details in one place.'],
];
const faqs = [
  ['Can I buy the furniture in the example?', 'Not yet. The homepage rooms and prices are illustrative. We have no approved retailer collection at present, so real-product generation and shopping remain unavailable. You can explore the example and prepare your room brief.'],
  ['Can I keep furniture I already own?', 'Yes. Identify it on your photograph and explain what must stay. Your brief can also include practical needs, preferred materials and what you want to change.'],
  ['Does the image guarantee that everything will fit?', 'No. A visualisation is a design aid. Measurements, access, clearances and the exact product details still need checking. Unknown measurements stay marked as assumptions.'],
  ['Is my furniture budget the design fee?', 'No. Your furniture budget is separate from any image-generation charge. The generation step shows its credit cost before you proceed; it remains blocked until a cleared collection is available.'],
  ['Which rooms can I start with?', 'The first real-product pilot is for living rooms. Bedroom images show design inspiration; bedroom generation is not available yet.'],
];

export function HomeBelowHero() {
  return <div className={styles.home}>
    <section className={`${styles.wrap} ${styles.stepsSection}`} id="reimagined" aria-labelledby="home-steps-title">
      <div className={styles.stepIntro}><p className={styles.kicker}>From your photograph to a considered room</p><h2 id="home-steps-title">A little direction.<br/><em>A clearer picture.</em></h2></div>
      <ol className={styles.steps}>{steps.map(([title,copy],index)=><li key={title}><span>0{index+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      <p className={styles.betaNote}>Explore the example below. Real-product generation is in preparation while we establish our first approved furniture collection.</p>
    </section>

    <section className={styles.exampleSection} id="shop-room" aria-labelledby="home-example-title">
      <div className={styles.wrap}><div className={styles.heading}><div><p className={styles.kicker}>An illustrative living room</p><h2 id="home-example-title">Look closer.<br/><em>Find the details you love.</em></h2></div><p>Tap a marker or choose a piece below. See how individual choices come together in one welcoming room.</p></div><HomeRoomExample/></div>
    </section>

    <section className={`${styles.wrap} ${styles.startSection}`} aria-labelledby="home-start-title">
      <div className={styles.heading}><div><p className={styles.kicker}>Two ways to begin</p><h2 id="home-start-title">Start where <em>you are.</em></h2></div></div>
      <div className={styles.startGrid}>
        <article><div className={styles.panelImage}><Image src="/images/hero-room-before.webp" alt="Empty living room with a bay window, ready for a furnishing brief" width={1672} height={941} sizes="(max-width: 700px) 100vw, 50vw" quality={85}/></div><div className={styles.panelCopy}><span className={styles.kicker}>A fresh start</span><h3>Furnish an empty room.</h3><p>Find your direction before choosing the big pieces. Bring your photograph, style ideas and a budget that feels right.</p><Link href="/design" className={styles.textLink}>Plan my room <span aria-hidden="true">↗</span></Link></div></article>
        <article><div className={styles.panelImage}><Image src="/images/hero-bedroom-after.webp" alt="Illustrative bedroom refresh with blue textiles and contemporary abstract artwork" width={1672} height={941} sizes="(max-width: 700px) 100vw, 50vw" quality={85}/><span>Bedroom inspiration · illustrative</span></div><div className={styles.panelCopy}><span className={styles.kicker}>A new perspective</span><h3>Refresh a room you know.</h3><p>Keep the pieces you love. Tell us what could work harder, feel calmer or better reflect your style.</p><Link href="/design" className={styles.textLink}>Set my brief <span aria-hidden="true">↗</span></Link></div></article>
      </div>
    </section>

    <section className={styles.budgetSection} aria-labelledby="home-budget-title"><div className={`${styles.wrap} ${styles.budgetGrid}`}>
      <div><p className={styles.kicker}>Your priorities, from the start</p><h2 id="home-budget-title">Room for your life.<br/><em>And your budget.</em></h2><p>Tell us where to spend, where to save and what already belongs. Your furniture budget stays separate from the design-generation charge.</p><div className={styles.preferences}><span>Keep the favourite armchair</span><span>Easy-care fabrics</span><span>More space to unwind</span></div><Link className="button buttonLight" href="/design">Build my room brief</Link></div>
      <aside className={styles.spendingPlan} aria-label="Illustrative furniture spending plan"><p className={styles.kicker}>An example spending plan</p><h3>Planning with £3,000</h3><p className={styles.planIntro}>One possible allocation for new furniture.</p><dl>{[['Seating','£1,400'],['Tables & storage','£500'],['Rug','£400'],['Lighting','£300'],['Finishing touches','£400']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>This is a planning illustration, not a product total or a price for the pictured room. Delivery and design charges are additional.</p></aside>
    </div></section>

    <section className={`${styles.wrap} ${styles.faqSection}`} id="verified-room" aria-labelledby="home-faq-title"><div><p className={styles.kicker}>A few things worth knowing</p><h2 id="home-faq-title">Clear details.<br/><em>Considered decisions.</em></h2><p>Know what is an example, what is checked and what still needs your attention.</p></div><div className={styles.faqs}>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className={`${styles.wrap} ${styles.final}`} aria-labelledby="home-final-title"><p className={styles.kicker}>Your room is the starting point</p><h2 id="home-final-title">Make room for<br/><em>your next chapter.</em></h2><p>Start with a photograph. Shape a brief around you.</p><Link className="button buttonPrimary" href="/design">Design my room</Link></section>
    <footer className={`${styles.wrap} ${styles.footer}`}><span>Roomfound</span><span>Thoughtful interiors for real UK homes</span><Link href="/privacy">Privacy</Link></footer>
  </div>;
}
