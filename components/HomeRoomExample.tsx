'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './HomeBelowHero.module.css';

const pieces = [
  { id:'sofa', name:'Olive green sofa', price:'£1,295', x:63, y:52, position:'70% 55%', zoom:'210%', finish:'Deep olive velvet-look upholstery', shape:'Tailored low profile with slim wooden legs', description:'A rich, comfortable centrepiece that grounds the scheme without overwhelming the room.' },
  { id:'table', name:'Oval walnut coffee table', price:'£245', x:49, y:73, position:'50% 87%', zoom:'260%', finish:'Warm walnut-look finish', shape:'Slim oval top and tapered legs', description:'The soft oval balances the sofa’s straight lines while echoing the timber elsewhere in the room.' },
  { id:'sideboard', name:'Mid-century walnut sideboard', price:'£695', x:16, y:57, position:'6% 72%', zoom:'250%', finish:'Rich walnut-look woodgrain', shape:'Low cabinet, simple handles and tapered legs', description:'Low storage introduces the characterful mid-century silhouette and makes space for books and ceramics.' },
];

export function HomeRoomExample() {
  const [active,setActive] = useState('sofa');
  const [hideTooltip,setHideTooltip] = useState(false);
  const piece = pieces.find(p=>p.id===active)!;
  const cropStyle = (p: typeof pieces[number]) => ({
    backgroundImage:'url(/images/mid-century-living-room.avif)',
    backgroundSize:p.zoom, backgroundPosition:p.position,
  });
  return <div onKeyDown={event=>{if(event.key==='Escape')setHideTooltip(true);}}>
    <div className={styles.example}>
      <div className={styles.roomColumn}>
        <div className={styles.roomPicture}>
          <Image src="/images/mid-century-living-room.avif" alt="Mid-century modern living room with an olive sofa, walnut sideboard, oval coffee table and rich rust accents" width={960} height={640} sizes="(max-width: 900px) 100vw, (max-width: 1424px) 65vw, 890px" quality={85}/>
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
    <div className={styles.exampleFootnote}><p>Illustrative room and furniture prices, not a retailer product listing.</p><p>Prices cover the marked pieces only, not the whole room.</p></div>
    <div className={styles.brief} aria-labelledby="example-brief-title">
      <div><p className={styles.kicker}>Behind this design</p><h3 id="example-brief-title">Mid-century character.<br/>A coordinated room.</h3></div>
      <dl>
        <div><dt>The direction</dt><dd>A relaxed, welcoming living room with distinctive mid-century furniture.</dd></div>
        <div><dt>The look</dt><dd>Olive upholstery, walnut wood, burnt orange accents and warm brass lighting.</dd></div>
        <div><dt>The idea</dt><dd>Choose pieces with a shared palette and era, then balance their shapes and textures.</dd></div>
      </dl>
      <p className={styles.briefNote}>Your own design starts with your photograph, budget and any pieces you want to keep. This is an illustrative style example; real furniture choices and retailer availability are confirmed separately.</p>
    </div>
  </div>;
}
