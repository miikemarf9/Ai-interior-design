'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { IntakeForBrief } from '@/lib/brief';
import { RetainedFurniture } from './RetainedFurniture';
import { trackRoomfound } from '@/components/PrivacyAnalytics';
import { JourneyAssistant } from '@/components/JourneyAssistant';
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
    note: 'Soft curves, natural wood, linen and earthy colours',
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
          const restoredStyles = (parsed.state.styles || []).map((style: string) => legacyStyleNames[style] || style);
          const selectedStyles = restoredStyles.slice(0, 1);
          if (selectedStyles.length !== restoredStyles.length) {
            window.localStorage.removeItem('roomfound-brief-v1');
            window.localStorage.removeItem('roomfound-product-selection-v1');
          }
          const restored = {
            ...initialState,
            ...parsed.state,
            styles: selectedStyles,
            measurements: { ...initialState.measurements, ...parsed.state.measurements },
          };
          savedAnswers.current = JSON.stringify(restored);
          setState(restored);
        }
        const savedStep = typeof parsed.step === 'number' && Number.isInteger(parsed.step)
          ? Math.min(2, Math.max(0, parsed.step))
          : 0;
        const requestedStepParam = new URLSearchParams(window.location.search).get('step');
        const requestedStep = requestedStepParam === null ? null : Number(requestedStepParam);
        setStep(requestedStep !== null && Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep <= 2
          ? requestedStep
          : savedStep);
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

  const progress = complete ? 100 : ((step + 1) / 3) * 100;
  const stepLabels = ['Your room', 'Choose your style', 'Furniture'];
  const stepLabel = stepLabels[step] || 'Your room';
  // Only the room photograph is required. Style, budget refinements, measurements,
  // retained-item markers and product-category choices are all optional.
  const canContinue = step === 0
    ? state.roomType === 'living_room' && Boolean(photoUrl && designId && roomAssetId && !uploadingPhoto)
    : step === 1 || step === 2;

  function goToStep(target: number) {
    if (target >= step || target < 0 || target > 2) return;
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function skipStyle() {
    setState(current => ({ ...current, styles: [] }));
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function surpriseMe() {
    const available = catalogueStyles.filter(option => option.available).map(option => option.name);
    if (!available.length) return;
    const alternatives = available.filter(name => !state.styles.includes(name));
    const pool = alternatives.length ? alternatives : available;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    setState(current => ({ ...current, styles: [selected] }));
  }

  function useSuggestedItems() {
    setState(current => ({
      ...current,
      change: availableRecommendedItems.filter(item => !current.keep.includes(item)),
    }));
  }

  function letDesignerChoose() {
    const categoryMap: Record<string, string> = {
      'Sofa':'sofas','Armchairs':'armchairs','Coffee table':'coffee-tables','TV unit':'tv-units',
      'Side tables':'side-tables','Rug':'rugs','Lighting':'lighting','Storage':'storage-cabinets',
      'Bed':'beds','Bedside tables':'bedside-tables','Wardrobe':'wardrobes','Chest of drawers':'chest-of-drawers',
    };
    trackRoomfound('item_choices_submitted', {
      roomType: state.roomType || 'living_room',
      categories: [],
      keptCategories: [...state.keep].map(item => categoryMap[item]).filter(Boolean),
    });
    setState(current => ({ ...current, change: [] }));
    setComplete(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('That photograph is larger than 8 MB. Choose a smaller image and try again.');
      event.currentTarget.value = '';
      return;
    }
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
      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          response.headers.get('content-type')?.includes('text/html') || /^\s*</.test(responseText)
            ? 'The photo service returned an error page. Your photograph has not been saved; please try again.'
            : 'The photo service returned an unreadable response. Your photograph has not been saved; please try again.',
        );
      }

      if (!response.ok || !data.assetId || !data.designId) {
        throw new Error(data.error || 'Your photograph could not be saved. Please try again.');
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
      if (fileInput.current) fileInput.current.value = '';
      setUploadingPhoto(false);
    }
  }

  function next() {
    if (!canContinue) return;

    if (step === 1) {
      const styleMap: Record<string,string> = {
        'Modern Organic':'modern-organic','Modern Country':'modern-country','Japandi':'japandi',
        'Mid-Century Modern':'mid-century-modern','Bold & Colourful':'bold-colourful',
        'Contemporary Classic':'contemporary-classic',
      };
      trackRoomfound('style_choices_submitted', {
        roomType: state.roomType || 'living_room',
        styles: state.styles.map(style => styleMap[style]).filter(Boolean),
      });
    }

    if (step === 2) {
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
      setComplete(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setStep(value => Math.min(2, value + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    if (complete) {
      setComplete(false);
      setStep(2);
      return;
    }
    setStep(value => Math.max(0, value - 1));
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
          <span>Step {complete ? '3' : step + 1} of 3</span>
          <strong>{complete ? 'Ready to review' : stepLabel}</strong>
          <span>About 2 minutes</span>
        </div>
        <div className="progressTrack"><i style={{ width: progress + '%' }} /></div>
      </div>

      {complete ? (
        <section className="intakeReview">
          <div className="reviewHeading">
            <p className="eyebrow">Your room direction</p>
            <h1>Your room plan is ready.</h1>
            <p>Check the essentials below. You can still refine the written design direction before choosing products or generating an image.</p>
          </div>

          <div className="reviewGrid">
            <div className="reviewPhoto">
              {photoUrl ? <img src={photoUrl} alt={'Your uploaded ' + roomName} /> : null}
              <span>{photoName || 'Your room'}</span>
            </div>
            <div className="reviewFacts">
              <ReviewRow label="Room" value={roomName + ' · ' + (state.projectGoal === 'furnish' ? 'Furnishing' : 'Refreshing')} />
              <ReviewRow label="Style" value={state.styles.join(', ') || 'Open to recommendations'} />
              {state.keep.length ? <ReviewRow label="Keeping" value={state.keep.join(', ')} /> : null}
              {state.retainedFurniture?.length ? <ReviewRow label="Marked to keep" value={state.retainedFurniture.map(item => item.label).join(', ')} /> : null}
              <ReviewRow label="New furniture" value={state.change.join(', ') || 'Open to recommendations'} />
              <ReviewRow label="Furniture budget" value={formatBudget(state.budget)} />
              {state.colours.length ? <ReviewRow label="Colour preferences" value={state.colours.join(', ')} /> : null}
              {state.materials.length ? <ReviewRow label="Materials" value={state.materials.join(', ')} /> : null}
              {state.uses.length ? <ReviewRow label="Room needs" value={state.uses.join(', ')} /> : null}
              {state.dislikes.trim() ? <ReviewRow label="Avoid" value={state.dislikes} /> : null}
              {state.measurements.width || state.measurements.length || state.measurements.height ? (
                <ReviewRow
                  label="Measurements"
                  value={
                    (state.measurements.accuracy === 'measured' ? 'Customer measured' : 'Approximate / unconfirmed') +
                    ': ' + (state.measurements.width || '?') + ' W × ' +
                    (state.measurements.length || '?') + ' L × ' +
                    (state.measurements.height || '?') + ' H cm'
                  }
                />
              ) : null}
              {state.measurements.notes ? <ReviewRow label="Room notes" value={state.measurements.notes} /> : null}
              {state.freedom !== 'Balanced' ? <ReviewRow label="Design approach" value={state.freedom} /> : null}
            </div>
          </div>

          <div className="briefBoundary">
            <div>
              <span className="microLabel">Next step · free</span>
              <h2>Review your design direction.</h2>
              <p>We’ll turn your choices into a concise written brief. You can make changes before any image is generated.</p>
            </div>
            <button className="button buttonPrimary" type="button" onClick={() => window.location.assign('/brief')}>Continue to design brief</button>
          </div>

          <div className="intakeReviewActions">
            <button className="textButton" type="button" onClick={back}>← Edit my choices</button>
            <button className="textButton" type="button" onClick={reset}>Start again</button>
          </div>
        </section>
      ) : (
        <div className="intakeLayout">
        <section className="intakeStep">
          {step === 0 ? (
            <>
              <StepIntro eyebrow="01 / 03 · Your room" title="Let’s start with your room." copy="Tell us what you’re working with and add one clear photograph." time="About 30 seconds" />
              <div className="roomSetupFields">
                <label className={ui.field}>Room
                  <select value={state.roomType} disabled={uploadingPhoto} onChange={event => changeRoomType(event.target.value as 'living_room' | 'bedroom')}>
                    <option value="living_room">Living room</option>
                    <option value="bedroom" disabled>Bedroom · coming soon</option>
                  </select>
                </label>
                <label className={ui.field}>Your starting point
                  <select value={state.projectGoal} onChange={event => setState(current => ({ ...current, projectGoal: event.target.value as IntakeState['projectGoal'] }))}>
                    <option value="refresh">Refresh an existing room</option>
                    <option value="furnish">Furnish an empty room</option>
                  </select>
                </label>
              </div>

              <div className="photoStepGrid">
                <div className="photoUploadColumn">
                  <button className={'roomUploader ' + (photoUrl ? 'hasPhoto' : '')} type="button" disabled={uploadingPhoto} onClick={() => fileInput.current?.click()}>
                    {photoUrl ? (
                      <>
                        <img src={photoUrl} alt="Preview of your room photograph" />
                        <span className="replacePhoto">Change photo</span>
                      </>
                    ) : (
                      <span className="uploadEmpty">
                        <i>＋</i>
                        <strong>Add a photo of your room</strong>
                        <small>JPG, PNG or WebP · up to 8 MB</small>
                        <small>A single wide-angle photograph works best</small>
                      </span>
                    )}
                  </button>
                  <input ref={fileInput} className="visuallyHidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhoto} />
                  {uploadingPhoto ? <p className="photoUploadState" role="status">Saving your photograph…</p> : null}
                  {photoError ? <p className="photoUploadError" role="alert">{photoError}</p> : null}
                </div>
                <aside className="photoGuidance">
                  <span className="microLabel">A good photo makes all the difference</span>
                  <div><strong>01</strong><p>Stand back far enough to show the room and its layout.</p></div>
                  <div><strong>02</strong><p>Use natural light where possible. Avoid filters.</p></div>
                  <div><strong>03</strong><p>Leave existing furniture in place so we can work around it.</p></div>
                  <p className="photoPrivacy">Your photograph is saved privately. Sharing a finished design is always optional.</p>
                </aside>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <StepIntro eyebrow="02 / 03 · Style and budget" title="Choose a look, or leave it to us." copy="Pick a style if you have one in mind. Not sure? You can skip this step or let us choose." time="About 30 seconds" />
              <div className="styleDiscoveryGrid">
                {styles.map(style => {
                  const active = state.styles.includes(style.name);
                  const styleAvailable = !catalogueLoading && !catalogueError && catalogueStyles.some(option => option.name === style.name && option.available);
                  return (
                    <button
                      className={'styleChoice ' + (active ? 'isSelected' : '')}
                      type="button"
                      aria-pressed={active}
                      aria-disabled={!styleAvailable && !active && !catalogueLoading}
                      key={style.name}
                      disabled={!catalogueLoading && !styleAvailable && !active}
                      onClick={() => setState(current => ({ ...current, styles: current.styles.includes(style.name) ? [] : [style.name] }))}
                    >
                      <img src={style.image} alt="" aria-hidden="true" />
                      <span className="styleChoiceShade" />
                      <span className="styleChoiceCopy">
                        <strong>{style.name}</strong>
                        <small>{style.note}</small>
                        <small>{active ? 'Selected' : catalogueLoading ? 'Checking availability…' : styleAvailable ? 'Products available' : 'Not available yet'}</small>
                      </span>
                      <i>{active ? '✓' : '+'}</i>
                    </button>
                  );
                })}
              </div>
              {catalogueLoading ? <p aria-live="polite" className="choiceHint">Checking styles against the reviewed furniture collection…</p> : null}
              {catalogueError ? <p className={ui.error} role="alert">{catalogueError} <button className="textButton" type="button" onClick={() => setCatalogueRetry(value => value + 1)}>Try again</button></p> : null}
              {!catalogueLoading && !catalogueError && !catalogueStyles.some(style => style.available) ? (
                <p className={ui.note} role="status">
                  No reviewed furniture matches these filters yet. Increase the budget or remove optional filters.
                  <button className="textButton" type="button" onClick={() => setState(current => ({ ...current, budget: 10000, dislikes: '', measurements: { ...current.measurements, width: '', length: '', height: '' } }))}>Show all reviewed options</button>
                </p>
              ) : null}

              <section className="budgetInline">
                <div className="budgetInlineHeading">
                  <div>
                    <span className="microLabel">Furniture budget</span>
                    <p>How much would you like to spend on new furniture and accessories?</p>
                  </div>
                  <strong>{formatBudget(state.budget)}</strong>
                </div>
                <input
                  type="range"
                  min="750"
                  max="10000"
                  step="250"
                  value={state.budget}
                  onChange={event => setState(current => ({ ...current, budget: Number(event.target.value) }))}
                  aria-label="Maximum furniture and accessories budget"
                />
                <div className="budgetRangeLabels"><span>£750</span><span>£10,000</span></div>
                <div className="budgetPresets">
                  {[1500, 2500, 5000, 7500].map(budget => (
                    <button className={state.budget === budget ? 'isSelected' : ''} key={budget} type="button" onClick={() => setState(current => ({ ...current, budget }))}>{formatBudget(budget)}</button>
                  ))}
                </div>
                <p>Set a guide for the new pieces. Anything you keep is excluded; delivery and design charges are separate.</p>
              </section>

              <div className="styleQuickActions">
                <p><strong>Not sure about style?</strong> It is optional. Your budget choice will be kept if you skip.</p>
                <div>
                  <button className="textButton" type="button" onClick={skipStyle}>Continue without a style →</button>
                  <button className="textButton" type="button" onClick={surpriseMe} disabled={!catalogueStyles.some(option => option.available)}>Surprise me</button>
                </div>
              </div>

              <details className="advancedSettings">
                <summary>
                  <span>Advanced settings</span>
                  <small>Optional · colours, materials, room details and more</small>
                  <i>＋</i>
                </summary>
                <div className="advancedSettingsBody">
                  <section className="advancedGroup">
                    <h2>Colour and materials</h2>
                    <p>Only choose these if you have a clear preference. Your selected style is enough to get started.</p>
                    <div className="preferenceBlock">
                      <span className="microLabel">Colours</span>
                      <div className="colourChoices">
                        {colours.map(item => {
                          const active = state.colours.includes(item.name);
                          return (
                            <button key={item.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState(current => ({ ...current, colours: toggle(current.colours, item.name) }))}>
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
                        {materials.map(item => {
                          const active = state.materials.includes(item.name);
                          return (
                            <button key={item.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState(current => ({ ...current, materials: toggle(current.materials, item.name) }))}>
                              <i className={item.className} />
                              <span>{item.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <section className="advancedGroup">
                    <h2>Things to avoid</h2>
                    <p>Tell us about colours, materials or styles you really do not want.</p>
                    <div className="dislikePrompt">
                      <label htmlFor="dislikes">I would rather not have…</label>
                      <textarea id="dislikes" value={state.dislikes} onChange={event => setState(current => ({ ...current, dislikes: event.target.value }))} placeholder="For example: grey velvet, glass tables or very low sofas…" rows={3} />
                    </div>
                  </section>

                  <section className="advancedGroup">
                    <h2>How you use the room</h2>
                    <p>Choose anything that changes how the space needs to work.</p>
                    <div className="lifestyleGrid">
                      {uses.map(item => {
                        const active = state.uses.includes(item.name);
                        return (
                          <button key={item.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState(current => ({ ...current, uses: toggle(current.uses, item.name) }))}>
                            <span className="lifestyleCheck">{active ? '✓' : '+'}</span>
                            <strong>{item.name}</strong>
                            <p>{item.detail}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="advancedGroup">
                    <h2>Room measurements</h2>
                    <p>Completely optional. Skip this if you do not have the measurements to hand. We never guess dimensions from a photograph.</p>
                    <label className={ui.field}>Measurement accuracy
                      <select value={state.measurements.accuracy || 'unknown'} onChange={event => setState(current => ({ ...current, measurements: { ...current.measurements, accuracy: event.target.value as 'measured' | 'approximate' | 'unknown' } }))}>
                        <option value="unknown">Not measured / not sure</option>
                        <option value="approximate">Approximate estimates</option>
                        <option value="measured">Measured by me</option>
                      </select>
                    </label>
                    <div className="measurementGrid">
                      <MeasurementField label="Room width" value={state.measurements.width} onChange={value => setState(current => ({ ...current, measurements: { ...current.measurements, width: value } }))} />
                      <MeasurementField label="Room length" value={state.measurements.length} onChange={value => setState(current => ({ ...current, measurements: { ...current.measurements, length: value } }))} />
                      <MeasurementField label="Ceiling height" value={state.measurements.height} onChange={value => setState(current => ({ ...current, measurements: { ...current.measurements, height: value } }))} />
                    </div>
                    <label className="measurementNotes">
                      <span>Anything else we should know? (optional)</span>
                      <textarea rows={3} value={state.measurements.notes} onChange={event => setState(current => ({ ...current, measurements: { ...current.measurements, notes: event.target.value } }))} placeholder="Door and window positions, radiators, narrow access or maximum furniture width…" />
                    </label>
                    {!validMeasurements ? <p role="status" className={ui.error}>One or more measurements look incorrect. You can correct or clear them, but they are optional and will not stop you continuing.</p> : null}
                    <div className="measurementReassurance"><span>Optional</span><p>Fit is not guaranteed, even when dimensions are supplied. Always check product sizes and access before buying.</p></div>
                  </section>

                  {photoUrl ? (
                    <section className="advancedGroup">
                      <RetainedFurniture photoUrl={photoUrl} items={state.retainedFurniture || []} onChange={items => setState(current => ({ ...current, retainedFurniture: items }))} />
                    </section>
                  ) : null}

                  <section className="advancedGroup">
                    <h2>Design approach</h2>
                    <p>Leave this on Designer balance if you are happy for us to interpret your preferences.</p>
                    <div className="freedomGrid">
                      {freedomOptions.map(option => {
                        const active = state.freedom === option.name;
                        return (
                          <button key={option.name} type="button" className={active ? 'isSelected' : ''} aria-pressed={active} onClick={() => setState(current => ({ ...current, freedom: option.name }))}>
                            <span>{active ? 'Selected' : option.name}</span>
                            <strong>{option.title}</strong>
                            <p>{option.copy}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </details>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepIntro eyebrow="03 / 03 · Furniture" title="What should stay, and what should change?" copy="Keep the pieces you already own, then choose the furniture you would like us to find for your room." time="About 30 seconds" />

              <section className="keepSection">
                <div className="choiceSectionHeading">
                  <div><h2>Keep</h2><p>Select anything you want the design to work around.</p></div>
                  <span>Optional</span>
                </div>
                <ChoiceGrid
                  items={keepItems}
                  selected={state.keep}
                  onChange={value => setState(current => ({ ...current, keep: toggle(current.keep, value), change: current.change.filter(item => item !== value) }))}
                />
              </section>

              <section className="changeSection">
                <div className="choiceSectionHeading">
                  <div><h2>Replace or add</h2><p>We have preselected a useful starting collection. Change it to suit your plans.</p></div>
                  <span>Optional</span>
                </div>
                <div className="choiceHint">
                  <span className="microLabel">Suggested for your {roomName}</span>
                  <p>{catalogueLoading ? 'Checking suggestions…' : recommendedItems.length ? recommendedItems.join(' · ') : 'No suggested item types match these filters yet.'}</p>
                </div>
                {catalogueLoading ? <p aria-live="polite" className="choiceHint">Checking reviewed furniture…</p> : null}
                {catalogueError ? <p className={ui.error} role="alert">{catalogueError} <button className="textButton" type="button" onClick={() => setCatalogueRetry(value => value + 1)}>Try again</button></p> : null}
                {!catalogueLoading && !catalogueError && availableItemChoices.length ? (
                  <ChoiceGrid
                    items={availableItemChoices.filter(item => !state.keep.includes(item.label)).map(item => item.label)}
                    selected={state.change}
                    onChange={value => { setUnavailableLabels([]); setState(current => ({ ...current, change: toggle(current.change, value) })); }}
                  />
                ) : !catalogueLoading && !catalogueError ? (
                  <p className="choiceHint">There are no reviewed furniture types matching this combination yet. Go back to adjust your style or budget.</p>
                ) : null}
                {!catalogueLoading && !catalogueError && noMatchItems.length ? (
                  <p className="choiceHint" role="status">
                    No reviewed item matches: {noMatchItems.join(' · ')}.{' '}
                    <button className="textButton" type="button" onClick={() => setState(current => ({ ...current, styles: [], budget: 10000, dislikes: '', measurements: { ...current.measurements, width: '', length: '', height: '' } }))}>Show all reviewed options</button>
                  </p>
                ) : null}
                {!catalogueLoading && !catalogueError && comingSoonItems.length ? <p className="choiceHint">Not in the reviewed catalogue yet: {comingSoonItems.join(' · ')}.</p> : null}
                <div className="furnitureQuickActions">
                  {availableRecommendedItems.length ? (
                    <button className="selectAllButton" type="button" onClick={useSuggestedItems}>Use suggested items</button>
                  ) : null}
                  <button className="textButton" type="button" onClick={letDesignerChoose}>Let the designer choose →</button>
                </div>
              </section>
              {unavailableLabels.length ? <p className={ui.note} role="status">{unavailableLabels.join(', ')} {unavailableLabels.length === 1 ? 'is' : 'are'} no longer available with the current style, budget or room details. <button className="textButton" type="button" onClick={() => setStep(1)}>Review style and budget</button></p> : null}
              {state.roomType === 'bedroom' ? <p className={ui.note}>Bedroom product selection and image generation are not available yet.</p> : null}
            </>
          ) : null}

          <div className="intakeNav">
            <button className="textButton" type="button" onClick={back} disabled={step === 0}>← Back</button>
            <span>Step {step + 1} of 3</span>
            <button className="button buttonPrimary" type="button" onClick={next} disabled={!canContinue}>
              {step === 0 ? 'Choose your style' : step === 1 ? (state.styles.length ? 'Choose furniture' : 'Continue without a style') : 'Review my room'}
            </button>
          </div>
        </section>

        </div>
      )}
      <JourneyAssistant
        visible={Boolean(roomAssetId)}
        currentStep={complete ? 4 : step + 1}
        nextTitle={complete ? 'Review your design direction' : step === 0 ? 'Choose your style' : step === 1 ? 'Choose your furniture direction' : 'Review your room'}
        nextDescription={complete
          ? 'Your room choices are saved. Next, we will turn them into an editable design brief.'
          : step === 0
            ? 'Your room photograph is the starting point. Continue when it has been saved.'
            : step === 1
              ? state.styles.length ? 'We will use your ' + state.styles[0] + ' direction and budget to guide the furniture collection.' : 'A style is optional. Continue with your budget and we will create a balanced direction.'
              : 'Your room, style and furniture preferences are ready to review.'}
        nextLabel={complete ? 'Review my design brief' : step === 0 ? 'Continue to style' : step === 1 ? 'Continue to furniture' : 'Review my room'}
        nextHref={complete ? '/brief' : undefined}
        onNext={complete ? undefined : next}
        nextDisabled={!complete && !canContinue}
        ownerKey={ownerKey}
        onStageClick={(stage) => {
          if (complete && stage === 3) {
            setComplete(false);
            setStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            goToStep(stage - 1);
          }
        }}
      />
    </div>
  );
}

function StepIntro({ eyebrow, title, copy, time }: { eyebrow: string; title: string; copy: string; time: string }) {
  return (
    <div className="intakeIntro">
      <div className="intakeIntroMeta">
        <p className="eyebrow">{eyebrow}</p>
        <span className="stepTime">{time}</span>
      </div>
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
