import assert from "node:assert/strict";
import test from "node:test";
import {
  multimodalResearchReferences,
  multimodalResearchDuplicates,
  multimodalEvaluationDimensions,
  multimodalModelReleaseBlockers,
  assessMultimodalResearchBasis
} from "../src/core/intelligence-multimodal-research-basis.mjs";
import { multimodalSyntheticProbes, runMultimodalSyntheticThreatAudit } from "../src/core/intelligence-multimodal-threat-evaluation.mjs";

const unique = new Set(multimodalResearchReferences.map(x => x.number));

test("all 22 supplied citation positions map to exactly 21 unique verified source pointers", () => {
  assert.equal(multimodalResearchReferences.length,21);
  assert.deepEqual([...unique].sort((a,b)=>a-b),Array.from({length:21},(_,i)=>i+1));
  assert.deepEqual(multimodalResearchDuplicates,[
    {suppliedNumber:22,canonicalNumber:15,reason:"Identical Crawford–Paglen (2019) reference"}
  ]);
  assert.ok(multimodalResearchReferences.every(ref=>/^https:\/\//u.test(ref.url) &&
    Number.isSafeInteger(ref.year) && ref.title.length > 8 &&
    Object.hasOwn(multimodalEvaluationDimensions,ref.theme) &&
    typeof ref.engineeringRule === "string" && ref.engineeringRule.length>28));
  assert.ok(Object.isFrozen(multimodalResearchReferences));
});

test("seven independent research dimensions remain plans and never grant model admission",()=>{
  const plan = assessMultimodalResearchBasis();
  assert.equal(plan.suppliedEntries,22);
  assert.equal(plan.distinctWorks,21);
  assert.equal(plan.duplicateEntries,1);
  assert.equal(plan.dimensions.length,7);
  assert.ok(plan.dimensions.every(x=>x.planned && !x.independentlyMeasured));
  assert.ok(multimodalModelReleaseBlockers.length>=9);
  for(const field of ["trainingDataImported","modelInferenceEnabled","dataRightsApproved","productionAccepted","canPublish","decisionReady"]){
    assert.equal(plan[field],false,field);
  }
  assert.equal(plan.realModelEvaluationCount,0);
});

test("offline synthetic regression suite covers all papers without making an image/model claim",()=>{
  const report = runMultimodalSyntheticThreatAudit();
  assert.equal(report.cases,12);
  assert.equal(report.coveredReferenceCount,21);
  assert.deepEqual(report.failures,[]);
  assert.equal(report.syntheticOnly,true);
  for(const field of ["neuralNetworkTested","imageAttacksExecuted","realPatientOrProductRecordsUsed","modelRobustnessVerified","productionAccepted","canPublish"]){
    assert.equal(report[field],false,field);
  }
  const allMapped = new Set(multimodalSyntheticProbes.flatMap(x=>x.paperNumbers));
  assert.deepEqual(allMapped,unique);
  assert.ok(multimodalSyntheticProbes.every(p =>
    p.expectedStatus !== "verified" && p.expectedStatus !== "production_accepted" &&
    Object.hasOwn(multimodalEvaluationDimensions,p.theme) &&
    p.paperNumbers.every(n=>unique.has(n))));
  assert.equal(multimodalSyntheticProbes.filter(p=>p.expectedStatus==="human_review_required").length,1);
  assert.ok(Object.isFrozen(report));
});

test("research registry and probes cannot silently claim customer release or clinical accuracy",()=>{
  const source = JSON.stringify({
    references: multimodalResearchReferences,
    plan:assessMultimodalResearchBasis(),
    audit:runMultimodalSyntheticThreatAudit()
  });
  assert.equal(/"modelInferenceEnabled":true|"canPublish":true|"productionAccepted":true/u.test(source),false);
  assert.ok(!source.includes("patient identifiable"));
});
