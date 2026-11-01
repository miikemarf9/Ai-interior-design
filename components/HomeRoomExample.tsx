import Image from 'next/image';
import Link from 'next/link';
import styles from './HomeBelowHero.module.css';

export function HomeRoomExample() {
  return <>
    <div className={styles.example}>
      <div className={styles.roomColumn}>
        <div className={styles.roomPicture}>
          <Image src="/images/mid-century-living-room.avif" alt="Style inspiration: a living room with olive upholstery, walnut furniture and warm rust accents" width={960} height={640} sizes="(max-width: 900px) 100vw, (max-width: 1424px) 65vw, 890px" quality={85} />
          <span className={styles.previewLabel}>Style inspiration · not a product listing</span>
        </div>
      </div>
      <div className={styles.examplePanel}>
        <p className={styles.kicker}>A style to explore</p>
        <h3>Mid-century warmth</h3>
        <p>Olive tones, walnut finishes and softly sculpted shapes bring character to this living room.</p>
        <dl className={styles.specs}>
          <div><dt>Palette</dt><dd>Olive, walnut and warm rust</dd></div>
          <div><dt>Materials</dt><dd>Wood, woven textures and soft upholstery</dd></div>
          <div><dt>Room image</dt><dd>An inspiration example, not a selectable design</dd></div>
        </dl>
        <p className={styles.retailerNote}>Your room plan starts with reviewed products, current retailer details and your own room photo.</p>
        <Link className="button buttonPrimary" href="/design">Build my room with real products</Link>
      </div>
    </div>
    <div className={styles.exampleFootnote}><p>This image is for style inspiration only. Its furniture and prices are not retailer listings.</p></div>
  </>;
}
