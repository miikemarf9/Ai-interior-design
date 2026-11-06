import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { getLiveBrowseCandidates } from '@/lib/catalog/repository';
import { exploreCatalogue, label, styleLabels } from '@/lib/catalog/explore';
import type { SelectionCandidate } from '@/lib/catalog/selection';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'Explore furniture | Transform My Room' },
  description: 'Discover curated furniture from UK retailers. Browse by style, category, colour, material and price.',
  alternates: { canonical: '/explore-furniture' },
};
const money = (minor: number) => new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }).format(minor/100);
const bedroomCollectionDefinitions = [
  {
    tier: 'Value',
    title: 'Warm Oak & Ivory · Value Edit',
    note: 'A light, welcoming bedroom with warm wood finishes and soft neutral upholstery.',
    productIds: ['d252315e-c2d4-4ca6-a470-6b9a1810e309', 'c0d3a09e-5d73-4c6e-83f4-7899fb5842e0', '5ea4223d-a34c-4102-bdc2-5fc5f63e3173', 'af8a193a-e266-4483-8058-9f90645b73fa', '940efcb2-0c93-4f31-8307-6fec8678d030'],
  },
  {
    tier: 'Premium',
    title: 'Warm Oak & Ivory · Premium Edit',
    note: 'A coordinated oak collection with a softly upholstered centrepiece and matching Kingsley storage.',
    productIds: ['30f26c61-b63c-4cc4-8547-5f427d56f931', 'd8c2aab9-76ed-4e61-a34d-55afe0f9f3cb', '5ec1832e-7524-466e-be46-92a574acdac5', '219a3ec4-5716-420f-bf98-0949c7ed5c42', '567ce9e4-2660-43fd-82fb-f336303841bc'],
  },
] as const;

type FeaturedBedroomCollection = {
  tier: string;
  title: string;
  note: string;
  items: SelectionCandidate[];
  totalMinor: number;
};

function featuredBedroomCollections(candidates: SelectionCandidate[]): FeaturedBedroomCollection[] {
  return bedroomCollectionDefinitions.map(collection => {
    const byProduct = new Map(candidates.map(candidate => [candidate.productId, candidate]));
    const items = collection.productIds.map(id => byProduct.get(id)).filter((item): item is SelectionCandidate => Boolean(item));
    return { ...collection, items, totalMinor: items.reduce((total, item) => total + item.offer.priceMinor, 0) };
  }).filter(collection => collection.items.length === collection.productIds.length);
}


