// Synthetic control-flow fixtures only. No paid provider request is made.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),original=Module._load;let dbCalls=0;
Module._load=function(name,parent,main){
 if(name==='next/server')return {NextResponse:{json:(data,options={})=>({data,status:options.status||200})}};
 if(name==='@/lib/catalog/neon')return {getCatalogDb:()=>{dbCalls++;throw Error('Database must not be used for an uncleared pilot')}};
 if(name==='@/lib/auth')return {getCurrentAccount:async()=>null};
 if(name.startsWith('@/'))name=path.join(root,name.slice(2));return original.call(this,name,parent,main);
};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
const {validPlacements,validReview,reviewPassed,pilotSummary}=require('../lib/render/pilot.ts');
const {buildRoomRenderPrompt}=require('../lib/render/prompt.ts');const {calculateImageCost}=require('../lib/render/cost.ts');
const selection={version:2,products:[{selected:{variantId:'sofa'}}]};
const placements=[{variantId:'sofa',instruction:'Along the left wall, clear of the door'}];
assert(validPlacements(placements,selection));assert(!validPlacements([],selection));assert(!validPlacements([{variantId:'wrong',instruction:'Left wall'}],selection));
const review={architecture:'pass',retainedFurniture:'pass',products:[{variantId:'sofa',quantity:'pass',shape:'pass',finish:'pass',placement:'uncertain'}],notes:'Front leg hidden'};
assert(validReview(review,selection));assert(!reviewPassed(review));assert(!validReview({...review,products:[]},selection));assert(!validReview({...review,architecture:'verified'},selection));assert(reviewPassed({...review,products:[{...review.products[0],placement:'pass'}]}));
const room={roomType:'living_room',keep:['Sideboard'],retainedFurniture:[{id:'pin',label:'Sideboard',x:.3,y:.4}],change:['Sofa'],uses:[],dislikes:'',budget:3000,measurements:{width:'400',length:'500',height:'',notes:'Narrow door',accuracy:'approximate'}};
const product={productId:'p',variantId:'sofa',offerId:'offer',quantity:2,name:'Synthetic sofa',variantName:'Cream / exact size',brandName:null,categoryName:'Sofa',widthMm:2000,depthMm:900,heightMm:800,imageUrl:'https://example.invalid/sofa'};
const prompt=buildRoomRenderPrompt(room,{direction:'Warm contemporary',budget:'£3000'},selection,[product],placements,'Restore the sofa arms to the reference shape.');
assert.match(prompt,/Quantity: 2/);assert.match(prompt,/200cm × 90cm × 80cm/);assert.match(prompt,/Along the left wall/);assert.match(prompt,/final reference image \(3\)/);assert.match(prompt,/Reference image 1 remains the source of truth/);assert.match(prompt,/Sideboard/);assert(!prompt.includes('£3000'));assert(!prompt.includes('\\n'));
assert.throws(()=>buildRoomRenderPrompt({...room,roomType:'bedroom'},{},selection,[product],placements),/living-room/);
const usage={input_tokens_details:{text_tokens:100,image_tokens:200},output_tokens:300,total_tokens:600};assert.equal(calculateImageCost(usage).costUsdMicros,11100);assert.equal(calculateImageCost(usage,'unpriced-model').costUsdMicros,null);assert.equal(calculateImageCost(null).costUsdMicros,null);assert.equal(calculateImageCost({...usage,input_tokens_details:{text_tokens:-1,image_tokens:200}}).costUsdMicros,null);
assert.deepEqual(pilotSummary([{cost_usd_micros:12000,duration_ms:1000,metadata:{correctionAttempt:0}},{cost_usd_micros:null,duration_ms:2000,metadata:{correctionAttempt:1}}]),{attempts:2,corrections:1,knownCostUsdMicros:12000,unknownCostAttempts:1,knownDurationMs:3000});
(async()=>{
 const {POST}=require('../app/api/render/route.ts');const response=await POST({json:async()=>({intake:room,selection})});assert.equal(response.status,409);assert.equal(response.data.code,'PILOT_CATALOGUE_NOT_READY');assert.equal(dbCalls,0);
 const {GET}=require('../app/api/render/pilot/route.ts');const history=await GET(new Request('https://roomfound.test/api/render/pilot'));assert.equal(history.data.available,false);assert.deepEqual(history.data.attempts,[]);assert.equal(dbCalls,0);
 console.log('PASS: placement completeness, per-product review, uncertainty, correction reference order, exact variants/quantities, bedroom guard, model-specific cost estimates, unknown costs, attempt totals and fail-closed live-pilot prerequisites.');
})().catch(error=>{console.error(error);process.exitCode=1});
