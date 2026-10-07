'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DesignBrief, IntakeForBrief } from '@/lib/brief';
import { creditPolicy } from '@/lib/credits';

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
    } finally {
      setLoading(false);
    }
  }

  function saveBrief(nextBrief: DesignBrief, nextSource: BriefSource, isApproved: boolean) {
    window.localStorage.setItem(
      'roomfound-brief-v1',
      JSON.stringify({ brief: nextBrief, source: nextSource, approved: isApproved, updatedAt: new Date().toISOString() }),
    );
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
    setRevising(true);
    try {
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake, currentBrief: brief, request: instruction }),
      });
      const data = await response.json();
      if (data.brief) {
        setBrief(data.brief);
        setSource(data.source || source);
        setApproved(false);
        saveBrief(data.brief, data.source || source, false);
        setRevision('');
      }
    } finally {
      setRevising(false);
    }
  }

  function approve() {
    if (!brief) return;
    setApproved(true);
    saveBrief(brief, source, true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  const measured = useMemo(() => {
    if (!intake) return false;
    return Boolean(intake.measurements.width || intake.measurements.length || intake.measurements.height);
  }, [intake]);

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
          <p className="eyebrow">Your written proposal</p>
          <h1>{brief.title}</h1>
          <p>Read it like a designer’s proposal. Change anything that does not feel right before we select products or spend a design credit.</p>
        </div>

        <aside className="creditStatus">
          <span className="microLabel">Design credits</span>
          <div className="creditCount">
            {Array.from({ length: creditPolicy.freeRenderCredits }).map((_, index) => <i key={index} />)}
            <strong>{creditPolicy.freeRenderCredits} free</strong>
          </div>
          <div className="creditRule"><span>This brief</span><strong>0 credits</strong></div>
          <div className="creditRule"><span>Brief changes</span><strong>0 credits</strong></div>
          <div className="creditRule"><span>Future room render</span><strong>1 credit</strong></div>
          <p>Think and refine for free. Credits are reserved for image generation.</p>
        </aside>
      </section>

      <section className="briefLead">
        <span>01</span>
        <p>{brief.direction}</p>
      </section>

      <section className="briefSections">
        {fieldOrder.slice(1).map((field, index) => (
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
                  <textarea value={draftValue} onChange={(event) => setDraftValue(event.target.value)} rows={5} autoFocus />
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

      <section className="askDesigner">
        <div className="askDesignerIntro">
          <p className="eyebrow">Refine the direction</p>
          <h2>Ask to change something.</h2>
          <p>You should not need to rewrite a prompt. Say what feels wrong or what you want more of, like you would to a designer.</p>
        </div>
        <div className="askDesignerControl">
          <textarea
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
        <div className="freeRevisionNote"><span>Free</span><p>Changing the written brief does not reduce your three render credits.</p></div>
      </section>

      <section className="briefConfidence">
        <div>
          <p className="eyebrow">Before products are selected</p>
          <h2>Does this sound like your room?</h2>
        </div>
        <div className="confidenceRows">
          <div><span>Budget defined</span><strong>Yes</strong></div>
          <div><span>Existing items considered</span><strong>{intake.keep.length ? 'Yes' : 'Open'}</strong></div>
          <div><span>Lifestyle requirements</span><strong>{intake.uses.length ? 'Included' : 'Open'}</strong></div>
          <div><span>Room measurements</span><strong className={measured ? '' : 'needsData'}>{measured ? 'Added' : 'Optional · not added'}</strong></div>
          <div><span>Image credit used</span><strong>None</strong></div>
        </div>
      </section>

      <section className={`approveBrief ${approved ? 'isApproved' : ''}`}>
        <div>
          <span className="microLabel">{approved ? 'Direction approved' : 'Ready when you are'}</span>
          <h2>{approved ? 'Your brief is locked in.' : 'Approve this direction.'}</h2>
          <p>
            {approved
              ? 'We can now use this approved brief as the constraint for real-product selection. You can still return and edit it later.'
              : 'Approval does not generate an image or spend a credit. It simply tells the next stage what we are designing towards.'}
          </p>
        </div>
        {approved ? (
          <button className="button buttonSecondary briefNextDisabled" type="button" disabled>Product selection comes next</button>
        ) : (
          <button className="button buttonLight" type="button" onClick={approve}>Approve design direction</button>
        )}
      </section>

      <section className="purchaseCreditPreview">
        <div>
          <span className="microLabel">Future loyalty loop</span>
          <h3>Buy from a room. Earn another design.</h3>
        </div>
        <p>When a qualifying purchase is confirmed, the architecture can return <strong>1 design credit</strong> to the customer. Affiliate clicks alone will never trigger a reward.</p>
      </section>
    </div>
  );
}
