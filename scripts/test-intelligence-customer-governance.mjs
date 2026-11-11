import assert from "node:assert/strict";
import test from "node:test";
import { intelligenceCustomerOidc } from "../src/core/intelligence-customer-oidc.mjs";
import { authorizeIntelligenceCustomer } from "../src/core/intelligence-customer-governance.mjs";

const now = "2026-11-11T11:00:00.000Z";
const subject = "sub-1234567890";
const tenantId = "tenant-novapharm-01";
const sessionId = "session-0123456789";
const source = { sourceId: "nhsbsa-epd", sourceVersion: "2026-09" };

const identity = {
  identityVerified: true,
  grantsTenantAccess: false,
  verifiedIssuer: intelligenceCustomerOidc.issuer,
  verifiedCognitoSubject: subject,
};
const session = {
  verifiedServerSide: true, status: "active",
  subject, sessionId, tenantId, identityProvider: "cognito-oidc",
  mfaVerified: true, revokedAt: null, revision: "session-rev-01",
  expiresAt: "2026-11-11T12:00:00.000Z",
};
const owner = {
  verifiedServerSide: true, subject, tenantId, status: "active",
  seatAccepted: true, revokedAt: null, revision: "owner-rev-01",
  stripeCustomerId: "cus_12345678",
};
const grant = {
  source: "verified-stripe-webhook-ledger",
  webhookSignatureVerified: true, contractAccepted: true,
  tenantId, subject, stripeCustomerId: "cus_12345678",
  stripeSubscriptionId: "sub_12345678",
  status: "active", plan: "professional",
  revision: "subscription-rev-01",
  periodStart: "2026-11-01T00:00:00.000Z",
  periodEnd: "2026-12-01T00:00:00.000Z",
  entitledFeatures: ["medicine-search", "medicine-identity"],
};
const usage = {
  verifiedServerSide: true, tenantId, subject,
  period: "2026-11", searchCount: 5,
};
const rights = {
  verifiedServerSide: true, tenantId, ...source,
  status: "active", revokedAt: null, patientDataAllowed: false,
  allowedPurposes: ["customer_medicine_search"], revision: "rights-rev-01",
  validFrom: "2026-01-01T00:00:00.000Z", validUntil: null,
};
const release = {
  verifiedServerSide: true, customerLaunchAccepted: true,
  atomicAuthorityCommitApproved: true, sourceRightsApproved: true,
  productionApprovedFeatures: ["medicine-search"],
};
const resource = {
  verifiedServerSide: true, tenantId,
  medicineId: "medicine-" + "a".repeat(32),
  sources: [source],
};

function fixture({ override = {}, commitResponse = {}, failAt } = {}) {
  const calls = [];
  const documents = {
    session: { ...session, ...override.session },
    owner: { ...owner, ...override.owner },
    grant: { ...grant, ...override.grant },
    usage: { ...usage, ...override.usage },
    rights: { ...rights, ...override.rights },
  };
  const adapter = (name, record) => async arg => {
    calls.push({ name, arg });
    if (failAt === name) throw new Error("PRIVATE DATA / LOG STRING MUST NEVER LEAK");
    return record;
  };
  const adapters = {
    loadSession: adapter("session", documents.session),
    loadOwner: adapter("owner", documents.owner),
    loadSubscription: adapter("grant", documents.grant),
    loadUsage: adapter("usage", documents.usage),
    loadSourceGrant: adapter("rights", documents.rights),
    async commitAuthorisation(args) {
      calls.push({ name: "atomicCommit", arg: args });
      if (failAt === "atomicCommit") throw new Error("SECRET LEDGER EXCEPTION");
      return {
        committed: true, revocationFenceVerified: true,
        majorityAcknowledged: true, auditRecorded: true,
        quotaReserved: true, tenantId, subject,
        scopeDigest: args.scopeDigest, ...commitResponse,
      };
    },
  };
  return { adapters, calls };
}

async function authorize(testFixture, overrides = {}) {
  return authorizeIntelligenceCustomer({
    identity, sessionId, feature: "medicine-search", resource,
    release, now, adapters: testFixture.adapters, ...overrides,
  });
}

