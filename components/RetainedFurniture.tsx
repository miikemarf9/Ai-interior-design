'use client';

import { useState } from 'react';
import type { IntakeForBrief } from '@/lib/brief';
import styles from './RoomBrief.module.css';

type Marker = NonNullable<IntakeForBrief['retainedFurniture']>[number];
type MarkerIntent = 'keep' | 'place';

export function RetainedFurniture({ photoUrl, items, projectGoal, active, onActiveChange, onChange, onChangePhoto, photoChangeDisabled }: {
  photoUrl: string;
  items: Marker[];
  projectGoal: 'furnish' | 'refresh';
  active: boolean;
  onActiveChange: (active: boolean) => void;
  onChange: (items: Marker[]) => void;
  onChangePhoto: () => void;
  photoChangeDisabled: boolean;
}) {
  const [label, setLabel] = useState('');
  const [intent, setIntent] = useState<MarkerIntent>(projectGoal === 'furnish' ? 'place' : 'keep');
  const [cursor, setCursor] = useState({ x: .5, y: .5 });
  const [message, setMessage] = useState('');

  function add(x: number, y: number) {
    if (!active) return;
    if (!label.trim()) {
      setMessage('Type a label above the photo before placing a note.');
      return;
    }
    if (items.length >= 12) {
      setMessage('You can add up to 12 photo notes.');
      return;
    }
    const cleanLabel = label.trim();
    onChange([...items, { id: crypto.randomUUID(), label: cleanLabel, intent, x, y }]);
    setMessage((intent === 'keep' ? 'Keep: ' : 'Place here: ') + cleanLabel + ' added.');
    setLabel('');
  }

  const intentLabel = intent === 'keep' ? 'Keep this' : 'Place here';

  return <section className={styles.marking + (active ? ' ' + styles.markingActive : '')} aria-labelledby="photo-notes-title">
    <div className={styles.photoHeading}>
      <div>
        <h2 id="photo-notes-title">{active ? 'Add a note to your photo' : 'Your room photo'}</h2>
        <p>{items.length ? items.length + ' photo note' + (items.length === 1 ? '' : 's') : 'Photo saved'}</p>
      </div>
      <div className={styles.photoActions}>
        {active ? <button type="button" onClick={() => { onActiveChange(false); setMessage(''); }}>Done</button> : <button type="button" onClick={() => onActiveChange(true)}>Annotate photo</button>}
        <button type="button" disabled={photoChangeDisabled} onClick={onChangePhoto}>Change photo</button>
      </div>
    </div>
    {active ? (
      <div className={styles.annotationForm}>
        <div className={styles.annotationKinds} role="group" aria-label="Photo note type">
          <button type="button" className={intent === 'keep' ? styles.annotationKindActive : styles.annotationKind} aria-pressed={intent === 'keep'} onClick={() => setIntent('keep')}>Keep this</button>
          <button type="button" className={intent === 'place' ? styles.annotationKindActive : styles.annotationKind} aria-pressed={intent === 'place'} onClick={() => setIntent('place')}>Place here</button>
        </div>
        <label className={styles.field}>Label for this note
          <input value={label} maxLength={80} onChange={event => setLabel(event.target.value)} placeholder={intent === 'keep' ? 'e.g. Oak bookcase' : 'e.g. Reading chair'} />
        </label>
      </div>
    ) : null}
    <div className={styles.photo}>
      <img src={photoUrl} alt="Your room photo with optional notes" />
      <button
        type="button"
        className={styles.markSurface}
        aria-label={intentLabel + ' on photo'}
        aria-describedby="photo-marker-help"
        disabled={!active}
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
        {active ? <span className={styles.crosshair} style={{ left: (cursor.x * 100) + '%', top: (cursor.y * 100) + '%' }}>＋</span> : null}
      </button>
      {items.map((item, index) => <span
        key={item.id}
        className={item.intent === 'place' ? styles.pinPlace : styles.pin}
        style={{ left: (item.x * 100) + '%', top: (item.y * 100) + '%' }}
        title={(item.intent === 'place' ? 'Place here: ' : 'Keep: ') + item.label}
      >{index + 1}</span>)}
    </div>
    {active ? <p id="photo-marker-help" className={styles.markerHelp}>Type a label above the photo, then tap its location. Tap the photo again to add another note.</p> : null}
    {active ? <p role="status" aria-live="polite">{message}</p> : null}
    {items.length > 0 ? <ol className={styles.markerList}>{items.map(item => <li key={item.id}>
      <span><strong>{item.intent === 'place' ? 'Place here' : 'Keep'}:</strong> {item.label}</span>
      {active ? <button type="button" onClick={() => onChange(items.filter(other => other.id !== item.id))} aria-label={'Remove photo note for ' + item.label}>Remove</button> : null}
    </li>)}</ol> : null}
    {projectGoal === 'furnish' && active ? <p className={styles.emptyRoomNote}>Empty room? Nothing needs removing. Mark only where you would like new items.</p> : null}
  </section>;
}
