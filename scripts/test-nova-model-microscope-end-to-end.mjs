/**
 * SELF-CONTAINED, OFFLINE acceptance: synthetic first-party source code ->
 * deterministic neuron visualization -> independent SHA-256 evidence manifest ->
 * ephemeral Ed25519 review -> protected allow-listed read.
 * This is a test fixture, never a production signing or clinical data flow.
 */
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inspectGovernedModelFeature } from "../src/core/ai/model-microscope.mjs";
import { canonicalMicroscopeReceiptBytes, verifySignedMicroscopeEvidence } from "../src/core/ai/model-microscope-signed-evidence.mjs";
import { inspectSyntheticFeature } from "../src/core/ai/model-microscope-synthetic-reference.mjs";

const now = Date.parse("2026-11-18T08:01:00.000Z");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const modelSource = readFileSync(new URL("../src/core/ai/model-microscope-synthetic-reference.mjs", import.meta.url));
const scope = Object.freeze({
  tenantId: "synthetic-qa-tenant", actorId: "synthetic-researcher",
  modelId: "first-party-relu-reference", modelVersion: "source-v1",
  layerId: "features", featureId: "center-columns"
});
const identifiers = Object.keys(scope);
const bound = (obj) => Object.fromEntries(identifiers.map(key => [key, obj[key]]));
const original = inspectSyntheticFeature({ layerId: scope.layerId, featureId: scope.featureId });
const inputs = Object.freeze({
  datasetRef: "owned-synthetic-only",
  evaluationRef: "synthetic-fixture-zero-patients",
  rightsGrantId: "nonproduction-qa-owned-reference"
});
function visualizationBytes(visualization) {
  // Preserve canonical fixed field ordering across test platforms.
  return Buffer.from(JSON.stringify({
    modelId: scope.modelId, layerId: scope.layerId, featureId: scope.featureId,
    contract: visualization.contract, optimizedGrid: visualization.optimizedGrid,
    finalActivation: visualization.finalActivation
  }));
}
function makeHashes({ modelBytes = modelSource, visualization = original, datasetRef = inputs.datasetRef } = {}) {
  const modelArtifactSha256 = sha256(modelBytes);
  const visualizationSha256 = sha256(visualizationBytes(visualization));
  const provenanceSha256 = sha256(Buffer.from(JSON.stringify({
    modelArtifactSha256, visualizationSha256, datasetRef,
    evaluationRef: inputs.evaluationRef, rightsGrantId: inputs.rightsGrantId,
    method: "bounded-synthetic-projected-gradient-ascent-v1",
    patientData: "none"
  })));
  return { modelArtifactSha256, visualizationSha256, provenanceSha256 };
}
const issuedHashes = makeHashes();
const grant = Object.freeze({
  ...scope, allowed: true, purpose: "research_model_inspection",
  channel: "protected_backend", grantId: "synthetic-qa-grant",
  expiresAt: "2026-11-18T08:04:00.000Z"
});
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const keys = Object.freeze({ "qa-ephemeral-key": publicKey });
const signedPayload = Object.freeze({
  schemaVersion: "novapharm.model-microscope.signed-evidence.v1",
  keyId: "qa-ephemeral-key", issuerId: "qa-evidence-issuer",
  reviewerId: "qa-independent-reviewer", rightsApproverId: "qa-rights-approver",
  ...scope, ...inputs, authorizationGrantId: grant.grantId, ...issuedHashes,
  reviewState: "independently_verified", modelRightsApproved: true,
  datasetRightsApproved: true, patientDataExcluded: true, separationOfDutiesVerified: true,
  issuedAt: "2026-11-18T08:00:00.000Z", expiresAt: "2026-11-18T08:03:00.000Z"
});
const envelope = Object.freeze({
  payload: signedPayload,
  signature: sign(null, canonicalMicroscopeReceiptBytes(signedPayload), privateKey).toString("base64url")
});
function recordFrom({ modelBytes, visualization, datasetRef } = {}) {
  const hashes = makeHashes({ modelBytes, visualization, datasetRef });
  return Object.freeze({
    ...scope, ...inputs, datasetRef: datasetRef ?? inputs.datasetRef, ...hashes,
    privacyClass: "approved_non_patient", rightsReview: "approved",
    provenanceVerified: true, inspectionState: "human_reviewed_candidate",
    patientContentPresent: false, modelReleaseApproval: "research_only",
    explanationState: "hypothesis_only",
    architecture: "Fixed first-party four-by-four ReLU reference",
    featureHypothesis: "A controlled synthetic center-column pattern only",
    rawNeuralWeights: "SECRET_EXCLUDED", clinicalResult: "SECRET_EXCLUDED"
  });
}
async function inspectFixture({ actor = scope.actorId, modelBytes, visualization, datasetRef } = {}) {
  const artifact = recordFrom({ modelBytes, visualization, datasetRef });
  return inspectGovernedModelFeature({
    request: { ...scope, actorId: actor, purpose: "research_model_inspection" },
    now,
    authorizeRead: async () => grant,
    loadRecord: async () => artifact,
    verifyEvidence: async expected => verifySignedMicroscopeEvidence({
      envelope, expected, trustedPublicKeys: keys, now
    })
  });
}
test("model source, actual visualization, provenance and human proof bind end-to-end offline", async () => {
  const report = await inspectFixture();
  assert.equal(report.modelArtifactSha256, sha256(modelSource));
  assert.equal(report.visualizationSha256, sha256(visualizationBytes(original)));
  assert.equal(report.provenanceSha256, issuedHashes.provenanceSha256);
  assert.equal(report.state, "research_candidate_only");
  assert.equal(report.canPublish, false);
  assert.equal(report.inferenceEnabled, false);
  assert.equal(report.clinicalDecisionReady, false);
  assert.equal(report.regulatoryDecisionReady, false);
  assert.equal(report.commercialDecisionReady, false);
  assert.doesNotMatch(JSON.stringify(report), /SECRET_EXCLUDED|rawNeuralWeights|clinicalResult|signature|rightsGrantId|authorizationGrantId/);
});
test("altered model source or visualization bytes cannot reuse the original signed receipt", async () => {
  const tamperedSource = Buffer.concat([modelSource, Buffer.from("\n// malicious model change\n")]);
  await assert.rejects(inspectFixture({ modelBytes: tamperedSource }), /denied/);
  const tamperedGrid = structuredClone(original);
  tamperedGrid.optimizedGrid[0][0] = Math.min(1, tamperedGrid.optimizedGrid[0][0] + 0.01);
  await assert.rejects(inspectFixture({ visualization: tamperedGrid }), /denied/);
});
test("rights, dataset, actor and clock are independent blocks on synthetic inspection", async () => {
  await assert.rejects(inspectFixture({ datasetRef: "other-synthetic-dataset" }), /denied/);
  await assert.rejects(inspectFixture({ actor: "another-actor" }), /denied/);
  const artifact = recordFrom();
  await assert.rejects(inspectGovernedModelFeature({
    request: { ...scope, purpose: "research_model_inspection" },
    now: Date.parse("2026-11-18T08:06:00.000Z"),
    authorizeRead: async () => grant,
    loadRecord: async () => artifact,
    verifyEvidence: async () => { throw Error("Expired grant must never verify"); }
  }), /denied/);
});
