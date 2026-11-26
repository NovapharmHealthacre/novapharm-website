import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SOURCE_ID,DATASET_ID,buildHsaCompanyLicencePlan,validateHsaCompanyLicences,createHsaCompanyLicenceReader} from "../src/core/intelligence-sg-hsa-company-licences.mjs";
const body={success:true,result:{resource_id:DATASET_ID,fields:["Companyname","Licensetype","Activitytype","DosageForm","Expirydate"].map(id=>({id})),records:[{Companyname:"TEST CO",Licensetype:"Wholesaler",Activitytype:"",DosageForm:"",Expirydate:"2/1/2027"}]}};
const time=Date.parse("2026-11-26T12:00:00.000Z");
const grant={decision:"approved",rightsStatus:"approved",sourceId:SOURCE_ID,tenantId:"tenant1",country:"SG",domain:"establishment-licensing",purpose:"internal-evaluation",allowedUses:["internal-evaluation"],receiptId:"receipt1",licenseId:"license1",rightsVersion:"v1",issuedAt:"2026-11-26T11:00:00.000Z",validUntil:"2026-11-26T13:00:00.000Z",revokedAt:null};
test("fixed HSA dataset and bounded native schema, no inferred company ID or licence validity",()=>{
 const p=buildHsaCompanyLicencePlan();assert.equal(new URL(p.url).origin,"https://data.gov.sg");
 assert.equal(new URL(p.url).searchParams.get("resource_id"),DATASET_ID);
 const [row]=validateHsaCompanyLicences(p,body);assert.equal(row.expiryDate,"2027-01-02");assert.equal(row.canonicalCompanyId,null);assert.equal(row.licenceCurrentlyValid,null);
 assert.throws(()=>buildHsaCompanyLicencePlan({limit:100}));
 assert.throws(()=>validateHsaCompanyLicences(p,{...body,result:{...body.result,resource_id:"wrong"}}));
 assert.throws(()=>validateHsaCompanyLicences(p,{...body,result:{...body.result,records:[{...body.result.records[0],Expirydate:"31/2/2027"}]}}));
});
test("rights and shared quota required before egress; revocation blocks response",async()=>{
 let calls=0;const transport=async()=>{calls++;return new Response(JSON.stringify(body),{headers:{"content-type":"application/json"}})};
 const opts={tenantId:"tenant1"};
 const reader=o=>createHsaCompanyLicenceReader({authorize:async()=>grant,acquireSharedQuota:async()=>({allowed:true}),transport,now:()=>time,...o});
 await assert.rejects(reader({authorize:async()=>null}).read(opts));await assert.rejects(reader({acquireSharedQuota:async()=>({allowed:false})}).read(opts));assert.equal(calls,0);
 const value=await reader({}).read(opts);assert.equal(value.canPublish,false);assert.equal(value.stockAvailabilityVerified,false);assert.equal(value.records.length,1);
 let count=0;await assert.rejects(reader({authorize:async()=>++count===1?grant:{...grant,revokedAt:"revoked"}}).read(opts));
});
test("worldwide WHO research leads remain non-admitted and visible across clients",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 const m=JSON.parse(read("docs/intelligence/worldwide-jurisdiction-scope-20261126.json"));
 const leads=m.jurisdictions.filter(j=>j.authorityLead);assert.equal(leads.length,19);assert.ok(leads.every(j=>!j.customerLive&&!j.authorityVerified&&!j.productionAccepted));
 const swift=read("native/novapharm-intelligence-ios/App/NovaCountryDirectoryView.swift");
 for(const j of leads)assert.ok(swift.includes(JSON.stringify(j.code)+": "+JSON.stringify(j.authorityLead.name)));
 for(const p of ["apps/portal/components/country-source-coverage.tsx","native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx"])assert.match(read(p),/entry\.authorityLead/);
});
