'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { IntakeForBrief } from '@/lib/brief';
import { RetainedFurniture } from './RetainedFurniture';
import { trackRoomfound } from '@/components/PrivacyAnalytics';
import ui from './RoomBrief.module.css';

type CreativeFreedom = 'Safe' | 'Balanced' | 'Surprise me';
type IntakeState = IntakeForBrief;
type CatalogueItemChoice = { label: string; recommended: boolean; available: boolean; count: number; catalogueCount: number };
type CatalogueStyleChoice = { name: string; available: boolean };

const initialState: IntakeState = {
  roomType: 'living_room', projectGoal: 'refresh', retainedFurniture: [],
  keep: [],
  change: ['Sofa', 'Armchairs', 'Coffee table', 'TV unit', 'Rug', 'Lighting'],
  styles: [],
  colours: [],
  materials: [],
  dislikes: '',
  uses: [],
  budget: 2500,
  measurements: { width: '', length: '', height: '', notes: '', accuracy: 'unknown' },
  freedom: 'Balanced',
};

const livingKeepItems = ['Sofa', 'Armchairs', 'TV', 'TV unit', 'Flooring', 'Fireplace', 'Artwork', 'Curtains', 'Lighting'];

const styles = [
  {
    name: 'Modern Organic',
    image: '/style-previews/modern-organic.webp',
    note: 'First priority · soft curves, natural wood, linen and earthy colours',
  },
  {
    name: 'Modern Country',
    image: '/style-previews/modern-country.webp',
    note: 'Sage green, traditional wood, cosy fabrics and heritage details',
  },
  {
    name: 'Japandi',
    image: '/style-previews/japandi.webp',
    note: 'Pale wood, warm whites, simple shapes and practical calm',
  },
  {
    name: 'Mid-Century Modern',
    image: '/style-previews/mid-century-modern.webp',
    note: 'Walnut tones, tapered legs, olive and vintage-inspired detail',
  },
  {
    name: 'Bold & Colourful',
    image: '/style-previews/bold-colourful.webp',
    note: 'Rich colour, expressive upholstery and confident focal pieces',
  },
  {
    name: 'Contemporary Classic',
    image: '/style-previews/contemporary-classic.webp',
    note: 'Refined shapes, elegant details and timeless colour',
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

const livingUses = [
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
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItemChoice[]>([]);
  const [catalogueStyles, setCatalogueStyles] = useState<CatalogueStyleChoice[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState('');
  const [catalogueRetry, setCatalogueRetry] = useState(0);
  const [unavailableLabels, setUnavailableLabels] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const savedAnswers = useRef('');
  const defaultedCatalogueRooms = useRef(new Set<string>());
  const latestState = useRef(state);
  latestState.current = state;
  const roomName = state.roomType === 'bedroom' ? 'bedroom' : 'living room';
  const keepItems = state.roomType === 'bedroom' ? ['Bed', 'Bedside tables', 'Wardrobe', 'Chest of drawers', 'Flooring', 'Curtains', 'Lighting', 'Artwork'] : livingKeepItems;
  const availableItemChoices = catalogueItems.filter(item => item.available);
  const recommendedItems = catalogueItems.filter(item => item.recommended && item.available).map(item => item.label);
  const availableRecommendedItems = catalogueItems.filter(item => item.recommended && item.available).map(item => item.label);
  const comingSoonItems = catalogueItems.filter(item => item.catalogueCount === 0).map(item => item.label);
  const noMatchItems = catalogueItems.filter(item => item.catalogueCount > 0 && !item.available).map(item => item.label);
  const uses = state.roomType === 'bedroom' ? [
    { name: 'Sleeping', detail: 'A calm, comfortable place to rest' },
    { name: 'Storage', detail: 'Clothes, bedding and everyday belongings' },
    { name: 'Reading', detail: 'Comfortable light beside the bed' },
    { name: 'Working', detail: 'Space for a discreet desk' },
    { name: 'Children', detail: 'Practical family needs' },
    { name: 'Pets', detail: 'Materials that suit everyday life' },
  ] : livingUses;
  const validMeasurements = ['width', 'length', 'height'].every(key => {
    const value = state.measurements[key as 'width' | 'length' | 'height'];
    return !value || (/^\d+(\.\d+)?$/.test(value) && Number(value) > 0 && Number(value) <= 5000);
  });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('roomfound-intake-v1');
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: IntakeState; step?: number };
        if (parsed.state) {
          const legacyStyleNames: Record<string, string> = {
            Contemporary: 'Contemporary Classic',
            'Warm minimal': 'Modern Organic',
            'Modern British': 'Modern Country',
            'Mid-century': 'Mid-Century Modern',
            Classic: 'Contemporary Classic',
            Scandi: 'Japandi',
            Colourful: 'Bold & Colourful',
          };
          const restored = {
            ...initialState,
            ...parsed.state,
            styles: (parsed.state.styles || []).map((style: string) => legacyStyleNames[style] || style),
            measurements: { ...initialState.measurements, ...parsed.state.measurements },
          };
          savedAnswers.current = JSON.stringify(restored);
          setState(restored);
        }
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
    const controller = new AbortController();
    setCatalogueLoading(true);
    setCatalogueError('');

    const params = new URLSearchParams({ roomType: state.roomType || 'living_room', budget: String(state.budget) });
    if (state.styles.length) params.set('styles', state.styles.join(','));
    if (state.change.length) params.set('items', state.change.join(','));
    if (state.measurements.width) params.set('roomWidthCm', state.measurements.width);
    if (state.measurements.length) params.set('roomLengthCm', state.measurements.length);
    if (state.measurements.height) params.set('ceilingCm', state.measurements.height);
    if (state.dislikes.trim()) params.set('dislikes', state.dislikes.trim());

    fetch(`/api/products/categories?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const payload = await response.json() as { items?: CatalogueItemChoice[]; styles?: CatalogueStyleChoice[]; error?: string };
        if (!response.ok || !Array.isArray(payload.items)) throw new Error(payload.error || 'The product list could not be checked.');
        if (controller.signal.aborted) return;
        const items = payload.items;
        setCatalogueStyles(Array.isArray(payload.styles) ? payload.styles : []);
        setCatalogueItems(items);
        const availableLabels = new Set(items.filter(item => item.available).map(item => item.label));
        const suggested = items.filter(item => item.recommended && item.available).map(item => item.label);
        const catalogueLabels = new Set(items.filter(item => item.catalogueCount > 0).map(item => item.label));
        const removed = latestState.current.change.filter(label => catalogueLabels.has(label) && !availableLabels.has(label));
        setUnavailableLabels(current => Array.from(new Set([...current, ...removed])).filter(label => {
          const item = items.find(choice => choice.label === label);
          return Boolean(item && item.catalogueCount > 0 && !item.available);
        }));
        const firstCheckForRoom = !defaultedCatalogueRooms.current.has(state.roomType || 'living_room');
        defaultedCatalogueRooms.current.add(state.roomType || 'living_room');
        setState(current => {
          const saved = current.change.filter(item => availableLabels.has(item));
          return { ...current, change: firstCheckForRoom && !saved.length ? suggested : saved };
        });
      })
      .catch(error => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!controller.signal.aborted) setCatalogueError(error instanceof Error ? error.message : 'The product list could not be checked.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogueLoading(false);
      });

    return () => controller.abort();
  }, [hydrated, state.roomType, state.styles, state.budget, state.measurements.width, state.measurements.length, state.measurements.height, state.dislikes, catalogueRetry]);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = JSON.stringify(state);
    if (savedAnswers.current && savedAnswers.current !== snapshot) {
      window.localStorage.removeItem('roomfound-brief-v1');
      window.localStorage.removeItem('roomfound-product-selection-v1');
    }
    savedAnswers.current = snapshot;
    window.localStorage.setItem('roomfound-intake-v1', JSON.stringify({ state, step }));
  }, [hydrated, state, step]);

  useEffect(() => () => {
    if (photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const progress = complete ? 100 : ((step + 1) / 11) * 100;

  const stepLabel = useMemo(() => {
    const labels = ['Your room', 'Choose items', 'Add your photo', 'What stays', 'Style', 'Colour + material', 'Dislikes', 'How you live', 'Budget', 'Measurements', 'Creative freedom'];
    return labels[step];
  }, [step]);

  const canContinue = useMemo(() => {
    if (step === 0) return state.roomType === 'living_room';
    if (step === 1) return !catalogueLoading && !catalogueError && state.change.some(label => catalogueItems.some(item => item.label === label && item.available));
    if (step === 2) return Boolean(photoUrl && designId && roomAssetId && !uploadingPhoto);
    if (step === 9) return validMeasurements;
    if (step === 4) return !catalogueLoading && !catalogueError && state.styles.some(style => catalogueStyles.some(option => option.name === style && option.available));
    return true;
  }, [step, state.roomType, photoUrl, designId, roomAssetId, uploadingPhoto, state.styles, state.change, validMeasurements, catalogueLoading, catalogueError, catalogueStyles, catalogueItems]);

  function saveRuntime(next: { ownerKey: string; designId: string; roomAssetId: string; photoName: string }) {
    window.localStorage.setItem('roomfound-design-runtime-v1', JSON.stringify(next));
    window.localStorage.removeItem('roomfound-brief-v1');
    window.localStorage.removeItem('roomfound-product-selection-v1');
    setState(current => ({ ...current, retainedFurniture: [] }));
    setOwnerKey(next.ownerKey);
    setDesignId(next.designId);
    setRoomAssetId(next.roomAssetId);
    setPhotoName(next.photoName);
    setPhotoUrl(`/api/assets/${next.roomAssetId}?ownerKey=${encodeURIComponent(next.ownerKey)}`);
  }

  async function changeRoomType(roomType: 'living_room' | 'bedroom') {
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      if (designId) {
        const response = await fetch('/api/designs/room-photo', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designId, ownerKey, roomType }),
        });
        if (!response.ok) throw new Error('Room type could not be saved. Please try again.');
      }
      setState(current => ({ ...current, roomType, keep: [], change: [], uses: [], retainedFurniture: [] }));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Room type could not be saved.');
    } finally { setUploadingPhoto(false); }
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
      form.set('roomType', state.roomType || 'living_room');
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
      setPhotoUrl('');
    } finally {
      URL.revokeObjectURL(preview);
      setUploadingPhoto(false);
    }
  }

  function next() {
    if (!canContinue) return;
    if (step === 1) {
      const categoryMap: Record<string,string> = {
        'Sofa':'sofas','Armchairs':'armchairs','Coffee table':'coffee-tables','TV unit':'tv-units',
        'Side tables':'side-tables','Rug':'rugs','Lighting':'lighting','Storage':'storage-cabinets',
        'Bed':'beds','Bedside tables':'bedside-tables','Wardrobe':'wardrobes','Chest of drawers':'chest-of-drawers',
      };
      trackRoomfound('item_choices_submitted', {
        roomType: state.roomType || 'living_room',
        categories: [...state.change].map(item => categoryMap[item]).filter(Boolean),
        keptCategories: [...state.keep].map(item => categoryMap[item]).filter(Boolean),
      });
    }
    if (step === 4) {
      const styleMap: Record<string,string> = {
        'Modern Organic':'modern-organic','Modern Country':'modern-country','Japandi':'japandi',
        'Mid-Century Modern':'mid-century-modern','Bold & Colourful':'bold-colourful',
        'Contemporary Classic':'contemporary-classic',
      };
      const selectedStyles = state.styles.map(style => styleMap[style]).filter(Boolean);
      trackRoomfound('style_choices_submitted', {
        roomType: state.roomType || 'living_room',
        styles: selectedStyles,
      });
    }
    if (step === 10) {
      setComplete(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStep((value) => Math.min(10, value + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    if (complete) {
      setComplete(false);
      setStep(10);
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
          <span>{complete ? 'Review' : `Step ${step + 1} of 11`}</span>
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
              {photoUrl ? <img src={photoUrl} alt={`Your uploaded ${roomName}`} /> : null}
              <span>{photoName || 'Your room'}</span>
            </div>
            <div className="reviewFacts">
              <ReviewRow label="Room" value={`${roomName} · ${state.projectGoal === 'furnish' ? 'Furnishing' : 'Refreshing'}`} />
              <ReviewRow label="Marked to keep" value={state.retainedFurniture?.map(item => item.label).join(', ') || 'No photo markers'} />
              <ReviewRow label="Keep" value={state.keep.length ? state.keep.join(', ') : 'Nothing specified'} />
              <ReviewRow label="Change" value={state.change.length ? state.change.join(', ') : 'Open to recommendations'} />
              <ReviewRow label="Style" value={state.styles.join(', ')} />
              <ReviewRow label="Colour" value={state.colours.length ? state.colours.join(', ') : 'Open'} />
              <ReviewRow label="Materials" value={state.materials.length ? state.materials.join(', ') : 'Open'} />
              <ReviewRow label="How you live" value={state.uses.length ? state.uses.join(', ') : 'No special requirements'} />
              <ReviewRow label="Furniture allowance" value={`${formatBudget(state.budget)} · design charges separate`} />
              <ReviewRow label="Creative freedom" value={state.freedom} />
              <ReviewRow
                label="Measurements"
                value={
                  state.measurements.width || state.measurements.length || state.measurements.height
                    ? `${state.measurements.accuracy === 'measured' ? 'Customer measured' : 'Approximate / unconfirmed'}: ${state.measurements.width || '?'} W × ${state.measurements.length || '?'} L × ${state.measurements.height || '?'} H cm`
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
              <StepIntro eyebrow="1 · Your room" title="Which room are we planning?" copy="Choose the room first. Next, you will pick the items you want us to consider." />
              <div className={ui.setup}>
                <label className={ui.field}>Room type
                  <select value={state.roomType} disabled={uploadingPhoto} onChange={event => changeRoomType(event.target.value as 'living_room' | 'bedroom')}>
                    <option value="living_room">Living room</option><option value="bedroom" disabled>Bedroom · coming soon</option>
                  </select>
                </label>
                <label className={ui.field}>What would you like to do?
                  <select value={state.projectGoal} onChange={event => setState(current => ({ ...current, projectGoal: event.target.value as IntakeState['projectGoal'] }))}>
                    <option value="refresh">Refresh an existing room</option><option value="furnish">Furnish an empty room</option>
                  </select>
                </label>
              </div>
              {state.roomType === 'bedroom' && <p className={ui.note}>Bedroom product collections are being prepared. Choose Living room to start a design with reviewed furniture and retailer links.</p>}

            </>
          ) : null}

          {unavailableLabels.length ? <p className={ui.note} role="status">{unavailableLabels.join(', ')} {unavailableLabels.length === 1 ? 'is' : 'are'} no longer selectable because no reviewed item matches your current style, budget, room measurements or exclusions. <button className="textButton" type="button" onClick={() => setStep(1)}>Review item choices</button></p> : null}

          {step === 1 ? (
            <>
              <StepIntro eyebrow="2 · Choose items" title="What would you like us to include?" copy={state.roomType === 'bedroom' ? "Choose the furniture types to plan around. Bedroom product recommendations are being prepared; you can still save your room plan." : "Choose from item types with reviewed products matching your current style, budget and room measurements. This list updates as you change those answers."} />
              <div className="choiceHint">
                <span className="microLabel">Suggested for a {roomName}</span>
                <p>{catalogueLoading ? 'Checking suggestions…' : recommendedItems.length ? recommendedItems.join(' · ') : 'No suggested item types match your current choices.'}</p>
              </div>
              {catalogueLoading ? <p aria-live="polite">Checking the reviewed product list…</p> : null}
              {catalogueError ? (
                <p className={ui.error} role="alert">{catalogueError} <button className="textButton" type="button" onClick={() => setCatalogueRetry(value => value + 1)}>Try again</button></p>
              ) : null}
              {!catalogueLoading && availableItemChoices.length ? (
                <ChoiceGrid
                  items={availableItemChoices.filter(item => !state.keep.includes(item.label)).map(item => item.label)}
                  selected={state.change}
                  onChange={(value) => { setUnavailableLabels([]); setState((current) => ({ ...current, change: toggle(current.change, value) })); }}
                />
              ) : !catalogueLoading && !catalogueError ? (
                <p className="choiceHint">There are no reviewed {roomName} products matching these choices yet. Adjust your budget or filters before continuing with a shoppable room.</p>
              ) : null}
              {!catalogueLoading && !catalogueError && noMatchItems.length ? (
                <p className="choiceHint" role="status">
                  No reviewed item matches your current choices for: {noMatchItems.join(' · ')}. They cannot be selected unless the style, budget, room measurements or exclusions change.{' '}
                  <button className="textButton" type="button" onClick={() => setState(current => ({ ...current, styles: [], budget: 10000, dislikes: '', measurements: { ...current.measurements, width: '', length: '', height: '' } }))}>Show all reviewed options</button>
                </p>
              ) : null}
              {!catalogueLoading && !catalogueError && comingSoonItems.length ? <p className="choiceHint">Not in the reviewed catalogue yet: {comingSoonItems.join(' · ')}.</p> : null}
              {state.roomType === 'bedroom' ? <p className={ui.note}>Bedroom products and image generation are not available yet; this list is for planning only.</p> : null}
              {!catalogueLoading && !catalogueError && availableItemChoices.length > 0 && !state.change.some(label => availableItemChoices.some(item => item.label === label)) ? (
                <p className="choiceHint" role="status">Choose at least one reviewed furniture type to continue. This keeps your room plan tied to products you can shop.</p>
              ) : null}
              {availableRecommendedItems.length ? (
                <button className="selectAllButton" type="button" onClick={() => setState((current) => ({ ...current, change: availableRecommendedItems.filter(item => !current.keep.includes(item)) }))}>
                  Use suggested items
                </button>
              ) : null}
              <p className="choiceHint">Colour and material preferences guide the design. Item types are only selectable when a reviewed product also matches your current hard filters.</p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepIntro eyebrow="3 · Add your photo" title="Now show us the room." copy="A clear photo helps us work with the real layout. On a phone, the upload button can open your camera." />
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
                      <strong>Upload your {roomName}</strong>
                      <small>JPG, PNG or WebP · one clear wide-angle view · max 8 MB</small>
                    </span>
                  )}
                </button>
                <input ref={fileInput} className="visuallyHidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhoto} />
                {uploadingPhoto ? <p className="photoUploadState">Securing your room photograph…</p> : null}
                {photoError ? <p className="photoUploadError">{photoError}</p> : null}
                <aside className="photoGuidance">
                  <span className="microLabel">For the best first design</span>
                  <div><strong>01</strong><p>Stand far enough back to show as much of the room as possible.</p></div>
                  <div><strong>02</strong><p>Use daylight if you can. Avoid strong filters or portrait mode.</p></div>
                  <div><strong>03</strong><p>Leave the room as it really is. Existing furniture helps us understand it.</p></div>
                <div><strong>04</strong><p>Your photo is saved privately in your room gallery. Sharing a finished design publicly is a separate choice.</p></div>
                </aside>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepIntro eyebrow="4 · What stays" title="What already belongs in the room?" copy="Select the things you want the design to respect and work around." />
              <ChoiceGrid items={keepItems} selected={state.keep} onChange={(value) => setState((current) => ({ ...current, keep: toggle(current.keep, value), change: current.change.filter(item => item !== value) }))} />
              {photoUrl && <RetainedFurniture photoUrl={photoUrl} items={state.retainedFurniture || []} onChange={items => setState(current => ({ ...current, retainedFurniture: items }))} />}
              <p className="choiceHint">Not sure? Leave it unselected. You can refine this in the written brief.</p>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <StepIntro eyebrow="5 · Style discovery" title="Which style feels like home?" copy="Choose a look with reviewed furniture available for your budget and room. You can select more than one." />
              <div className="styleDiscoveryGrid">
                {styles.map((style) => {
                  const active = state.styles.includes(style.name);
                  const styleAvailable = !catalogueLoading && !catalogueError && catalogueStyles.some(option => option.name === style.name && option.available);
                  return (
                    <button
                      className={`styleChoice ${active ? 'isSelected' : ''}`}
                      type="button"
                      aria-pressed={active}
                      aria-disabled={!styleAvailable && !active}
                      key={style.name}
                      disabled={!styleAvailable && !active}
                      onClick={() => {
                        if (styleAvailable || active) setState((current) => ({ ...current, styles: toggle(current.styles, style.name) }));
                      }}
                    >
                      <img src={style.image} alt="" aria-hidden="true" />
                      <span className="styleChoiceShade" />
                      <span className="styleChoiceCopy"><strong>{style.name}</strong><small>{style.note}</small><small>{styleAvailable ? 'Reviewed products available' : active ? 'No longer matches your current filters · remove this style' : 'No reviewed products match your current filters'}</small></span>
                      <i>{active ? '✓' : '+'}</i>
                    </button>
                  );
                })}
              </div>
              {catalogueLoading ? <p aria-live="polite">Checking which styles have matching furniture…</p> : null}
              {catalogueError ? <p className={ui.error} role="alert">{catalogueError} <button className="textButton" type="button" onClick={() => setCatalogueRetry(value => value + 1)}>Try again</button></p> : null}
              {!catalogueLoading && !catalogueError && !catalogueStyles.some(style => style.available) ? (
                <p className={ui.note} role="status">No reviewed furniture matches these styles for your chosen item types and filters. <button className="textButton" type="button" onClick={() => setStep(1)}>Change item types</button></p>
              ) : null}
            </>
          ) : null}

          {step === 5 ? (
            <>
              <StepIntro eyebrow="6 · Colour + material" title="What do you want the room to feel made from?" copy="Pick any colours and materials you are naturally drawn to. Leaving this open is completely fine." />
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

          {step === 6 ? (
            <>
              <StepIntro eyebrow="7 · Dislikes" title="Tell us what should never make the shortlist." copy="Avoiding the wrong things is often as useful as knowing what you like." />
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

          {step === 7 ? (
            <>
              <StepIntro eyebrow="8 · How you live" title="A beautiful room still has to work on a Tuesday night." copy="Select anything that materially changes how the room needs to perform." />
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

          {step === 8 ? (
            <>
              <StepIntro eyebrow="9 · Total room budget" title="What is the most you want to spend?" copy="Set the maximum for new furniture and accessories. We’ll keep the initial product collection within this limit where suitable items are available. Image-generation charges are separate; delivery costs are confirmed with the products." />
              <div className="intakeBudget">
                <strong>{formatBudget(state.budget)} <small>maximum</small></strong>
                <input
                  type="range"
                  min="750"
                  max="10000"
                  step="250"
                  value={state.budget}
                  onChange={(event) => setState((current) => ({ ...current, budget: Number(event.target.value) }))}
                  aria-label="Maximum total room furniture budget"
                />
                <div className="budgetRangeLabels"><span>£750</span><span>£10,000</span></div>
                <div className="budgetPresets">
                  {[1500, 2500, 5000, 7500].map((budget) => (
                    <button className={state.budget === budget ? 'isSelected' : ''} key={budget} type="button" onClick={() => setState((current) => ({ ...current, budget }))}>{formatBudget(budget)}</button>
                  ))}
                </div>
                <p><strong>Budget principle:</strong> this is the maximum for the new furniture collection. Furniture you keep does not count. If you later swap an item for a more expensive one, we’ll show whether the collection goes over this limit.</p>
              </div>
            </>
          ) : null}

          {step === 9 ? (
            <>
              <StepIntro eyebrow="10 · Measurements" title="Measurements help us design with more confidence." copy="They are optional for now. Approximate measurements are still useful, and you can add better ones before fit checking." />
              <label className={ui.field}>How were these measurements taken?
                <select value={state.measurements.accuracy || 'unknown'} onChange={event => setState(current => ({ ...current, measurements: { ...current.measurements, accuracy: event.target.value as 'measured' | 'approximate' | 'unknown' } }))}>
                  <option value="unknown">Not measured / not sure yet</option><option value="approximate">My approximate estimates</option><option value="measured">Measured by me</option>
                </select>
              </label>
              <p>Start with width and length in centimetres. Ceiling height is useful for tall furniture. We do not infer measurements from your photograph.</p>
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
                  placeholder="Dimensions of furniture you are keeping; door and window positions; radiator; clear wall space; narrow access; or a maximum furniture width…"
                />
              </label>
              {!validMeasurements && <p role="alert" className={ui.error}>Use a positive number up to 5,000 cm, or leave the field empty if unknown.</p>}
              <div className="measurementReassurance"><span>Optional</span><p>No measurements? We can still create the design brief. Missing measurements remain unknown. Customer-supplied measurements are not a guarantee of furniture fit.</p></div>
            </>
          ) : null}

          {step === 10 ? (
            <>
              <StepIntro eyebrow="11 · Creative freedom" title="How much should we challenge your first instinct?" copy="This controls how adventurous the design direction can be while still respecting everything you have told us." />
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
            <span>{step + 1} / 11</span>
            <button className="button buttonPrimary" type="button" onClick={next} disabled={!canContinue}>
              {step === 10 ? 'Review my room brief' : 'Continue'}
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
      <div><input inputMode="decimal" maxLength={8} value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ''))} placeholder="e.g. 420" /><strong>cm</strong></div>
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="reviewRow"><span>{label}</span><strong>{value}</strong></div>;
}
