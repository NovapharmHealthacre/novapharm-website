// Isolated synthetic HTTP acceptance: actual Next gateway, cookie sessions, CSRF and WMS database.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const root=mkdtempSync(join(tmpdir(),'novapharm-wms-http-'));
const origin='http://127.0.0.1:4303',api='http://127.0.0.1:4178';
const env={...process.env,PORTAL_VALIDATION_ORIGIN:origin,WMS_COMMERCE_DRAFTS_ENABLED:'true',WMS_COMMERCE_EDITOR_ALLOWLIST:'Vishal',WMS_COMMERCE_PRICE_PUBLISH_ENABLED:'false',WMS_COMMERCE_PRICE_PUBLISH_SCOPE:'disabled'};
delete env.PORTAL_BASE_URL;delete env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;delete env.AWS_CONTAINER_CREDENTIALS_FULL_URI;
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
 const list=await employee.call(path);assert.equal(list.status,200);assert.equal(list.payload.total,787);assert.equal(list.payload.canEdit,true);assert.equal(list.payload.pricePublicationEnabled,false);
 const product={sku:'NP-NEW-HTTP-FIXTURE',supplier:'s1',name:'Synthetic HTTP product NOT FOR SALE',brand:'Fixture',pack:'1 fixture unit',gtin:null,grossPriceMinor:2400,vatBasisPoints:2000,proposedQuantity:10,websiteVisible:false,expectedRevision:0};
 assert.equal((await employee.call(path,'POST',product,false)).status,403);
 assert.equal((await customer.call(path,'POST',product)).status,403);
 const saved=await employee.call(path,'POST',product);assert.equal(saved.status,200);assert.equal(saved.payload.status,'draft_saved');assert.equal(saved.payload.draft.revision,1);
 const revised=await employee.call(path,'POST',{...product,grossPriceMinor:3000,expectedRevision:1});assert.equal(revised.status,200);assert.equal(revised.payload.draft.revision,2);
 assert.equal((await employee.call(path,'POST',{...product,expectedRevision:1})).status,409);
 const read=await employee.call(path+'?q='+product.sku);assert.equal(read.status,200);assert.equal(read.payload.matching,1);assert.equal(read.payload.records[0].draft.grossPriceMinor,3000);assert.equal(read.payload.records[0].checkoutStatus,'unverified_runtime');
 assert.equal((await employee.call('enterprise/wms/commerce-price-preview','POST',{sku:'NP-CP-5010058089785',revision:1})).status,403);
 console.log(JSON.stringify({status:'wms_http_acceptance_passed',catalogueReferences:787,employeeLogin:true,anonymousDenied:true,customerDenied:true,csrfDenied:true,revision:2,staleDenied:true,publicationDisabled:true}));
}finally{
 if(portal)portal.kill('SIGTERM');
 try{run('stop-browser-validation.mjs');}finally{rmSync(root,{recursive:true,force:true});}
}
