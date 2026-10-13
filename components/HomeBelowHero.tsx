import Link from 'next/link';
import { Brand } from './Brand';
import { HomeRoomExample } from './HomeRoomExample';
import styles from './HomeBelowHero.module.css';

const steps = [
  ['Upload a photo','Show us the room you want to change.'],
  ['Set style & budget','Set your style, furniture budget and what stays.'],
  ['Review your design','Review selected furniture and see it in your room.'],
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
      <div className={styles.wrap}><div className={styles.heading}><div><h2 id="home-example-title">Whatever your style.<br/>Your room design.<br/><em>The furniture to match.</em></h2></div><p>Explore a different look. Select a piece to see its details.</p></div><HomeRoomExample/></div>
    </section>

    <section className={`${styles.wrap} ${styles.faqSection}`} id="verified-room" aria-labelledby="home-faq-title"><div><h2 id="home-faq-title">Your <em>questions.</em></h2></div><div className={styles.faqs}>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className={`${styles.wrap} ${styles.final}`} aria-labelledby="home-final-title"><h2 id="home-final-title">See the room.<br/><em>Explore the furniture.</em></h2><Link className="button buttonPrimary" href="#shop-room">See an example</Link></section>
    <footer className={`${styles.wrap} ${styles.footer}`}><Brand/><nav className={styles.footerLinks} aria-label="Explore Seemori"><Link href="/#reimagined">How it works</Link><Link href="/#shop-room">Explore the room</Link><Link href="/ideas">Ideas</Link><Link href="/#verified-room">Your questions</Link></nav></footer>
  </div>;
}
