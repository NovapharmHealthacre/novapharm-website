import assert from "node:assert/strict";
import {test} from "node:test";
import {source,officialEpdSampleUrl,validateEpdPublisherSample} from "../src/data/nhsbsa-epd-bounded-quarantine.mjs";
const r={id:source.resourceId,name:source.resourceName,datastore_active:true,size:7432815985,sha256:"1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b"};
const pkg={success:true,result:{name:source.dataset,license_id:"OGL-UK-3.0",resources:[r]}};
const row={YEAR_MONTH:"2026-08",PRACTICE_CODE:"ABC123",BNF_PRESENTATION_CODE:"0208020Z0AAAFA",ITEMS:13,NIC:47.4,SNOMED_CODE:"SECRET_TERM",extra:"EXCLUDED"};
const data={success:true,result:{records:[row],total:18000000}};
function validate(p=pkg,d=data,o={}){return validateEpdPublisherSample({packageBytes:JSON.stringify(p),dataBytes:JSON.stringify(d),observedAt:"2026-11-12T12:00:00.000Z",limit:2,...o});}
test("official source allowlist, bounded limit and no arbitrary target",()=>{
 const u=new URL(officialEpdSampleUrl(2));
 assert.equal(u.origin,"https://opendata.nhsbsa.net");
 assert.equal(u.searchParams.get("resource_id"),"EPD_SNOMED_202608");
 assert.equal(u.searchParams.get("limit"),"2");
 for(const n of [0,6,1000,"wrong"])assert.throws(()=>officialEpdSampleUrl(n),/rejected/);
});
test("publisher data projects only private unapproved observations",()=>{
 const receipt=validate();
 assert.equal(receipt.rows.length,1);
 assert.equal(receipt.rows[0].observed_items_unapproved,13);
 assert.equal(receipt.rows[0].accepted_observations,0);
 assert.equal(receipt.manifest.full_month_csv_verified,false);
 assert.equal(receipt.manifest.publisher_declared_full_csv_bytes,7432815985);
 assert.equal(receipt.manifest.publisher_declared_full_csv_sha256,r.sha256);
 assert.equal(receipt.manifest.full_csv_sha256_independently_verified,false);
 assert.equal(receipt.manifest.customer_publish_approved,false);
 assert.equal(receipt.manifest.publisher_licence_id,"OGL-UK-3.0");
 assert.equal(receipt.rows[0].source_rights_grant_id,null);
 assert.ok(!JSON.stringify(receipt).includes("SECRET_TERM"));
 assert.ok(!JSON.stringify(receipt).includes("EXCLUDED"));
});
test("unknown rights, resource, period and invalid metrics fail closed",()=>{
 const cases=[
  [{...pkg,result:{...pkg.result,license_id:"unknown"}},data],
  [{...pkg,result:{...pkg.result,resources:[{...r,id:"different"}]}},data],
  [{...pkg,result:{...pkg.result,resources:[{...r,size:0}]}},data],
  [{...pkg,result:{...pkg.result,resources:[{...r,sha256:"broken"}]}},data],
  [pkg,{...data,success:false}],
  [pkg,{...data,result:{records:[{...row,YEAR_MONTH:202607}]}}],
  [pkg,{...data,result:{records:[{...row,ITEMS:"invalid"}]}}],
  [pkg,{...data,result:{records:[{...row,NIC:-2}]}}],
  [pkg,{...data,result:{records:[row,row]}}],
  [pkg,{...data,result:{records:[]}}],
 ];
 for(const [p,d] of cases)assert.throws(()=>validate(p,d),/rejected/);
});
test("huge responses and invalid timestamps fail closed",()=>{
 assert.throws(()=>validate(pkg,data,{dataBytes:"x".repeat(1000001)}),/rejected/);
 assert.throws(()=>validate(pkg,data,{observedAt:"tomorrow"}),/rejected/);
});
