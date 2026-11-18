import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  OFFICIAL_LIVE_PROBE_PLANS, validateOfficialLiveSample,
  probeOfficialPublicPharmaSource
} from "../src/core/intelligence-official-live-pharma-probes.mjs";

const NOW = Date.parse("2026-11-18T09:00:00.000Z");
const HSA_RESOURCE = "d_767279312753558cbf19d48344577084";
const fda = () => ({
  meta:{last_updated:"2026-08-07",results:{skip:0,limit:1,total:29260}},
  results:[{application_number:"ANDA076829",
    products:[{brand_name:"AMMONIUM LACTATE",marketing_status:"Discontinued"}]}]
});
const singapore = () => ({
  success:true,result:{
    resource_id:HSA_RESOURCE,
    fields:[{id:"LicenceNo",type:"text"},{id:"Productname",type:"text"},{id:"Activeingredients",type:"text"}],
    records:[{LicenceNo:"SIN00230P",Productname:"CHLORAMPHENICOL EAR DROPS 5% w/v",
      Activeingredients:"CHLORAMPHENICOL"}]
  }
});
const response = raw => new Response(JSON.stringify(raw),{
  headers:{"content-type":"application/json"}
});
const clock = () => NOW;

test("only exact current official FDA and Singapore dataset HTTPS origins can be called", () => {
  assert.deepEqual(Object.keys(OFFICIAL_LIVE_PROBE_PLANS).sort(),[
    "sg-hsa-registered-products","us-fda-drugsfda"]);
  const us=OFFICIAL_LIVE_PROBE_PLANS["us-fda-drugsfda"];
  const sg=OFFICIAL_LIVE_PROBE_PLANS["sg-hsa-registered-products"];
  assert.equal(us.url, "https://api.fda.gov/drug/drugsfda.json?limit=1");
  assert.equal(sg.url,"https://data.gov.sg/api/action/datastore_search?resource_id="+
    HSA_RESOURCE+"&limit=1");
  assert.equal(us.registryCandidateKey,"north-america-united-states-fda-openfda");
  assert.equal(sg.registryCandidateKey,"asia-pacific-singapore-hsa-data-gov-sg");
  assert.ok(Object.isFrozen(us));
  assert.ok(Object.isFrozen(sg));
});

test("real publisher-shaped data is probed only into non-customer evidence receipts", async () => {
  const cases=[["us-fda-drugsfda",fda()],["sg-hsa-registered-products",singapore()]];
  for(const [sourceId,fixture] of cases){
    const seen=[];
    const receipt=await probeOfficialPublicPharmaSource(sourceId,{
      now:clock,
      transport:async (url,opts)=>{seen.push({url,opts});return response(fixture);}
    });
    assert.equal(seen.length,1);
    assert.equal(seen[0].url,OFFICIAL_LIVE_PROBE_PLANS[sourceId].url);
    assert.equal(seen[0].opts.method,"GET");
    assert.equal(seen[0].opts.redirect,"error");
    assert.equal(seen[0].opts.credentials,"omit");
    assert.equal(seen[0].opts.cache,"no-store");
    assert.equal(seen[0].opts.headers.accept,"application/json");
    assert.equal(receipt.observedAt,new Date(NOW).toISOString());
    assert.equal(receipt.schemaBoundRecordCount,1);
    assert.equal(receipt.nativeIdentifierPresent,true);
    assert.match(receipt.upstreamContentSha256,/^[a-f0-9]{64}$/);
    assert.equal(receipt.publicPublisherEndpointResponded,true);
    for(const field of [
      "sourceRightsForCommercialAiReuseReviewed","publisherDatasetSnapshotAdmitted",
      "actualProductionApiConnected","customerCountryLive","canPublish",
      "clinicalDecisionReady","commercialDecisionReady","rawRecordsRetained"
    ])assert.equal(receipt[field],false,sourceId+":"+field);
    const body=JSON.stringify(receipt);
    assert.ok(!body.includes("ANDA076829"));
    assert.ok(!body.includes("SIN00230P"));
    assert.ok(!body.includes("AMMONIUM LACTATE"));
    assert.ok(!body.includes("CHLORAMPHENICOL EAR"));
    assert.ok(Object.isFrozen(receipt));
  }
});

test("verify source-native FDA and Singapore identities before observing connectivity", () => {
  assert.equal(validateOfficialLiveSample("us-fda-drugsfda",fda()).sourceRecordsValidated,1);
  assert.equal(validateOfficialLiveSample("sg-hsa-registered-products",singapore()).sourceRecordsValidated,1);
  const wrong=[
    ["us-fda-drugsfda",{...fda(),results:[]}],
    ["us-fda-drugsfda",{...fda(),results:[{application_number:"ANDA000000"}]}],
    ["us-fda-drugsfda",{...fda(),results:[{application_number:3922,products:[{brand_name:"B"}]}]}],
    ["us-fda-drugsfda",{...fda(),meta:{last_updated:"2026-08-07",results:{total:0}}}],
    ["sg-hsa-registered-products",{...singapore(),result:{...singapore().result,resource_id:"d_other"}}],
    ["sg-hsa-registered-products",{...singapore(),result:{...singapore().result,fields:[]}}],
    ["sg-hsa-registered-products",{...singapore(),result:{...singapore().result,records:[]}}],
    ["sg-hsa-registered-products",{...singapore(),result:{...singapore().result,records:[{LicenceNo:"SIN00230P"}]}}],
    ["sg-hsa-registered-products",{...singapore(),result:{...singapore().result,records:[{LicenceNo:123,Productname:"B"}]}}],
    ["sg-hsa-registered-products",{...singapore(),result:{...singapore().result,records:[
      {LicenceNo:"SIN00001P",Productname:"B"},{LicenceNo:"SIN00002P",Productname:"C"}]}}],
  ];
  for (const [sourceId,payload] of wrong){
    assert.throws(()=>validateOfficialLiveSample(sourceId,payload),
      /Official live source probe rejected:/,sourceId);
  }
});

