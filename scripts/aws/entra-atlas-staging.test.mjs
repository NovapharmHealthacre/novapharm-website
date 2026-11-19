import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  approvedAtlasStagingConfig,
  atlasEvidenceCollection,
  atlasIngestionCollection,
  atlasStagingDatabase,
  evidenceFilter,
  listWorkspaceEvidence,
  validateEvidenceMetadata
} from "../../src/data/atlas-evidence-staging.mjs";

const manifest = JSON.parse(readFileSync("infra/aws/entra-atlas-staging-readiness.json", "utf8"));
const example = Object.freeze({
  workspace_id: "novapharm_staging",
  medicine_identity: "VMP:123456",
  source_id: "mhra-licensing",
  source_version: "2026-11-08",
  evidence_type: "observed_fact",
  observed_at: "2026-11-08T09:00:00Z",
  recorded_at: "2026-11-08T09:01:00Z",
  provenance_sha256: "a".repeat(64)
});

test("Atlas access is disabled unless staging is explicitly authorised", () => {
  const valid = {
    ATLAS_EVIDENCE_READ_ENABLED: "true",
    ATLAS_ENVIRONMENT: "staging",
    MONGODB_DATABASE: atlasStagingDatabase,
    MONGODB_EVIDENCE_COLLECTION: atlasEvidenceCollection
  };
  assert.deepEqual(approvedAtlasStagingConfig(valid), {
    database: "novapharm_staging",
    collection: "nova_medicine_evidence_staging"
  });
  for (const bad of [
    {}, { ...valid, ATLAS_EVIDENCE_READ_ENABLED: "false" },
    { ...valid, ATLAS_ENVIRONMENT: "production" },
    { ...valid, MONGODB_DATABASE: "admin" },
    { ...valid, MONGODB_EVIDENCE_COLLECTION: "users" },
    { ...valid, ATLAS_ALLOW_PUBLIC_NETWORK: "true" },
    { ...valid, ATLAS_ALLOW_PATIENT_DATA: "true" }
  ]) assert.throws(() => approvedAtlasStagingConfig(bad));
});

test("medicine evidence queries always bind workspace and identity, with no injected operators", () => {
  assert.deepEqual(evidenceFilter({ workspaceId: "tenant_123", medicineIdentity: "VMP:123456" }), {
    workspace_id: "tenant_123", medicine_identity: "VMP:123456"
  });
  assert.deepEqual(evidenceFilter({
    workspaceId: "tenant_123", medicineIdentity: "VMP:123456", asOf: "2026-11-08T00:00:00Z"
  }), {
    workspace_id: "tenant_123", medicine_identity: "VMP:123456",
    observed_at: { $lte: "2026-11-08T00:00:00Z" }
  });
  for (const bad of [
    { workspaceId: { $ne: null }, medicineIdentity: "VMP:123456" },
    { workspaceId: "tenant_123", medicineIdentity: { $regex: ".*" } },
    { workspaceId: "tenant_123", medicineIdentity: "VMP:123456", asOf: { $gte: "" } },
    { workspaceId: "anything;drop", medicineIdentity: "VMP:123456" },
    { workspaceId: "", medicineIdentity: "VMP:123456" }
  ]) assert.throws(() => evidenceFilter(bad));
});

test("evidence classes and provenance are enforced without personal records", () => {
  assert.deepEqual(validateEvidenceMetadata(example), example);
  for (const evidence_type of [
    "observed_fact", "derived_metric", "model_forecast",
    "commercial_assumption", "recommendation"
  ]) assert.equal(validateEvidenceMetadata({ ...example, evidence_type }).evidence_type, evidence_type);
  for (const bad of [
    { ...example, patient_email: "patient@example.com" },
    { ...example, access_token: "secret" },
    { ...example, evidence_type: "ai_confidence_score" },
    { ...example, source_id: { $ne: null } },
    { ...example, provenance_sha256: "short" },
    { ...example, recorded_at: "yesterday" }
  ]) assert.throws(() => validateEvidenceMetadata(bad));
});

test("read-only collection query limits results and projects no unapproved data", async () => {
  let filterSeen;
  let projection;
  let sortSeen;
  let limitSeen;
  const collection = {
    find(filter, opts) {
      filterSeen = filter;
      projection = opts.projection;
      return {
        sort(sort) {
          sortSeen = sort;
          return this;
        },
        limit(limit) {
          limitSeen = limit;
          return this;
        },
        async toArray() { return [{ ...example }]; }
      };
    }
  };
  const rows = await listWorkspaceEvidence(collection, {
    workspaceId: "novapharm_staging", medicineIdentity: "VMP:123456", limit: 25
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(filterSeen, { workspace_id: "novapharm_staging", medicine_identity: "VMP:123456" });
  assert.deepEqual(sortSeen, { observed_at: -1 });
  assert.equal(limitSeen, 25);
  assert.equal(projection._id, 0);
  assert.equal(projection.provenance_sha256, 1);
  assert.equal(projection.patient_email, undefined);
  await assert.rejects(listWorkspaceEvidence(collection, {
    workspaceId: "novapharm_staging", medicineIdentity: "VMP:123456", limit: 1001
  }));
  const malicious = {
    find() { return { sort() { return this; }, limit() { return this; }, async toArray() {
      return [{ ...example, workspace_id: "other_tenant" }];
    } }; }
  };
  await assert.rejects(listWorkspaceEvidence(malicious, {
    workspaceId: "novapharm_staging", medicineIdentity: "VMP:123456"
  }), /out-of-scope/);
});

test("versioned Atlas staging resources match real cluster and remain non-production", () => {
  const atlas = manifest.mongodb;
  assert.equal(atlas.projectId, "6aede4d2bedcc3f04ecc6eb5");
  assert.equal(atlas.cluster, "novapharm-staging");
  assert.equal(atlas.database, atlasStagingDatabase);
  assert.equal(atlas.collections.evidence, atlasEvidenceCollection);
  assert.equal(atlas.collections.ingestionRuns, atlasIngestionCollection);
  assert.equal(atlas.productionSourceOfTruth, false);
  assert.equal(atlas.customerPiiAllowed, false);
  assert.equal(atlas.openInternetAllowlistPermitted, false);
  assert.equal(atlas.applicationNetworkConnectionVerified, false);
  assert.deepEqual(atlas.indexes.evidence.map(x => x.name), [
    "workspace_medicine_observed_at", "workspace_source_provenance"
  ]);
});
test("Entra workforce broker is pinned and live session remains default-off", () => {
  const entra = manifest.workforceEntra;
  assert.equal(entra.userPoolId, "eu-north-1_dZRAEzkYa");
  assert.equal(entra.clientId, "26al3v0so11731c1l1hglfa8d1");
  assert.equal(entra.providerName, "EntraP1");
  assert.deepEqual(entra.expectedMapping, { username: "sub", email: "email", name: "name" });
  assert.deepEqual(entra.currentCallbackUrls, ["http://localhost:4303/auth/callback/"]);
  assert.equal(entra.productionSessionsApproved, false);
  assert.equal(entra.realEntraMfaVerified, false);
  assert.equal(entra.customerIdentitiesAllowed, false);
  assert.equal(entra.requiresApprovedHttpsCallback, true);
  assert.equal(entra.requiresSignedSubjectAllowlist, true);
  assert.notEqual(entra.userPoolId, manifest.mongodb.cluster);
});
