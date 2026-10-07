'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

type CreativeFreedom = 'Safe' | 'Balanced' | 'Surprise me';

type IntakeState = {
  keep: string[];
  change: string[];
  styles: string[];
  colours: string[];
  materials: string[];
  dislikes: string;
  uses: string[];
  budget: number;
  measurements: {
    width: string;
    length: string;
    height: string;
    notes: string;
  };
  freedom: CreativeFreedom;
};

const initialState: IntakeState = {
  keep: [],
  change: [],
  styles: [],
  colours: [],
  materials: [],
  dislikes: '',
  uses: [],
  budget: 2500,
  measurements: { width: '', length: '', height: '', notes: '' },
  freedom: 'Balanced',
};

const keepItems = ['Sofa', 'Armchairs', 'TV', 'TV unit', 'Flooring', 'Fireplace', 'Artwork', 'Curtains', 'Lighting'];
const changeItems = ['Sofa', 'Armchairs', 'Coffee table', 'Side tables', 'TV unit', 'Storage', 'Rug', 'Lighting', 'Curtains', 'Artwork', 'Accessories'];

const styles = [
  {
    name: 'Contemporary',
    image: 'https://images.unsplash.com/photo-1781249144361-0b0b085f9da1?auto=format&fit=crop&q=82&w=1000',
    note: 'Clean lines, confident shapes, warm detail',
  },
  {
    name: 'Warm minimal',
    image: 'https://images.unsplash.com/photo-1698047736474-3c1e5a0d3526?auto=format&fit=crop&q=82&w=1000',
    note: 'Soft neutrals, texture, uncluttered forms',
  },
  {
    name: 'Modern British',
    image: 'https://images.unsplash.com/photo-1726090401458-7abb00f7450c?auto=format&fit=crop&q=82&w=1000',
    note: 'Character, tailored comfort, old meets new',
  },
  {
    name: 'Mid-century',
    image: 'https://images.unsplash.com/photo-1781249144372-e76e32526473?auto=format&fit=crop&q=82&w=1000',
    note: 'Warm timber, low profiles, graphic accents',
  },
  {
    name: 'Classic',
    image: 'https://images.unsplash.com/photo-1753911372198-50b1b254ad4d?auto=format&fit=crop&q=82&w=1000',
    note: 'Timeless proportions, layered and composed',
  },
  {
    name: 'Scandi',
    image: 'https://images.unsplash.com/photo-1761330439741-3dcf41ee766b?auto=format&fit=crop&q=82&w=1000',
    note: 'Light woods, calm colour, practical comfort',
  },
  {
    name: 'Colourful',
    image: 'https://images.unsplash.com/photo-1643148636639-c4f28543a5cc?auto=format&fit=crop&q=82&w=1000',
    note: 'Expressive colour, playful but still considered',
  },
];

const colours = [
  { name: 'Warm neutrals', colour: '#D7C8B6' },
  { name: 'Soft white', colour: '#F1ECE1' },
  { name: 'Olive', colour: '#78816C' },
  { name: 'Forest', colour: '#364A3D' },
  { name: 'Clay', colour: '#A86149' },
  { name: 'Ochre', colour: '#BD8B45' },
  { name: 'Dusty blue', colour: '#718493' },
  { name: 'Burgundy', colour: '#713D42' },
  { name: 'Charcoal', colour: '#444541' },
];

const materials = [
  { name: 'Natural oak', className: 'materialOak' },
  { name: 'Dark timber', className: 'materialWalnut' },
  { name: 'Linen', className: 'materialLinen' },
  { name: 'Bouclé', className: 'materialBoucle' },
  { name: 'Wool', className: 'materialWool' },
  { name: 'Leather', className: 'materialLeather' },
  { name: 'Stone', className: 'materialStone' },
  { name: 'Metal', className: 'materialMetal' },
];

const uses = [
  { name: 'TV watching', detail: 'Comfortable viewing and sensible layout' },
  { name: 'Entertaining', detail: 'More social seating and useful surfaces' },
  { name: 'Children', detail: 'Practical materials and family-friendly choices' },
  { name: 'Pets', detail: 'Durability, cleanability and realistic fabrics' },
  { name: 'Storage', detail: 'Make clutter control part of the design' },
  { name: 'Working', detail: 'Allow for a discreet work-from-home setup' },
  { name: 'Reading', detail: 'Comfort, task lighting and a quieter corner' },
];

