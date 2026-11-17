/** Offline, bounded, non-publishable source snapshot evidence. No I/O, network, storage or source-rights approval. */
import { createHash } from "node:crypto";
const MAX_BYTES=262144;
const FORMATS=new Set(["application/json","text/csv","application/xml","text/xml","application/ld+json","application/x-ndjson","text/plain"]);
const ID=/^[a-z0-9][a-z0-9._-]{2,119}$/;
const JURISDICTION=/^(GLOBAL|[A-Z]{2}(?:-[A-Z0-9]{2,5})?)$/;
const SHA=/^[a-f0-9]{64}$/;
const fail=(message)=>{throw new Error("Quarantine rejected: "+message);};
const isId=(x)=>typeof x==="string"&&ID.test(x);
function date(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail("calendar date");
  return value;
}
function time(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))fail("retrieval time");
  return new Date(value).toISOString();
}
function pinLocation(url,origin){
  if(typeof url!=="string"||url.length>1024||typeof origin!=="string")fail("URL metadata");
  let u,p;
  try{u=new URL(url);p=new URL(origin);}catch{fail("URL parsing");}
  if(u.protocol!=="https:"||p.protocol!=="https:"||u.origin!==p.origin||u.username||u.password||u.hash||p.pathname!=="/"||p.search||p.hash||!u.hostname||u.hostname.endsWith(".local"))fail("untrusted source origin");
  return u.toString();
}
export function buildSourceSnapshotQuarantine(input){
  if(!input||typeof input!=="object"||Array.isArray(input))fail("input");
  const {sourceKey,jurisdiction,publisher,datasetKey,resourceId,resourceUrl,expectedOrigin,mediaType,schemaVersion,observationStart,observationEnd,publishedOn,fetchedAt,bytes,rightsEvidenceId=null}=input;
  if(![sourceKey,datasetKey,resourceId,schemaVersion].every(isId)||!JURISDICTION.test(jurisdiction||"")||rightsEvidenceId!==null)fail("source or rights");
  if(typeof publisher!=="string"||publisher.length<1||publisher.length>160||/[\u0000-\u001f\u007f]/.test(publisher))fail("publisher");
  const location=pinLocation(resourceUrl,expectedOrigin);
  if(!FORMATS.has(mediaType))fail("format");
  const first=date(observationStart),last=date(observationEnd),published=date(publishedOn),retrieved=time(fetchedAt);
  if(first>last||last>published||published>retrieved.slice(0,10))fail("chronology");
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>MAX_BYTES)fail("sample size");
  const digestSha256=createHash("sha256").update(bytes).digest("hex");
  const snapshotId=createHash("sha256").update(JSON.stringify([sourceKey,jurisdiction,datasetKey,resourceId,schemaVersion,location,first,last,published,digestSha256]),"utf8").digest("hex");
  return Object.freeze({contract:"novapharm.intelligence.source-quarantine.v1",snapshotId,sourceKey,jurisdiction,publisher,datasetKey,resourceId,resourceUrl:location,mediaType,schemaVersion,observationStart:first,observationEnd:last,publishedOn:published,fetchedAt:retrieved,sampleBytes:bytes.byteLength,digestSha256,sourceRightsIndependentlyApproved:false,rightsEvidenceId:null,intakeState:"QUARANTINED_INTERNAL_EVALUATION",productionAccepted:false,canPublish:false,commercialDecisionReady:false,clinicalDecisionReady:false});
}
function candidate(m){
  return m?.contract==="novapharm.intelligence.source-quarantine.v1"&&m.canPublish===false&&m.productionAccepted===false&&m.intakeState==="QUARANTINED_INTERNAL_EVALUATION"&&SHA.test(m.digestSha256||"")&&SHA.test(m.snapshotId||"");
}
export function classifySourceSnapshotReplay(previous,next){
  if(!Array.isArray(previous)||!candidate(next)||previous.some(x=>!candidate(x)))fail("replay inputs");
  const same=x=>x.sourceKey===next.sourceKey&&x.jurisdiction===next.jurisdiction&&x.datasetKey===next.datasetKey&&x.resourceId===next.resourceId&&x.schemaVersion===next.schemaVersion&&x.observationStart===next.observationStart&&x.observationEnd===next.observationEnd&&x.publishedOn===next.publishedOn;
  const matches=previous.filter(same);
  if(matches.some(x=>x.snapshotId===next.snapshotId))return Object.freeze({decision:"DUPLICATE",canPublish:false});
  if(matches.length)return Object.freeze({decision:"QUARANTINE_CONFLICTING_REVISION",canPublish:false});
  return Object.freeze({decision:"QUARANTINE_NEW_CANDIDATE",canPublish:false});
}
export function assertSourceSnapshotPublishable(_candidate){fail("independent rights and data admission required");}
