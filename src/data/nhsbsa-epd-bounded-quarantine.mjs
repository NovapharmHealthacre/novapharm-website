/**
 * Bounded NHSBSA EPD response validator. Quarantine only: no grant, medicine
 * admission, clinical equivalence, customer publishing or full CSV proof.
 */
import {createHash} from "node:crypto";
export const source=Object.freeze({
 dataset:"english-prescribing-dataset-epd-with-snomed-code",
 period:"2026-08", resourceId:"30b74257-9912-4b54-8990-8eec2a4b7f14",
 resourceName:"EPD_SNOMED_202608",
 packageUrl:"https://opendata.nhsbsa.net/api/3/action/package_show?id=english-prescribing-dataset-epd-with-snomed-code",
 dataUrl:"https://opendata.nhsbsa.net/api/3/action/datastore_search"
});
const sha=t=>createHash("sha256").update(t,"utf8").digest("hex");
const deny=reason=>{throw Object.assign(new Error("EPD quarantine rejected: "+reason),{code:"EPD_QUARANTINE_DENIED"});};
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
function number(v,upper){if(v==null||v===""||typeof v==="boolean"||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>upper)deny("invalid_number");return Number(v);}
function code(v){const s=String(v??"");return /^[A-Za-z0-9_-]{3,32}$/u.test(s)?s:null;}
export function officialEpdSampleUrl(limit){
 if(!Number.isInteger(limit)||limit<1||limit>5)deny("unbounded_limit");
 const u=new URL(source.dataUrl);
 u.searchParams.set("resource_id",source.resourceName);
 u.searchParams.set("limit",String(limit));
 u.searchParams.set("offset","0");return u.href;
}
export function validateEpdPublisherSample({packageBytes,dataBytes,observedAt,limit=2}={}){
 officialEpdSampleUrl(limit);
 if(typeof packageBytes!=="string"||typeof dataBytes!=="string"||
    Buffer.byteLength(packageBytes)>1500000||Buffer.byteLength(dataBytes)>1000000||
    typeof observedAt!=="string"||!Number.isFinite(Date.parse(observedAt)))deny("invalid_bytes_or_time");
 let p,d;try{p=JSON.parse(packageBytes);d=JSON.parse(dataBytes);}catch{deny("invalid_json");}
 const pkg=p?.result;
 if(p?.success!==true||!plain(pkg)||pkg.name!==source.dataset||
    pkg.license_id!=="OGL-UK-3.0"||!Array.isArray(pkg.resources))deny("publisher_package_mismatch");
 const matches=pkg.resources.filter(r=>r?.name===source.resourceName&&r?.id===source.resourceId);
 if(matches.length!==1||![true,"true"].includes(matches[0].datastore_active))deny("source_resource_not_current");
 const records=d?.result?.records;
 if(d?.success!==true||!Array.isArray(records)||records.length<1||records.length>limit)deny("invalid_datastore_response");
 const seen=new Set();
 const rows=records.map((r,index)=>{
  const required=["YEAR_MONTH","PRACTICE_CODE","BNF_PRESENTATION_CODE","ITEMS","NIC"];
  if(!plain(r)||required.some(k=>!Object.hasOwn(r,k))||
     !["202608","2026-08"].includes(String(r.YEAR_MONTH))||!code(r.PRACTICE_CODE)||!code(r.BNF_PRESENTATION_CODE))deny("source_row_schema_or_period");
  const items=number(r.ITEMS,1e7),nic=number(r.NIC,1e7);
  if(!Number.isSafeInteger(items))deny("items_not_integer");
  const fingerprint=sha(JSON.stringify(r));
  if(seen.has(fingerprint))deny("duplicate_source_row");
  seen.add(fingerprint);
  return Object.freeze({
   _id:"nhsbsa-epd-202608-"+fingerprint.slice(0,32),
   workspace_id:"novapharm-internal-staging",environment:"staging",
   source_id:"nhsbsa_english_prescribing",source_resource_id:source.resourceId,
   reporting_period:source.period,row_index_in_bounded_response:index,
   publisher_row_sha256:fingerprint,
   practice_code:code(r.PRACTICE_CODE),bnf_presentation_code:code(r.BNF_PRESENTATION_CODE),
   observed_items_unapproved:items,observed_nic_gbp_unapproved:nic,
   record_grain:"practice_bnf_presentation_month",
   status:"quarantined_unapproved_source_row",accepted_observations:0,
   full_month_csv_verified:false,canonical_medicine_identity_accepted:false,
   source_rights_grant_id:null,third_party_terminology_rights_accepted:false,
   customer_publish_approved:false,ai_processing_approved:false,production_promoted:false
  });
 });
 const manifest=Object.freeze({
  _id:"nhsbsa-epd-202608-datastore-preview-"+sha(dataBytes).slice(0,16),
  source_id:"nhsbsa_english_prescribing",workspace_id:"novapharm-internal-staging",
  environment:"staging",kind:"bounded_official_datastore_response",
  reporting_period:source.period,resource_id:source.resourceId,resource_name:source.resourceName,
  dataset_metadata_sha256:sha(packageBytes),datastore_response_sha256:sha(dataBytes),
  metadata_bytes:Buffer.byteLength(packageBytes),response_bytes:Buffer.byteLength(dataBytes),
  publisher_query_url:officialEpdSampleUrl(limit),publisher:"NHS Business Services Authority",
  publisher_licence_id:"OGL-UK-3.0",publisher_attribution:"NHSBSA Copyright 2021-2026",
  bounded_sample_count:rows.length,observed_at:observedAt,
  full_month_csv_verified:false,full_month_row_count_verified:false,
  source_rights_grant_id:null,third_party_terminology_rights_accepted:false,
  accepted_observations:0,customer_publish_approved:false,ai_processing_approved:false,
  production_promoted:false,status:"bounded_publisher_response_quarantined"
 });
 return Object.freeze({manifest,rows:Object.freeze(rows)});
}
