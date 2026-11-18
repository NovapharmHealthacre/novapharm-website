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
