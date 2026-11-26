import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildNfzDictionaryPlan,validateNfzDictionary,createNfzDictionaryReader} from "../src/core/intelligence-pl-nfz-dictionary.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const matrix=JSON.parse(read("docs/intelligence/global-integration-execution-20261126.json"));
test("all national scopes and original candidates remain represented",()=>{
 const catalog=JSON.parse(read("docs/intelligence/country-101-client-catalog-20261118.json"));
 const registry=JSON.parse(read("docs/intelligence/global-pharma-sources-20261117.json"));
 assert.deepEqual(matrix.countries.map(c=>c.iso2),catalog.countries.map(c=>c.iso2));
 assert.deepEqual(matrix.sources.map(s=>s.candidateKey),registry.sources.map(s=>s.candidateKey));
 assert.equal(matrix.countries.filter(c=>c.scope==="original-national-list").length,77);
 assert.equal(matrix.countries.filter(c=>c.scope==="original-european-extension").length,5);
 assert.ok(matrix.sources.every(s=>s.customerLive===false&&s.productionAccepted===false));
 const codes=matrix.countries.filter(c=>c.adapterSourceCandidateCount>0).map(c=>'"'+c.iso2+'"').join(", ");
 assert.ok(read("native/novapharm-intelligence-ios/App/NovaCountryDirectoryView.swift").includes("["+codes+"]"));
 for(const p of ["apps/portal/components/country-source-coverage.tsx","native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx"])assert.ok(read(p).includes("global-integration-execution-20261126.json"));
});
test("NFZ dictionary contract is fixed, bounded and preserves strings",()=>{
 const p=buildNfzDictionaryPlan({sourceId:"pl-nfz-active-substances",limit:2});
 assert.equal(new URL(p.url).origin,"https://api.nfz.gov.pl");
 assert.deepEqual(validateNfzDictionary(p,{data:["AFLIBERCEPTUM","001"]}),["AFLIBERCEPTUM","001"]);
 for(const data of [{data:[1]},{data:["x","y","z"]},{data:[],errors:[]}])assert.throws(()=>validateNfzDictionary(p,data));
 assert.throws(()=>buildNfzDictionaryPlan({sourceId:"__proto__"}));
 assert.throws(()=>buildNfzDictionaryPlan({sourceId:"pl-nfz-programs",limit:11}));
});
test("reader denies before transport and revalidates rights after response",async()=>{
 const t=Date.parse("2026-11-26T10:00:00.000Z");
 const grant={decision:"approved",rightsStatus:"approved",sourceId:"pl-nfz-programs",tenantId:"tenant1",country:"PL",domain:"drug-program-dictionary",purpose:"internal-evaluation",allowedUses:["internal-evaluation"],receiptId:"receipt1",licenseId:"license1",rightsVersion:"v1",issuedAt:"2026-11-26T09:00:00.000Z",validUntil:"2026-11-26T11:00:00.000Z",revokedAt:null};
 let calls=0;const transport=async()=>{calls++;return new Response(JSON.stringify({data:["TEST PROGRAM"]}),{headers:{"content-type":"application/json"}})};
 const opts={sourceId:"pl-nfz-programs",tenantId:"tenant1"};
 await assert.rejects(createNfzDictionaryReader({authorize:async()=>null,transport,now:()=>t}).read(opts));assert.equal(calls,0);
 const value=await createNfzDictionaryReader({authorize:async()=>grant,transport,now:()=>t}).read(opts);
 assert.equal(value.canPublish,false);assert.equal(value.identityResolved,false);assert.deepEqual(value.labels,["TEST PROGRAM"]);
 let checks=0;await assert.rejects(createNfzDictionaryReader({authorize:async()=>++checks===1?grant:{...grant,revokedAt:"revoked"},transport,now:()=>t}).read(opts));
});
