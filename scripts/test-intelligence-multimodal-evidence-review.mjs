import assert from "node:assert/strict";
import test from "node:test";
import { assessMultimodalEvidence, MULTIMODAL_CONTRACT } from "../src/core/intelligence-multimodal-evidence-review.mjs";

const sample = {
  userInitiated: true, nonSensitiveMaterialConfirmed: true,
  purpose: "catalogue-research", sourceReference: "approved-public-sample",
  country: "GB", visionMedicineName: "Example capsule",
  imageTextMedicineName: "Example capsule",
  referenceProductCode: "000123", observedProductCode: "000123"
};

test("contract never grants release, rights, tenant access or medicine identity", () => {
  const result = assessMultimodalEvidence(sample);
  assert.equal(result.contract, MULTIMODAL_CONTRACT);
  assert.equal(result.status, "human_review_required");
  for (const key of ["productionAccepted", "identityVerified", "confidenceCalibrated", "sourceRightsVerified", "tenantAuthorised", "canPublish", "decisionReady", "clinicalUseAllowed"]) {
    assert.equal(result[key], false, key);
  }
  assert.equal(result.reviewRequired, true);
  assert.ok(Object.isFrozen(result));
});

test("vision/text mismatch is treated as potential typographic conflict, not an attack finding", () => {
  const result = assessMultimodalEvidence({...sample, imageTextMedicineName: "Other formulation"});
  assert.equal(result.status, "conflicting_candidates");
  assert.deepEqual(result.signals, ["vision_text_name_conflict"]);
  assert.equal(result.identityVerified, false);
});

test("leading zeroes in codes are never coerced to numbers", () => {
  const result = assessMultimodalEvidence({...sample, observedProductCode: "123"});
  assert.equal(result.status, "conflicting_candidates");
  assert.ok(result.signals.includes("product_code_conflict"));
});

test("unapproved or sensitive purposes are blocked before any conclusions", () => {
  for (const override of [{userInitiated: false}, {nonSensitiveMaterialConfirmed: false}, {purpose:"diagnosis"}]) {
    const result = assessMultimodalEvidence({...sample,...override});
    assert.equal(result.status, "blocked");
    assert.ok(result.signals.includes("purpose_or_consent_missing"));
  }
});

test("empty and malformed inputs fail closed, absent provenance is insufficient", () => {
  assert.equal(assessMultimodalEvidence(null).status, "blocked");
  assert.equal(assessMultimodalEvidence([]).status, "blocked");
  assert.equal(assessMultimodalEvidence({...sample,sourceReference:""}).status, "insufficient_evidence");
  assert.equal(assessMultimodalEvidence({...sample,visionMedicineName:"",imageTextMedicineName:"",observedProductCode:""}).status, "insufficient_evidence");
});

test("never echo user data or patient information into the result or logs", () => {
  const privateMarker = "PRIVATE-NOT-FOR-OUTPUT-391";
  const result = assessMultimodalEvidence({...sample, imageTextMedicineName:privateMarker});
  assert.equal(JSON.stringify(result).includes(privateMarker), false);
  assert.equal(JSON.stringify(result).includes("000123"), false);
});

test("multilingual medicine names remain distinguishable, not erased as ASCII", () => {
  const result = assessMultimodalEvidence({
    ...sample, visionMedicineName:"薬剤甲", imageTextMedicineName:"薬剤乙"
  });
  assert.equal(result.status,"conflicting_candidates");
  assert.ok(result.signals.includes("vision_text_name_conflict"));
});

test("never silently truncate identifiers, including 241-character spoofed suffixes", () => {
  const long = "X".repeat(240) + "Y";
  const result = assessMultimodalEvidence({ ...sample, observedProductCode:long });
  assert.equal(result.status, "blocked");
  assert.ok(result.signals.includes("invalid_or_oversized_input"));
  assert.equal(JSON.stringify(result).includes(long), false);
});

test("reject spoofed/invisible text and non-string inputs", () => {
  for (const value of ["A\u202eB", "A\u200bB", { text:"Example" }, ["Example"]]) {
    const result = assessMultimodalEvidence({...sample, imageTextMedicineName:value});
    assert.equal(result.status, "blocked");
    assert.ok(result.signals.includes("invalid_or_oversized_input"));
  }
});

