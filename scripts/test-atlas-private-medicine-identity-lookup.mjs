import assert from "node:assert/strict";
import test from "node:test";
import { createPrivateAtlasMedicineIdentityLookup } from "../src/data/atlas-private-medicine-identity-lookup.mjs";

const NOW = Date.parse("2026-11-14T18:00:00Z");
const asOf = "2026-11-14T17:30:00Z";
const workspaceId = "novapharm-internal-staging";
const principalId = "founder_reviewer_001";
const codeSystem = "BNF_PRESENTATION_CODE";
const sourceCode = "0208020Z0AAAAAA";
const session = {
  verified: true, role: "board", principalId, workspaceId,
  authorityRevision: "current-identity-v1",
  expiresAt: "2026-11-14T19:00:00Z",
};
const row = {
  workspace_id: workspaceId, identity_id: "medicine_001",
  canonical_name: "Example accepted-code fixture",
  code_system: codeSystem, normalized_code: sourceCode, jurisdiction: "England",
  source_id: "publisher_001", source_version: "2026-11",
  source_resource_sha256: "a".repeat(64),
  identity_revision: "identity-v1", rights_revision: "rights-v1",
  effective_from: "2026-01-01T00:00:00Z", effective_to: null,
  verified_at: "2026-11-12T00:00:00Z", status: "accepted", is_synthetic: false,
};
const grant = {
  verified: true, active: true, workspaceId,
  sourceId: row.source_id, sourceVersion: row.source_version,
  rightsRevision: row.rights_revision,
  allowedPurpose: "private_medicine_identity_research",
  checkedAt: "2026-11-14T17:59:50Z", validUntil: null,
};
const request = { principalId, workspaceId, codeSystem, sourceCode, asOf };
function fake({ records = [row], sessionValues = [session, session], rights = grant,
  audit = { committed: true, eventId: "audit-event-001" }, time = NOW } = {}) {
  const observed = { filters: [], audits: [], rights: [], sessions: [], queries: 0 };
  let sc = 0;
  const service = createPrivateAtlasMedicineIdentityLookup({
    database: {
      databaseName: "novapharm_intelligence_production",
      collection: name => {
        assert.equal(name, "npi_medicine_identity");
        return { find(filter, options) {
          observed.filters.push({ filter, options });
          observed.queries += 1;
          return { limit(limit) {
            assert.equal(limit, 3);
            return { toArray: async () => structuredClone(records) };
          } };
        } };
      },
    },
    verifyPrivateSession: async context => {
      observed.sessions.push(context);
      return sessionValues[Math.min(sc++, sessionValues.length - 1)];
    },
    verifyCurrentSourceRights: async context => {
      observed.rights.push(context);
      return rights;
    },
    recordReadAudit: async context => {
      observed.audits.push(context);
      return audit;
    },
    clock: () => time,
  });
  return { service, observed };
}
const rejects = code => err => err?.code === code && err?.statusCode === 403;

test("valid exact governed code returns a bounded private identity with no market facts", async () => {
  const { service, observed } = fake();
  const result = await service.lookup(request);
  assert.equal(result.state, "accepted_identity_source_checked");
  assert.equal(result.identity.identityId, row.identity_id);
  assert.equal(result.identity.sourceResourceSha256, row.source_resource_sha256);
  assert.equal(result.query.sourceCode, sourceCode);
  assert.equal(result.noMarketOrClinicalClaims, true);
  assert.equal(result.customerReleaseApproved, false);
  assert.equal(result.productionCertified, false);
  assert.equal(observed.sessions.length, 2);
  assert.equal(observed.rights.length, 1);
  assert.equal(observed.audits.length, 1);
  assert.equal(observed.filters[0].filter.workspace_id, workspaceId);
  assert.deepEqual(observed.filters[0].filter.normalized_code, sourceCode);
  assert.equal(observed.filters[0].filter.status, "accepted");
  assert.equal(observed.filters[0].filter.is_synthetic, false);
  assert.equal(observed.filters[0].options.projection._id, 0);
  assert.equal(observed.filters[0].options.projection.patientId, undefined);
  assert.equal(observed.filters[0].options.maxTimeMS, 3000);
});

