import Link from 'next/link';
import { Brand } from './Brand';
import { HomeRoomExample } from './HomeRoomExample';
import styles from './HomeBelowHero.module.css';

const steps = [
  ['Add your room photo','Upload a photo. Add optional notes to show what stays and where new pieces should go.'],
  ['Choose your look and furniture','Pick a coordinated group, set a budget, then swap, remove or add pieces from the catalogue.'],
  ['Review your room','Check your room photo and collection total before generating. You can return to Step 2 to edit your furniture.'],
  ['See your new room','Generate your room image. If you love a piece, follow its link to shop with the retailer.'],
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
      
    </section>

    <section className={styles.exampleSection} id="shop-room" aria-labelledby="home-example-title">
      <div className={styles.wrap}><div className={styles.heading}><div><h2 id="home-example-title">Find a look.<br/>Build your room.<br/><em>Shop the real pieces.</em></h2></div><p>This room is style inspiration only. Create your own plan to review products and retailer details.</p></div><HomeRoomExample/></div>
    </section>

    <section className={`${styles.wrap} ${styles.retailers}`} aria-labelledby="home-retailers-title"><p className={styles.kicker}>Real furniture. Real retailers.</p><h2 id="home-retailers-title">Shop directly.<br/><em>No extra charge from us.</em></h2><p>Found something you love? Buy it directly from the retailer, who handles your order, delivery and returns.</p><p>We may earn a commission when you shop through our links, at no extra cost to you. Buying furniture is always your choice.</p></section>\n\n    <section className={`${styles.wrap} ${styles.faqSection}`} id="verified-room" aria-labelledby="home-faq-title"><div><h2 id="home-faq-title">Your <em>questions.</em></h2></div><div className={styles.faqs}>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className={`${styles.wrap} ${styles.final}`} aria-labelledby="home-final-title"><p className={styles.offerBadge}>One free room image every month</p><h2 id="home-final-title">Your room, reimagined.<br/><em>On us.</em></h2><p>Sign up free, confirm your email and get one new room image each month. No furniture purchase needed.</p><p>Explore other people’s designs, like your favourites and find ideas for your own space.</p><Link className="button buttonPrimary" href="/account">Get my free image</Link><Link className={styles.exploreLink} href="/community">Explore community designs →</Link><p className={styles.offerNote}>Free for every account with a confirmed email.</p></section>
    <footer className={`${styles.wrap} ${styles.footer}`}><Brand/><nav className={styles.footerLinks} aria-label="Explore Transform My Room"><Link href="/#reimagined">How it works</Link><Link href="/#shop-room">Explore the room</Link><Link href="/ideas">Ideas</Link><Link href="/#verified-room">Your questions</Link></nav></footer>
  </div>;
}
