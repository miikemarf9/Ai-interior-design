// Mocked integration test: no retailer imagery, database or provider calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),original=Module._load;
let collection,prior=null,spendArgs=null,providerBody=null,refunded=false,failProvider=false,failRefund=false,claimed=true;
const designId='550e8400-e29b-41d4-a716-446655440000',parentId='550e8400-e29b-41d4-a716-446655440001';
const room={roomType:'living_room',keep:[],change:['Sofa'],styles:[],colours:[],materials:[],uses:[],dislikes:'',budget:3000,measurements:{width:'',length:'',height:'',notes:''},freedom:'Balanced'};
const brief={keep:'None',direction:'Warm contemporary',budget:'£3000'};
const placements=[{variantId:'sofa',instruction:'Along the left wall'}];
const product={variantId:'sofa',productId:'p',offerId:'offer',quantity:1,name:'Synthetic sofa',variantName:'Cream',brandName:null,categoryName:'Sofa',widthMm:2000,depthMm:900,heightMm:800,imageUrl:'https://example.invalid/sofa'};
const sql={query:async(text,values)=>{
 if(text.includes('a.asset_kind'))return [{design_id:designId,asset_id:'source',mime_type:'image/jpeg',external_url:null,base64:'c291cmNl'}];
 if(text.includes('select g.metadata,a.mime_type'))return prior?[{metadata:prior,mime_type:'image/jpeg',base64:'ZmFpbGVk'}]:[];
 if(text.includes('correctionRequestId')){assert(text.includes("metadata->'humanReview'->>'outcome'='needs_correction'"));return claimed?[{id:parentId}]:[];}
 if(text.includes('set\n       intake='))return [{id:designId}];
 if(text.includes('with asset as'))return [{asset_id:'result'}];
 throw Error('Unexpected SQL: '+text.slice(0,70));
}};
Module._load=function(name,parent,main){
 if(name==='next/server')return {NextResponse:{json:(data,options={})=>({data,status:options.status||200})}};
 if(name==='sharp')return ()=>({metadata:async()=>({width:1600,height:900,format:'jpeg'})});
 if(name==='@/lib/auth')return {getCurrentAccount:async()=>null};
 if(name==='@/lib/catalog/neon')return {getCatalogDb:()=>sql};
 if(name==='@/lib/catalog/clearance')return {currentClearances:()=>[{}]};
 if(name==='@/lib/catalog/repository')return {getLiveSelectionCandidates:async()=>[]};
 if(name==='@/lib/catalog/selection')return {buildProductSelection:()=>collection,applySelectionChoices:s=>s,approvalSnapshot:s=>JSON.stringify(s)};
 if(name==='@/lib/render/products')return {getVerifiedRenderProducts:async()=>[product]};
 if(name==='@/lib/render/credits-server')return {ensureRenderWallet:async()=>({balance:3,verifiedRequired:false}),spendCreditAndCreateGeneration:async args=>{spendArgs=args;return {generation_id:'generation',reused:false,balance:2}},refundFailedGeneration:async()=>{if(failRefund)throw Error('refund unavailable');refunded=true}};
 if(name.startsWith('@/'))name=path.join(root,name.slice(2));return original.call(this,name,parent,main);
};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
process.env.OPENAI_API_KEY='synthetic-test-only';
global.fetch=async(url,options)=>{providerBody=JSON.parse(options.body);return {ok:!failProvider,status:failProvider?500:200,headers:{get:()=> 'synthetic-request'},json:async()=>failProvider?{error:{message:'Synthetic provider failure'}}:{data:[{b64_json:'cmVzdWx0'}],usage:{input_tokens_details:{text_tokens:100,image_tokens:200},output_tokens:300,total_tokens:600}}}};
collection={version:2,products:[{slot:'sofas',quantity:1,selected:{variantId:'sofa'}}]};
const body={ownerKey:'synthetic-owner-key-123456',designId,requestId:parentId,intake:room,brief,selection:collection,placements};
(async()=>{
 const {POST}=require('../app/api/render/route.ts');
 let response=await POST({json:async()=>body});assert.equal(response.status,200);assert.equal(providerBody.size,'1536x864');assert.equal(providerBody.images.length,2);assert.equal(providerBody.images[1].image_url,product.imageUrl);assert.equal(spendArgs.metadata.snapshot.roomAssetId,'source');assert.equal(spendArgs.metadata.correctionAttempt,0);assert.equal(response.data.costUsdMicros,11100);
 prior={...spendArgs.metadata,humanReview:{outcome:'needs_correction'}};
 response=await POST({json:async()=>({...body,parentGenerationId:parentId,correction:'Restore the sofa arm shape.'})});assert.equal(response.status,200);assert.equal(providerBody.images.length,3);assert.equal(spendArgs.metadata.correctionAttempt,1);assert.match(providerBody.prompt,/CONTROLLED CORRECTION/);
 prior.correctionAttempt=2;spendArgs=null;response=await POST({json:async()=>({...body,parentGenerationId:parentId,correction:'Restore the sofa arm shape.'})});assert.equal(response.status,409);assert.equal(spendArgs,null);
 prior.correctionAttempt=0;prior.humanReview.outcome='visually_reviewed';response=await POST({json:async()=>({...body,parentGenerationId:parentId,correction:'Restore the sofa arm shape.'})});assert.equal(response.status,409);assert.equal(spendArgs,null);
 prior.humanReview.outcome='needs_correction';claimed=false;response=await POST({json:async()=>({...body,parentGenerationId:parentId,correction:'Restore the sofa arm shape.'})});assert.equal(response.status,409);assert.equal(spendArgs,null);
 const log=console.error;console.error=()=>{};failProvider=true;response=await POST({json:async()=>body});assert.equal(response.data.code,'RENDER_FAILED_REFUNDED');assert(refunded);failRefund=true;response=await POST({json:async()=>body});assert.equal(response.data.code,'REFUND_UNCONFIRMED');assert(!response.data.error.includes('has been returned'));console.error=log;
 console.log('PASS: mocked generation references and source ratio, immutable input record, usage estimate, correction reference ordering, human-review prerequisite, two-correction cap, duplicate correction claim and honest refund errors.');
})().catch(error=>{console.error(error);process.exitCode=1});
