import Link from 'next/link';
import { Brand } from './Brand';
import { HomeRoomExample } from './HomeRoomExample';
import styles from './HomeBelowHero.module.css';

const steps = [
  ['Choose your room','Start with a living room and upload a photo of your space.'],
  ['Set your preferences','Choose styles, items and a furniture budget.'],
  ['Review real products','Check product photos, dimensions, prices and retailer details.'],
  ['See it, then shop','Create a room visual with your approved products, then visit the retailer.'],
];
const faqs = [
  ['Can I buy the furniture?', 'Each reviewed product links to its retailer for the current price, availability and purchase. The retailer handles payment, delivery and returns.'],
  ['Can I keep my own furniture?', 'Yes. Tell us which pieces stay so the design can work around them.'],
  ['Are the furniture pieces in the example available to buy?', 'No. The example is for style inspiration only. Your room plan uses reviewed products with retailer links.'],
  ['Do I need measurements?', 'Measurements help us filter products and plan your room. Check product dimensions, delivery access and the retailer’s latest details before ordering.'],
  ['Does the room image show an exact product match?', 'The generated room image is a visual guide. Use each product’s own photo and retailer listing to confirm its appearance, dimensions, price and availability.'],
];

export function HomeBelowHero() {
  return <div className={styles.home}>
    <section className={`${styles.wrap} ${styles.stepsSection}`} id="reimagined" aria-labelledby="home-steps-title">
      <div className={styles.stepIntro}><h2 id="home-steps-title">How <em>it works.</em></h2></div>
      <ol className={styles.steps}>{steps.map(([title,copy],index)=><li key={title}><span>0{index+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      <p className={styles.betaNote}>Style examples are for inspiration. Furniture recommendations use reviewed retailer products.</p>
    </section>

    <section className={styles.exampleSection} id="shop-room" aria-labelledby="home-example-title">
      <div className={styles.wrap}><div className={styles.heading}><div><h2 id="home-example-title">Find a look.<br/>Build your room.<br/><em>Shop the real pieces.</em></h2></div><p>This room is style inspiration only. Create your own plan to review products and retailer details.</p></div><HomeRoomExample/></div>
    </section>

    <section className={`${styles.wrap} ${styles.faqSection}`} id="verified-room" aria-labelledby="home-faq-title"><div><h2 id="home-faq-title">Your <em>questions.</em></h2></div><div className={styles.faqs}>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className={`${styles.wrap} ${styles.final}`} aria-labelledby="home-final-title"><h2 id="home-final-title">Start with your room.<br/><em>Choose furniture you can shop.</em></h2><Link className="button buttonPrimary" href="/design">Plan my room</Link></section>
    <footer className={`${styles.wrap} ${styles.footer}`}><Brand/><nav className={styles.footerLinks} aria-label="Explore Transform My Room"><Link href="/#reimagined">How it works</Link><Link href="/#shop-room">Explore the room</Link><Link href="/ideas">Ideas</Link><Link href="/#verified-room">Your questions</Link></nav></footer>
  </div>;
}
