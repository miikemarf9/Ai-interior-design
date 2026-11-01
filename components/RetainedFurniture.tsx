'use client';

import { useState } from 'react';
import type { IntakeForBrief } from '@/lib/brief';
import styles from './RoomBrief.module.css';

type Marker = NonNullable<IntakeForBrief['retainedFurniture']>[number];
type MarkerIntent = 'keep' | 'place';

export function RetainedFurniture({ photoUrl, items, projectGoal, onChange }: {
  photoUrl: string;
  items: Marker[];
  projectGoal: 'furnish' | 'refresh';
  onChange: (items: Marker[]) => void;
}) {
  const [label, setLabel] = useState('');
  const [intent, setIntent] = useState<MarkerIntent>(projectGoal === 'furnish' ? 'place' : 'keep');
  const [cursor, setCursor] = useState({ x: .5, y: .5 });
  const [message, setMessage] = useState('');

  function add(x: number, y: number) {
    if (!label.trim()) {
      setMessage('Add a short label first, then tap the photo to place the marker.');
      return;
    }
    if (items.length >= 12) {
      setMessage('You can add up to 12 photo notes.');
      return;
    }
    const cleanLabel = label.trim();
    onChange([...items, { id: crypto.randomUUID(), label: cleanLabel, intent, x, y }]);
    setMessage(`${intent === 'keep' ? 'Keep' : 'Place here'}: ${cleanLabel} added.`);
    setLabel('');
  }

  const intentLabel = intent === 'keep' ? 'Keep this' : 'Place here';
  const help = projectGoal === 'furnish'
    ? 'You’ve said this is an empty room, so there is nothing you need to remove. Choose “Place here” and tap where you would like an item. If anything should stay, you can mark it too.'
    : 'Mark pieces you want to keep, or choose “Place here” and tap where you would like a new item. These are visual notes, not measurements.';

  return <section className={styles.marking} aria-labelledby="photo-notes-title">
    <h2 id="photo-notes-title">Add notes to your photo <span>Optional</span></h2>
    <p>{help}</p>
    <div className={styles.annotationKinds} role="group" aria-label="Photo note type">
      <button type="button" className={intent === 'keep' ? styles.annotationKindActive : styles.annotationKind} aria-pressed={intent === 'keep'} onClick={() => setIntent('keep')}>Keep this</button>
      <button type="button" className={intent === 'place' ? styles.annotationKindActive : styles.annotationKind} aria-pressed={intent === 'place'} onClick={() => setIntent('place')}>Place here</button>
    </div>
    <label className={styles.field}>Label
      <input value={label} maxLength={80} onChange={event => setLabel(event.target.value)} placeholder={intent === 'keep' ? 'e.g. Oak bookcase' : 'e.g. Reading chair'} />
    </label>
    <p id="photo-marker-help" className={styles.markerHelp}>Type a label, then tap the spot on your photo. You can add several notes.</p>
    <div className={styles.photo}>
      <img src={photoUrl} alt="Your room photo with optional notes" />
      <button
        type="button"
        className={styles.markSurface}
        aria-label={`${intentLabel} on photo`}
        aria-describedby="photo-marker-help"
        onClick={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (rect.width && rect.height) add(
            Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
            Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
          );
        }}
        onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            setCursor(old => ({
              x: Math.max(0, Math.min(1, old.x + (event.key === 'ArrowRight' ? .02 : event.key === 'ArrowLeft' ? -.02 : 0))),
              y: Math.max(0, Math.min(1, old.y + (event.key === 'ArrowDown' ? .02 : event.key === 'ArrowUp' ? -.02 : 0))),
            }));
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            add(cursor.x, cursor.y);
          }
        }}
      >
        <span className={styles.crosshair} style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}>＋</span>
      </button>
      {items.map((item, index) => <span
        key={item.id}
        className={item.intent === 'place' ? styles.pinPlace : styles.pin}
        style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }}
        title={`${item.intent === 'place' ? 'Place here' : 'Keep'}: ${item.label}`}
      >{index + 1}</span>)}
    </div>
    <p role="status" aria-live="polite">{message}</p>
    {items.length > 0 && <ol className={styles.markerList}>{items.map(item => <li key={item.id}>
      <span><strong>{item.intent === 'place' ? 'Place here' : 'Keep'}:</strong> {item.label}</span>
      <button type="button" onClick={() => onChange(items.filter(other => other.id !== item.id))} aria-label={`Remove photo note for ${item.label}`}>Remove</button>
    </li>)}</ol>}
  </section>;
}