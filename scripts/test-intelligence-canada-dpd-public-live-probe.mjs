import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  CA_DPD_SOURCE,validateCanadianDpdSample,probeCanadianDpdPublicSource
} from "../src/core/intelligence-canada-dpd-public-live-probe.mjs";

const NOW=Date.parse("2026-11-18T11:00:00.000Z");
const sample=()=>({
  drug_code:2049,class_name:"Human",
  drug_identification_number:"00326925",
  brand_name:"SINEQUAN",descriptor:"",
  number_of_ais:"1",ai_group_no:"0107703005",
  company_name:"ASPRI PHARMA CANADA INC",
  last_update_date:"2019-03-05"
});
const response=data=>new Response(JSON.stringify(data),{
  headers:{"content-type":"application/json"}
});
test("Canada DPD is bound to exact national regulator and all-country baseline",()=>{
  const all=JSON.parse(readFileSync(new URL(
    "../docs/intelligence/global-pharma-sources-20261117.json",import.meta.url),
    "utf8"
  )).sources;
  const source=all.filter(x=>x.candidateKey===CA_DPD_SOURCE.registryCandidateKey);
  assert.equal(source.length,1);
  assert.equal(source[0].country,"Canada");
  assert.equal(source[0].provider,"Health Canada Drug Product Database");
  assert.equal(source[0].mode,"API");
  assert.equal(source[0].rightsStatus,"not-reviewed");
  assert.equal(source[0].integrationStatus,"candidate-only");
  assert.equal(source[0].dataAdmission,"not-admitted");
  assert.equal(source[0].activeAdapterId,null);
  assert.equal(CA_DPD_SOURCE.url,
    "https://health-products.canada.ca/api/drug/drugproduct/?din=00326925&lang=en&type=json");
  assert.ok(Object.isFrozen(CA_DPD_SOURCE));
});

test("one official DIN result stays a SHA-256 and time receipt, not customer medicine content",async()=>{
  for(const data of [sample(),[sample()]]){
    let requests=0;
    const result=await probeCanadianDpdPublicSource({
      now:()=>NOW,
      transport:async(url,options)=>{
        requests++;
        assert.equal(url,CA_DPD_SOURCE.url);
        assert.equal(options.method,"GET");
        assert.equal(options.redirect,"error");
        assert.equal(options.credentials,"omit");
        assert.equal(options.cache,"no-store");
        return response(data);
      }
    });
    assert.equal(requests,1);
    assert.equal(result.schemaBoundRecords,1);
    assert.equal(result.sourceNativeDinPreserved,true);
    assert.equal(result.officialSourceHttpResponseVerified,true);
    assert.equal(result.sourceRecordLastUpdated,"2019-03-05");
    assert.match(result.payloadSha256,/^[a-f0-9]{64}$/);
    for(const f of [
      "licensedCommercialAiReuseIndependentlyApproved",
      "publisherDatasetSnapshotAdmitted",
      "nationalDrugIdentifiersReconciled",
      "customerProductionDeploymentVerified",
      "clinicalDecisionReady","commercialDecisionReady",
      "customerCountryLive","canPublish","rawDrugRecordsRetained"
    ])assert.equal(result[f],false,f);
    assert.ok(!JSON.stringify(result).includes("SINEQUAN"));
    assert.ok(!JSON.stringify(result).includes("drug_identification_number"));
    assert.ok(Object.isFrozen(result));
  }
});

test("lossless native DIN and declared Canadian schema reject substitutions",()=>{
  const invalid=[
    {...sample(),drug_identification_number:"326925"},
    {...sample(),drug_identification_number:326925},
    {...sample(),drug_identification_number:"00326926"},
    {...sample(),drug_code:"2049"},
    {...sample(),drug_code:-1},
    {...sample(),brand_name:""},
    {...sample(),brand_name:"SINEQUAN\u202eFALSE"},
    {...sample(),company_name:""},
    {...sample(),class_name:""},
    {...sample(),last_update_date:"2019-02-31"},
    {...sample(),last_update_date:"2019/03/05"},
    {},
    [],
    [sample(),sample()]
  ];
  for(const x of invalid)assert.throws(
    ()=>validateCanadianDpdSample(x),/Canadian DPD source probe denied:/);
  assert.equal(validateCanadianDpdSample(sample()).sourceNativeDinPreserved,true);
});

test("invalid source MIME, status, redirects and oversized streams fail closed",async()=>{
  const cases=[
    async()=>new Response("forbidden",{
      status:403,headers:{"content-type":"application/json"}
    }),
    async()=>new Response("<html/>",{
      headers:{"content-type":"text/html"}
    }),
    async()=>new Response("{broken",{
      headers:{"content-type":"application/json"}
    }),
    async()=>new Response("",{
      headers:{"content-type":"application/json"}
    }),
    async()=>new Response(JSON.stringify(sample()),{
      headers:{"content-type":"application/json","content-length":"100000"}
    }),
    async()=>new Response(JSON.stringify({pad:"A".repeat(66000)}),{
      headers:{"content-type":"application/json"}
    })
  ];
  for(const transport of cases){
    await assert.rejects(probeCanadianDpdPublicSource({
      transport,now:()=>NOW
    }),/Canadian DPD source probe denied:/);
  }
  const good=response(sample());
  await assert.rejects(probeCanadianDpdPublicSource({
    now:()=>NOW,
    transport:async()=>({
      ...good,ok:true,redirected:true,
      headers:good.headers,body:good.body
    })
  }),/redirected/);
  await assert.rejects(probeCanadianDpdPublicSource({
    now:()=>NOW,
    transport:async()=>({
      ...good,ok:true,redirected:false,
      headers:good.headers,body:good.body,url:"https://other.example/drugs"
    })
  }),/unexpected official source URL/);
});

test("Canadian publisher network diagnostics are sanitized and never expose credentials",async()=>{
  const testCases=[
    ["UND_ERR_CONNECT_TIMEOUT","timeout"],
    ["ENOTFOUND","dns"],
    ["CERT_HAS_EXPIRED","tls"],
    ["ECONNRESET","network"],
    ["UNEXPECTED_NET_FAILURE","network-or-policy"]
  ];
  for(const [code,category] of testCases){
    const secret="DO_NOT_LOG_SERVER_TOKEN";
    const error=Object.assign(new Error(secret),{
      cause:Object.assign(new Error(secret),{code})
    });
    await assert.rejects(probeCanadianDpdPublicSource({
      now:()=>NOW,
      transport:async()=>{throw error}
    }),e=>e.message==="Canadian DPD source probe denied: official source network unavailable ("+category+")" &&
      !e.message.includes(secret));
  }
});

test("Canadian source observation refuses invalid or rolled-back clocks",async()=>{
  let calls=0;
  for(const clockValue of [NaN,Infinity,-1,undefined,"now",NOW+.5]){
    await assert.rejects(probeCanadianDpdPublicSource({
      now:()=>clockValue,
      transport:async()=>{calls++;return response(sample())}
    }),/invalid trusted observation clock/);
  }
  assert.equal(calls,0);
  for(const finished of [NOW-1,NOW+25001,NaN]){
    const clocks=[NOW,finished];
    await assert.rejects(probeCanadianDpdPublicSource({
      now:()=>clocks.shift(),transport:async()=>response(sample())
    }),/stale or rolled-back observation/);
  }
});
