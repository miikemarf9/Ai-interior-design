import Image from 'next/image';
import Link from 'next/link';
import { HomeRoomExample } from './HomeRoomExample';
import styles from './HomeBelowHero.module.css';

const steps = [
  ['Upload a photo','Show us the room you want to change.'],
  ['Choose your preferences','Set your style, furniture budget and what stays.'],
  ['See your design','Review selected furniture and see it in your room.'],
  ['Shop the furniture','Check product details and buy from the retailer.'],
];
const faqs = [
  ['Can I buy the furniture?', 'At launch, product links will take you to the retailer to buy. The retailer handles payment, delivery and returns.'],
  ['Can I keep my own furniture?', 'Yes. Tell us which pieces stay so the design can work around them.'],
  ['What budget should I allow?', 'Our first living-room collections are being planned around £2,500–£4,000. Refreshing a room with fewer new pieces may cost less.'],
  ['Do I need measurements?', 'Start with a photo. Key room and furniture measurements help with planning. Check product dimensions and delivery access before ordering.'],
  ['Is the design fee included?', 'No. Any design fee is shown separately from your furniture budget. Retailers confirm delivery charges.'],
];

export function HomeBelowHero() {
  return <div className={styles.home}>
    <section className={`${styles.wrap} ${styles.stepsSection}`} id="reimagined" aria-labelledby="home-steps-title">
      <div className={styles.stepIntro}><h2 id="home-steps-title">How <em>it works.</em></h2></div>
      <ol className={styles.steps}>{steps.map(([title,copy],index)=><li key={title}><span>0{index+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      <p className={styles.betaNote}>Launch preview · Example designs and furniture prices are illustrative.</p>
    </section>

    <section className={styles.exampleSection} id="shop-room" aria-labelledby="home-example-title">
      <div className={styles.wrap}><div className={styles.heading}><div><h2 id="home-example-title">Explore <em>an example room.</em></h2></div><p>Select a marker to see the furniture and example price.</p></div><HomeRoomExample/></div>
    </section>

    <section className={`${styles.wrap} ${styles.startSection}`} aria-labelledby="home-start-title">
      <div className={styles.heading}><div><h2 id="home-start-title">Furnish or <em>refresh.</em></h2></div></div>
      <div className={styles.startGrid}>
        <article><div className={styles.panelImage}><Image src="/images/hero-room-before.webp" alt="Empty living room with a bay window, ready for a furnishing brief" width={1672} height={941} sizes="(max-width: 700px) 100vw, 50vw" quality={85}/></div><div className={styles.panelCopy}><h3>Furnish an empty room.</h3><p>Get a coordinated furniture selection and see how it looks in your room.</p><Link href="#shop-room" className={styles.textLink}>Explore the living room <span aria-hidden="true">↗</span></Link></div></article>
        <article><div className={styles.panelImage}><Image src="/images/hero-bedroom-after.webp" alt="Illustrative bedroom refresh with blue textiles and contemporary abstract artwork" width={1672} height={941} sizes="(max-width: 700px) 100vw, 50vw" quality={85}/><span>Bedroom inspiration · illustrative</span></div><div className={styles.panelCopy}><h3>Keep what you love.</h3><p>Keep your favourite furniture and choose new pieces to work around it.</p><Link href="#verified-room" className={styles.textLink}>See what’s coming <span aria-hidden="true">↗</span></Link></div></article>
      </div>
    </section>

    <section className={styles.budgetSection} aria-labelledby="home-budget-title"><div className={`${styles.wrap} ${styles.budgetGrid}`}>
      <div><h2 id="home-budget-title">Set your <em>furniture budget.</em></h2><p>See individual prices and the furniture total. Decide where to spend, save or use what you already own.</p><Link className="button buttonLight" href="#verified-room">Your questions answered</Link></div>
      <aside className={styles.spendingPlan} aria-label="Illustrative furniture spending plan"><p className={styles.kicker}>An example spending plan</p><h3>Planning with £3,000</h3><p className={styles.planIntro}>One way to divide a £3,000 furniture budget.</p><dl>{[['Seating','£1,400'],['Tables & storage','£500'],['Rug','£400'],['Lighting','£300'],['Finishing touches','£400']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>This is a planning illustration, not a product total or a price for the pictured room. Allow separately for delivery and any design charge.</p></aside>
    </div></section>

    <section className={`${styles.wrap} ${styles.faqSection}`} id="verified-room" aria-labelledby="home-faq-title"><div><h2 id="home-faq-title">Your <em>questions.</em></h2></div><div className={styles.faqs}>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className={`${styles.wrap} ${styles.final}`} aria-labelledby="home-final-title"><h2 id="home-final-title">See the room.<br/><em>Explore the furniture.</em></h2><Link className="button buttonPrimary" href="#shop-room">See an example</Link></section>
    <footer className={`${styles.wrap} ${styles.footer}`}><span>Roomfound</span><span>Thoughtful interiors for real UK homes</span><Link href="/privacy">Privacy</Link></footer>
  </div>;
}
