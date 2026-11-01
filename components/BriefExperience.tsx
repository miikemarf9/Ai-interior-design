'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { buildFallbackBrief, type DesignBrief, type IntakeForBrief } from '@/lib/brief';
import { trackRoomfound } from '@/components/PrivacyAnalytics';
import ui from './RoomBrief.module.css';

type BriefSource = 'ai' | 'preview';

const fieldOrder: Array<{ key: keyof DesignBrief; label: string; kicker: string }> = [
  { key: 'direction', label: 'Overall direction', kicker: 'The design idea' },
  { key: 'keep', label: 'Keep + work around', kicker: 'Existing room' },
  { key: 'change', label: 'Change + improve', kicker: 'Where to intervene' },
  { key: 'palette', label: 'Colour direction', kicker: 'Palette' },
  { key: 'materials', label: 'Material direction', kicker: 'Texture + finish' },
  { key: 'function', label: 'How the room needs to work', kicker: 'Real life' },
  { key: 'avoid', label: 'What to avoid', kicker: 'Exclusions' },
  { key: 'measurements', label: 'Room constraints', kicker: 'Dimensions + fit' },
  { key: 'creativeFreedom', label: 'Creative freedom', kicker: 'Designer latitude' },
  { key: 'budget', label: 'Budget guardrail', kicker: 'Whole-room spend' },
  { key: 'designerNote', label: 'Designer note', kicker: 'For product selection + rendering' },
];

const changePrompts = [
  'Make the room feel warmer',
  'Be more adventurous with colour',
  'Keep more of my existing furniture',
  'Prioritise comfort over statement pieces',
];

