import assert from "node:assert/strict";
import test from "node:test";
import { assessMultimodalBenchmark } from "../src/core/intelligence-multimodal-benchmark-metadata.mjs";

const cases = [
  {caseId:"case_a001",truth:"match",country:"GB",scenario:"clean"},
  {caseId:"case_b002",truth:"non_match",country:"GB",scenario:"typographic-overlay"},
  {caseId:"case_c003",truth:"match",country:"IN",scenario:"low-light"},
  {caseId:"case_d004",truth:"non_match",country:"IN",scenario:"clean"}
];
const predictions = [
  {caseId:"case_a001",predicted:"match"},
  {caseId:"case_b002",predicted:"match"},
  {caseId:"case_c003",predicted:"abstain"},
  {caseId:"case_d004",predicted:"non_match"}
];
const evaluate=(changes={})=>assessMultimodalBenchmark({cases,predictions,...changes});

test("calculates error denominators with false matches and abstentions separately",()=>{
  const o=evaluate();
  assert.equal(o.contract,"novapharm.intelligence.multimodal-benchmark-metadata.v1");
  assert.deepEqual(o.total.counts,{
    trueMatch:1,trueNonMatch:1,falseMatch:1,falseNonMatch:0,
    abstainOnMatch:1,abstainOnNonMatch:0
  });
  assert.equal(o.total.sampleSize,4);
  assert.equal(o.total.falseMatchPerNonMatchingCase,0.5);
  assert.equal(o.total.falseMatchAmongClaimedMatches,0.5);
  assert.equal(o.total.correctDecisionPerAllCases,0.5);
  assert.equal(o.total.abstentionRate,0.25);
  assert.equal(o.total.decisionCoverage,0.75);
  assert.deepEqual(o.byScenario.map(x=>x.key),["clean","low-light","typographic-overlay"]);
  assert.deepEqual(o.byCountry.map(x=>x.key),["GB","IN"]);
  assert.equal(o.plannedScenarioCount,9);
  assert.equal(o.allPlannedScenariosRepresented,false);
  assert.deepEqual(o.unmeasuredScenarios,[
    "adversarial-patch","blur","distribution-shift",
    "lookalike-pack","occlusion","translation"
  ]);
  assert.ok(Object.isFrozen(o.unmeasuredScenarios));
  assert.equal(o.byScenario.find(x=>x.key==="typographic-overlay").counts.falseMatch,1);
  assert.equal(o.byCountry.find(x=>x.key==="IN").counts.abstainOnMatch,1);
});

test("returns null rather than fabricating a rate with a zero denominator",()=>{
  const o=assessMultimodalBenchmark({
    cases:[cases[0]],predictions:[predictions[0]]
  });
  assert.equal(o.total.falseMatchPerNonMatchingCase,null);
  assert.equal(o.total.falseMatchAmongClaimedMatches,0);
  assert.equal(o.total.abstentionRate,0);
});

test("complete disagreement and total abstention cannot turn into model approval",()=>{
  const result=evaluate({predictions:predictions.map(x=>({...x,predicted:"abstain"}))});
  assert.equal(result.total.decisionCoverage,0);
  assert.equal(result.total.falseMatchAmongClaimedMatches,null);
  assert.equal(result.modelExecuted,false);
  assert.equal(result.independentlyVerified,false);
  assert.equal(result.licensedSourceRightsVerified,false);
  assert.equal(result.tenantAuthorised,false);
  assert.equal(result.productionAccepted,false);
  assert.equal(result.canPublish,false);
  assert.equal(result.clinicalUseAllowed,false);
  assert.equal(result.decisionReady,false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.byCountry));
  assert.ok(Object.isFrozen(result.total.counts));
});

test("rejects identifying text, unsupported conditions, duplicates and incomplete predictions",()=>{
  const invalid=[
    {cases:[],predictions:[]},
    {cases:[{...cases[0],patientName:"private"}],predictions:[predictions[0]]},
    {cases:[{...cases[0],country:"UK-France"}],predictions:[predictions[0]]},
    {cases:[{...cases[0],scenario:"not-reviewed"}],predictions:[predictions[0]]},
    {cases:[{...cases[0],caseId:"patient001"}],predictions:[predictions[0]]},
    {cases:[cases[0],cases[0]],predictions:[predictions[0],predictions[0]]},
    {cases,predictions:predictions.slice(1)},
    {cases,predictions:[predictions[0],predictions[0],predictions[2],predictions[3]]},
    {cases,predictions:[{...predictions[0],confidence:0.99},...predictions.slice(1)]},
    {cases,predictions:[{...predictions[0],predicted:"100% certain"},...predictions.slice(1)]}
  ];
  for (const item of invalid) {
    assert.throws(()=>assessMultimodalBenchmark(item),err=>
      err.code==="novapharm_multimodal_benchmark_rejected");
  }
});

test("order-independent aggregate output excludes case identifiers and raw predictions",()=>{
  const a=evaluate(),b=assessMultimodalBenchmark({
    cases:[...cases].reverse(),predictions:[...predictions].reverse()
  });
  assert.deepEqual(a,b);
  const serial=JSON.stringify(a);
  assert.ok(!serial.includes("case_a001"));
  assert.ok(!serial.includes("case_d004"));
  assert.doesNotMatch(serial,/"productionAccepted":true|"canPublish":true/u);
});

test("even perfect reported results cannot confer rights, approval or cover untested attacks",()=>{
  const allCorrect = [
    {caseId:"case_a001",predicted:"match"},
    {caseId:"case_b002",predicted:"non_match"},
    {caseId:"case_c003",predicted:"match"},
    {caseId:"case_d004",predicted:"non_match"}
  ];
  const result = evaluate({predictions:allCorrect});
  assert.equal(result.total.correctDecisionPerAllCases,1);
  assert.equal(result.total.falseMatchPerNonMatchingCase,0);
  assert.equal(result.allPlannedScenariosRepresented,false);
  assert.equal(result.unmeasuredScenarios.includes("adversarial-patch"),true);
  for(const key of ["modelExecuted","independentlyVerified","licensedSourceRightsVerified","tenantAuthorised","productionAccepted","canPublish","clinicalUseAllowed","decisionReady"]){
    assert.equal(result[key],false,key);
  }
});
