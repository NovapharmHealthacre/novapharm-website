/**
 * Owner-approved, source-pinned NHSBSA EPD archive acquisition for PRIVATE
 * quarantine only. Never writes to Atlas, authorises terms or publishes rows.
 * Maximum ZIP bytes 650 MB; free-tier test transfer through existing CI.
 */
import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {createWriteStream} from "node:fs";
import {Readable,Transform} from "node:stream";
import {pipeline} from "node:stream/promises";
import {resolve,sep,isAbsolute,join} from "node:path";
import {source} from "../../src/data/nhsbsa-epd-bounded-quarantine.mjs";

const MAX_ZIP=650_000_000;
const KNOWN_SOURCE=new Set([
 "opendata.nhsbsa.net",
 "83025b28472d6aa2bf5ae59f3724aa78.eu.r2.cloudflarestorage.com"
]);
const deny=v=>{throw Object.assign(new Error("EPD archive acquisition denied: "+v),{code:"EPD_ARCHIVE_DENIED"});};
function urlSafe(value){
 if(typeof value!=="string"||!value.trim())deny("missing_url");
 let u;try{u=new URL(value);}catch{deny("invalid_url");}
 if(u.protocol!=="https:"||!KNOWN_SOURCE.has(u.hostname)||u.username||u.password||u.hash)deny("unauthorised_origin");
 return u.href;
}
function sourceResource(payload){
 const d=payload?.result;
 if(payload?.success!==true||d?.name!==source.dataset||d?.license_id!=="OGL-UK-3.0")deny("publisher_metadata_changed");
 const matches=d.resources?.filter(r=>r?.id===source.resourceId&&r?.name===source.resourceName);
 if(matches?.length!==1)deny("resource_identity_mismatch");
 const r=matches[0],sha=r.sha256||r.hash,n=Number(r.size);
 if(!/^[a-f0-9]{64}$/u.test(sha??"")||n!==7432815985)deny("raw_csv_metadata_changed");
 return Object.freeze({zip:urlSafe(r.zip_url),rawBytes:n,rawSha256:sha});
}
async function providerGet(url,headers={}){
 const r=await fetch(urlSafe(url),{method:"GET",redirect:"error",
  headers,signal:AbortSignal.timeout(900000)});
 if(!r.ok||!r.body)deny("publisher_unavailable_"+r.status);
 return r;
}
async function main(args){
 if(args.length===0){console.log(JSON.stringify({status:"dry_run_no_network",
  source:source.resourceName,archive_max_bytes:MAX_ZIP,customer_publish_approved:false}));return;}
 if(args.length!==2||args[0]!=="--out")deny("output_path_required");
 const out=args[1],cwd=resolve(process.cwd());
 if(!isAbsolute(out)||resolve(out)===cwd||resolve(out).startsWith(cwd+sep))deny("isolated_output_required");
 const response=await providerGet(source.packageUrl,{accept:"application/json"});
 const p=await response.json();const spec=sourceResource(p);
 const range=await providerGet(spec.zip,{range:"bytes=0-0"});
 const match=/^bytes 0-0\/(\d+)$/u.exec(range.headers.get("content-range")||"");
 const expected=match?Number(match[1]):NaN;
 await range.body.cancel();
 if(range.status!==206||!Number.isSafeInteger(expected)||expected<1||expected>MAX_ZIP)
  deny("official_zip_size_exceeds_budget_or_unavailable");
 await mkdir(out,{recursive:true,mode:0o700});
 const dest=join(out,"EPD_SNOMED_202608_official_source.zip");
 const res=await providerGet(spec.zip,{accept:"application/zip"});
 let bytes=0;const h=createHash("sha256");
 const t=new Transform({transform(chunk,_enc,cb){
   bytes+=chunk.length;
   if(bytes>MAX_ZIP||bytes>expected){cb(new Error("archive_exceeded_declared_budget"));return;}
   h.update(chunk);cb(null,chunk);
 }});
 await pipeline(Readable.fromWeb(res.body),t,createWriteStream(dest,{flags:"wx",mode:0o600}));
 if(bytes!==expected)deny("archive_size_mismatch");
 const report={status:"private_source_archive_not_admitted",source_id:"nhsbsa_english_prescribing",
  resource_id:source.resourceId,reporting_period:source.period,
  official_zip_bytes:bytes,official_zip_sha256:h.digest("hex"),
  publisher_declared_csv_bytes:spec.rawBytes,publisher_declared_csv_sha256:spec.rawSha256,
  archive_origin:new URL(spec.zip).origin,downloaded_at:new Date().toISOString(),
  customer_publish_approved:false,accepted_observations:0,
  rights_grants_created:0,independent_terminology_review_required:true};
 await writeFile(join(out,"archive-transfer-manifest.json"),JSON.stringify(report,null,2)+"\n",{mode:0o600,flag:"wx"});
 console.log(JSON.stringify({status:report.status,zip_bytes:bytes,sha256:report.official_zip_sha256,
  customer_publish_approved:false}));
}
await main(process.argv.slice(2));