test("valid identity, live MFA, tenant seat, signed ledger, rights and atomic audit are all required", async () => {
  const sample = fixture();
  const decision = await authorize(sample);
  assert.equal(decision.allowed, true);
  assert.equal(decision.code, "authorised");
  assert.equal(decision.effectivePlan, "professional");
  assert.equal(decision.remainingSearches, 244);
  assert.equal(decision.requiresSameRequestScopedDataAccess, true);
  assert.equal(decision.customerDataReturned, false);
  assert.match(decision.scopeDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(sample.calls.map(z => z.name), [
    "session", "owner", "grant", "usage", "rights", "atomicCommit",
  ]);
  const commit = sample.calls.at(-1).arg;
  assert.equal(commit.tenantId, tenantId);
  assert.equal(commit.expectedUsageCount, 5);
  assert.equal(commit.requiresQuotaReservation, true);
  assert.deepEqual(commit.sourceRightsRevisions, [
    { ...source, revision: "rights-rev-01" },
  ]);
  assert.equal(JSON.stringify(decision).includes(subject), false);
  assert.equal(JSON.stringify(decision).includes("cus_"), false);
});

test("OIDC identity alone and missing authoritative adapters never permit access", async () => {
  const sample = fixture();
  for (const changed of [
    { identity: { ...identity, grantsTenantAccess: true } },
    { identity: { ...identity, verifiedIssuer: "https://forged.example" } },
    { identity: { ...identity, identityVerified: false } },
    { sessionId: "bad" },
    { feature: "commercial-advice" },
    { release: { ...release, customerLaunchAccepted: false } },
    { release: { ...release, atomicAuthorityCommitApproved: false } },
    { release: { ...release, sourceRightsApproved: false } },
    { release: { ...release, productionApprovedFeatures: [] } },
    { now: "2026-11-31T11:00:00.000Z" },
    { adapters: { ...sample.adapters, commitAuthorisation: null } },
  ]) {
    const result = await authorize(sample, changed);
    assert.equal(result.allowed, false);
    assert.equal(result.customerDataReturned, false);
  }
  assert.equal(sample.calls.length, 0);
});

test("missing, revoked, wrong provider or non-MFA sessions deny before ownership lookup", async () => {
  for (const change of [
    { mfaVerified: false },
    { revokedAt: "2026-11-11T09:00:00.000Z" },
    { expiresAt: "2026-11-11T10:00:00.000Z" },
    { status: "revoked" }, { tenantId: "" },
    { subject: "other-subject" }, { sessionId: "stolen-session" },
    { identityProvider: "unknown" }, { revision: "" },
  ]) {
    const sample = fixture({ override: { session: change } });
    const result = await authorize(sample);
    assert.equal(result.allowed, false);
    assert.equal(sample.calls.at(-1)?.name, "session");
  }
});

test("tenant seat, subscriber ledger and usage must match the same subject", async () => {
  const groups = [
    { owner: { seatAccepted: false } },
    { owner: { status: "revoked" } },
    { owner: { tenantId: "different-tenant" } },
    { owner: { stripeCustomerId: "cus_another1234" } },
    { grant: { webhookSignatureVerified: false } },
    { grant: { source: "browser-metadata" } },
    { grant: { stripeSubscriptionId: "invalid" } },
    { grant: { status: "past_due" } },
    { grant: { plan: "enterprise" } },
    { usage: { verifiedServerSide: false } },
    { usage: { tenantId: "different-tenant" } },
    { usage: { period: "2026-10" } },
    { usage: { searchCount: 250 } },
  ];
  for (const changes of groups) {
    const sample = fixture({ override: changes });
    assert.equal((await authorize(sample)).allowed, false);
    assert.equal(sample.calls.some(c => c.name === "atomicCommit"), false);
  }
});

test("source permissions are purpose-specific, revoked/future/expired sources fail closed", async () => {
  for (const change of [
    { verifiedServerSide: false }, { allowedPurposes: ["internal_evidence_graph"] },
    { tenantId: "different-tenant" }, { sourceId: "unlicensed" },
    { revokedAt: "2026-11-10T00:00:00.000Z" },
    { status: "revoked" }, { patientDataAllowed: true },
    { validFrom: "2027-01-01T00:00:00.000Z" },
    { validUntil: "2026-10-01T00:00:00.000Z" },
    { revision: "" },
  ]) {
    const sample = fixture({ override: { rights: change } });
    assert.equal((await authorize(sample)).code, "medicine_source_rights_unverified");
    assert.equal(sample.calls.some(c => c.name === "atomicCommit"), false);
  }
  for (const changed of [
    { verifiedServerSide: false },
    { tenantId: "different-tenant" },
    { medicineId: "apixaban" },
    { sources: [] },
    { sources: [source, source] },
    { sources: [{ sourceId: { "$ne": null }, sourceVersion: "2026-09" }] },
  ]) {
    const sample = fixture();
    assert.equal((await authorize(sample, { resource: { ...resource, ...changed } })).allowed, false);
    assert.equal(sample.calls.some(c => c.name === "rights"), false);
  }
});

test("atomic revocation fencing, majority audit and quota reservation cannot be bypassed", async () => {
  for (const commitResponse of [
    { committed: false }, { revocationFenceVerified: false },
    { majorityAcknowledged: false }, { auditRecorded: false },
    { quotaReserved: false }, { scopeDigest: "wrong" },
    { tenantId: "different-tenant" }, { subject: "different-subject" },
  ]) {
    const sample = fixture({ commitResponse });
    assert.equal((await authorize(sample)).code, "atomic_authorisation_commit_unverified");
  }
  const unavailable = fixture({ failAt: "atomicCommit" });
  const result = await authorize(unavailable);
  assert.equal(result.code, "authoritative_ledger_unavailable");
  assert.equal(JSON.stringify(result).includes("SECRET"), false);
});

test("adapter failures are redacted and do not expose customer data", async () => {
  for (const name of ["session", "owner", "grant", "usage", "rights", "atomicCommit"]) {
    const sample = fixture({ failAt: name });
    const response = await authorize(sample);
    assert.equal(response.allowed, false);
    assert.equal(JSON.stringify(response).includes("PRIVATE"), false);
    assert.equal(JSON.stringify(response).includes("SECRET"), false);
  }
});

test("multiple sources must have independent licensed grants", async () => {
  const sample = fixture();
  const extendedResource = {
    ...resource,
    sources: [source, { sourceId: "clinical-trials", sourceVersion: "2026-11" }],
  };
  const result = await authorize(sample, { resource: extendedResource });
  assert.equal(result.code, "medicine_source_rights_unverified");
  assert.equal(sample.calls.some(c => c.name === "atomicCommit"), false);
});
