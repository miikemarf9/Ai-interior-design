// Synthetic catalogue fixtures: no live retailer or database requests.
const assert=require('node:assert/strict'), fs=require('node:fs'), ts=require('typescript'), Module=require('node:module');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,f);
const {exploreCatalogue,eligibleForExplore}=require('../lib/catalog/explore.ts');
const now=Date.now();
const make=i=>({clearedForSelection:true,productId:`p${String(i).padStart(3,'0')}`,variantId:`v${i}`,productName:`Oak table ${i}`,variantName:'Natural',brandName:'Brand',category:'coffee-tables',categoryName:'Coffee tables',styles:['warm-minimal'],materials:['oak'],colours:['brown'],curationScore:90,qualityScore:90,image:{url:'https://example.invalid/image.jpg'},offer:{id:`o${i}`,retailerSlug:'shop',retailerName:'UK Shop',priceMinor:(i+1)*1000,availability:'in_stock',ukDeliveryStatus:'available',lastCheckedAt:new Date(now-1000).toISOString(),productUrl:'https://example.invalid/product'}});
const fixtures=Array.from({length:25},(_,i)=>make(i));
const run=q=>exploreCatalogue(fixtures,new URLSearchParams(q),now);
assert.equal(run('').products.length,10);assert.equal(run('page=2').products.length,10);assert.equal(run('page=3').products.length,5);assert.equal(new Set([...run('').products,...run('page=2').products,...run('page=3').products].map(x=>x.variantId)).size,25);
assert.equal(run('page=999').page,3);assert.equal(run('page=-1').page,1);assert.equal(run('page=NaN').page,1);assert.equal(run('page=1.5').page,1);
assert.equal(run('q=UK+Shop').total,25);assert.equal(run('q=Modern+Organic').total,25);assert.equal(run('category=sofas').total,0);assert.equal(run('min=50&max=100').total,6);assert.equal(run('min=100&max=50').total,0);assert.equal(run('material=oak&colour=brown&retailer=shop&style=warm-minimal').total,25);assert.equal(run('retailer=other').total,0);
assert.equal(run('sort=price-desc').products[0].offer.priceMinor,25000);assert.equal(run('sort=price-asc').products[0].offer.priceMinor,1000);
for(const status of ['preorder','backorder','unknown','out_of_stock'])assert(!eligibleForExplore({...make(1),offer:{...make(1).offer,availability:status}},now));
for(const status of ['collection_only','unavailable','unknown'])assert(!eligibleForExplore({...make(1),offer:{...make(1).offer,ukDeliveryStatus:status}},now));
assert(eligibleForExplore({...make(1),offer:{...make(1).offer,availability:'low_stock',ukDeliveryStatus:'restricted'}},now));
for(const date of [new Date(now-36*3600000).toISOString(),'invalid',new Date(now+1000).toISOString()])assert(!eligibleForExplore({...make(1),offer:{...make(1).offer,lastCheckedAt:date}},now));
assert(!eligibleForExplore({...make(1),clearedForSelection:undefined},now));assert(!eligibleForExplore({...make(1),image:null},now));assert(!eligibleForExplore({...make(1),offer:{...make(1).offer,priceMinor:0}},now));
// The existing repository must continue to enforce active curated GBP UK offers and exact approval IDs.
const repository=fs.readFileSync(require.resolve('../lib/catalog/repository.ts'),'utf8');
for(const clause of ["p.is_curated","p.status = 'active'","v.status = 'active'","r.status = 'active'","r.ships_to_uk","ro.currency = 'GBP'","ro.last_price_checked_at > now() - interval '36 hours'","item.productId === row.product_id && item.variantId === row.variant_id && item.offerId === row.offer_id"])assert(repository.includes(clause),clause);
console.log('PASS: 10-per-page boundaries, complete pagination, stable ordering, filters, retailer/style search, prices, approval/stock/delivery/freshness exclusions and repository eligibility guards.');

// Browse shop links fail closed if approval or stock has changed since page render.
const old=Module._load; let current=[];
Module._load=function(name,parent,main){
 if(name==='next/server')return {NextResponse:{redirect:(url,status)=>({url:String(url),status})}};
 if(name==='@/lib/catalog/repository')return {getLiveSelectionCandidates:async()=>current};
 if(name==='@/lib/catalog/neon')return {getCatalogDb:()=>{throw new Error('Ineligible browse click reached commerce query');}};
 if(name==='@/lib/catalog/explore')return {eligibleForExplore};
 if(name==='@/lib/commerce/awin')return {};
 return old.call(this,name,parent,main);
};
(async()=>{
 const {GET}=require('../app/go/[offerId]/route.ts');
 const offerId='550e8400-e29b-41d4-a716-446655440000';
 const request={url:`https://example.invalid/go/${offerId}?surface=explore_furniture`,headers:new Headers()};
 const result=await GET(request,{params:Promise.resolve({offerId})});
 assert.equal(result.status,302);assert(result.url.includes('/explore-furniture?unavailable=1'));
 current=[{...make(1),offer:{...make(1).offer,id:offerId,availability:'out_of_stock'}}];
 assert((await GET(request,{params:Promise.resolve({offerId})})).url.includes('unavailable=1'));
 console.log('PASS: removed and out-of-stock browse offers cannot redirect to checkout.');
})().catch(e=>{console.error(e);process.exitCode=1});
