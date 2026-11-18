import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const authorised = { ...scoped, allowed: true, channel: "protected_backend", purpose: scope.purpose, grantId: "grant-7", expiresAt: "2026-11-18T08:04:00.000Z" };
const record = {
  ...scoped, privacyClass: "approved_non_patient", rightsReview: "approved",
  provenanceVerified: true, inspectionState: "human_reviewed_candidate",
  patientContentPresent: false, modelReleaseApproval: "research_only",
  explanationState: "hypothesis_only", architecture: "Test vision network",
  featureHypothesis: "Possible curved-edge feature, not proven",
  datasetRef: "approved-synthetic-set", evaluationRef: "eval-17", rightsGrantId: "rights-31",
  provenanceSha256: "a".repeat(64), visualizationSha256: "b".repeat(64), modelArtifactSha256: "d".repeat(64),
  rawTensor: ["SENSITIVE_DO_NOT_RETURN"], patientName: "SENSITIVE_DO_NOT_RETURN"
};
const verified = {
  ...scoped, provenanceSha256: record.provenanceSha256,
  visualizationSha256: record.visualizationSha256, modelArtifactSha256: record.modelArtifactSha256,
  datasetRef: record.datasetRef, evaluationRef: record.evaluationRef,
  rightsGrantId: record.rightsGrantId, authorizationGrantId: authorised.grantId,
  reviewState: "independently_verified", modelRightsApproved: true,
  datasetRightsApproved: true, patientDataExcluded: true,
  separationOfDutiesVerified: true
};
function deps(auth = authorised, artifact = record, proof = verified) {
  let loads = 0;
  let verifications = 0;
  return {
    get loads() { return loads; },
    get verifications() { return verifications; },
    authorizeRead: async () => auth,
    loadRecord: async () => { loads += 1; return artifact; },
    verifyEvidence: async () => { verifications += 1; return proof; }
  };
}
test("fails closed before reading when actor/tenant/model/feature rights are missing", async () => {
  for (const grant of [null, {}, { ...authorised, allowed: false },
    { ...authorised, tenantId: "tenant-b" },
    { ...authorised, featureId: "other-feature" },
    { ...authorised, channel: "mobile_client" },
    { ...authorised, expiresAt: "2026-11-18T07:00:00.000Z" },
    { ...authorised, expiresAt: "2026-11-18T09:00:00.000Z" },
    { ...authorised, expiresAt: "2026-11-18T08:04:00+00:00" }]) {
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
    { explanationState: "verified_fact" }, { provenanceSha256: "invalid" },
    { visualizationSha256: "invalid" }, { modelArtifactSha256: "invalid" },
    { rightsGrantId: "another-rights-grant" }
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

test("independent evidence verifier must bind rights, tenant, digest and reviewer separation", async () => {
  for (const proof of [null, {},
    { ...verified, tenantId: "tenant-b" },
    { ...verified, provenanceSha256: "c".repeat(64) },
    { ...verified, visualizationSha256: "c".repeat(64) },
    { ...verified, modelArtifactSha256: "c".repeat(64) },
    { ...verified, rightsGrantId: "rights-other" },
    { ...verified, authorizationGrantId: "fake-authorization" },
    { ...verified, datasetRightsApproved: false },
    { ...verified, modelRightsApproved: false },
    { ...verified, patientDataExcluded: false },
    { ...verified, separationOfDutiesVerified: false },
    { ...verified, reviewState: "self_approved" }]) {
    const d = deps(authorised, record, proof);
    await assert.rejects(inspect({ request: scope, now, ...d }), /denied/);
    assert.equal(d.loads, 1);
    assert.equal(d.verifications, 1);
  }
});

test("artifacts never self-certify independent authorization or expose grant identifiers", async () => {
  const d = deps(authorised, record, verified);
  const result = await inspect({ request: scope, now, ...d });
  assert.equal(d.verifications, 1);
  assert.equal(Object.hasOwn(result, "rightsGrantId"), false);
  assert.equal(Object.hasOwn(result, "authorizationGrantId"), false);
  assert.equal(Object.hasOwn(result, "patientName"), false);
});

test("the public-facing response exactly matches a restrictive review schema", async () => {
  const schema = JSON.parse(readFileSync(new URL("../docs/intelligence/model-microscope-inspection-v1.schema.json", import.meta.url), "utf8"));
  const value = await inspect({ request: scope, now, ...deps() });
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(value).sort(), schema.required.slice().sort());
  assert.deepEqual(Object.keys(schema.properties).sort(), schema.required.slice().sort());
  for (const [key, constraints] of Object.entries(schema.properties)) {
    if (Object.hasOwn(constraints, "const")) assert.equal(value[key], constraints.const, key);
    if (constraints.type === "string") {
      assert.equal(typeof value[key], "string", key);
      if (constraints.pattern) assert.match(value[key], new RegExp(constraints.pattern), key);
      if (constraints.maxLength) assert.ok(value[key].length <= constraints.maxLength, key);
    }
  }
  for (const key of ["rawTensor", "imageBytes", "embedding", "patientName", "rightsGrantId", "authorizationGrantId"]) {
    assert.ok(!Object.hasOwn(schema.properties, key), key);
    assert.ok(!Object.hasOwn(value, key), key);
  }
});

test("interpretability is registered as a non-operational model use case with risk and licence gates", () => {
  const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const register = JSON.parse(read("docs/ai-use-case-register.json"));
  const item = register.roadmapOnly.find((entry) => entry.id === "model-feature-interpretability");
  assert.ok(item);
  assert.equal(item.maturity, "source-only-not-operational");
  assert.match(item.prohibitedUse, /medical|regulatory|commercial/i);
  assert.match(item.requiredData, /licensed|inspectable/i);
  assert.match(read("docs/ai-risk-register.md"), /False model-feature explanations/);
  assert.match(read("docs/ai-model-licence-review.md"), /does not authorize access to OpenAI model internals/);
  assert.match(read("docs/ai-system-card.md"), /no approved inspectable model/i);
  const models = JSON.parse(read("docs/ai-model-register.json"));
  const evidenceVector = models.models.find((entry) => entry.id === "novapharm-evidence-vector-v1");
  assert.match(evidenceVector.implementation, /no neural weights/i);
  assert.ok(!models.models.some((entry) => entry.id === "model-microscope-live"));
});
