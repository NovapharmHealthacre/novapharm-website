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
    { ...authorised, expiresAt: "2026-11-18T08:04:00+00:00" },
    { ...authorised, expiresAt: "2026-11-31T08:04:00.000Z" }]) {
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

test("short-lived grant expiry during asynchronous loading or independent verification denies output", async () => {
  for (const ticks of [
    [now, now + 5 * 60 * 1000],
    [now, now + 60 * 1000, now + 5 * 60 * 1000]
  ]) {
    let index = 0;
    const d = deps();
    await assert.rejects(
      inspect({ request: scope, now: () => ticks[Math.min(index++, ticks.length - 1)], ...d }),
      /authorisation expired/
    );
    assert.equal(d.loads, 1);
    assert.equal(d.verifications, ticks.length === 2 ? 0 : 1);
  }
  await assert.rejects(inspect({ request: scope, now: () => NaN, ...deps() }), /invalid clock/);
});

test("scope is immutable across asynchronous authorizer and record callbacks", async () => {
  const mutable = { ...scope };
  const d = deps();
  const result = await inspect({
    request: mutable, now,
    authorizeRead: async requested => {
      assert.equal(Object.isFrozen(requested), true);
      assert.equal(requested.featureId, scope.featureId);
      mutable.featureId = "replaced-after-authorisation";
      return authorised;
    },
    loadRecord: async selected => {
      assert.equal(Object.isFrozen(selected), true);
      assert.equal(selected.featureId, scope.featureId);
      return record;
    },
    verifyEvidence: d.verifyEvidence
  });
  assert.equal(result.featureId, scope.featureId);
  assert.equal(mutable.featureId, "replaced-after-authorisation");
});

test("record mutation during independent verification never changes authorized response or digest", async () => {
  const mutableRecord = { ...record };
  const observed = await inspect({
    request: scope, now,
    authorizeRead: async () => authorised,
    loadRecord: async () => mutableRecord,
    verifyEvidence: async () => {
      mutableRecord.architecture = "SECRET_UNREVIEWED_ARCHITECTURE";
      mutableRecord.featureHypothesis = "SECRET_UNREVIEWED_HYPOTHESIS";
      mutableRecord.datasetRef = "unapproved-dataset";
      mutableRecord.modelArtifactSha256 = "0".repeat(64);
      return verified;
    }
  });
  assert.equal(observed.architecture, record.architecture);
  assert.equal(observed.featureHypothesis, record.featureHypothesis);
  assert.equal(observed.datasetRef, record.datasetRef);
  assert.equal(observed.modelArtifactSha256, record.modelArtifactSha256);
  assert.doesNotMatch(JSON.stringify(observed), /SECRET_UNREVIEWED|unapproved-dataset/);
});

test("trusted adapter and clock failures never disclose backend secrets or raw errors", async () => {
  const marker = "SECRET_UPSTREAM_TOKEN_AND_INTERNAL_DATABASE_URI";
  const secretError = () => { throw new Error(marker); };
  for (const failing of ["authorizeRead", "loadRecord", "verifyEvidence"]) {
    const callbacks = { ...deps(), [failing]: async () => secretError() };
    await assert.rejects(
      inspect({ request: scope, now, ...callbacks }),
      (error) => error instanceof Error &&
        /Model inspection denied:/.test(error.message) &&
        !error.message.includes(marker)
    );
  }
  await assert.rejects(
    inspect({ request: scope, now: secretError, ...deps() }),
    (error) => error instanceof Error && error.message === "Model inspection denied: invalid clock"
  );
});

test("grant expiry during asynchronous authorizer denies before protected artifact access", async () => {
  let clock = now;
  const expired = Date.parse(authorised.expiresAt);
  const d = deps();
  await assert.rejects(
    inspect({
      request: scope, now: () => clock,
      authorizeRead: async () => { clock = expired; return authorised; },
      loadRecord: d.loadRecord,
      verifyEvidence: d.verifyEvidence
    }),
    /missing, mismatched or expired authorisation/
  );
  assert.equal(d.loads, 0);
  assert.equal(d.verifications, 0);
});

test("server clock regressions and fractional or negative times fail closed", async () => {
  for (const invalid of [-1, 0.5, Infinity, NaN]) {
    const d = deps();
    await assert.rejects(inspect({ request: scope, now: () => invalid, ...d }), /invalid clock/);
    assert.equal(d.loads, 0);
  }
  let reads = 0;
  const tick = [now, now + 1000, now - 1];
  await assert.rejects(inspect({
    request: scope, now: () => tick[Math.min(reads++, tick.length - 1)],
    ...deps()
  }), /invalid clock/);
});

test("malformed scope and untrusted artifact or verifier accessors cannot disclose private errors", async () => {
  const marker = "PRIVATE_INTERNAL_SIGNER_PASSWORD";
  const poisoned = (value, property) => new Proxy(value, {
    get(target, key) {
      if (key === property) throw new Error(marker);
      return Reflect.get(target, key);
    }
  });
  for (const changed of [
    { request: poisoned({ ...scope }, "tenantId") },
    { authorizeRead: async () => poisoned({ ...authorised }, "allowed") },
    { loadRecord: async () => poisoned({ ...record }, "rightsReview") },
    { verifyEvidence: async () => poisoned({ ...verified }, "reviewState") }
  ]) {
    await assert.rejects(
      inspect({ request: scope, now, ...deps(), ...changed }),
      error => error instanceof Error &&
        /^Model inspection denied: /u.test(error.message) &&
        !error.message.includes(marker)
    );
  }
});

test("authorizer cannot extend or swap validated grant fields after storage begins", async () => {
  let clock = now;
  const originalExpiry = Date.parse("2026-11-18T08:00:01.000Z");
  const mutableGrant = { ...authorised, expiresAt: new Date(originalExpiry).toISOString() };
  let loads = 0, checks = 0;
  await assert.rejects(inspect({
    request: scope,
    now: () => clock,
    authorizeRead: async () => mutableGrant,
    loadRecord: async () => {
      loads++;
      clock = now + 2000;
      mutableGrant.expiresAt = authorised.expiresAt;
      mutableGrant.grantId = "changed-after-storage";
      return record;
    },
    verifyEvidence: async () => { checks++; return verified; }
  }), /authorisation expired while loading artifact/);
  assert.equal(loads, 1);
  assert.equal(checks, 0);
});

test("independent verification is bound to the original approved grant ID", async () => {
  const mutableGrant = { ...authorised };
  let seen;
  const output = await inspect({
    request: scope, now,
    authorizeRead: async () => mutableGrant,
    loadRecord: async () => {
      mutableGrant.grantId = "replaced-with-later-grant";
      return record;
    },
    verifyEvidence: async request => {
      seen = request.authorizationGrantId;
      return verified;
    }
  });
  assert.equal(seen, authorised.grantId);
  assert.equal(output.canPublish, false);
});
