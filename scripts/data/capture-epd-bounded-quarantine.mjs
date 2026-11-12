/** GET-only, no-credential official EPD quarantine capture, explicitly opted in. */
import {mkdir,writeFile} from "node:fs/promises";
import {join,resolve,isAbsolute,sep} from "node:path";
import {source,officialEpdSampleUrl,validateEpdPublisherSample} from "../../src/data/nhsbsa-epd-bounded-quarantine.mjs";
let execute=false, out=null, limit=2;
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){
 if(args[i]==="--execute")execute=true;
 else if(args[i]==="--out"&&args[i+1])out=args[++i];
 else if(args[i]==="--limit"&&args[i+1])limit=Number(args[++i]);
 else throw Error("Invalid EPD capture arguments");
}
const dataUrl=officialEpdSampleUrl(limit);
if(!execute){
 console.log(JSON.stringify({status:"dry_run_no_network",resource:source.resourceName,query:dataUrl,acceptedObservations:0,customerPublishing:false}));
}else{
 const cwd=resolve(process.cwd());
 if(!out||!isAbsolute(out)||resolve(out)===cwd||resolve(out).startsWith(cwd+sep))throw Error("Output must be an absolute isolated path outside repository");
 async function officialGet(url){
  if(new URL(url).origin!=="https://opendata.nhsbsa.net")throw Error("Publisher not allowlisted");
  const r=await fetch(url,{method:"GET",redirect:"error",headers:{accept:"application/json"},signal:AbortSignal.timeout(25000)});
  if(!r.ok||r.url!==url)throw Error("NHSBSA publisher unavailable or redirected");
  if(Number(r.headers.get("content-length")||0)>1500000)throw Error("Publisher payload too large");
  const body=await r.text();
  if(Buffer.byteLength(body)>1500000)throw Error("Publisher response too large");
  return body;
 }
 const [packageBytes,dataBytes]=await Promise.all([officialGet(source.packageUrl),officialGet(dataUrl)]);
 const receipt=validateEpdPublisherSample({packageBytes,dataBytes,observedAt:new Date().toISOString(),limit});
 await mkdir(out,{recursive:true,mode:0o700});
 await writeFile(join(out,"epd-quarantine.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx",mode:0o600});
 // No raw publisher response, credentials, or source-wide files in the artifact.
 console.log(JSON.stringify({status:receipt.manifest.status,resourceId:receipt.manifest.resource_id,
  boundedRows:receipt.rows.length,sha256:receipt.manifest.datastore_response_sha256,
  acceptedObservations:0,customerPublishing:false}));
}
