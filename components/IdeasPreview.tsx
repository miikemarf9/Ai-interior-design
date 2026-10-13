import Image from 'next/image';
import Link from 'next/link';
import styles from './IdeasPreview.module.css';

export function IdeasPreview() {
  return <section className={styles.preview} aria-labelledby="ideas-preview-title">
    <div className={styles.visual}>
      <Image src="/images/hero-room-after.webp" alt="Example warm contemporary living room with ivory seating and walnut tones" width={1672} height={941} sizes="(max-width: 800px) 100vw, 60vw" quality={85}/>
      <span>Seemori example design</span>
    </div>
    <div className={styles.copy}>
      <p className={styles.status}>First collection coming soon</p>
      <h2 id="ideas-preview-title">Find a look.<br/><em>Make it your own.</em></h2>
      <p>We’re preparing a collection of room designs, with the furniture, colours and details behind each look.</p>
      <p>While we put the collection together, explore our example living room and its furniture details.</p>
      <Link href="/#shop-room" className="button buttonPrimary">Explore the example room</Link>
      <small>Example furniture and prices are illustrative.</small>
    </div>
  </section>;
}
