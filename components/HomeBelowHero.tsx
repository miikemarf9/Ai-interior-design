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
  ['How will Roomfound work?', 'Start with a photo of your room, choose a style and set your furniture budget. Tell us what you want to keep, then review a coordinated furniture selection before seeing the proposed design in your space.'],
  ['Will I be able to shop the furniture?', 'At launch, you will be able to explore the selected furniture from your room design, view product details and follow links to buy directly from the retailer. The retailer will handle your order, delivery and returns.'],
  ['Can I keep furniture I already own?', 'Absolutely. Your room brief starts with what stays and what can change. Whether it is a favourite armchair or a much-loved table, those pieces help shape the new look.'],
  ['What furniture budget should I allow?', 'Start with an amount you feel comfortable spending. Around £2,500–£4,000 is the range we are designing our first living-room collections around. A refresh can focus on fewer pieces, especially when you are keeping existing furniture.'],
  ['Do I need to measure my room?', 'A photograph gives us the starting point. Key room measurements and the sizes of furniture you are keeping help with planning. Before ordering, check each product’s dimensions and the access through doors and stairs.'],
  ['Is the design cost included in my furniture budget?', 'Your furniture budget is for the pieces you choose. Any design charge will be shown separately before you proceed, and delivery costs will be confirmed by the retailer.'],
];

export function HomeBelowHero() {
  return <div className={styles.home}>
    <section className={`${styles.wrap} ${styles.stepsSection}`} id="reimagined" aria-labelledby="home-steps-title">
      <div className={styles.stepIntro}><p className={styles.kicker}>The experience we’re building</p><h2 id="home-steps-title">Your room.<br/><em>A clearer plan.</em></h2></div>
      <ol className={styles.steps}>{steps.map(([title,copy],index)=><li key={title}><span>0{index+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      <p className={styles.betaNote}>A preview of the Roomfound experience. The room designs and furniture prices shown here are illustrative.</p>
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

    <section className={`${styles.wrap} ${styles.faqSection}`} id="verified-room" aria-labelledby="home-faq-title"><div><p className={styles.kicker}>A few things worth knowing</p><h2 id="home-faq-title">Clear details.<br/><em>Considered decisions.</em></h2><p>From keeping favourite pieces to planning your budget, here is how Roomfound will help.</p></div><div className={styles.faqs}>{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className={`${styles.wrap} ${styles.final}`} aria-labelledby="home-final-title"><p className={styles.kicker}>A little inspiration goes a long way</p><h2 id="home-final-title">Picture the possibilities.<br/><em>Find what feels like you.</em></h2><p>Explore the example room and discover the details you would make your own.</p><Link className="button buttonPrimary" href="#shop-room">Explore the furniture</Link></section>
    <footer className={`${styles.wrap} ${styles.footer}`}><span>Roomfound</span><span>Thoughtful interiors for real UK homes</span><Link href="/privacy">Privacy</Link></footer>
  </div>;
}
