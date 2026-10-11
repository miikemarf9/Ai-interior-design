// Synthetic fixtures only: no database, provider, or retailer calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),old=Module._load;
const id='550e8400-e29b-41d4-a716-446655440000',gen='550e8400-e29b-41d4-a716-446655440001',asset='550e8400-e29b-41d4-a716-446655440002';
const selected={productId:'p',variantId:'v',offer:{id:'o'},image:{url:'https://example.invalid/approved'}};
const selection={version:2,products:[{selected,alternatives:[]}]};let rows=[{metadata:{snapshot:{selection}}}],updates=0;
Module._load=function(name,parent,main){
 if(name==='next/server')return {NextResponse:{json:(data,options={})=>({data,status:options.status||200})}};
 if(name==='@/lib/auth')return {getCurrentAccount:async()=>null};
 if(name==='@/lib/catalog/clearance')return {currentClearances:()=>[{productId:'p',variantId:'v',offerId:'o',imageUrl:selected.image.url}]};
 if(name==='@/lib/catalog/neon')return {getCatalogDb:()=>({query:async(sql,values)=>{if(sql.startsWith('select')){assert(sql.includes('d.owner_key=$3'));assert(sql.includes('g.result_asset_id=$4'));assert.equal(values[2],'synthetic-owner-key-123456');return rows;}updates++;assert(sql.includes('jsonb_set'));return [];}})};
 if(name.startsWith('@/'))name=path.join(root,name.slice(2));return old.call(this,name,parent,main);
};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);
const {validHotspots,checkedHotspots}=require('../lib/room-hotspots.ts');const {clearedImageSelection}=require('../lib/room-exploration-server.ts');
const items=[{variantId:'v',visibility:'visible',x:25,y:66}];
assert(validHotspots(items,selection));for(const bad of [[],[...items,...items],[{...items[0],x:NaN}],[{...items[0],x:-1}],[{...items[0],y:101}],[{...items[0],variantId:'other'}],[{...items[0],visibility:'hidden'}]])assert(!validHotspots(bad,selection));
assert(validHotspots([{variantId:'v',visibility:'missing'}],selection));assert(validHotspots([{variantId:'v',visibility:'uncertain'}],selection));
const record={generationId:gen,resultAssetId:asset,reviewedAt:new Date().toISOString(),items};assert.equal(checkedHotspots(record,gen,asset,selection).length,1);assert.deepEqual(checkedHotspots(record,'other',asset,selection),[]);assert.deepEqual(checkedHotspots(record,gen,'other',selection),[]);assert.deepEqual(checkedHotspots(undefined,gen,asset,selection),[]);
assert(clearedImageSelection({snapshot:{selection}}));assert.equal(clearedImageSelection({}),null);assert.equal(clearedImageSelection({snapshot:{selection:{...selection,products:[{selected:{...selected,image:{url:'https://example.invalid/unapproved'}},alternatives:[]}]}}}),null);
(async()=>{const {POST}=require('../app/api/designs/hotspots/route.ts');const body={designId:id,generationId:gen,resultAssetId:asset,ownerKey:'synthetic-owner-key-123456',confirmed:true,items};let response=await POST({json:async()=>body});assert.equal(response.status,200);assert.equal(updates,1);response=await POST({json:async()=>({...body,confirmed:false})});assert.equal(response.status,400);assert.equal(updates,1);rows=[];response=await POST({json:async()=>body});assert.equal(response.status,404);assert.equal(updates,1);console.log('PASS: image-specific binding, missing/hidden omission, bounds, duplicate/foreign IDs, cleared immutable references, explicit review and owner-scoped saves.');})().catch(e=>{console.error(e);process.exitCode=1});