test("zero real identities is a truthful audited absence, not a medicine or clinical conclusion", async () => {
  const { service, observed } = fake({ records: [] });
  const result = await service.lookup(request);
  assert.equal(result.state, "no_accepted_identity");
  assert.equal(result.identity, null);
  assert.equal(result.productionCertified, false);
  assert.equal(observed.rights.length, 0);
  assert.equal(observed.audits.length, 1);
});

test("more than one current exact mapping is not guessed into a single identity", async () => {
  const { service } = fake({ records: [row, { ...row, identity_id: "medicine_002" }] });
  const result = await service.lookup(request);
  assert.equal(result.state, "multiple_current_mappings_require_review");
  assert.equal(result.identity, null);
  const overflow = fake({ records: [row, row, row] });
  await assert.rejects(overflow.service.lookup(request), rejects("ambiguous_identity_not_resolved"));
});

test("missing or revoked source rights deny even an accepted identity row", async () => {
  for (const rights of [
    null, { ...grant, verified: false }, { ...grant, active: false },
    { ...grant, workspaceId: "tenant_other" },
    { ...grant, rightsRevision: "rights-old" },
    { ...grant, checkedAt: "2026-11-13T17:59:50Z" },
    { ...grant, validUntil: "2026-11-14T17:59:59Z" },
  ]) {
    const { service, observed } = fake({ rights });
    await assert.rejects(service.lookup(request), rejects("source_rights_not_accepted"));
    assert.equal(observed.audits.length, 0);
  }
});

test("session expires at current clock, not at the historical evidence as-of", async () => {
  const expired = { ...session, expiresAt: "2026-11-14T17:45:00Z" };
  const { service, observed } = fake({ sessionValues: [expired] });
  await assert.rejects(service.lookup(request), rejects("private_session_not_accepted"));
  assert.equal(observed.queries, 0);
});

test("revised or revoked authority after read denies output before audit", async () => {
  const { service, observed } = fake({ sessionValues: [session, { ...session, authorityRevision: "revoked-v2" }] });
  await assert.rejects(service.lookup(request), rejects("session_revoked_during_read"));
  assert.equal(observed.audits.length, 0);
});

test("wrong tenant, role, selector injection and fuzzy identifiers never query Atlas", async () => {
  for (const bad of [
    { workspaceId: "other-tenant" }, { codeSystem: { $ne: "" } },
    { sourceCode: { $ne: "" } }, { sourceCode: "Apixaban 5 mg" },
    { sourceCode: "" }, { principalId: "../bad" },
    { asOf: "tomorrow" }, { asOf: "2030-01-01T00:00:00Z" },
  ]) {
    const { service, observed } = fake();
    await assert.rejects(service.lookup({ ...request, ...bad }), rejects("invalid_exact_identity_request"));
    assert.equal(observed.queries, 0);
  }
  const { service, observed } = fake({ sessionValues: [{ ...session, role: "customer" }] });
  await assert.rejects(service.lookup(request), rejects("private_session_not_accepted"));
  assert.equal(observed.queries, 0);
});

test("unapproved or wrong-tenant result rows and hidden fields are never returned", async () => {
  const mutations = [
    { workspace_id: "other-tenant" }, { status: "pending" },
    { is_synthetic: true }, { normalized_code: "wrong" },
    { patientId: "patient-hidden" },
    { source_resource_sha256: "unverified" },
    { effective_to: "2026-11-14T17:00:00Z" },
  ];
  for (const partial of mutations) {
    const { service, observed } = fake({ records: [{ ...row, ...partial }] });
    await assert.rejects(service.lookup(request), rejects("source_identity_unverified"));
    assert.equal(observed.rights.length, 0);
    assert.equal(observed.audits.length, 0);
  }
});

test("a missing durable read audit refuses to disclose identity", async () => {
  const { service } = fake({ audit: { committed: false } });
  await assert.rejects(service.lookup(request), rejects("read_audit_unavailable"));
});