test("product identifiers retain punctuation and case; semantics cannot waive code mismatch", () => {
  const result = assessMultimodalEvidence({
    ...sample, referenceProductCode:"AB/000123", observedProductCode:"AB-000123"
  });
  assert.equal(result.status,"conflicting_candidates");
  assert.ok(result.signals.includes("product_code_conflict"));
});

test("equal image/text labels cannot conceal a different strength, form or manufacturer", () => {
  for (const [field, observed, signal] of [
    ["observedStrength", "20 mg", "strength_conflict"],
    ["observedDoseForm", "capsule", "dose_form_conflict"],
    ["observedManufacturer", "Other Manufacturer", "manufacturer_conflict"]
  ]) {
    const baseline = {
      ...sample,
      referenceStrength: "10 mg", observedStrength: "10 mg",
      referenceDoseForm: "tablet", observedDoseForm: "tablet",
      referenceManufacturer: "Example Manufacturer", observedManufacturer: "Example Manufacturer"
    };
    const result = assessMultimodalEvidence({ ...baseline, [field]: observed });
    assert.equal(result.status, "conflicting_candidates");
    assert.ok(result.signals.includes(signal));
    assert.equal(result.identityVerified, false);
    assert.equal(result.canPublish, false);
  }
});

test("even all matching identity attributes do not authorize any identity decision", () => {
  const result = assessMultimodalEvidence({
    ...sample, referenceStrength: "10 mg", observedStrength: "10 mg",
    referenceDoseForm: "tablet", observedDoseForm: "tablet",
    referenceManufacturer: "Example Manufacturer", observedManufacturer: "Example Manufacturer"
  });
  assert.equal(result.status, "human_review_required");
  assert.equal(result.identityVerified, false);
  assert.equal(result.clinicalUseAllowed, false);
  assert.equal(result.decisionReady, false);
});

test("oversized new pharmaceutical identity fields are also refused", () => {
  const result = assessMultimodalEvidence({
    ...sample, referenceStrength: "1".repeat(241)
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.signals.includes("invalid_or_oversized_input"));
});

test("rejects prototype-inherited consent and accessor-side effects",()=>{
  const inherited = Object.assign(Object.create({
    userInitiated:true,nonSensitiveMaterialConfirmed:true,purpose:"catalogue-research"
  }),{
    sourceReference:"synthetic",country:"GB",
    visionMedicineName:"Example",imageTextMedicineName:"Example"
  });
  let readCount=0;
  const accessor={...sample};
  Object.defineProperty(accessor,"visionMedicineName",{
    enumerable:true,get:()=>{readCount++;return "Example";}
  });
  const extras={...sample,modelInferenceApproved:true};
  for(const value of [inherited,accessor,extras]){
    const result=assessMultimodalEvidence(value);
    assert.equal(result.status,"blocked");
    assert.equal(result.canPublish,false);
    assert.ok(result.signals.includes("invalid_or_oversized_input"));
  }
  assert.equal(readCount,0,"Unsafe user-defined getters must never execute");
});

test("unknown metadata, including private fields and phantom model rights, cannot be silently ignored",()=>{
  for(const injected of [
    {patientName:"private"},
    {sourceRightsVerified:true},
    {verifiedRegulatoryStatus:true},
    {modelConfidence:0.99999}
  ]){
    const result=assessMultimodalEvidence({...sample,...injected});
    assert.equal(result.status,"blocked");
    assert.equal(result.identityVerified,false);
    assert.equal(result.sourceRightsVerified,false);
    assert.equal(result.decisionReady,false);
    assert.ok(result.signals.includes("invalid_or_oversized_input"));
  }
});

test("one-sided code, strength, form or manufacturer must not be reported as an ordinary review",()=>{
  const baseline={
    ...sample,
    referenceStrength:"10 mg",observedStrength:"10 mg",
    referenceDoseForm:"tablet",observedDoseForm:"tablet",
    referenceManufacturer:"Example Lab",observedManufacturer:"Example Lab"
  };
  for(const field of [
    "observedProductCode","referenceProductCode",
    "observedStrength","referenceStrength",
    "observedDoseForm","referenceDoseForm",
    "observedManufacturer","referenceManufacturer"
  ]){
    const result=assessMultimodalEvidence({...baseline,[field]:""});
    assert.equal(result.status,"insufficient_evidence",field);
    assert.ok(result.signals.includes("incomplete_critical_attribute_pair"),field);
    assert.equal(result.identityVerified,false);
    assert.equal(result.canPublish,false);
  }
});