const freedomOptions: Array<{ name: CreativeFreedom; title: string; copy: string }> = [
  { name: 'Safe', title: 'Keep it close', copy: 'Refine what I already like. Fewer unexpected choices.' },
  { name: 'Balanced', title: 'Designer balance', copy: 'Respect my brief, but make confident choices where they improve the room.' },
  { name: 'Surprise me', title: 'Push it further', copy: 'Use my constraints, but show me ideas I probably would not choose myself.' },
];

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function formatBudget(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
}

export function DesignIntake() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<IntakeState>(initialState);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [complete, setComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [designId, setDesignId] = useState('');
  const [roomAssetId, setRoomAssetId] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('roomfound-intake-v1');
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: IntakeState; step?: number };
        if (parsed.state) setState(parsed.state);
        setStep(0);
      }

      const runtimeRaw = window.localStorage.getItem('roomfound-design-runtime-v1');
      const runtime = runtimeRaw
        ? JSON.parse(runtimeRaw) as { ownerKey?: string; designId?: string; roomAssetId?: string; photoName?: string }
        : {};

      const nextOwnerKey = runtime.ownerKey || crypto.randomUUID();
      setOwnerKey(nextOwnerKey);

      if (runtime.designId) setDesignId(runtime.designId);
      if (runtime.roomAssetId) {
        setRoomAssetId(runtime.roomAssetId);
        setPhotoUrl(`/api/assets/${runtime.roomAssetId}?ownerKey=${encodeURIComponent(nextOwnerKey)}`);
      }
      if (runtime.photoName) setPhotoName(runtime.photoName);

      window.localStorage.setItem(
        'roomfound-design-runtime-v1',
        JSON.stringify({ ...runtime, ownerKey: nextOwnerKey }),
      );
    } catch {
      const nextOwnerKey = crypto.randomUUID();
      setOwnerKey(nextOwnerKey);
      window.localStorage.setItem('roomfound-design-runtime-v1', JSON.stringify({ ownerKey: nextOwnerKey }));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem('roomfound-intake-v1', JSON.stringify({ state, step }));
  }, [hydrated, state, step]);

  useEffect(() => () => {
    if (photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const progress = complete ? 100 : ((step + 1) / 10) * 100;

  const stepLabel = useMemo(() => {
    const labels = ['Your room', 'What stays', 'What changes', 'Style', 'Colour + material', 'Dislikes', 'How you live', 'Budget', 'Measurements', 'Creative freedom'];
    return labels[step];
  }, [step]);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(photoUrl && designId && roomAssetId && !uploadingPhoto);
    if (step === 3) return state.styles.length > 0;
    return true;
  }, [step, photoUrl, state.styles.length]);

  function saveRuntime(next: { ownerKey: string; designId: string; roomAssetId: string; photoName: string }) {
    window.localStorage.setItem('roomfound-design-runtime-v1', JSON.stringify(next));
    setOwnerKey(next.ownerKey);
    setDesignId(next.designId);
    setRoomAssetId(next.roomAssetId);
    setPhotoName(next.photoName);
    setPhotoUrl(`/api/assets/${next.roomAssetId}?ownerKey=${encodeURIComponent(next.ownerKey)}`);
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    setUploadingPhoto(true);

    const preview = URL.createObjectURL(file);
    if (photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(preview);
    setPhotoName(file.name);

    try {
      const key = ownerKey || crypto.randomUUID();
      const form = new FormData();
      form.set('ownerKey', key);
      if (designId) form.set('designId', designId);
      form.set('file', file);

      const response = await fetch('/api/designs/room-photo', {
        method: 'POST',
        body: form,
      });
      const data = await response.json();

      if (!response.ok || !data.assetId || !data.designId) {
        throw new Error(data.error || 'Upload failed');
      }

      saveRuntime({
        ownerKey: data.ownerKey || key,
        designId: data.designId,
        roomAssetId: data.assetId,
        photoName: file.name,
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'The room photograph could not be stored.');
      setDesignId('');
      setRoomAssetId('');
    } finally {
      URL.revokeObjectURL(preview);
      setUploadingPhoto(false);
    }
  }

  async function useExampleRoom() {
    const exampleUrl = 'https://images.unsplash.com/photo-1753911372198-50b1b254ad4d?auto=format&fit=crop&q=84&w=1600';
    setPhotoError('');
    setUploadingPhoto(true);
    setPhotoUrl(exampleUrl);
    setPhotoName('Example living room');

    try {
      const key = ownerKey || crypto.randomUUID();
      const response = await fetch('/api/designs/room-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerKey: key,
          designId: designId || null,
          exampleUrl,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.assetId || !data.designId) {
        throw new Error(data.error || 'Example room could not be stored.');
      }

      saveRuntime({
        ownerKey: data.ownerKey || key,
        designId: data.designId,
        roomAssetId: data.assetId,
        photoName: 'Example living room',
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Example room could not be stored.');
      setDesignId('');
      setRoomAssetId('');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function next() {
    if (!canContinue) return;
    if (step === 9) {
      setComplete(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStep((value) => Math.min(9, value + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    if (complete) {
      setComplete(false);
      setStep(9);
      return;
    }
    setStep((value) => Math.max(0, value - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    if (photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
    setState(initialState);
    setPhotoUrl('');
    setPhotoName('');
    setComplete(false);
    setStep(0);
    window.localStorage.removeItem('roomfound-intake-v1');
    window.localStorage.removeItem('roomfound-brief-v1');
    window.localStorage.removeItem('roomfound-product-selection-v1');
    const key = ownerKey || crypto.randomUUID();
    window.localStorage.setItem('roomfound-design-runtime-v1', JSON.stringify({ ownerKey: key }));
    setDesignId('');
    setRoomAssetId('');
    setPhotoError('');
  }

  return (
    <div className="designIntake">
      <div className="intakeProgress" aria-label="Design intake progress">
        <div className="intakeProgressMeta">
          <span>{complete ? 'Review' : `Step ${step + 1} of 10`}</span>
          <strong>{complete ? 'Ready for your brief' : stepLabel}</strong>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="progressTrack"><i style={{ width: `${progress}%` }} /></div>
      </div>

      {complete ? (
        <section className="intakeReview">
          <div className="reviewHeading">
            <p className="eyebrow">Your room direction</p>
            <h1>We know enough to write the brief.</h1>
            <p>Nothing has been rendered yet. Review the direction below before we turn it into your written design brief.</p>
          </div>

          <div className="reviewGrid">
            <div className="reviewPhoto">
              {photoUrl ? <img src={photoUrl} alt="Your uploaded living room" /> : null}
              <span>{photoName || 'Your room'}</span>
            </div>
            <div className="reviewFacts">
              <ReviewRow label="Keep" value={state.keep.length ? state.keep.join(', ') : 'Nothing specified'} />
              <ReviewRow label="Change" value={state.change.length ? state.change.join(', ') : 'Open to recommendations'} />
              <ReviewRow label="Style" value={state.styles.join(', ')} />
              <ReviewRow label="Colour" value={state.colours.length ? state.colours.join(', ') : 'Open'} />
              <ReviewRow label="Materials" value={state.materials.length ? state.materials.join(', ') : 'Open'} />
              <ReviewRow label="How you live" value={state.uses.length ? state.uses.join(', ') : 'No special requirements'} />
              <ReviewRow label="Budget" value={formatBudget(state.budget)} />
              <ReviewRow label="Creative freedom" value={state.freedom} />
              <ReviewRow
                label="Measurements"
                value={
                  state.measurements.width || state.measurements.length || state.measurements.height
                    ? `${state.measurements.width || '?'} W × ${state.measurements.length || '?'} L × ${state.measurements.height || '?'} H cm`
                    : 'Not supplied yet'
                }
              />
              {state.dislikes ? <ReviewRow label="Avoid" value={state.dislikes} /> : null}
            </div>
          </div>

          <div className="briefBoundary">
            <div>
              <span className="microLabel">Next stage · free</span>
              <h2>Create my design brief</h2>
              <p>The written brief will be editable before any image generation uses a design credit.</p>
            </div>
            <button className="button buttonPrimary" type="button" onClick={() => window.location.assign('/brief')}>Create my design brief · Free</button>
          </div>

          <div className="intakeReviewActions">
            <button className="textButton" type="button" onClick={back}>← Edit answers</button>
            <button className="textButton" type="button" onClick={reset}>Start again</button>
          </div>
        </section>
      ) : (
        <section className="intakeStep">
          {step === 0 ? (
            <>
              <StepIntro eyebrow="1 · Your room" title="Show us the room as it is today." copy="One clear photograph is enough to start. We want the real space, not the perfect angle." />
              <div className="photoStepGrid">
                <button className={`roomUploader ${photoUrl ? 'hasPhoto' : ''}`} type="button" onClick={() => fileInput.current?.click()}>
                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt="Selected room preview" />
                      <span className="replacePhoto">Change photograph</span>
                    </>
                  ) : (
                    <span className="uploadEmpty">
                      <i>＋</i>
                      <strong>Upload your living room</strong>
                      <small>JPG, PNG or WebP · one clear wide-angle view · max 8 MB</small>
                    </span>
                  )}
                </button>
                <input ref={fileInput} className="visuallyHidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} />
                {uploadingPhoto ? <p className="photoUploadState">Securing your room photograph…</p> : null}
                {photoError ? <p className="photoUploadError">{photoError}</p> : null}
                <aside className="photoGuidance">
                  <span className="microLabel">For the best first design</span>
                  <div><strong>01</strong><p>Stand far enough back to show as much of the room as possible.</p></div>
                  <div><strong>02</strong><p>Use daylight if you can. Avoid strong filters or portrait mode.</p></div>
                  <div><strong>03</strong><p>Leave the room as it really is. Existing furniture helps us understand it.</p></div>
                  <button className="textArrowLink buttonAsText" type="button" onClick={useExampleRoom}>Try with an example room <span>→</span></button>
                </aside>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <StepIntro eyebrow="2 · What stays" title="What already belongs in the room?" copy="Select the things you want the design to respect and work around." />
              <ChoiceGrid items={keepItems} selected={state.keep} onChange={(value) => setState((current) => ({ ...current, keep: toggle(current.keep, value) }))} />
              <p className="choiceHint">Not sure? Leave it unselected. You can refine this in the written brief.</p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepIntro eyebrow="3 · What can change" title="Where do we have permission to redesign?" copy="Choose the categories you are happy for us to replace, add or rethink." />
              <ChoiceGrid items={changeItems} selected={state.change} onChange={(value) => setState((current) => ({ ...current, change: toggle(current.change, value) }))} />
              <button className="selectAllButton" type="button" onClick={() => setState((current) => ({ ...current, change: current.change.length === changeItems.length ? [] : [...changeItems] }))}>
                {state.change.length === changeItems.length ? 'Clear all' : 'I am open to changing everything'}
              </button>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepIntro eyebrow="4 · Style discovery" title="Which rooms feel most like you?" copy="Choose more than one. We care about the feeling and ingredients, not forcing you into a label." />
              <div className="styleDiscoveryGrid">
                {styles.map((style) => {
                  const active = state.styles.includes(style.name);
                  return (
                    <button
                      className={`styleChoice ${active ? 'isSelected' : ''}`}
                      type="button"
                      aria-pressed={active}
                      key={style.name}
                      onClick={() => setState((current) => ({ ...current, styles: toggle(current.styles, style.name) }))}
                    >
                      <img src={style.image} alt="" aria-hidden="true" />
                      <span className="styleChoiceShade" />
                      <span className="styleChoiceCopy"><strong>{style.name}</strong><small>{style.note}</small></span>
                      <i>{active ? '✓' : '+'}</i>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <StepIntro eyebrow="5 · Colour + material" title="What do you want the room to feel made from?" copy="Pick any colours and materials you are naturally drawn to. Leaving this open is completely fine." />
              <div className="preferenceBlock">
                <span className="microLabel">Colours</span>
                <div className="colourChoices">
                  {colours.map((item) => {
                    const active = state.colours.includes(item.name);
                    return (
                      <button key={item.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState((current) => ({ ...current, colours: toggle(current.colours, item.name) }))}>
                        <i style={{ background: item.colour }} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="preferenceBlock">
                <span className="microLabel">Materials</span>
                <div className="materialChoices">
                  {materials.map((item) => {
                    const active = state.materials.includes(item.name);
                    return (
                      <button key={item.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState((current) => ({ ...current, materials: toggle(current.materials, item.name) }))}>
                        <i className={item.className} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <StepIntro eyebrow="6 · Dislikes" title="Tell us what should never make the shortlist." copy="Avoiding the wrong things is often as useful as knowing what you like." />
              <div className="dislikePrompt">
                <label htmlFor="dislikes">I really do not want…</label>
                <textarea
                  id="dislikes"
                  value={state.dislikes}
                  onChange={(event) => setState((current) => ({ ...current, dislikes: event.target.value }))}
                  placeholder="For example: grey velvet, glass tables, very low sofas, boucle, lots of gold, anything too clinical…"
                  rows={7}
                />
                <div className="promptIdeas">
                  <span>Useful things to mention:</span>
                  <span>colours</span><span>materials</span><span>shapes</span><span>trends</span><span>retailers</span>
                </div>
              </div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <StepIntro eyebrow="7 · How you live" title="A beautiful room still has to work on a Tuesday night." copy="Select anything that materially changes how the room needs to perform." />
              <div className="lifestyleGrid">
                {uses.map((item) => {
                  const active = state.uses.includes(item.name);
                  return (
                    <button key={item.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState((current) => ({ ...current, uses: toggle(current.uses, item.name) }))}>
                      <span className="lifestyleCheck">{active ? '✓' : '+'}</span>
                      <strong>{item.name}</strong>
                      <p>{item.detail}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 7 ? (
            <>
              <StepIntro eyebrow="8 · Total room budget" title="What should the finished room cost?" copy="We use this as a whole-room target, not as permission to spend every penny." />
              <div className="intakeBudget">
                <strong>{formatBudget(state.budget)}</strong>
                <input
                  type="range"
                  min="750"
                  max="10000"
                  step="250"
                  value={state.budget}
                  onChange={(event) => setState((current) => ({ ...current, budget: Number(event.target.value) }))}
                  aria-label="Total room budget"
                />
                <div className="budgetRangeLabels"><span>£750</span><span>£10,000+</span></div>
                <div className="budgetPresets">
                  {[1500, 2500, 5000, 7500].map((budget) => (
                    <button className={state.budget === budget ? 'isSelected' : ''} key={budget} type="button" onClick={() => setState((current) => ({ ...current, budget }))}>{formatBudget(budget)}</button>
                  ))}
                </div>
                <p><strong>Budget principle:</strong> leave room for the entire scheme. The system will later compare product combinations, not just recommend expensive hero pieces.</p>
              </div>
            </>
          ) : null}

          {step === 8 ? (
            <>
              <StepIntro eyebrow="9 · Measurements" title="Measurements help us design with more confidence." copy="They are optional for now. Approximate measurements are still useful, and you can add better ones before fit checking." />
              <div className="measurementGrid">
                <MeasurementField label="Room width" value={state.measurements.width} onChange={(value) => setState((current) => ({ ...current, measurements: { ...current.measurements, width: value } }))} />
                <MeasurementField label="Room length" value={state.measurements.length} onChange={(value) => setState((current) => ({ ...current, measurements: { ...current.measurements, length: value } }))} />
                <MeasurementField label="Ceiling height" value={state.measurements.height} onChange={(value) => setState((current) => ({ ...current, measurements: { ...current.measurements, height: value } }))} />
              </div>
              <label className="measurementNotes">
                <span>Anything awkward we should know about?</span>
                <textarea
                  rows={4}
                  value={state.measurements.notes}
                  onChange={(event) => setState((current) => ({ ...current, measurements: { ...current.measurements, notes: event.target.value } }))}
                  placeholder="Bay window, chimney breast, radiator behind sofa, narrow doorway…"
                />
              </label>
              <div className="measurementReassurance"><span>Optional</span><p>No measurements? We can still create the design brief. More accurate fit checking comes later.</p></div>
            </>
          ) : null}

          {step === 9 ? (
            <>
              <StepIntro eyebrow="10 · Creative freedom" title="How much should we challenge your first instinct?" copy="This controls how adventurous the design direction can be while still respecting everything you have told us." />
              <div className="freedomGrid">
                {freedomOptions.map((option) => {
                  const active = state.freedom === option.name;
                  return (
                    <button key={option.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState((current) => ({ ...current, freedom: option.name }))}>
                      <span>{active ? 'Selected' : option.name}</span>
                      <strong>{option.title}</strong>
                      <p>{option.copy}</p>
                    </button>
                  );
                })}
              </div>
              <div className="freeBoundaryNote">
                <span className="microLabel">Still free</span>
                <p>Finishing this consultation does not use a design credit. The next step is the written brief, which you will be able to edit before rendering.</p>
              </div>
            </>
          ) : null}

          <div className="intakeNav">
            <button className="textButton" type="button" onClick={back} disabled={step === 0}>← Back</button>
            <span>{step + 1} / 10</span>
            <button className="button buttonPrimary" type="button" onClick={next} disabled={!canContinue}>
              {step === 9 ? 'Review my room brief' : 'Continue'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function StepIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="intakeIntro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

function ChoiceGrid({ items, selected, onChange }: { items: string[]; selected: string[]; onChange: (value: string) => void }) {
  return (
    <div className="choiceGrid">
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <button key={item} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => onChange(item)}>
            <span>{active ? '✓' : '+'}</span>
            <strong>{item}</strong>
          </button>
        );
      })}
    </div>
  );
}

function MeasurementField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="measurementField">
      <span>{label}</span>
      <div><input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="e.g. 420" /><strong>cm</strong></div>
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="reviewRow"><span>{label}</span><strong>{value}</strong></div>;
}