export default async function ExploreFurniture({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ['q','category','retailer','style','material','colour','min','max','sort','page']) {
    const value=raw[key]; if (typeof value==='string') params.set(key,value.slice(0,100));
  }
  let catalogue: ReturnType<typeof exploreCatalogue> | null = null;
  let bedroomCollections: FeaturedBedroomCollection[] = [];
  try {
    const candidates = await getLiveBrowseCandidates();
    catalogue = exploreCatalogue(candidates, params);
    bedroomCollections = featuredBedroomCollections(candidates);
  } catch (error) { console.error('Explore furniture catalogue unavailable', error); }
  const pageUrl = (page: number) => { const next=new URLSearchParams(params); next.set('page',String(page)); return '/explore-furniture?'+next.toString()+'#results'; };
  const select = (name: string, title: string, options: string[][]) => <label>{title}<select name={name} defaultValue={params.get(name) || ''}><option value="">All {title.toLowerCase()}</option>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
  return <main>
    <Header />
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Considered pieces. Beautiful possibilities.</p>
      <h1>Explore furniture</h1>
      <p>Find the pieces that feel like you. Browse our curated collection from UK retailers, one thoughtful choice at a time.</p>
      <Link href="/design" className={styles.designLink}>See what’s possible in your room →</Link>
    </section>
    {bedroomCollections.length ? <section className={styles.bedroomSection} aria-labelledby="bedroom-looks-title">
      <div className={styles.bedroomHeading}>
        <p className={styles.eyebrow}>Bedroom styles · Debenhams</p>
        <h2 id="bedroom-looks-title">Warm Oak &amp; Ivory</h2>
        <p>Two complete furniture edits, with the same calm palette at different price points. Each includes a bed frame, bedside cabinets, wardrobe, chest of drawers and dressing table. Mattress is not included.</p>
      </div>
      <div className={styles.bedroomGrid}>
        {bedroomCollections.map(collection => <article className={styles.bedroomCard} key={collection.tier}>
          <header className={styles.bedroomCardHeader}>
            <span>{collection.tier} price point</span>
            <h3>{collection.title}</h3>
            <p>{collection.note}</p>
            <strong>{money(collection.totalMinor)}</strong>
            <small>Current total for five pieces · prices can change</small>
            <Link href={`/design?roomType=bedroom&bedroomCollection=${collection.tier.toLowerCase()}`} className={styles.tryBedroomButton}>See these pieces in your room</Link>
            <small className={styles.tryBedroomNote}>Create a room image with this set</small>
          </header>
          <ul className={styles.bedroomItems}>
            {collection.items.map(item => <li key={item.variantId}>
              <div className={styles.bedroomThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image!.url} alt={item.image!.altText || item.productName} loading="lazy" width={96} height={96} />
              </div>
              <div className={styles.bedroomItemInfo}>
                <small>{item.categoryName}</small>
                <strong>{item.variantName || item.productName}</strong>
                <span>{money(item.offer.priceMinor)} · {item.offer.retailerName}</span>
              </div>
              <a href={`/go/${item.offer.id}?surface=explore_furniture_bedroom_set`} target="_blank" rel="sponsored noopener noreferrer" aria-label={`Shop ${item.variantName || item.productName} at ${item.offer.retailerName}`}>Shop ↗</a>
            </li>)}
          </ul>
        </article>)}
      </div>
    </section> : null}
    <section className={styles.catalogue} aria-label="Furniture catalogue">
      {raw.unavailable === '1' && <p role="status" className={styles.disclosure}>That piece is no longer available to shop. Please choose another from the current collection below.</p>}
      {!catalogue ? <div className={styles.empty}><h2>Our collection is temporarily unavailable.</h2><p>Please try again in a moment.</p><Link href="/explore-furniture" className="button buttonPrimary">Try again</Link></div> : <>
        <form key={params.toString()} action="/explore-furniture" method="get" className={styles.filters}>
          <label className={styles.search}>Search furniture<input type="search" name="q" maxLength={100} defaultValue={params.get('q') || ''} placeholder="Product, style, material or retailer" /></label>
          {select('category','Categories',catalogue.facets.categories)}
          {select('retailer','Retailers',catalogue.facets.retailers)}
          {select('style','Styles',catalogue.facets.styles.map(s=>[s,styleLabels[s] || label(s)]))}
          {select('material','Materials',catalogue.facets.materials.map(s=>[s,label(s)]))}
          {select('colour','Colours',catalogue.facets.colours.map(s=>[s,label(s)]))}
          <label>Minimum price (£)<input type="number" name="min" min="0" step="0.01" defaultValue={params.get('min') || ''} placeholder="No minimum" /></label>
          <label>Maximum price (£)<input type="number" name="max" min="0" step="0.01" defaultValue={params.get('max') || ''} placeholder="No maximum" /></label>
          <label>Sort by<select name="sort" defaultValue={params.get('sort') || ''}><option value="">Our curated picks</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
          <div className={styles.filterActions}><button className="button buttonPrimary" type="submit">Apply filters</button><Link href="/explore-furniture">Clear filters</Link></div>
        </form>
        <div id="results" className={styles.results}><p>{catalogue.total ? `${(catalogue.page-1)*10+1}–${Math.min(catalogue.page*10,catalogue.total)} of ${catalogue.total} pieces` : 'No matching pieces'}</p><p>In stock · UK delivery options</p></div>
        <p className={styles.disclosure}>We may earn a commission from partner links, at no extra cost to you. Prices and availability can change; confirm delivery to your postcode with the retailer.</p>
        {!catalogue.total ? <div className={styles.empty}><h2>A little more room to explore.</h2><p>Try clearing your filters. We only show approved pieces with a recent stock check.</p><Link href="/explore-furniture" className="button buttonPrimary">View all furniture</Link></div> : <div className={styles.grid}>
          {catalogue.products.map(item=><article className={styles.card} key={item.variantId}>
            <div className={styles.photo}>{/* Approved retailer feed images; no illustrative substitutions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image!.url} alt={item.image!.altText || item.productName} loading="lazy" width={600} height={600} />
            </div>
            <div className={styles.cardBody}><p className={styles.eyebrow}>{item.categoryName} · {item.offer.availability==='low_stock' ? 'Low stock' : 'In stock'}</p>
              <h2>{item.variantName || item.productName}</h2>{item.brandName && <p className={styles.variant}>{item.brandName}</p>}
              <p className={styles.price}>{money(item.offer.priceMinor)}</p><p className={styles.retailer}>{item.offer.retailerName}</p>
              <p className={styles.delivery}>{item.offer.ukDeliveryStatus==='restricted' ? 'UK delivery restrictions apply. ' : ''}{item.commercial?.deliveryDetails || 'Confirm delivery options with the retailer.'}</p>
              <a className="button buttonPrimary" href={`/go/${item.offer.id}?surface=explore_furniture`} target="_blank" rel="sponsored noopener noreferrer">Shop at {item.offer.retailerName} ↗</a>
              <details><summary>Product details &amp; delivery</summary><p>{item.productName}</p><p>{item.designSummary}</p><p>{[...item.materials,...item.colours].map(label).join(' · ')}</p><p>{item.styles.map(s=>styleLabels[s] || label(s)).join(' · ')}</p><p>Dimensions (W × D × H): {[item.dimensions.widthMm,item.dimensions.depthMm,item.dimensions.heightMm].map(n=>n ? `${n/10} cm` : 'Not listed').join(' × ')}</p><p>Price &amp; stock checked: {new Date(item.offer.lastCheckedAt).toLocaleDateString('en-GB',{timeZone:'Europe/London'})}. Confirm the final price and delivery at checkout.</p></details>
            </div>
          </article>)}
        </div>}
        {catalogue.total>0 && <nav className={styles.pagination} aria-label="Furniture pages">
          {catalogue.page>1 && <Link href={pageUrl(catalogue.page-1)}>← Previous</Link>}
          {Array.from({length:catalogue.pages},(_,i)=>i+1).filter(p=>p===1 || p===catalogue.pages || Math.abs(p-catalogue.page)<=2).map((p,i,list)=><span key={p}>{i>0 && p-list[i-1]>1 && <span aria-hidden="true">… </span>}<Link href={pageUrl(p)} aria-label={`Page ${p}`} aria-current={p===catalogue.page?'page':undefined}>{p}</Link></span>)}
          {catalogue.page<catalogue.pages && <Link href={pageUrl(catalogue.page+1)}>Next →</Link>}
        </nav>}
      </>}
    </section>
  </main>;
}
