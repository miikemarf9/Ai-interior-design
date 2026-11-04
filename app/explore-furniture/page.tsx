import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { getLiveBrowseCandidates } from '@/lib/catalog/repository';
import { exploreCatalogue, label, styleLabels } from '@/lib/catalog/explore';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { absolute: 'Explore furniture | Transform My Room' },
  description: 'Discover curated furniture from UK retailers. Browse by style, category, colour, material and price.',
  alternates: { canonical: '/explore-furniture' },
};
const money = (minor: number) => new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }).format(minor/100);

export default async function ExploreFurniture({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ['q','category','retailer','style','material','colour','min','max','sort','page']) {
    const value=raw[key]; if (typeof value==='string') params.set(key,value.slice(0,100));
  }
  let catalogue: ReturnType<typeof exploreCatalogue> | null = null;
  try { catalogue=exploreCatalogue(await getLiveBrowseCandidates(), params); }
  catch (error) { console.error('Explore furniture catalogue unavailable', error); }
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
