'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './HomeBelowHero.module.css';

const pieces = [
  { id:'sofa', name:'Three-seater sofa', price:'£1,295', x:35, y:58, description:'Soft ivory upholstery and gently rounded arms give this room a relaxed centrepiece.', detail:'Consider seat depth, fabric care and the space around the sofa.' },
  { id:'table', name:'Walnut coffee table', price:'£245', x:56, y:73, description:'A warm walnut finish brings depth to the neutral palette. The oval shape softens the seating area.', detail:'Check the height against your sofa and leave a comfortable route around it.' },
  { id:'pendant', name:'Pendant light', price:'£165', x:59, y:10, description:'A softly sculptural pendant adds a gentle focal point above the room.', detail:'Check ceiling height, fitting requirements and the light you need.' },
];

export function HomeRoomExample() {
  const [active,setActive] = useState('sofa');
  const [hideTooltip,setHideTooltip] = useState(false);
  const piece = pieces.find(p=>p.id===active)!;
  return <div className={styles.example} onKeyDown={event=>{if(event.key==='Escape')setHideTooltip(true);}}>
    <div className={styles.roomPicture}>
      <Image src="/images/hero-room-after.webp" alt="Illustrative warm contemporary living room with ivory sofa, oval walnut table and sculptural pendant" width={1672} height={941} sizes="(max-width: 1424px) 100vw, 1360px" quality={85}/>
      {pieces.map((p,index)=><button key={p.id} type="button" className={styles.pin} style={{left:`${p.x}%`,top:`${p.y}%`}} data-hide-tooltip={hideTooltip} onFocus={()=>setHideTooltip(false)} onMouseEnter={()=>setHideTooltip(false)} aria-label={`${p.name}, illustrative price ${p.price}`} aria-pressed={active===p.id} aria-controls="example-furniture-details" onClick={()=>setActive(p.id)}>
        <span>{index+1}</span><span className={`${styles.pinLabel} ${p.y<20?styles.below:''}`} aria-hidden="true">{p.name}<strong>{p.price}</strong></span>
      </button>)}
    </div>
    <div className={styles.examplePanel}>
      <p className={styles.kicker}>Explore the furniture</p>
      <div className={styles.pieceButtons} role="group" aria-label="Example furniture">
        {pieces.map((p,index)=><button key={p.id} type="button" aria-pressed={active===p.id} aria-controls="example-furniture-details" onClick={()=>setActive(p.id)}><span>0{index+1}</span>{p.name}</button>)}
      </div>
      <div id="example-furniture-details" className={styles.pieceDetail} aria-live="polite" aria-atomic="true">
        <h3>{piece.name}</h3><strong className={styles.price}>{piece.price}</strong><span className={styles.smallLabel}>Illustrative price</span>
        <p>{piece.description}</p><p className={styles.detailNote}>{piece.detail}</p>
      </div>
      <p className={styles.disclosure}>AI-generated example. These pieces are not verified retail products or offers. Product links will appear only when a real collection is cleared for use.</p>
    </div>
  </div>;
}
