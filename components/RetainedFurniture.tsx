'use client';

import { useState } from 'react';
import type { IntakeForBrief } from '@/lib/brief';
import styles from './RoomBrief.module.css';

type Marker = NonNullable<IntakeForBrief['retainedFurniture']>[number];

export function RetainedFurniture({ photoUrl, items, onChange }: {
  photoUrl: string; items: Marker[]; onChange: (items: Marker[]) => void;
}) {
  const [label, setLabel] = useState('');
  const [cursor, setCursor] = useState({ x: .5, y: .5 });
  const [message, setMessage] = useState('');
  function add(x: number, y: number) {
    if (!label.trim()) { setMessage('Name the item before marking its position.'); return; }
    if (items.length >= 12) { setMessage('You can mark up to 12 items. Add any further details in your brief.'); return; }
    onChange([...items, { id: crypto.randomUUID(), label: label.trim(), x, y }]);
    setMessage(`${label.trim()} added to the furniture to keep.`);
    setLabel('');
  }
  return <div className={styles.marking}>
    <h2>Show us exactly what stays</h2>
    <p>Name an item, then tap it on your photograph. These markers identify furniture to keep; they do not measure it.</p>
    <label className={styles.field}>Item to keep
      <input value={label} maxLength={80} onChange={event => setLabel(event.target.value)} placeholder="e.g. Mum’s oak sideboard" />
    </label>
    <p id="marker-help">Keyboard: focus the photograph, use the arrow keys to position the marker, then press Enter. You can also keep items using the choices above.</p>
    <div className={styles.photo}>
      <img src={photoUrl} alt="Your room, ready to mark furniture to keep" />
      <button type="button" className={styles.markSurface} aria-label="Mark furniture position on your photograph" aria-describedby="marker-help"
        onClick={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (rect.width && rect.height) add(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)));
        }}
        onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            setCursor(old => ({ x: Math.max(0, Math.min(1, old.x + (event.key === 'ArrowRight' ? .02 : event.key === 'ArrowLeft' ? -.02 : 0))), y: Math.max(0, Math.min(1, old.y + (event.key === 'ArrowDown' ? .02 : event.key === 'ArrowUp' ? -.02 : 0))) }));
          } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); add(cursor.x, cursor.y); }
        }}>
        <span className={styles.crosshair} style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}>＋</span>
      </button>
      {items.map((item, index) => <span key={item.id} className={styles.pin} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }} title={item.label}>{index + 1}</span>)}
    </div>
    <p role="status">{message}</p>
    {items.length > 0 && <ol className={styles.markerList}>{items.map(item => <li key={item.id}><span>{item.label}</span><button type="button" onClick={() => onChange(items.filter(other => other.id !== item.id))} aria-label={`Remove marker for ${item.label}`}>Remove</button></li>)}</ol>}
  </div>;
}
