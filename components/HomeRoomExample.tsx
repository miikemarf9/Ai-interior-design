'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './HomeBelowHero.module.css';

const pieces = [
  { id:'sofa', name:'Three-seater sofa', price:'£1,295', x:35, y:58, position:'24% 72%', zoom:'210%', finish:'Warm ivory upholstery', shape:'Gently rounded arms', description:'A neutral anchor for the room, with olive and rust accents adding colour.' },
  { id:'table', name:'Walnut coffee table', price:'£245', x:56, y:73, position:'61% 85%', zoom:'290%', finish:'Walnut-look finish', shape:'Oval top with a sculptural base', description:'The curved shape softens the seating area and the dark wood adds contrast.' },
  { id:'pendant', name:'Pendant light', price:'£165', x:59, y:10, position:'61% 0%', zoom:'350%', finish:'Warm white shade', shape:'Softly rounded silhouette', description:'A simple overhead focal point that complements the warm, neutral room.' },
];

export function HomeRoomExample() {
  const [active,setActive] = useState('sofa');
  const [hideTooltip,setHideTooltip] = useState(false);
  const piece = pieces.find(p=>p.id===active)!;
  const cropStyle = (p: typeof pieces[number]) => ({
    backgroundImage:'url(/images/hero-room-after.webp)',
    backgroundSize:p.zoom, backgroundPosition:p.position,
  });
  return <div onKeyDown={event=>{if(event.key==='Escape')setHideTooltip(true);}}>
    <div className={styles.example}>
      <div className={styles.roomColumn}>
        <div className={styles.roomPicture}>
          <Image src="/images/hero-room-after.webp" alt="Example living-room design with an ivory sofa, oval walnut table and sculptural pendant" width={1672} height={941} sizes="(max-width: 900px) 100vw, (max-width: 1424px) 65vw, 890px" quality={85}/>
          {pieces.map((p,index)=><button key={p.id} type="button" className={styles.pin} style={{left:`${p.x}%`,top:`${p.y}%`}} data-hide-tooltip={hideTooltip} onFocus={()=>setHideTooltip(false)} onMouseEnter={()=>setHideTooltip(false)} aria-label={`${p.name}, illustrative price ${p.price}`} aria-pressed={active===p.id} aria-controls="example-furniture-details" onClick={()=>setActive(p.id)}>
            <span>{index+1}</span><span className={`${styles.pinLabel} ${p.y<20?styles.below:''}`} aria-hidden="true">{p.name}<strong>{p.price}</strong></span>
          </button>)}
        </div>
        <div className={styles.pieceButtons} role="group" aria-label="Example furniture">
          {pieces.map((p,index)=><button key={p.id} type="button" aria-pressed={active===p.id} aria-controls="example-furniture-details" onClick={()=>setActive(p.id)}>
            <span className={styles.thumbnail} style={cropStyle(p)} aria-hidden="true"/>
            <span><small>0{index+1}</small>{p.name}<strong>{p.price}</strong></span>
          </button>)}
        </div>
      </div>
      <div id="example-furniture-details" className={styles.examplePanel} aria-live="polite" aria-atomic="true">
        <p className={styles.kicker}>Selected piece</p>
        <div className={styles.productImage} style={cropStyle(piece)} role="img" aria-label={`Detail of the ${piece.name.toLowerCase()} in the example room`}/>
        <p className={styles.cropCaption}>Detail from the example design</p>
        <h3>{piece.name}</h3>
        <div className={styles.priceRow}><strong className={styles.price}>{piece.price}</strong><span>Illustrative price · quantity 1</span></div>
        <p className={styles.productDescription}>{piece.description}</p>
        <dl className={styles.specs}>
          <div><dt>Look</dt><dd>{piece.finish}</dd></div>
          <div><dt>Design</dt><dd>{piece.shape}</dd></div>
          <div><dt>Dimensions</dt><dd>Shown with the final product selection</dd></div>
        </dl>
        <p className={styles.retailerNote}>Retailer details and buying links will accompany the launch collection.</p>
      </div>
    </div>
    <div className={styles.exampleFootnote}><p>Example furniture and prices. Image details are taken from this room design.</p><p>Prices cover the marked pieces only, not the whole room.</p></div>
    <div className={styles.brief} aria-labelledby="example-brief-title">
      <div><p className={styles.kicker}>Behind this design</p><h3 id="example-brief-title">An empty room.<br/>A coordinated plan.</h3></div>
      <dl>
        <div><dt>The starting point</dt><dd>An unfurnished living room with a bay window and beige carpet.</dd></div>
        <div><dt>The look</dt><dd>Warm neutrals, walnut tones and a clay-coloured accent chair.</dd></div>
        <div><dt>What stays</dt><dd>The bay window, room layout and fitted carpet.</dd></div>
      </dl>
      <p className={styles.briefNote}>For your room, the brief will also include your furniture budget and any pieces you want to keep. Your design charge and retailer delivery costs are separate from furniture spending.</p>
    </div>
  </div>;
}
