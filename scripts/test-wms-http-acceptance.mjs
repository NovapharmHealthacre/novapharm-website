// Isolated synthetic HTTP acceptance: actual Next gateway, cookie sessions, CSRF and WMS database.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {join,resolve} from 'node:path';
const root=mkdtempSync(join(tmpdir(),'novapharm-wms-http-'));
const origin='http://127.0.0.1:4303',api='http://127.0.0.1:4178';
const env={...process.env,PORTAL_VALIDATION_ORIGIN:origin,WMS_COMMERCE_DRAFTS_ENABLED:'true',WMS_COMMERCE_EDITOR_ALLOWLIST:'Vishal',WMS_COMMERCE_PRICE_PUBLISH_ENABLED:'false',WMS_COMMERCE_PRICE_PUBLISH_SCOPE:'disabled'};
const awsAcceptance=process.env.WMS_HTTP_AWS_ACCEPTANCE==='true';
const awsSku=process.env.WMS_HTTP_FIXTURE_SKU;
if(awsAcceptance){
 assert.match(awsSku??'',/^NP-CP-000000[0-9]{7}$/);
 assert.match(env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI??'',/^\/v2\/credentials\/[a-f0-9-]{36}$/i);
 env.WMS_COMMERCE_PRICE_PUBLISH_ENABLED='true';env.WMS_COMMERCE_PRICE_PUBLISH_SCOPE='aws-isolated-staging';env.WMS_COMMERCE_DATA_MODE='synthetic';
}else{delete env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;delete env.WMS_COMMERCE_DATA_MODE;}
delete env.PORTAL_BASE_URL;delete env.AWS_CONTAINER_CREDENTIALS_FULL_URI;
let portal;
function run(script){
 const r=spawnSync(process.execPath,[resolve('scripts',script),root],{env,stdio:['ignore','pipe','pipe'],encoding:'utf8'});
 if(r.status!==0)throw Error(script+' failed: '+String(r.stderr||r.stdout).slice(-1800));
}
function session(){
 const cookies=new Map();let csrf;
 async function call(path,method='GET',body,token=true){
  const headers={'accept':'application/json','origin':origin};
  if(cookies.size)headers.cookie=[...cookies].map(([k,v])=>k+'='+v).join('; ');
  if(method==='POST'){headers['content-type']='application/json';if(token&&csrf)headers['x-csrf-token']=csrf;}
  const r=await fetch(origin+'/gateway/'+path,{method,headers,body:method==='POST'?JSON.stringify(body??{}):undefined,redirect:'manual',signal:AbortSignal.timeout(20000)});
  for(const raw of r.headers.getSetCookie()){const pair=raw.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}
  const payload=await r.json().catch(()=>({}));
  return {status:r.status,payload};
 }
 return {call,async login(credentials,accessType){const c=await call('security/csrf');assert.equal(c.status,200);csrf=c.payload.csrfToken;assert(csrf);const a=await call('auth/login','POST',{...credentials,accessType});assert.equal(a.status,200,'synthetic role login');assert.equal(a.payload.accessType,accessType);}};
}
try{
 run('start-browser-validation.mjs');
 const credentials=JSON.parse(readFileSync(join(root,'credentials.json'),'utf8'));
 const cwd=resolve('apps/portal/.next/standalone/apps/portal');
 portal=spawn(process.execPath,['server.js'],{cwd,env:{...env,HOSTNAME:'127.0.0.1',PORT:'4303',INTERNAL_API_ORIGIN:api,PUBLIC_API_ORIGIN:api,PORTAL_ORIGIN:origin,PORTAL_VALIDATION_MODE:'true',NEXT_PUBLIC_ENTRA_LOGIN_ENABLED:'false'},stdio:'ignore'});
 let ready=false;
 for(let i=0;i<60;i++){try{ready=(await fetch(origin+'/healthz/',{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}
 assert(ready,'portal gateway not ready');
 const path='enterprise/wms/commerce-products';
 const anonymous=session(),employee=session(),customer=session();
 assert.equal((await anonymous.call(path)).status,401);
 await employee.login(credentials,'employee');await customer.login(credentials,'customer');
 assert.equal((await customer.call(path)).status,403);
 const list=await employee.call(path);assert.equal(list.status,200);assert.equal(list.payload.total,787);assert.equal(list.payload.canEdit,true);assert.equal(list.payload.pricePublicationEnabled,awsAcceptance);
 const product={sku:'NP-NEW-HTTP-FIXTURE',supplier:'s1',name:'Synthetic HTTP product NOT FOR SALE',brand:'Fixture',pack:'1 fixture unit',gtin:null,grossPriceMinor:2400,vatBasisPoints:2000,proposedQuantity:10,websiteVisible:false,expectedRevision:0};
 assert.equal((await employee.call(path,'POST',product,false)).status,403);
 assert.equal((await customer.call(path,'POST',product)).status,403);
 const saved=await employee.call(path,'POST',product);assert.equal(saved.status,200);assert.equal(saved.payload.status,'draft_saved');assert.equal(saved.payload.draft.revision,1);
 const revised=await employee.call(path,'POST',{...product,grossPriceMinor:3000,expectedRevision:1});assert.equal(revised.status,200);assert.equal(revised.payload.draft.revision,2);
 assert.equal((await employee.call(path,'POST',{...product,expectedRevision:1})).status,409);
 const read=await employee.call(path+'?q='+product.sku);assert.equal(read.status,200);assert.equal(read.payload.matching,1);assert.equal(read.payload.records[0].draft.grossPriceMinor,3000);assert.equal(read.payload.records[0].checkoutStatus,'unverified_runtime');
 assert.equal((await employee.call('enterprise/wms/commerce-price-preview','POST',{sku:'NP-CP-5010058089785',revision:1})).status,403);
 if(awsAcceptance){
  // Explicitly seed a synthetic approved-price draft, not a saleable catalogue record.
  // New-draft creation and revision were independently exercised through the HTTP API above.
  const db=new DatabaseSync(join(root,'visual-validation.sqlite'));
  try{
   const draft={sku:awsSku,supplier:'connective',gtin:awsSku.slice(6),name:'Synthetic HTTP acceptance fixture NOT FOR SALE',brand:'Fixture',pack:'1 fixture unit',grossPriceMinor:1200,vatBasisPoints:2000,proposedQuantity:10,websiteVisible:false};
   db.prepare('INSERT INTO wms_commerce_drafts(sku,revision,draft_json,updated_by,updated_at,gtin) VALUES(?,?,?,?,?,?)').run(awsSku,1,JSON.stringify(draft),'synthetic-http-fixture',new Date().toISOString(),draft.gtin);
  }finally{db.close();}
  const previewPath='enterprise/wms/commerce-price-preview',publishPath='enterprise/wms/commerce-price-publish';
  assert.equal((await customer.call(previewPath,'POST',{sku:awsSku,revision:1})).status,403);
  assert.equal((await employee.call(previewPath,'POST',{sku:awsSku,revision:2})).status,409);
  const preview=await employee.call(previewPath,'POST',{sku:awsSku,revision:1});
  assert.equal(preview.status,200);assert.equal(preview.payload.currentGrossMinor,600);assert.equal(preview.payload.proposedGrossMinor,1200);
  const request={sku:awsSku,revision:1,expectedHash:preview.payload.expectedHash};
  assert.equal((await employee.call(publishPath,'POST',request,false)).status,403);
  assert.equal((await customer.call(publishPath,'POST',request)).status,403);
  const published=await employee.call(publishPath,'POST',request);
  assert.equal(published.status,200);assert.equal(published.payload.status,'ledger_revision_confirmed');assert.equal(published.payload.currentGrossMinor,1200);
  assert.equal(published.payload.websiteVerified,false);assert.equal(published.payload.stripeVerified,false);
  const replay=await employee.call(publishPath,'POST',request);assert.equal(replay.status,200);assert.deepEqual(replay.payload,published.payload);
  console.log(JSON.stringify({status:'wms_http_aws_acceptance_passed',sku:awsSku,previousGrossMinor:600,publishedGrossMinor:1200,employeeLogin:true,customerDenied:true,csrfDenied:true,staleDenied:true,duplicateReceiptMatched:true,websiteVerified:false,stripeVerified:false}));
 }else{
  console.log(JSON.stringify({status:'wms_http_acceptance_passed',catalogueReferences:787,employeeLogin:true,anonymousDenied:true,customerDenied:true,csrfDenied:true,revision:2,staleDenied:true,publicationDisabled:true}));
 }
}finally{
 if(portal)portal.kill('SIGTERM');
 try{run('stop-browser-validation.mjs');}finally{rmSync(root,{recursive:true,force:true});}
}