test("malicious sourceId and caller-supplied URLs do not reach network", async () => {
  let requests=0;
  for(const sourceId of ["other","__proto__","constructor","us-fda-drugsfda/../../etc",""]){
    await assert.rejects(probeOfficialPublicPharmaSource(sourceId,{
      transport:async()=>{requests++;return response(fda())},now:clock
    }),/source not on fixed publisher allowlist/);
  }
  assert.equal(requests,0);
});

test("upstream errors are sanitized and fail closed rather than producing a receipt",async()=>{
  const secret="CREDENTIAL_DO_NOT_LOG";
  for(const upstream of [
    async()=>{throw new Error(secret)},
    async()=>new Response("forbidden",{status:403,headers:{"content-type":"application/json"}}),
    async()=>new Response("<html>redirect</html>",{headers:{"content-type":"text/html"}}),
    async()=>new Response("not-json",{headers:{"content-type":"application/json"}}),
    async()=>new Response("",{headers:{"content-type":"application/json"}}),
    async()=>new Response(JSON.stringify(fda()),{
      headers:{"content-type":"application/json","content-length":"200000"}})
  ]){
    await assert.rejects(probeOfficialPublicPharmaSource("us-fda-drugsfda",{
      now:clock,transport:upstream
    }),err=>err instanceof Error &&
      err.message.startsWith("Official live source probe rejected:") &&
      !err.message.includes(secret));
  }
});

test("source response stream must remain within 128 KiB and never redirect to another host",async()=>{
  const original=response(fda());
  await assert.rejects(probeOfficialPublicPharmaSource("us-fda-drugsfda",{
    now:clock,
    transport:async()=>({...original,ok:true,redirected:true,
      headers:original.headers,body:original.body,url:"https://other.tld/drugsfda.json"})
  }),/unexpected redirect/);
  await assert.rejects(probeOfficialPublicPharmaSource("us-fda-drugsfda",{
    now:clock,
    transport:async()=>({...response(fda()),ok:true,redirected:false,
      headers:response(fda()).headers,body:response(fda()).body,
      url:"https://api.fda.gov/drug/label.json?limit=1"})
  }),/source location mismatch/);
  const large=new Response(JSON.stringify({pad:"A".repeat(131072)}),{
    headers:{"content-type":"application/json"}
  });
  await assert.rejects(probeOfficialPublicPharmaSource("us-fda-drugsfda",{
    now:clock,transport:async()=>large
  }),/oversized/);
});

test("invalid, future, rolled-back or stale clock fails closed",async()=>{
  let requests=0;
  for(const bad of [NaN,undefined,null,Infinity,-1,{},NOW+0.5]){
    await assert.rejects(probeOfficialPublicPharmaSource("us-fda-drugsfda",{
      now:()=>bad,
      transport:async()=>{requests++;return response(fda())}
    }),/invalid trusted probe clock/);
  }
  assert.equal(requests,0);
  for(const followup of [NOW-1,NaN,Infinity,NOW+13001]){
    let calls=0;
    const timestamps=[NOW,followup];
    await assert.rejects(probeOfficialPublicPharmaSource("us-fda-drugsfda",{
      now:()=>timestamps.shift(),
      transport:async()=>{calls++;return response(fda())}
    }),/invalid or stale official observation clock/);
    assert.equal(calls,1);
  }
  await assert.rejects(probeOfficialPublicPharmaSource("us-fda-drugsfda",{
    now:42
  }),/invalid trusted transport or clock/);
});


test("both real upstream probes resolve to their original national registry publisher, never global aliases", () => {
  const source = JSON.parse(readFileSync(
    new URL("../docs/intelligence/global-pharma-sources-20261117.json",import.meta.url),
    "utf8"
  )).sources;
  for (const [id,plan] of Object.entries(OFFICIAL_LIVE_PROBE_PLANS)) {
    const match = source.filter(x=>x.candidateKey===plan.registryCandidateKey);
    assert.equal(match.length,1,id);
    assert.equal(match[0].country,plan.jurisdiction==="US"?"United States":"Singapore");
    assert.equal(match[0].region,plan.jurisdiction==="US"?"North America":"Asia Pacific");
    assert.ok(match[0].mode.includes("API"));
    assert.equal(match[0].rightsStatus,"not-reviewed");
    assert.equal(match[0].integrationStatus,"candidate-only");
    assert.equal(match[0].dataAdmission,"not-admitted");
    assert.equal(match[0].activeAdapterId,null);
  }
});