export function BriefExperience() {
  const [intake, setIntake] = useState<IntakeForBrief | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [source, setSource] = useState<BriefSource>('preview');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState('');
  const [revising, setRevising] = useState(false);
  const [editing, setEditing] = useState<keyof DesignBrief | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [error, setError] = useState('');
  const [approved, setApproved] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const raw = window.localStorage.getItem('roomfound-intake-v1');
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { state?: IntakeForBrief };
      if (!parsed.state) {
        setLoading(false);
        return;
      }

      setIntake(parsed.state);

      const saved = window.localStorage.getItem('roomfound-brief-v1');
      if (saved) {
        const savedBrief = JSON.parse(saved) as { brief?: DesignBrief; source?: BriefSource; approved?: boolean };
        if (savedBrief.brief) {
          setBrief(savedBrief.brief);
          setSource(savedBrief.source || 'preview');
          setApproved(Boolean(savedBrief.approved));
          setLoading(false);
          return;
        }
      }

      createBrief(parsed.state);
    } catch {
      setLoading(false);
    }
  }, []);

  async function createBrief(intakeState: IntakeForBrief) {
    setLoading(true);
    try {
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake: intakeState }),
      });
      const data = await response.json();
      if (!data.brief) throw new Error('No brief returned');
      setBrief(data.brief);
      setSource(data.source || 'preview');
      saveBrief(data.brief, data.source || 'preview', false);
    } catch {
      const fallback = buildFallbackBrief(intakeState);
      setBrief(fallback);
      saveBrief(fallback, 'preview', false);
      setError('Your answers are saved below. The writing service is unavailable; you can edit this draft directly.');
    } finally {
      setLoading(false);
    }
  }

  function saveBrief(nextBrief: DesignBrief, nextSource: BriefSource, isApproved: boolean) {
    window.localStorage.setItem(
      'roomfound-brief-v1',
      JSON.stringify({ brief: nextBrief, source: nextSource, approved: isApproved, updatedAt: new Date().toISOString() }),
    );

    if (!isApproved) {
      window.localStorage.removeItem('roomfound-product-selection-v1');
    }
  }

  function startEdit(key: keyof DesignBrief) {
    if (!brief) return;
    setEditing(key);
    setDraftValue(brief[key]);
  }

  function saveEdit() {
    if (!brief || !editing || !draftValue.trim()) return;
    const next = { ...brief, [editing]: draftValue.trim() };
    setBrief(next);
    setApproved(false);
    saveBrief(next, source, false);
    setEditing(null);
    setDraftValue('');
  }

  async function askForChange(requestText?: string) {
    if (!intake || !brief) return;
    const instruction = (requestText ?? revision).trim();
    if (!instruction) return;

    setRevision(instruction);
    setError('');
    setRevising(true);
    try {
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake, currentBrief: brief, request: instruction }),
      });
      const data = await response.json();
      if (data.warning) { setError(data.warning); return; }
      if (!response.ok || !data.brief) throw new Error('Revision unavailable');
      if (data.brief) {
        setBrief(data.brief);
        setSource(data.source || source);
        setApproved(false);
        saveBrief(data.brief, data.source || source, false);
        setRevision('');
      }
    } catch {
      setError('We could not update your brief. Your current version is saved; please edit it directly or try again.');
    } finally {
      setRevising(false);
    }
  }

  function approve() {
    if (!brief) return;
    setApproved(true);
    saveBrief(brief, source, true);
    trackRoomfound("brief_approved");
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <section className="briefLoading shell">
        <div className="briefLoadingMark">R</div>
        <p className="eyebrow">Writing your design brief</p>
        <h1>Turning your choices into a clear room direction.</h1>
        <div className="briefLoadingLine"><i /></div>
        <p>This part is free. No design credit is being used.</p>
      </section>
    );
  }

  if (!intake || !brief) {
    return (
      <section className="missingBrief shell">
        <p className="eyebrow">Design brief</p>
        <h1>We need your room consultation first.</h1>
        <p>Complete the Design My Room questions so the brief has real constraints to work from.</p>
        <Link className="button buttonPrimary" href="/design">Start my room</Link>
      </section>
    );
  }

  return (
    <div className="briefExperience shell">
      <section className="briefHero">
        <div className="briefHeroMain">
          <p className="eyebrow">Your design direction</p>
          <h1>{brief.title}</h1>
          <p>Check the direction we have created from your choices. Edit anything that does not feel right before choosing real products.</p>
        </div>

        <aside className="creditStatus">
          <span className="microLabel">Design credits</span>
          <div className="creditRule"><span>This brief</span><strong>0 credits</strong></div>
          <div className="creditRule"><span>Brief changes</span><strong>0 credits</strong></div>
          <div className="creditRule"><span>Future room render</span><strong>1 credit</strong></div>
          <p>Your furniture allowance is separate from any image-generation charge. Any charge will be shown before you confirm.</p>
        </aside>
      </section>

      <div className={ui.summary}>
        <strong>{intake.roomType === 'bedroom' ? 'Bedroom' : 'Living room'} · {intake.projectGoal === 'furnish' ? 'Furnish' : 'Refresh'}</strong>
        <span>Furniture allowance: £{intake.budget.toLocaleString('en-GB')}</span>
        <Link href="/design">Edit room, photo or advanced settings</Link>
      </div>
      {error && <p role="alert" className={ui.error}>{error}</p>}
      <section className="briefSections">
        {fieldOrder.filter(field => ['direction', 'keep', 'change', 'function'].includes(field.key)).map((field, index) => (
          <article className="briefSection" key={field.key}>
            <div className="briefSectionMeta">
              <span>{String(index + 2).padStart(2, '0')}</span>
              <div>
                <small>{field.kicker}</small>
                <strong>{field.label}</strong>
              </div>
            </div>

            <div className="briefSectionBody">
              {editing === field.key ? (
                <div className="inlineBriefEdit">
                  <textarea aria-label={field.label} value={draftValue} onChange={(event) => setDraftValue(event.target.value)} rows={5} autoFocus />
                  <div>
                    <button className="button buttonPrimary buttonCompact" type="button" onClick={saveEdit}>Save change</button>
                    <button className="textButton" type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{brief[field.key]}</p>
                  <button className="briefEditButton" type="button" onClick={() => startEdit(field.key)}>Edit</button>
                </>
              )}
            </div>
          </article>
        ))}
      </section>

      <details className={ui.briefDetails}>
        <summary>Style, measurements, budget and further details</summary>
        {fieldOrder.filter(field => !['direction', 'keep', 'change', 'function'].includes(field.key)).map(field => (
          <article className="briefSection" key={field.key}>
            <strong>{field.label}</strong>
            <div className="briefSectionBody">
              <p>{brief[field.key]}</p>
              {['budget', 'measurements'].includes(field.key) ? <Link href="/design">Edit in room answers</Link> : editing === field.key ? (
                <div className="inlineBriefEdit">
                  <textarea aria-label={field.label} value={draftValue} onChange={event => setDraftValue(event.target.value)} rows={3} />
                  <button type="button" onClick={saveEdit}>Save change</button>
                  <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              ) : <button className="briefEditButton" type="button" onClick={() => startEdit(field.key)}>Edit</button>}
            </div>
          </article>
        ))}
      </details>
      <details className="briefRefineDetails">
        <summary>
          <span>Want to refine the direction?</span>
          <small>Optional · make a change before approving</small>
          <i>＋</i>
        </summary>
      <section className="askDesigner">
        <div className="askDesignerIntro">
          <p className="eyebrow">Refine the direction</p>
          <h2>Make a small adjustment.</h2>
          <p>If something does not feel quite right, tell us what you would like changed. This is optional and does not use a design credit.</p>
        </div>
        <div className="askDesignerControl">
          <textarea
            aria-label="Changes to your brief"
            rows={4}
            value={revision}
            onChange={(event) => setRevision(event.target.value)}
            placeholder="For example: I like this, but make it warmer and spend more of the budget on the sofa."
          />
          <button className="button buttonPrimary" type="button" disabled={revising || !revision.trim()} onClick={() => askForChange()}>
            {revising ? 'Updating brief…' : 'Update my brief'}
          </button>
        </div>
        <div className="quickRevisions">
          {changePrompts.map((prompt) => (
            <button key={prompt} type="button" disabled={revising} onClick={() => askForChange(prompt)}>{prompt}</button>
          ))}
        </div>
        <div className="freeRevisionNote"><span>Free</span><p>Changing the written brief does not use image-generation credits.</p></div>
      </section>
      </details>



      <section className={`approveBrief ${approved ? 'isApproved' : ''}`}>
        <div>
          <span className="microLabel">{approved ? 'Direction approved' : 'Ready when you are'}</span>
          <h2>{approved ? 'Your brief is locked in.' : 'Approve this direction.'}</h2>
          <p>
            {approved
              ? intake.roomType === 'bedroom' ? 'Your bedroom brief is saved. Bedroom product selection and image generation are not available yet.' : 'We can now use this approved brief as the constraint for real-product selection. You can still return and edit it later.'
              : 'Approval does not generate an image or spend a credit. It simply tells the next stage what we are designing towards.'}
          </p>
        </div>
        {approved && intake.roomType === 'bedroom' ? <Link className="button buttonLight" href="/design">Edit room answers</Link> : approved ? (
          <Link className="button buttonLight" href="/products">Select real products · Free</Link>
        ) : (
          <button className="button buttonLight" type="button" onClick={approve}>Approve design direction</button>
        )}
      </section>


    </div>
  );
}
