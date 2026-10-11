'use client';
import { useState } from 'react';
import type { ProductSelection } from '@/lib/catalog/selection';
import type { RoomHotspot } from '@/lib/room-hotspots';
import styles from './RoomExploration.module.css';
export function RoomHotspotEditor({generationId,designId,resultAssetId,resultUrl,ownerKey,selection,hotspots,onSave}:{generationId:string;designId:string;resultAssetId:string;resultUrl:string;ownerKey:string;selection:ProductSelection;hotspots:RoomHotspot[];onSave:(items:RoomHotspot[])=>void}) {
 const [items,setItems]=useState<RoomHotspot[]>(selection.products.map(p=>hotspots.find(h=>h.variantId===p.selected.variantId)||{variantId:p.selected.variantId,visibility:'uncertain'}));
 const [active,setActive]=useState(selection.products[0]?.selected.variantId||'');
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const current=items.find(p=>p.variantId===active);
 const reference=selection.products.find(p=>p.selected.variantId===active)?.selected;
 function update(next:RoomHotspot){setItems(items.map(p=>p.variantId===active?next:p));setConfirmed(false);setMessage('');}
 async function save(){setBusy(true);setMessage('');try{const response=await fetch('/api/designs/hotspots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({designId,generationId,resultAssetId,ownerKey,items,confirmed})});const data=await response.json();if(!response.ok)throw Error(data.error);onSave(data.hotspots);setMessage('Positions saved for this image.');}catch(e){setMessage(e instanceof Error?e.message:'Could not save positions.');}finally{setBusy(false)}}
 return <details className={styles.editor}><summary>Check product positions</summary><p>Select each product and mark its visible centre on this image. Use Hidden, Missing or Uncertain if you cannot confidently identify it. Only confirmed visible items get a hotspot.</p>
 <label>Product<select value={active} onChange={e=>setActive(e.target.value)}>{selection.products.map(p=><option key={p.selected.variantId} value={p.selected.variantId}>{p.selected.productName} · {p.selected.variantName}</option>)}</select></label>
 {reference?.image && <figure><img style={{width:160,height:120,objectFit:'contain'}} src={reference.image.url} alt={`${reference.productName} — ${reference.variantName}`} /><figcaption>Exact product reference · {reference.variantName}</figcaption></figure>}
 {current&&<><label>Visibility<select value={current.visibility} onChange={e=>update({variantId:active,visibility:e.target.value as RoomHotspot['visibility']})}><option value="uncertain">Uncertain / not checked</option><option value="visible">Visible and identifiable</option><option value="hidden">Hidden</option><option value="missing">Missing from image</option></select></label>
 <div className={styles.positionImage} onClick={e=>{if(current.visibility!=='visible')return;const r=e.currentTarget.getBoundingClientRect();update({...current,x:Math.round((e.clientX-r.left)/r.width*10000)/100,y:Math.round((e.clientY-r.top)/r.height*10000)/100});}}><img src={resultUrl} alt="Generated room for checking product positions"/>{current.visibility==='visible'&&current.x!==undefined&&current.y!==undefined&&<i style={{left:`${current.x}%`,top:`${current.y}%`}}>+</i>}</div>
 {current.visibility==='visible'&&<div className={styles.coordinates}><p>Click the photograph or enter percentages from its top-left corner.</p>{(['x','y'] as const).map(axis=><label key={axis}>{axis==='x'?'Horizontal':'Vertical'} position (%)<input type="number" min="0" max="100" step="0.1" value={current[axis]??''} onChange={e=>update({...current,[axis]:e.target.value===''?undefined:Number(e.target.value)})}/></label>)}</div>}</>}
 <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I checked every visible marker against this image and its product reference.</label><button type="button" className="button buttonSecondary" disabled={busy||!confirmed||items.some(p=>p.visibility==='visible'&&(p.x===undefined||p.y===undefined))} onClick={save}>{busy?'Saving…':'Save checked positions'}</button><p role="status">{message}</p></details>
}
