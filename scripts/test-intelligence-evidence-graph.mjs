import assert from "node:assert/strict";
import test from "node:test";
import { readGovernedMedicineEvidenceGraph } from "../src/core/intelligence-evidence-graph.mjs";

const environment = Object.freeze({
  ATLAS_EVIDENCE_READ_ENABLED: "true",
  ATLAS_ENVIRONMENT: "staging",
  MONGODB_DATABASE: "novapharm_staging",
  MONGODB_EVIDENCE_COLLECTION: "nova_medicine_evidence_staging"
});
const authority = Object.freeze({
  verified: true, principalId: "employee_123", workspaceId: "novapharm_staging",
  authorityRevision: "session-7", accessScopes: ["board"]
});
const asOf = "2026-11-10T10:00:00Z";
const fact = Object.freeze({
  workspace_id: "novapharm_staging", medicine_identity: "VMP:123456",
  source_id: "mhra-licensing", source_version: "2026-11-08",
  evidence_type: "observed_fact",
  observed_at: "2026-11-08T09:00:00Z",
  recorded_at: "2026-11-08T09:01:00Z",
  provenance_sha256: "a".repeat(64)
});
const forecast = Object.freeze({
  ...fact, source_id: "forecast-internal", evidence_type: "model_forecast",
  provenance_sha256: "b".repeat(64)
});
function collectionFor(records, seen = []) {
  return {
    find(filter, options) {
      seen.push({ filter, options });
      return {
        sort() { return this; },
        limit() { return this; },
        async toArray() { return records; }
      };
    }
  };
}
function inputs(records = [fact], overrides = {}) {
  const seen = [];
  const auditEvents = [];
  const verified = [];
  const checks = [];
  const options = {
    collection: collectionFor(records, seen), authority, medicineIdentity: "VMP:123456",
    asOf, environment,
    async resolveSourceGrant({ workspaceId, sourceId, sourceVersion, purpose }) {
      checks.push({ workspaceId, sourceId, sourceVersion, purpose });
      return {
        workspaceId, sourceId, sourceVersion,
        status: "active", allowedPurposes: ["internal_evidence_graph"],
        validFrom: "2026-01-01T00:00:00Z", validUntil: null, rightsRevision: "grant-3"
      };
    },
    async verifyCurrentAuthority(context) { verified.push(context); return true; },
    async recordAudit(event) {
      auditEvents.push(event);
      return { committed: true, eventId: event.eventId };
    },
    ...overrides
  };
  return { options, seen, auditEvents, verified, checks };
}
test("graph remains disabled without explicit staging scope, before querying Atlas", async () => {
  const sample = inputs();
  await assert.rejects(readGovernedMedicineEvidenceGraph({
    ...sample.options, environment: {}
  }), /disabled/);
  assert.equal(sample.seen.length, 0);
  for (const invalid of [
    { ...authority, verified: false },
    { ...authority, accessScopes: ["customer"] },
    { ...authority, principalId: "x" },
    { ...authority, authorityRevision: "" },
    { ...authority, workspaceId: { $ne: null } }
  ]) {
    await assert.rejects(readGovernedMedicineEvidenceGraph({
      ...sample.options, authority: invalid
    }), error => error.statusCode === 403);
  }
  assert.equal(sample.seen.length, 0);
});
test("missing rights, audit or current-authority verifier cannot read source data", async () => {
  for (const callback of ["resolveSourceGrant", "recordAudit", "verifyCurrentAuthority"]) {
    const sample = inputs();
    await assert.rejects(readGovernedMedicineEvidenceGraph({
      ...sample.options, [callback]: undefined
    }), error => error.statusCode === 403);
    assert.equal(sample.seen.length, 0);
  }
});
test("one-hop graph includes only provenance metadata with distinct truth types", async () => {
  const sample = inputs([fact, forecast, { ...fact }]);
  const graph = await readGovernedMedicineEvidenceGraph(sample.options);
  assert.equal(graph.status, "staging_contract_only");
  assert.equal(graph.graphMode, "observed_one_hop_only");
  assert.equal(graph.dataState, "governed_metadata");
  assert.equal(graph.nodes.filter(n => n.kind === "medicine").length, 1);
  assert.equal(graph.nodes.filter(n => n.kind === "source").length, 2);
  assert.equal(graph.nodes.filter(n => n.kind === "evidence").length, 2);
  assert.equal(graph.relationships.length, 4);
  assert.deepEqual(graph.nodes.filter(n => n.kind === "evidence").map(n => n.evidenceType).sort(), [
    "model_forecast", "observed_fact"
  ]);
  assert.deepEqual(graph.relationships.map(e => e.relation).sort(), [
    "has_recorded_evidence", "has_recorded_evidence", "recorded_from_source", "recorded_from_source"
  ]);
  assert.equal(sample.seen[0].filter.workspace_id, authority.workspaceId);
  assert.equal(sample.seen[0].filter.medicine_identity, "VMP:123456");
  assert.deepEqual(sample.seen[0].filter.observed_at, { $lte: asOf });
  assert.equal(sample.seen[0].options.projection._id, 0);
  assert.equal(sample.auditEvents.length, 1);
  assert.equal(sample.auditEvents[0].evidenceCount, 2);
  assert.equal(sample.auditEvents[0].sourceCount, 2);
  assert.equal(sample.auditEvents[0].action, "intelligence.evidence_graph.read");
  assert.equal(sample.verified[0].sourceRightsRevisions.length, 2);
  assert.equal(sample.checks.every(c => c.purpose === "internal_evidence_graph"), true);
  const wire = JSON.stringify(graph) + JSON.stringify(sample.auditEvents);
  for (const forbidden of ["patient_email", "customer_email", "api_key", "source_text", "raw_prompt"]) {
    assert.equal(wire.includes(forbidden), false);
  }
  const same = await readGovernedMedicineEvidenceGraph(inputs([fact, forecast, { ...fact }]).options);
  assert.deepEqual(same.nodes, graph.nodes);
  assert.deepEqual(same.relationships, graph.relationships);
});
test("revoked, expired and wrong-purpose source grants cannot enter a graph", async () => {
  for (const altered of [
    { status: "revoked" }, { workspaceId: "other_tenant" },
    { sourceVersion: "other_version" }, { rightsRevision: "" },
    { allowedPurposes: ["external_ai"] }, { validUntil: "2026-11-01T00:00:00Z" }
  ]) {
    const sample = inputs([fact], {
      async resolveSourceGrant(query) {
        return {
          workspaceId: query.workspaceId, sourceId: query.sourceId,
          sourceVersion: query.sourceVersion, status: "active", rightsRevision: "rev-1",
          allowedPurposes: ["internal_evidence_graph"], validFrom: "2026-01-01T00:00:00Z",
          ...altered
        };
      }
    });
    const graph = await readGovernedMedicineEvidenceGraph(sample.options);
    assert.equal(graph.dataState, "no_authorised_evidence");
    assert.equal(graph.relationships.length, 0);
    assert.equal(graph.nodes.length, 1);
    assert.equal(sample.auditEvents[0].evidenceCount, 0);
  }
});
test("faulty Atlas adapter, future recorded data or revocation cannot leak", async () => {
  const crossTenant = inputs([{ ...fact, workspace_id: "another_tenant" }]);
  await assert.rejects(readGovernedMedicineEvidenceGraph(crossTenant.options), /out-of-scope/);
  assert.equal(crossTenant.auditEvents.length, 0);

  const injected = inputs([{ ...fact, clinical_note: "private" }]);
  await assert.rejects(readGovernedMedicineEvidenceGraph(injected.options), /Unapproved evidence metadata/);

  const future = inputs([{ ...fact, recorded_at: "2026-11-11T00:00:00Z" }]);
  const graph = await readGovernedMedicineEvidenceGraph(future.options);
  assert.equal(graph.dataState, "no_authorised_evidence");
  assert.equal(future.checks.length, 0);

  const revoked = inputs([fact], { async verifyCurrentAuthority() { return false; } });
  await assert.rejects(readGovernedMedicineEvidenceGraph(revoked.options), error => error.statusCode === 403);
  assert.equal(revoked.auditEvents.length, 0);

  const unstableRights = inputs([fact, { ...fact }], {
    async resolveSourceGrant(query) {
      return {
        ...{
          workspaceId: query.workspaceId, sourceId: query.sourceId,
          sourceVersion: query.sourceVersion, status: "active",
          allowedPurposes: ["internal_evidence_graph"], validFrom: "2026-01-01T00:00:00Z"
        },
        rightsRevision: unstableRightsRevisions.shift()
      };
    }
  });
  const unstableRightsRevisions = ["a", "b"];
  await assert.rejects(readGovernedMedicineEvidenceGraph(unstableRights.options), error => error.statusCode === 403);
});
test("durable audit acknowledgement is mandatory and failures are not success", async () => {
  const missingAck = inputs([fact], { async recordAudit() { return undefined; } });
  await assert.rejects(readGovernedMedicineEvidenceGraph(missingAck.options), error => error.statusCode === 503);
  const wrongAck = inputs([fact], {
    async recordAudit() { return { committed: true, eventId: "wrong-id" }; }
  });
  await assert.rejects(readGovernedMedicineEvidenceGraph(wrongAck.options), error => error.statusCode === 503);
  const storeDown = inputs([fact], { async recordAudit() { throw new Error("Audit store unavailable"); } });
  await assert.rejects(readGovernedMedicineEvidenceGraph(storeDown.options), /Audit store unavailable/);
});
test("rights resolver failure, invalid selector and overbroad page fail closed", async () => {
  const unavailable = inputs([fact], {
    async resolveSourceGrant() { throw new Error("Rights store unavailable"); }
  });
  await assert.rejects(readGovernedMedicineEvidenceGraph(unavailable.options), /Rights store unavailable/);
  assert.equal(unavailable.auditEvents.length, 0);
  await assert.rejects(readGovernedMedicineEvidenceGraph({
    ...inputs().options, medicineIdentity: { $ne: null }
  }), /Invalid medicine identity/);
  await assert.rejects(readGovernedMedicineEvidenceGraph({
    ...inputs().options, limit: 1001
  }), error => error.statusCode === 403);
});
