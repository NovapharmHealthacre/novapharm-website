/** Read-only official NHSBSA ZIP size discovery. No download or storage. */
import {source} from "../../src/data/nhsbsa-epd-bounded-quarantine.mjs";
const ALLOWED=new Set(["opendata.nhsbsa.net","83025b28472d6aa2bf5ae59f3724aa78.eu.r2.cloudflarestorage.com"]);
function safe(u){if(typeof u!=="string"||!u.trim())throw Error("No official ZIP URL");
 const x=new URL(u);if(x.protocol!=="https:"||!ALLOWED.has(x.hostname)||x.username||x.password)throw Error("Unsafe URL");
 return x;
}
async function metadata(){
 const r=await fetch(source.packageUrl,{redirect:"error",headers:{accept:"application/json"},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error("Publisher package unavailable");
 let p=await r.json();
 if(p?.success!==true||p.result?.name!==source.dataset)throw Error("Publisher dataset changed");
 const xs=p.result.resources?.filter(v=>v?.id===source.resourceId&&v?.name===source.resourceName);
 if(xs?.length!==1||!["true",true].includes(xs[0].datastore_active))throw Error("NHSBSA resource changed");
 return xs[0];
}
if(process.argv.includes("--execute")){
 const r=await metadata(),url=safe(r.zip_url);
 let final=url;
 let res;
 for(let i=0;i<3;i++){
  res=await fetch(final,{method:"HEAD",redirect:"manual",signal:AbortSignal.timeout(30000)});
  if([301,302,303,307,308].includes(res.status)){
   final=safe(new URL(res.headers.get("location"),final.href).href);continue;
  }
  break;
 }
 if(!res?.ok||res.status>=400)throw Error("Official ZIP HEAD unavailable");
 const n=Number(res.headers.get("content-length"));
 if(!Number.isSafeInteger(n)||n<1||n>10000000000)throw Error("ZIP size missing/invalid");
 console.log(JSON.stringify({source:source.resourceName,origin:final.origin,
  zip_declared_bytes:n,zip_size_mib:Math.round(n/1048576),raw_csv_expected_bytes:Number(r.size),
  requested_download:false,stored_bytes:0,customer_publish_approved:false}));
}else{
 console.log(JSON.stringify({status:"dry_run_no_network",source:source.resourceName,stored_bytes:0}));
}
