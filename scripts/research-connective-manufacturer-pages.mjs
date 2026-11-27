/**
 * Public manufacturer-page research for the 395 Connective references.
 * A source scrape is NEVER an online-sale approval or payment authorization.
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from 'parse5';

const allowed = ['vitabiotics.com','sebamed.co.uk','floradix.co.uk','salus-haus.com',
  'haliborange.com','vicks.co.uk','lansinoh.co.uk','centrum.co.uk','sambucol.co.uk',
  'bioglan.com','valupak.co.uk','seven-seas.com','skin-doctors.com','healthbiotics.com'];
const keep = value => String(value ?? '').replace(/\s+/g,' ').trim().slice(0,4000);
export function safeManufacturer(raw) {
  if (typeof raw !== 'string' || raw.length > 1800) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password || u.port ||
      !allowed.some(h => u.hostname === h || u.hostname.endsWith('.'+h))) return null;
    if (u.pathname.length > 500) return null;
    return u;
  } catch { return null; }
}
function txt(node) {
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(txt).join(' ');
}
export function extractPublicCandidate(html) {
  assert(typeof html === 'string' && html.length < 3_000_000);
  const blocks = [];
  function visit(node) {
    const tag = node.tagName ?? '';
    if (['script','style','svg','noscript'].includes(tag)) return;
    if (/^h[1-6]$/.test(tag) || ['p','li','td','dd'].includes(tag)) {
      const value = keep(txt(node));
      if (value && value.length > 2) blocks.push({kind: /^h[1-6]$/.test(tag)?'heading':'text', value});
    }
    for (const child of node.childNodes ?? []) visit(child);
  }
  visit(parse(html));
  function section(pattern) {
    const candidates=[];
    for(let i=0;i<blocks.length;i++){
      if(blocks[i].kind!=='heading' || !pattern.test(blocks[i].value)) continue;
      const values=[];
      for(let j=i+1;j<blocks.length && j<i+15;j++){
        if(blocks[j].kind==='heading') break;
        const v=blocks[j].value;
        if(v.length > 8 && !values.includes(v)) values.push(v);
        if(values.join(' ').length > 3300) break;
      }
      if(values.length) candidates.push(values.join(' ').slice(0,3500));
    }
    return candidates.sort((a,b)=>b.length-a.length)[0]??null;
  }
  const ingredients=section(/^(?:full |active )?ingredients(?: list)?$/i);
  const directions=section(/^(?:directions(?: for use)?|how to use|usage(?: instructions)?)$/i);
  const warnings=section(/^(?:warnings?|precautions?|allerg(?:en|y) advice|important information|cautions?)$/i);
  const caution=blocks.filter(x=>x.kind==='text' &&
    /(allerg|food supplement|do not exceed|not suitable|consult your doctor|avoid the eye|irritation|discontinue use|made in a site|store below)/i.test(x.value))
    .map(x=>x.value).filter(x=>x.length>=20).slice(0,12);
  const title=blocks.find(x=>x.kind==='heading' && x.value.length<180)?.value??null;
  return {title,ingredients,directions,warnings:warnings??(caution.join(' ').slice(0,3500)||null),
    cautionExtracts:caution.length,hasProductInformation:!!(ingredients&&directions&&(warnings||caution.length))};
}
function packMatch(supplierPack, manufacturerTitle) {
  const read = s => {
    const m=String(s??'').toLowerCase().replace(/\s/g,'').match(/(\d+(?:\.\d+)?)(ml|l|g|kg|tablets?|capsules?|tabs?)/);
    if(!m)return null;
    const unit={l:'ml',kg:'g',tablet:'tablet',tablets:'tablet',tab:'tablet',tabs:'tablet',
      capsule:'capsule',capsules:'capsule'}[m[2]]??m[2];
    const n=Number(m[1])*(m[2]==='l'||m[2]==='kg'?1000:1);
    return [n,unit].join(':');
  };
  const a=read(supplierPack),b=read(manufacturerTitle);
  return a&&b?(a===b?'MATCH':'CONFLICT'):'UNCONFIRMED';
}
export function assessRecord(row, parsed, url, httpStatus) {
  if(row.classificationReview==='medicine_class_review')
    return {gtin:row.ean,review:'REGULATED_HOLD',source:url??null,reason:'Medicines-selling review required'};
  if(!url)return {gtin:row.ean,review:'MANUFACTURER_LINK_MISSING_OR_NOT_ALLOWLISTED',source:null};
  if(httpStatus!==200 || !parsed)return {gtin:row.ean,review:'SOURCE_UNAVAILABLE',source:url,httpStatus};
  const variant=packMatch(row.pack,parsed.title);
  return {gtin:row.ean,name:row.name,brand:row.brand,supplierPack:row.pack,
    source:url,httpStatus,manufacturerTitle:parsed.title,packAssessment:variant,
    ingredientsCandidate:parsed.ingredients,directionsCandidate:parsed.directions,
    warningsCandidate:parsed.warnings,cautionExtracts:parsed.cautionExtracts,
    review:variant==='CONFLICT'?'PACK_MISMATCH_HOLD':parsed.hasProductInformation?'HUMAN_LABEL_REVIEW_REQUIRED':'INCOMPLETE_MANUFACTURER_INFORMATION',
    gtinValidatedOnManufacturerPage:false,physicalPackInspected:false,
    publicationApproved:false,customerPaymentOfferAdmitted:false};
}
async function fetchManufacturer(url) {
  let target=url;
  for(let redirects=0;redirects<3;redirects++){
    const resp=await fetch(target,{redirect:'manual',headers:{'accept':'text/html','user-agent':'NovaPharm-ProductInfo-Review/1.0'},signal:AbortSignal.timeout(14000)});
    if([301,302,303,307,308].includes(resp.status)){
      const loc=resp.headers.get('location');
      const next=loc?safeManufacturer(new URL(loc,target).href):null;
      if(!next)throw Error('Redirect outside manufacturer host allowlist');
      target=next.href;continue;
    }
    if(!resp.ok) return {status:resp.status,parsed:null};
    const type=resp.headers.get('content-type')??'';
    if(!type.includes('text/html'))throw Error('Not an HTML source');
    const len=Number(resp.headers.get('content-length')??0);
    if(len>2_800_000)throw Error('HTML exceeds size limit');
    const html=await resp.text();
    return {status:resp.status,parsed:extractPublicCandidate(html)};
  }
  throw Error('Too many redirects');
}
export async function research(source, request=fetchManufacturer) {
  assert(source.schema==='novapharm-connective-source-references-v1');
  assert(source.products.length===395);
  const rows=[];
  for(const row of source.products){
    const u=safeManufacturer(row.manufacturerProductUrl);
    if(row.classificationReview==='medicine_class_review' || !u){
      rows.push(assessRecord(row,null,u?.href??null,null));continue;
    }
    try{
      const r=await request(u.href);
      rows.push(assessRecord(row,r.parsed,u.href,r.status));
    }catch(e){
      rows.push({gtin:row.ean,review:'SOURCE_FETCH_FAILED',source:u.href,
        error:String(e.message??e).slice(0,180),publicationApproved:false,customerPaymentOfferAdmitted:false});
    }
  }
  assert(rows.length===395 && new Set(rows.map(x=>x.gtin)).size===395);
  return {schema:'novapharm.connective.manufacturer-research-candidates.v1',
    status:'RESEARCH_ONLY_NOT_PUBLICATION_OR_PAYMENT_APPROVAL',createdAtUtc:new Date().toISOString(),
    total:395,summary:rows.reduce((a,x)=>(a[x.review]=(a[x.review]??0)+1,a),{}),
    products:rows};
}
async function main(){
  const out=(process.argv.find(x=>x.startsWith('--output='))??'--output=research/connective-official-label-candidates.json').split('=').slice(1).join('=');
  const source=JSON.parse(readFileSync('src/content/connective-source-references.json','utf8'));
  const result=await research(source);
  mkdirSync(dirname(resolve(out)),{recursive:true});
  writeFileSync(resolve(out),JSON.stringify(result,null,2)+'\n');
  process.stdout.write(JSON.stringify({output:out,summary:result.summary,total:result.total})+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1});
