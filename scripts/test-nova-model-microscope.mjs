import assert from "node:assert/strict";
import test from "node:test";
import { inspectGovernedModelFeature as inspect, MODEL_MICROSCOPE_CONTRACT } from "../src/core/ai/model-microscope.mjs";
const now = Date.parse("2026-11-18T08:00:00Z");
const scope = Object.freeze({
  tenantId: "tenant-a", actorId: "user-a", modelId: "nova-vision",
  modelVersion: "1.2.0", layerId: "stage-3", featureId: "channel-17",
  purpose: "research_model_inspection"
});
const onlyKeys = ["tenantId","actorId","modelId","modelVersion","layerId","featureId"];
const scoped = Object.fromEntries(onlyKeys.map(key => [key, scope[key]]));
const authorised = { ...scoped, allowed: true, channel: "protected_backend", purpose: scope.purpose, grantId: "grant-7", expiresAt: "2026-11-18T09:00:00Z" };
const record = {
  ...scoped, privacyClass: "approved_non_patient", rightsReview: "approved",
  provenanceVerified: true, inspectionState: "human_reviewed_candidate",
  patientContentPresent: false, modelReleaseApproval: "research_only",
  explanationState: "hypothesis_only", architecture: "Test vision network",
  featureHypothesis: "Possible curved-edge feature, not proven",
  datasetRef: "approved-synthetic-set", evaluationRef: "eval-17",
  provenanceSha256: "a".repeat(64), visualizationSha256: "b".repeat(64),
  rawTensor: ["SENSITIVE_DO_NOT_RETURN"], patientName: "SENSITIVE_DO_NOT_RETURN"
};
function deps(auth = authorised, artifact = record) {
  let loads = 0;
  return {
    get loads() { return loads; },
    authorizeRead: async () => auth,
    loadRecord: async () => { loads += 1; return artifact; }
  };
}
test("fails closed before reading when actor/tenant/model/feature rights are missing", async () => {
  for (const grant of [null, {}, { ...authorised, allowed: false },
    { ...authorised, tenantId: "tenant-b" },
    { ...authorised, featureId: "other-feature" },
    { ...authorised, channel: "mobile_client" },
    { ...authorised, expiresAt: "2026-11-18T07:00:00Z" }]) {
    const d = deps(grant);
    await assert.rejects(inspect({ request: scope, now, ...d }), /denied/);
    assert.equal(d.loads, 0);
  }
});
test("denies spoofed caller grants and incomplete requests", async () => {
  const d = deps();
  await assert.rejects(inspect({ request: { ...scope, tenantId: "bad tenant" }, now, ...d }), /invalid scoped request/);
  await assert.rejects(inspect({ request: { ...scope, purpose: "clinical_decision" }, now, ...d }), /invalid purpose/);
  await assert.rejects(inspect({ request: scope, now }), /trusted backend adapters missing/);
  assert.equal(d.loads, 0);
});
test("rejects model, rights, privacy and provenance scope mismatches", async () => {
  const changes = [
    { tenantId: "tenant-b" }, { modelVersion: "other" },
    { rightsReview: "not-reviewed" }, { privacyClass: "patient" },
    { patientContentPresent: true }, { provenanceVerified: false },
    { inspectionState: "unreviewed" }, { modelReleaseApproval: "production" },
    { explanationState: "verified_fact" }, { provenanceSha256: "invalid" }
  ];
  for (const change of changes) {
    await assert.rejects(inspect({ request: scope, now, ...deps(authorised, {...record, ...change}) }), /denied/);
  }
});
test("returns limited hypothesis-only metadata without sensitive fields", async () => {
  const result = await inspect({ request: scope, now, ...deps() });
  assert.equal(result.contract, MODEL_MICROSCOPE_CONTRACT);
  assert.equal(result.canPublish, false);
  assert.equal(result.inferenceEnabled, false);
  assert.equal(result.clinicalDecisionReady, false);
  assert.equal(result.explanationState, "hypothesis_only");
  assert.equal(result.featureHypothesis, record.featureHypothesis);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /SENSITIVE_DO_NOT_RETURN|rawTensor|patientName/);
  assert.equal(Object.isFrozen(result), true);
});
