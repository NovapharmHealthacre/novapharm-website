import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
 ES_CIMA_PROBE, validateCimaMedicineSample, probeCimaPublicMedicine
} from "../src/core/intelligence-es-cima-public-live-probe.mjs";

const NOW=Date.parse("2026-11-18T11:00:00.000Z");
const sample=()=>({
 nregistro:"51347",nombre:"ASPIRINA C 400 mg/240 mg COMPRIMIDOS EFERVESCENTES",
 comerc:true,receta:false,
 principiosActivos:[{nombre:"ACETILSALICILICO ACIDO"},{nombre:"ASCORBICO ACIDO"}],
 presentaciones:[{cn:"712729",nombre:"ASPIRINA C 10 comprimidos"},
  {cn:"651877",nombre:"ASPIRINA C 20 comprimidos"}]
});
const makeResponse=payload=>new Response(JSON.stringify(payload),
 {headers:{"content-type":"application/json"}});
test("Spain is bound to an exact official CIMA medicine registration and source registry",()=>{
 const registry=JSON.parse(readFileSync(new URL(
  "../docs/intelligence/global-pharma-sources-20261117.json",import.meta.url
 ),"utf8")).sources;
 const match=registry.filter(x=>x.candidateKey===ES_CIMA_PROBE.registryCandidateKey);
 assert.equal(match.length,1);
 assert.equal(match[0].country,"Spain");
 assert.equal(match[0].provider,"AEMPS CIMA");
 assert.equal(match[0].rightsStatus,"not-reviewed");
 assert.equal(match[0].integrationStatus,"candidate-only");
 assert.equal(match[0].dataAdmission,"not-admitted");
 assert.equal(match[0].activeAdapterId,null);
 assert.equal(ES_CIMA_PROBE.url,
  "https://cima.aemps.es/cima/rest/medicamento?nregistro=51347");
 assert.ok(Object.isFrozen(ES_CIMA_PROBE));
});
test("CIMA only yields bounded source connectivity receipts, never medicine records",async()=>{
 let calls=0;
 const out=await probeCimaPublicMedicine({
  now:()=>NOW,
  transport:async(url,options)=>{
   calls++;
   assert.equal(url,ES_CIMA_PROBE.url);
   assert.equal(options.method,"GET");
   assert.equal(options.redirect,"error");
   assert.equal(options.credentials,"omit");
   assert.equal(options.cache,"no-store");
   return makeResponse(sample());
  }
 });
 assert.equal(calls,1);
 assert.equal(out.schemaBoundRecords,1);
 assert.equal(out.registrationIdentifierValidated,true);
 assert.equal(out.presentationCount,2);
 assert.equal(out.ingredientCount,2);
 assert.match(out.responseSha256,/^[a-f0-9]{64}$/u);
 assert.equal(out.publicPublisherResponded,true);
 for(const flag of [
  "sourceUseRightsIndependentlyReviewed","sourceDatasetAdmitted",
  "signedCustomerProductionReadVerified","clinicalDecisionReady",
  "commercialDecisionReady","countryCustomerLive","canPublish",
  "rawMedicineRecordsRetained"
 ])assert.equal(out[flag],false,flag);
 assert.ok(!JSON.stringify(out).includes("ASPIRINA C"));
 assert.ok(!JSON.stringify(out).includes("712729"));
 assert.ok(Object.isFrozen(out));
});
test("CIMA rejects substituted source registration and malformed national packs",()=>{
 const bad=[
  {...sample(),nregistro:"99999"},
  {...sample(),nregistro:51347},
  {...sample(),nombre:""},
  {...sample(),nombre:"VALID\u202eOTHER"},
  {...sample(),comerc:"yes"},
  {...sample(),receta:"no"},
  {...sample(),principiosActivos:[]},
  {...sample(),presentaciones:[]},
  {...sample(),presentaciones:[{cn:712729,nombre:"Wrong"}]},
  {...sample(),presentaciones:[{cn:"712729",nombre:"INVALID\u2066"}]},
  {...sample(),presentaciones:[{cn:"712729",nombre:"A"}].concat(
    Array.from({length:81},()=>({cn:"712729",nombre:"B"})))}
 ];
 for(const entry of bad)assert.throws(
  ()=>validateCimaMedicineSample(entry),/publisher schema/
 );
 assert.equal(validateCimaMedicineSample(sample()).recordCount,1);
});
test("CIMA fails closed on publisher HTTP, MIME, content-length, redirects and malformed JSON",async()=>{
 const cases=[
  async()=>new Response("no",{status:403,headers:{"content-type":"application/json"}}),
  async()=>new Response("<html>no</html>",{headers:{"content-type":"text/html"}}),
  async()=>new Response("broken",{headers:{"content-type":"application/json"}}),
  async()=>new Response("",{headers:{"content-type":"application/json"}}),
  async()=>new Response(JSON.stringify(sample()),{
    headers:{"content-type":"application/json","content-length":"70000"}}),
  async()=>new Response(JSON.stringify({pad:"X".repeat(66000)}),{
    headers:{"content-type":"application/json"}})
 ];
 for(const transport of cases)await assert.rejects(
  probeCimaPublicMedicine({transport,now:()=>NOW}),
  /CIMA public source observation denied:/
 );
 const fake=makeResponse(sample());
 await assert.rejects(probeCimaPublicMedicine({
  transport:async()=>({...fake,ok:true,redirected:true,headers:fake.headers}),
  now:()=>NOW
 }),/redirected request/);
 await assert.rejects(probeCimaPublicMedicine({
  transport:async()=>({...fake,ok:true,redirected:false,
   headers:fake.headers,url:"https://other-country.example/api",body:fake.body}),
  now:()=>NOW
 }),/unexpected publisher endpoint/);
});
test("CIMA never leaks an upstream or transport exception",async()=>{
 const secret="SENSITIVE_SERVER_TOKEN";
 await assert.rejects(probeCimaPublicMedicine({
  transport:async()=>{throw new Error(secret)},now:()=>NOW
 }),err=>!err.message.includes(secret)&&/connection unavailable/.test(err.message));
});
test("CIMA clock must be valid, monotonic and within bounded observation window",async()=>{
 let calls=0;
 for(const invalid of [NaN,undefined,-1,Infinity,"time",NOW+0.2]){
  await assert.rejects(probeCimaPublicMedicine({
   now:()=>invalid,transport:async()=>{calls++;return makeResponse(sample())}
  }),/invalid observation clock/);
 }
 assert.equal(calls,0);
 for(const end of [NOW-1,NOW+13001,NaN]){
  const times=[NOW,end];
  await assert.rejects(probeCimaPublicMedicine({
   now:()=>times.shift(),transport:async()=>makeResponse(sample())
  }),/invalid observation clock/);
 }
});
