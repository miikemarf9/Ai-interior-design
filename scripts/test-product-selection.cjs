// Synthetic fixtures only; never imported by the application or published as offers.
// Run: node scripts/test-product-selection.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const original = Module._load;
let suppliedCandidates = [];
Module._load = function(name, parent, main) {
  if (name === 'next/server') return { NextResponse: { json: (data, opts = {}) => ({ data, status: opts.status || 200 }) } };
  if (name === '@/lib/catalog/repository') return { getLiveSelectionCandidates: async () => suppliedCandidates };
  if (name === '@/lib/catalog/neon') return { getCatalogDb: () => { throw Error('Database must not be accessed without clearance'); } };
  if (name.startsWith('@/')) name = path.join(root, name.slice(2));
  return original.call(this, name, parent, main);
};
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file);
const { buildProductSelection, applySelectionChoices, selectionTotals, approvalSnapshot } = require('../lib/catalog/selection.ts');
const { buildFallbackBrief } = require('../lib/brief.ts');
const { currentClearances } = require('../lib/catalog/clearance.ts');
const room = { roomType: 'living_room', projectGoal: 'refresh', keep: [], retainedFurniture: [], change: ['Sofa', 'Coffee table'], styles: ['Contemporary'], colours: ['Cream'], materials: ['Linen'], dislikes: '', uses: [], budget: 3000, measurements: { width: '500', length: '400', height: '', notes: '', accuracy: 'approximate' }, freedom: 'Balanced' };
function candidate(id, category, price, extra = {}) {
 return { clearedForSelection: true, productId: 'product-'+id, variantId: id, productName: 'Synthetic test furniture', variantName: 'Cream / test size', brandName: null, category, categoryName: category, designSummary: null, dimensions: { widthMm: 2000, depthMm: 800, heightMm: 800 }, styles: ['contemporary'], materials: ['linen'], colours: ['cream'], curationScore: 80, qualityScore: 90, commercial: { packSize: 1, unitLabel: 'item', deliveryBasis: 'per_order', deliveryDetails: '' }, offer: { id: 'offer-'+id, retailerName: 'Test only', retailerSlug: 'test-only', priceMinor: price, compareAtPriceMinor: null, availability: 'in_stock', ukDeliveryStatus: 'available', deliveryPriceMinor: 5000, productUrl: 'https://example.invalid/product', affiliateUrl: null, lastCheckedAt: new Date().toISOString() }, image: { url: 'https://example.invalid/photo.png', altText: 'Test fixture' }, ...extra };
}
const sofa = candidate('sofa', 'sofas', 110000), cheaper = candidate('sofa-cheaper', 'sofas', 70000), table = candidate('table', 'coffee-tables', 20000);
const brief = buildFallbackBrief(room);
const pick = (r = room, items = [sofa, cheaper, table]) => buildProductSelection(r, buildFallbackBrief(r), items);
(async()=>{
 assert.equal(currentClearances().length, 0);
 const clearance = { productId:'p',variantId:'v',offerId:'o',imageUrl:'https://example.invalid/image',exactVariantName:'Exact',packSize:1,unitLabel:'item',displayEvidence:'display',aiReferenceEvidence:'ai',customerOutputEvidence:'output',dataEvidence:'data',reviewedAt:'2026-01-01',expiresAt:'2027-01-01',deliveryBasis:'unknown',deliveryDetails:'' };
 assert.equal(currentClearances(Date.parse('2026-10-11'),[clearance]).length,1);
 assert.equal(currentClearances(Date.parse('2026-10-11'),[{...clearance,aiReferenceEvidence:''}]).length,0);
 assert.equal(currentClearances(Date.parse('2027-10-11'),[clearance]).length,0);
 const repository = require('../lib/catalog/repository.ts');
 assert.deepEqual(await repository.getLiveSelectionCandidates(), []);
 assert.equal(pick(room,[{...sofa,clearedForSelection:undefined}]).products.length,0);
 assert.equal(pick(room,[{...sofa,offer:{...sofa.offer,priceMinor:null}}]).products.length,0);
 assert.match(pick(room,[{...sofa,offer:{...sofa.offer,priceMinor:null}}]).notes.join(' '),/missing or invalid prices/);
 assert.equal(pick(room,[{...sofa,offer:{...sofa.offer,lastCheckedAt:'2020-01-01'}}]).products.length,0);
 assert.equal(pick({...room,retainedFurniture:[{id:'pin',label:'Existing sofa',x:.2,y:.8}]}).products.some(p=>p.slot==='sofas'),false);
 assert.equal(pick({...room,change:['Coffee table']}).products.length,1);
 assert.equal(pick({...room,dislikes:'No leather'},[{...sofa,materials:['leather']}]).products.length,0);
 assert.equal(pick(room,[{...sofa,dimensions:{widthMm:6000,depthMm:800,heightMm:800}}]).products.length,0);
 assert.equal(pick({...room,measurements:{...room.measurements,height:'200'}},[{...sofa,dimensions:{widthMm:2000,depthMm:800,heightMm:2200}}]).products.length,0);
 const collection=pick();assert.equal(collection.products.length,2);assert.equal(collection.knownDeliveryMinor,5000);assert.equal(collection.totalMinor,collection.productSubtotalMinor+5000);
 const sofaItem=collection.products.find(p=>p.slot==='sofas');assert(sofaItem.alternatives.length<=3);
 const alternative=sofaItem.alternatives[0];assert(alternative);
 const swapped=applySelectionChoices(structuredClone(collection),[{slot:'sofas',variantId:alternative.candidate.variantId,quantity:2}]);assert.equal(swapped.products.find(p=>p.slot==='sofas').quantity,2);assert.notEqual(approvalSnapshot(collection),approvalSnapshot(swapped));
 assert.throws(()=>applySelectionChoices(structuredClone(collection),[{slot:'sofas',variantId:'unapproved',quantity:1}]));
 assert.throws(()=>applySelectionChoices(structuredClone(collection),[{slot:'sofas',variantId:sofaItem.selected.variantId,quantity:0}]));
 const unknown=structuredClone(collection.products);unknown[0].selected.offer.deliveryPriceMinor=null;assert(selectionTotals(unknown,300000).unknownDelivery);assert.equal(selectionTotals(unknown,300000).knownDeliveryMinor,0);
 const perUnit=structuredClone(collection.products);perUnit.forEach(p=>{p.selected.commercial.deliveryBasis='per_unit';p.quantity=2;});assert.equal(selectionTotals(perUnit,300000).knownDeliveryMinor,20000);
 const pair=structuredClone(collection.products);pair[0].selected.commercial.packSize=2;pair[0].quantity=2;assert.equal(selectionTotals(pair,300000).productSubtotalMinor,pair[0].selected.offer.priceMinor*2+pair[1].selected.offer.priceMinor);
 const {POST}=require('../app/api/products/select/route.ts');
 let result=await POST({json:async()=>({intake:room,brief})});assert.equal(result.status,200);assert.equal(result.data.selection.products.length,0);assert.equal(result.data.approved,false);
 suppliedCandidates=[sofa,cheaper,table];result=await POST({json:async()=>({intake:room,brief})});const initial=result.data.selection;
 const body={intake:room,brief,choices:initial.products.map(p=>({slot:p.slot,variantId:p.selected.variantId,quantity:p.quantity})),approve:true,acknowledgeLimitations:true,expectedSnapshot:approvalSnapshot(initial)};
 result=await POST({json:async()=>body});assert.equal(result.data.approved,true);
 result=await POST({json:async()=>({...body,acknowledgeLimitations:false})});assert.equal(result.data.approved,false);
 suppliedCandidates=suppliedCandidates.map(p=>({...p,offer:{...p.offer,priceMinor:p.offer.priceMinor+100}}));result=await POST({json:async()=>body});assert.equal(result.data.approved,false);assert(result.data.warning);
 const raisedQuantity={...body,choices:body.choices.map(p=>({...p,quantity:10}))};result=await POST({json:async()=>raisedQuantity});assert.equal(result.data.approved,false);
 suppliedCandidates=[];result=await POST({json:async()=>body});assert.equal(result.data.approved,false);assert.equal(result.data.selection.products.length,0);
 const {getVerifiedRenderProducts}=require('../lib/render/products.ts');await assert.rejects(()=>getVerifiedRenderProducts(initial),/not currently cleared/);
 console.log('PASS: clearance and expiry; no database read without clearance; exclusion of unapproved, unpriced, stale and oversized products; retained photo markers; requested scope; swaps; pack quantities; delivery deduplication and uncertainty; approval rechecks; revoked approval blocked before render.');
})().catch(error=>{console.error(error);process.exitCode=1});
