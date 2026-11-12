/**
 * Full-file NHSBSA CSV evidence: STREAM publisher bytes to SHA-256 only.
 * No persistent raw download, customer access, MongoDB write or rights grant.
 * Execute only through explicitly approved review workflow.
 */
import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {isAbsolute,resolve,sep,join} from "node:path";
import {source} from "../../src/data/nhsbsa-epd-bounded-quarantine.mjs";
const SHA=/^[a-f0-9]{64}$/u;
const ALLOWED=new Set([
  "opendata.nhsbsa.net",
  "83025b28472d6aa2bf5ae59f3724aa78.eu.r2.cloudflarestorage.com"
]);
const reject=why=>{throw Object.assign(new Error("EPD full stream verification rejected: "+why),{code:"EPD_FULL_STREAM_DENIED"});};
function officialUrl(v,base) {
 let u;
 try {u=new URL(v,base);}catch{reject("invalid_resource_url");}
 if(u.protocol!=="https:"||u.username||u.password||!ALLOWED.has(u.hostname)||u.hash)reject("unapproved_resource_origin");
 return u.href;
}
async function getOfficial(url,{headers={}}={}) {
 let current=officialUrl(url,source.packageUrl);
 for(let i=0;i<=3;i++){
  const r=await fetch(current,{method:"GET",redirect:"manual",headers,signal:AbortSignal.timeout(1200000)});
  if([301,302,303,307,308].includes(r.status)){
   if(i===3)reject("redirect_hops_exceeded");
   current=officialUrl(r.headers.get("location"),current);continue;
  }
  if(!r.ok||!r.body)reject("publisher_http_"+r.status);
  return {r,url:current};
 }
 reject("no_publisher_response");
}
export async function verifyByteStream({chunks,expectedSha256,expectedBytes,maxBytes=20000000000}={}){
 if(!SHA.test(expectedSha256??"")||!Number.isSafeInteger(expectedBytes)||expectedBytes<=0||
    expectedBytes>maxBytes)reject("invalid_expected_hash_or_size");
 const h=createHash("sha256");
 let bytes=0,lines=0,last=null,header=Buffer.alloc(0),headerDone=false;
 for await(const val of chunks){
  const b=Buffer.from(val);
  bytes+=b.length;
  if(bytes>maxBytes||bytes>expectedBytes)reject("oversize_response");
  h.update(b);lines+=b.reduce((n,v)=>n+(v===10),0);
  if(b.length)last=b.at(-1);
  if(!headerDone){
   const nl=b.indexOf(10);
   const prefix=nl<0?b:b.subarray(0,nl);
   if(header.length+prefix.length>4096)reject("missing_csv_header");
   header=Buffer.concat([header,prefix]);
   if(nl>=0)headerDone=true;
  }
 }
 const got=h.digest("hex");
 if(bytes!==expectedBytes||got!==expectedSha256||!headerDone)reject("whole_csv_hash_or_size_mismatch");
 const headerText=header.toString("utf8").replace(/^\uFEFF/u,"").replace(/\r$/u,"");
 const headers=headerText.split(",").map(s=>s.replace(/^"|"$/gu,"").trim());
 const required=["YEAR_MONTH","PRACTICE_CODE","BNF_PRESENTATION_CODE","ITEMS","NIC"];
 if(required.some(x=>!headers.includes(x)))reject("unexpected_full_csv_header");
 return Object.freeze({
  sha256:got,bytes,physical_newlines:lines,
  physical_lines_may_not_equal_csv_records:true,
  csv_header_fields:headers,
  csv_header_verified:true,
  trailing_newline:last===10,
  status:"full_csv_integrity_verified_private_only",
  accepted_observations:0,customer_publish_approved:false,
  rights_grants_created:0,raw_csv_persisted:false,
 });
}
async function publisherSourceMetadata(){
 const {r}=await getOfficial(source.packageUrl,{headers:{accept:"application/json"}});
 const sizeHeader=Number(r.headers.get("content-length")||0);
 if(sizeHeader>1500000)reject("metadata_response_too_large");
 const text=await r.text();
 if(Buffer.byteLength(text)>1500000)reject("metadata_response_too_large");
 let p;try{p=JSON.parse(text);}catch{reject("invalid_publisher_metadata_json");}
 const dataset=p?.result;
 if(p?.success!==true||dataset?.name!==source.dataset||dataset?.license_id!=="OGL-UK-3.0")reject("invalid_publisher_dataset");
 const rs=dataset.resources?.filter(x=>x?.id===source.resourceId&&x?.name===source.resourceName);
 if(rs?.length!==1)reject("resource_changed_or_missing");
 const o=rs[0];const checksum=o.sha256||o.hash;const size=Number(o.size);
 if(!SHA.test(checksum??"")||!Number.isSafeInteger(size)||size<=0||size>20000000000)reject("missing_official_csv_metadata");
 const url=officialUrl(o.url,source.packageUrl);
 return {url,sha256:checksum,bytes:size};
}
async function main(args){
 if(args.length===0||args[0]==="--dry-run"){
  console.log(JSON.stringify({status:"no_network_no_write",resource:source.resourceName,
   accepted_observations:0,customer_publish_approved:false}));return;
 }
 if(args.length!==3||args[0]!=="--execute"||args[1]!=="--output")reject("explicit_execute_and_output_required");
 const out=args[2];const cwd=resolve(process.cwd());
 if(!isAbsolute(out)||resolve(out)===cwd||resolve(out).startsWith(cwd+sep))reject("output_outside_repo_required");
 const spec=await publisherSourceMetadata();
 const {r,url}=await getOfficial(spec.url,{headers:{accept:"text/csv"}});
 const receipt=await verifyByteStream({
  chunks:r.body,expectedSha256:spec.sha256,expectedBytes:spec.bytes
 });
 const report=Object.freeze({
  ...receipt,source_id:"nhsbsa_english_prescribing",
  resource_id:source.resourceId,reporting_period:source.period,
  source_dataset:source.dataset,publisher_url_origin:new URL(url).origin,
  checked_at:new Date().toISOString(),
  publisher_attribution:"NHSBSA Copyright 2021-2026",
  full_month_source_rights_approved:false,
  third_party_bnf_snomed_rights_approved:false,
  customer_launch_approved:false
 });
 await mkdir(out,{recursive:true,mode:0o700});
 await writeFile(join(out,"nhsbsa-epd-202608-full-integrity-receipt.json"),JSON.stringify(report,null,2)+"\n",{mode:0o600,flag:"wx"});
 console.log(JSON.stringify({status:report.status,bytes:report.bytes,sha256:report.sha256,
  physical_newlines:report.physical_newlines,raw_stored:false,customer_publish_approved:false}));
}
if(process.argv[1]&&new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\","/"))){
 await main(process.argv.slice(2));
}
