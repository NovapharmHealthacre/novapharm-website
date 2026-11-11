import assert from "node:assert/strict";
import test from "node:test";
import {
  createAtlasGraphStagingAdapters, graphStagingCollections
} from "../src/data/atlas-graph-governance-staging.mjs";
import { readGovernedMedicineEvidenceGraph } from "../src/core/intelligence-evidence-graph.mjs";

const now = Date.parse("2026-11-10T12:00:00Z");
const asOf = "2026-11-10T10:00:00Z";
const environment = {
  ATLAS_EVIDENCE_READ_ENABLED: "true",
  ATLAS_ENVIRONMENT: "staging",
  MONGODB_DATABASE: "novapharm_staging",
  MONGODB_EVIDENCE_COLLECTION: "nova_medicine_evidence_staging",
  ATLAS_GRAPH_GOVERNANCE_ENABLED: "true",
  ATLAS_GRAPH_AUDIT_WRITE_ENABLED: "true"
};
const authority = {
  verified: true, principalId: "employee_123", workspaceId: "novapharm_staging",
  authorityRevision: "rev-7", accessScopes: ["board"]
};
const row = {
  workspace_id: "novapharm_staging",
  medicine_identity: "VMP:123456",
  source_id: "mhra-licensing",
  source_version: "2026-11-08",
  evidence_type: "observed_fact",
  observed_at: "2026-11-08T09:00:00Z",
  recorded_at: "2026-11-08T09:01:00Z",
  provenance_sha256: "a".repeat(64)
};
const sourceGrant = {
  workspace_id: "novapharm_staging", source_id: "mhra-licensing",
  source_version: "2026-11-08", status: "active",
  allowed_purposes: ["internal_evidence_graph"],
  rights_revision: "rights-1",
  valid_from: "2026-01-01T00:00:00Z", valid_until: null
};
const session = {
  workspace_id: "novapharm_staging", principal_id: "employee_123",
  authority_revision: "rev-7", verified: true, access_scopes: ["board"],
  revoked_at: null, expires_at: "2026-11-11T00:00:00Z"
};
function collection(docs, capture) {
  return {
    find(filter, options = {}) {
      capture.push({ filter, options });
      return {
        limit(limit) {
          this.limitValue = limit;
          return this;
        },
        async toArray() {
          return docs.filter(doc => Object.entries(filter).every(([key, val]) => doc[key] === val))
            .slice(0, this.limitValue);
        }
      };
    }
  };
}
function fixture({ grants = [sourceGrant], sessions = [session], records = [row], acknowledged = true } = {}) {
  const seen = { grants: [], sessions: [], evidence: [], audit: [] };
  const rightsCollection = collection(grants, seen.grants);
  const sessionsCollection = collection(sessions, seen.sessions);
  const evidenceCollection = {
    find(filter, options) {
      seen.evidence.push({ filter, options });
      return {
        sort() { return this; },
        limit() { return this; },
        async toArray() { return records; }
      };
    }
  };
  const auditCollection = {
    async insertOne(doc, options) {
      seen.audit.push({ doc, options });
      return { acknowledged, insertedId: acknowledged ? "event-1" : undefined };
    }
  };
  return {
    seen, rightsCollection, sessionsCollection, evidenceCollection, auditCollection,
    adapters: () => createAtlasGraphStagingAdapters({
      rightsCollection, sessionsCollection, auditCollection,
      environment, clock: () => now
    })
  };
}
async function project(sample, overrides = {}) {
  return readGovernedMedicineEvidenceGraph({
    collection: sample.evidenceCollection,
    authority, medicineIdentity: "VMP:123456", asOf, environment,
    ...sample.adapters(), ...overrides
  });
}
test("three staging collections are distinct and no real rights are pre-granted", () => {
  assert.deepEqual(Object.values(graphStagingCollections).sort(), [
    "nova_graph_audit_staging", "nova_graph_authority_sessions_staging",
    "nova_source_rights_grants_staging"
  ]);
  assert.throws(() => createAtlasGraphStagingAdapters({
    ...fixture(), environment: { ...environment, ATLAS_GRAPH_GOVERNANCE_ENABLED: "false" }
  }), /disabled/);
});
test("rights, live board authority and majority audit compose with graph without customer content", async () => {
  const sample = fixture();
  const graph = await project(sample);
  assert.equal(graph.dataState, "governed_metadata");
  assert.equal(graph.nodes.filter(n => n.kind === "evidence").length, 1);
  assert.equal(sample.seen.grants.length, 2);
  assert.equal(sample.seen.sessions.length, 1);
  assert.equal(sample.seen.audit.length, 1);
  assert.deepEqual(sample.seen.grants[0].filter, {
    workspace_id: "novapharm_staging", source_id: "mhra-licensing", source_version: "2026-11-08"
  });
  assert.equal(sample.seen.grants[0].options.projection._id, 0);
  assert.deepEqual(sample.seen.audit[0].options.writeConcern, { w: "majority", j: true });
  const audit = sample.seen.audit[0].doc;
  assert.equal(audit.action, "intelligence.evidence_graph.read");
  assert.equal(audit.source_count, 1);
  assert.equal(audit.evidence_count, 1);
  assert.equal(JSON.stringify(audit).includes("VMP:123456"), false);
  assert.equal(JSON.stringify(audit).includes("patient"), false);
});
test("empty grants never authorize evidence or infer rights", async () => {
  const sample = fixture({ grants: [] });
  const graph = await project(sample);
  assert.equal(graph.dataState, "no_authorised_evidence");
  assert.equal(graph.nodes.length, 1);
  assert.equal(sample.seen.audit[0].doc.evidence_count, 0);
});
test("expired, revoked and wrong-workspace sessions deny before audit", async () => {
  for (const altered of [
    { revoked_at: "2026-11-10T08:00:00Z" },
    { expires_at: "2026-11-10T10:00:00Z" },
    { access_scopes: ["customer"] },
    { verified: false },
    { authority_revision: "old-rev" },
    { workspace_id: "other_tenant" }
  ]) {
    const sample = fixture({ sessions: [{ ...session, ...altered }] });
    await assert.rejects(project(sample), error => error.statusCode === 403);
    assert.equal(sample.seen.audit.length, 0);
  }
});
test("revoked, expired or unapproved source grant returns no evidence, not a fake graph", async () => {
  for (const altered of [
    { status: "revoked" }, { allowed_purposes: ["external_ai"] },
    { valid_until: "2026-11-09T23:00:00Z" },
    { source_version: "2025-01-01" },
    { rights_revision: "" }
  ]) {
    const sample = fixture({ grants: [{ ...sourceGrant, ...altered }] });
    const graph = await project(sample);
    assert.equal(graph.dataState, "no_authorised_evidence");
    assert.equal(sample.seen.audit[0].doc.evidence_count, 0);
  }
});
test("duplicate authorities, inconsistent revisions and unavailable audit fail closed", async () => {
  const duplicate = fixture({ grants: [sourceGrant, sourceGrant] });
  await assert.rejects(project(duplicate), /Inconsistent authoritative records/);
  assert.equal(duplicate.seen.audit.length, 0);

  const sample = fixture();
  let calls = 0;
  const rightsCollection = {
    find(filter, options) {
      calls++;
      return {
        limit() { return this; },
        async toArray() {
          return [{ ...sourceGrant, rights_revision: calls > 1 ? "rights-revoked" : "rights-1" }];
        }
      };
    }
  };
  const adapters = createAtlasGraphStagingAdapters({
    rightsCollection, sessionsCollection: sample.sessionsCollection,
    auditCollection: sample.auditCollection, environment, clock: () => now
  });
  await assert.rejects(project(sample, adapters), error => error.statusCode === 403);
  assert.equal(sample.seen.audit.length, 0);

  const auditUnavailable = fixture({ acknowledged: false });
  await assert.rejects(project(auditUnavailable), /not durably acknowledged/);
  assert.equal(auditUnavailable.seen.audit.length, 1);
});
test("cross-workspace evidence and invalid Mongo source selectors never pass", async () => {
  const sample = fixture({ records: [{ ...row, workspace_id: "other_tenant" }] });
  await assert.rejects(project(sample), /out-of-scope/);
  assert.equal(sample.seen.audit.length, 0);
  const adapter = fixture().adapters();
  await assert.rejects(adapter.resolveSourceGrant({
    workspaceId: { $ne: null }, sourceId: "mhra-licensing",
    sourceVersion: "2026-11-08", purpose: "internal_evidence_graph"
  }), /Invalid workspace/);
});
