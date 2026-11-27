// Read-only bulk evidence discovery. Never alters a catalogue or payment offer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from 'parse5';
import {safeManufacturer,extractPublicCandidate} from './research-connective-manufacturer-pages.mjs';

export function safeSupplier(raw) {
  try {
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.port||
       !['connectivepharma.com','www.connectivepharma.com'].includes(u.hostname)||
       !/^\/en\/product\/\d+(?:\/[^/]+)?\/?$/.test(u.pathname)) return null;
    u.search='';u.hash='';return u;
  } catch{return null;}
}
export function discoverLinks(html,source) {
  const links=new Set();
  function visit(n){
    if(n.tagName==='a'){
      const href=n.attrs?.find(a=>a.name==='href')?.value;
      if(href)try{
        const u=safeManufacturer(new URL(href,source).href);
        if(u && u.pathname!=='/' && !/\/(?:privacy|contact|terms|about|account|cart|collections)(?:\/|$)/i.test(u.pathname)){
          u.hash='';u.search='';links.add(u.href);
        }
      }catch{}
    }
    for(const c of n.childNodes??[])visit(c);
  }
  visit(parse(html));
  return [...links].sort().slice(0,12);
}
export function hasExactGtin(html,gtin){
  assert(/^\d{13}$/.test(gtin));
  return new RegExp('(?:^|[^0-9])'+gtin+'(?:[^0-9]|$)').test(html);
}
async function getPage(raw,validate){
  let u=validate(raw);
  if(!u)throw Error('SOURCE_NOT_ALLOWED');
  for(let i=0;i<3;i++){
    const r=await fetch(u.href,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{accept:'text/html','user-agent':'NovaPharm-ProductInfo-Review/1.0'}});
    if([301,302,303,307,308].includes(r.status)){
      const loc=r.headers.get('location');u=loc?validate(new URL(loc,u).href):null;
      if(!u)throw Error('REDIRECT_NOT_ALLOWED');continue;
    }
    if(!r.ok)throw Error('HTTP_'+r.status);
    if(!r.headers.get('content-type')?.includes('text/html'))throw Error('NOT_HTML');
    if(Number(r.headers.get('content-length')??0)>2800000)throw Error('SIZE_LIMIT');
    const reader=r.body.getReader();let bytes=0;const chunks=[];
    try{
      while(true){const {value,done}=await reader.read();if(done)break;
        bytes+=value.byteLength;if(bytes>2800000)throw Error('SIZE_LIMIT');chunks.push(value);}
    }finally{await reader.cancel();}
    const html=Buffer.concat(chunks).toString('utf8');
    return {url:u.href,html};
  }
  throw Error('REDIRECT_LIMIT');
}
export async function pool(rows,worker,concurrency=4){
  assert(Number.isInteger(concurrency)&&concurrency>=1&&concurrency<=4);
  let next=0;const result=Array(rows.length);
  await Promise.all(Array.from({length:concurrency},async()=>{
    while(next<rows.length){const i=next++;result[i]=await worker(rows[i]);}
  }));
  return result;
}
export async function buildReview(source,manifest,catalogue,request=getPage){
  assert(source.schema==='novapharm-connective-source-references-v1');
  assert(source.products.length===395);
  const ids=new Set(source.products.map(p=>p.ean));
  assert(ids.size===395 && [...ids].every(id=>/^\d{13}$/.test(id)));
  const approved=new Set(manifest.approvedGtins);
  assert(approved.size===manifest.approvedGtins.length);
  const listed=new Set(catalogue.map(p=>p.ean));
  assert(listed.size===catalogue.length && listed.size===approved.size);
  assert([...approved].every(id=>ids.has(id)&&listed.has(id)));
  const records=await pool(source.products,async p=>{
    const base={gtin:p.ean,brand:p.brand,name:p.name,pack:p.pack,
      classification:p.classificationReview,publicationApproved:false,paymentAdmissionAuthorized:false};
    if(p.classificationReview==='medicine_class_review')return {...base,review:'REGULATED_HOLD'};
    if(approved.has(p.ean))return {...base,review:'EXISTING_MANIFEST_APPROVAL',publicationApproved:true};
    let supplier=null;let supplierError=null;let links=[];
    try{
      const supplierLink=safeSupplier(p.supplierProductUrl);
      const officialSupplierLink=safeManufacturer(p.supplierProductUrl);
      const u=supplierLink??officialSupplierLink;
      if(!u)throw Error('SUPPLIER_LINK_INVALID');
      const r=await request(u.href,supplierLink?safeSupplier:safeManufacturer);
      supplier={url:r.url,gtinMentioned:hasExactGtin(r.html,p.ean),...extractPublicCandidate(r.html)};
      links=discoverLinks(r.html,r.url);
    }catch(e){supplierError=String(e.message??e).slice(0,120);}
    const direct=safeManufacturer(p.manufacturerProductUrl)?.href;
    const candidates=[...new Set([direct,...links].filter(Boolean))];
    const official=[];
    // Only follow a supplied direct link or a unique supplier-linked candidate.
    // Multiple discovered links are preserved for review, not assumed equivalent.
    const fetchable=direct?[direct]:(candidates.length===1?candidates:[]);
    for(const u of fetchable){
      try{
        // An official manufacturer URL may also be the supplier reference.
        // Reuse that response rather than fetching the same page twice.
        if(supplier?.url===u){official.push({...supplier});continue;}
        const r=await request(u,safeManufacturer);
        official.push({url:r.url,gtinMentioned:hasExactGtin(r.html,p.ean),...extractPublicCandidate(r.html)});
      }catch(e){official.push({url:u,error:String(e.message??e).slice(0,120)});}
    }
    const complete=official.some(o=>o.hasProductInformation);
    const review=complete?'MANUFACTURER_LABEL_CANDIDATE_REVIEW':
      candidates.length?'MANUFACTURER_LINK_REVIEW':
      supplier?.hasProductInformation?'SUPPLIER_LABEL_CANDIDATE_REVIEW':'MANUFACTURER_DISCOVERY_REQUIRED';
    return {...base,review,supplier,supplierError,manufacturerLinks:candidates,manufacturerCandidates:official,
      exactPackVerified:false,physicalPackInspected:false};
  });
  return {schema:'novapharm.connective.bulk-evidence-review.v1',status:'READ_ONLY_NOT_PAYMENT_APPROVAL',
    total:records.length,manifestApproved:approved.size,
    summary:records.reduce((a,r)=>(a[r.review]=(a[r.review]??0)+1,a),{}),records};
}
async function main(){
  const read=p=>JSON.parse(readFileSync(p,'utf8'));
  const result=await buildReview(read('src/content/connective-source-references.json'),
    read('config/retail/approved-connective-checkout-release-20261126.json'),
    read('src/content/approved-consumer-catalogue.json'));
  const out=process.argv[2]??'research/connective-bulk-evidence-review.json';
  mkdirSync(dirname(resolve(out)),{recursive:true});
  writeFileSync(resolve(out),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({total:result.total,manifestApproved:result.manifestApproved,summary:result.summary}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(e=>{console.error(e);process.exitCode=1});
