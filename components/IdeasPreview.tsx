import Image from 'next/image';
import Link from 'next/link';
import styles from './IdeasPreview.module.css';

export function IdeasPreview() {
  return <section className={styles.preview} aria-labelledby="ideas-preview-title">
    <div className={styles.visual}>
      <Image src="/images/hero-room-after.webp" alt="Example warm contemporary living room with ivory seating and walnut tones" width={1672} height={941} sizes="(max-width: 800px) 100vw, 60vw" quality={85}/>
      <span>Transform My Room example design</span>
    </div>
    <div className={styles.copy}>
      <p className={styles.status}>First collection coming soon</p>
      <h2 id="ideas-preview-title">Find a look.<br/><em>Make it your own.</em></h2>
      <p>Explore style inspiration, then build your own living-room plan around reviewed furniture with retailer links.</p>
      <p>The example is a visual reference only. It is not a selectable design or a retailer product listing.</p>
      <Link href="/design" className="button buttonPrimary">Plan my room</Link>
      <small>Example furniture is not available to purchase through this preview.</small>
    </div>
  </section>;
}
