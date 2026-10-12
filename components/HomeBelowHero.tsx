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
  ['What can I try today?', 'Explore the example room and select its furniture markers to see illustrative details and prices. Roomfound is currently a preview: uploading your own room, generating a design and shopping are not yet ready for customers.'],
  ['Can I buy the furniture shown?', 'The rooms are AI-generated inspiration, not shoppable collections. Prices are illustrative, not retailer offers. We are working towards a collection with approved product images, exact variants and retailer links.'],
  ['Will I be able to keep my own furniture?', 'That is part of the planned experience. Your room brief will cover what stays, what can change and practical needs such as storage, pets or easy-care fabrics.'],
  ['Will the design guarantee everything fits?', 'No. A room visualisation helps you picture a design; it cannot guarantee fit or an exact product match. Room measurements, access and product dimensions will still need checking before buying.'],
  ['Does the furniture budget include the design fee?', 'No. Furniture spending and any design-generation charge are separate. The £3,000 plan above is an example allocation, not a quote for the pictured room.'],
  ['Will Roomfound work for bedrooms?', 'Living rooms are the focus of our first planned pilot. The bedroom transformation is inspiration only; bedroom generation is not available yet.'],
];

export function HomeBelowHero() {
  return <div className={styles.home}>
    <section className={`${styles.wrap} ${styles.stepsSection}`} id="reimagined" aria-labelledby="home-steps-title">
      <div className={styles.stepIntro}><p className={styles.kicker}>The experience we’re building</p><h2 id="home-steps-title">Your room.<br/><em>A clearer plan.</em></h2></div>
      <ol className={styles.steps}>{steps.map(([title,copy],index)=><li key={title}><span>0{index+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      <p className={styles.betaNote}>Roomfound is currently a preview. Explore the example today; designing your own room and shopping will follow once our first furniture collection and design journey are ready.</p>
    </section>

    <section className={styles.exampleSection} id="shop-room" aria-labelledby="home-example-title">
      <div className={styles.wrap}><div className={styles.heading}><div><p className={styles.kicker}>An illustrative living room</p><h2 id="home-example-title">Look closer.<br/><em>Find the details you love.</em></h2></div><p>Tap a marker or choose a piece below. See how individual choices come together in one welcoming room.</p></div><HomeRoomExample/></div>
    </section>

    <section className={`${styles.wrap} ${styles.startSection}`} aria-labelledby="home-start-title">
      <div className={styles.heading}><div><p className={styles.kicker}>A fresh start or a thoughtful refresh</p><h2 id="home-start-title">Start where <em>you are.</em></h2></div></div>
      <div className={styles.startGrid}>
        <article><div className={styles.panelImage}><Image src="/images/hero-room-before.webp" alt="Empty living room with a bay window, ready for a furnishing brief" width={1672} height={941} sizes="(max-width: 700px) 100vw, 50vw" quality={85}/></div><div className={styles.panelCopy}><span className={styles.kicker}>A fresh start</span><h3>Furnish an empty room.</h3><p>An empty room is full of possibilities. Explore how seating, lighting and a few considered details can make it feel like home.</p><Link href="#shop-room" className={styles.textLink}>Explore the living room <span aria-hidden="true">↗</span></Link></div></article>
        <article><div className={styles.panelImage}><Image src="/images/hero-bedroom-after.webp" alt="Illustrative bedroom refresh with blue textiles and contemporary abstract artwork" width={1672} height={941} sizes="(max-width: 700px) 100vw, 50vw" quality={85}/><span>Bedroom inspiration · illustrative</span></div><div className={styles.panelCopy}><span className={styles.kicker}>A new perspective</span><h3>Refresh a room you know.</h3><p>A room can feel different without replacing everything. Start with what you love, then consider the colours, textures and details you want to change.</p><Link href="#verified-room" className={styles.textLink}>See what’s coming <span aria-hidden="true">↗</span></Link></div></article>
      </div>
    </section>

    <section className={styles.budgetSection} aria-labelledby="home-budget-title"><div className={`${styles.wrap} ${styles.budgetGrid}`}>
      <div><p className={styles.kicker}>Your priorities, from the start</p><h2 id="home-budget-title">Room for your life.<br/><em>And your budget.</em></h2><p>A good plan starts with how you live. Think about the pieces worth investing in, the furniture you want to keep and a total you feel comfortable spending.</p><div className={styles.preferences}><span>Keep the favourite armchair</span><span>Easy-care fabrics</span><span>More space to unwind</span></div><Link className="button buttonLight" href="#verified-room">Your questions answered</Link></div>
      <aside className={styles.spendingPlan} aria-label="Illustrative furniture spending plan"><p className={styles.kicker}>An example spending plan</p><h3>Planning with £3,000</h3><p className={styles.planIntro}>Furnishing with £2,500–£4,000? Here is one way to plan a £3,000 furniture budget.</p><dl>{[['Seating','£1,400'],['Tables & storage','£500'],['Rug','£400'],['Lighting','£300'],['Finishing touches','£400']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>This is a planning illustration, not a product total or a price for the pictured room. Allow separately for delivery and any design charge.</p></aside>
    </div></section>

    <section className={`${styles.wrap} ${styles.faqSection}`} id="verified-room" aria-labelledby="home-faq-title"><div><p className={styles.kicker}>A few things worth knowing</p><h2 id="home-faq-title">Clear details.<br/><em>Considered decisions.</em></h2><p>What you can explore today, and what we’re working towards.</p></div><div className={styles.faqs}>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className={`${styles.wrap} ${styles.final}`} aria-labelledby="home-final-title"><p className={styles.kicker}>A little inspiration goes a long way</p><h2 id="home-final-title">Picture the possibilities.<br/><em>Find what feels like you.</em></h2><p>Explore the example room and discover the details you would make your own.</p><Link className="button buttonPrimary" href="#shop-room">Explore the furniture</Link></section>
    <footer className={`${styles.wrap} ${styles.footer}`}><span>Roomfound</span><span>Thoughtful interiors for real UK homes</span><Link href="/privacy">Privacy</Link></footer>
  </div>;
}
