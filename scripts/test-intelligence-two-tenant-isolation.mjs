import assert from "node:assert/strict";
import test from "node:test";
import { intelligenceCustomerOidc } from "../src/core/intelligence-customer-oidc.mjs";
import { authorizeIntelligenceCustomer } from "../src/core/intelligence-customer-governance.mjs";

/**
 * Pure, synthetic two-tenant negative acceptance fixtures.
 *
 * These are deliberately NOT Cognito users, real customer contracts, Atlas
 * production grants, or verified publisher licences. The release=true input
 * exists only inside this local test to exercise the positive policy branch.
 * The live release remains OFF until independently proven and approved.
 */
const at = "2026-11-12T05:15:00.000Z";
const medicineId = "medicine-" + "a".repeat(32);
const source = Object.freeze({ sourceId: "synthetic-test-source", sourceVersion: "fixture-2026-08" });
const productionRelease = Object.freeze({
  verifiedServerSide: true,
  customerLaunchAccepted: true,
  atomicAuthorityCommitApproved: true,
  sourceRightsApproved: true,
  productionApprovedFeatures: ["medicine-search"],
});

function tenantFixture(label) {
  const tenantId = `test-tenant-${label}-001`;
  const subject = `synthetic-subject-${label}-001`;
  const sessionId = `synthetic-session-${label}-001`;
  const stripeCustomerId = `cus_Synthetic${label}12345`;
  return {
    identity: {
      identityVerified: true, grantsTenantAccess: false,
      verifiedIssuer: intelligenceCustomerOidc.issuer,
      verifiedCognitoSubject: subject,
    },
    sessionId,
    resource: {
      verifiedServerSide: true, tenantId, medicineId, sources: [source],
    },
    documents: {
      session: {
        verifiedServerSide: true, status: "active",
        subject, sessionId, tenantId, identityProvider: "cognito-oidc",
        mfaVerified: true, revokedAt: null,
        revision: `session-rev-${label}-01`,
        expiresAt: "2026-11-12T06:00:00.000Z",
      },
      owner: {
        verifiedServerSide: true, subject, tenantId, status: "active",
        seatAccepted: true, revokedAt: null, revision: `owner-rev-${label}-01`,
        stripeCustomerId,
      },
      grant: {
        verifiedServerSide: true,
        source: "verified-stripe-webhook-ledger", webhookSignatureVerified: true,
        contractAccepted: true, tenantId, subject, stripeCustomerId,
        stripeSubscriptionId: `sub_Synthetic${label}12345`,
        status: "active", plan: "professional",
        revision: `subscription-rev-${label}-01`,
        periodStart: "2026-11-01T00:00:00.000Z",
        periodEnd: "2026-12-01T00:00:00.000Z",
        entitledFeatures: ["medicine-search"],
      },
      usage: { verifiedServerSide: true, tenantId, subject, period: "2026-11", searchCount: 3 },
      rights: {
        verifiedServerSide: true, tenantId, ...source,
        status: "active", revokedAt: null, patientDataAllowed: false,
        allowedPurposes: ["customer_medicine_search"],
        revision: `rights-rev-${label}-01`,
        validFrom: "2026-01-01T00:00:00.000Z", validUntil: null,
      },
    },
  };
}

function isolatedHarness() {
  const alpha = tenantFixture("alpha");
  const beta = tenantFixture("beta");
  const collection = new Map([[alpha.documents.session.tenantId, alpha], [beta.documents.session.tenantId, beta]]);
  const calls = [];
  let beforeCommit = () => {};

  const bySubject = (subject, sessionId) => {
    for (const fixture of collection.values()) {
      if (fixture.identity.verifiedCognitoSubject === subject &&
        fixture.sessionId === sessionId) return fixture;
    }
    return null;
  };
  const byTenantAndSubject = (tenantId, subject) => {
    const fixture = collection.get(tenantId);
    return fixture?.identity.verifiedCognitoSubject === subject ? fixture : null;
  };
  const adapters = {
    async loadSession({ subject, sessionId }) {
      calls.push("session");
      return bySubject(subject, sessionId)?.documents.session ?? null;
    },
    async loadOwner({ tenantId, subject }) {
      calls.push("owner");
      return byTenantAndSubject(tenantId, subject)?.documents.owner ?? null;
    },
    async loadSubscription({ tenantId, subject }) {
      calls.push("grant");
      return byTenantAndSubject(tenantId, subject)?.documents.grant ?? null;
    },
    async loadUsage({ tenantId, subject }) {
      calls.push("usage");
      return byTenantAndSubject(tenantId, subject)?.documents.usage ?? null;
    },
    async loadSourceGrant({ tenantId, sourceId, sourceVersion, purpose }) {
      calls.push("rights");
      const fixture = collection.get(tenantId);
      const rights = fixture?.documents.rights;
      if (rights?.sourceId !== sourceId || rights?.sourceVersion !== sourceVersion ||
        !rights.allowedPurposes.includes(purpose)) return null;
      return rights;
    },
    async commitAuthorisation(command) {
      calls.push("atomicCommit");
      beforeCommit(command);
      const fixture = byTenantAndSubject(command.tenantId, command.subject);
      const docs = fixture?.documents;
      const valid = Boolean(docs &&
        docs.session.status === "active" && docs.session.revokedAt === null &&
        docs.session.revision === command.sessionRevision &&
        docs.owner.status === "active" && docs.owner.revision === command.ownershipRevision &&
        docs.grant.revision === command.subscriptionRevision &&
        docs.usage.searchCount === command.expectedUsageCount &&
        docs.rights.status === "active" && docs.rights.revokedAt === null &&
        docs.rights.revision === command.sourceRightsRevisions[0]?.revision);
      return {
        committed: valid, revocationFenceVerified: valid,
        majorityAcknowledged: valid, auditRecorded: valid,
        quotaReserved: valid, tenantId: command.tenantId,
        subject: command.subject, scopeDigest: command.scopeDigest,
      };
    },
  };
  function request(fixture, overrides = {}) {
    return authorizeIntelligenceCustomer({
      identity: fixture.identity,
      sessionId: fixture.sessionId,
      resource: fixture.resource,
      feature: "medicine-search",
      release: productionRelease,
      now: at, adapters, ...overrides,
    });
  }
  return { alpha, beta, calls, adapters, request, setBeforeCommit(fn) { beforeCommit = fn; } };
}

test("two distinct synthetic tenants pass the in-memory contract independently, with different scoped fingerprints", async () => {
  const h = isolatedHarness();
  const first = await h.request(h.alpha);
  const second = await h.request(h.beta);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.notEqual(first.scopeDigest, second.scopeDigest);
  assert.equal(first.customerDataReturned, false);
  assert.equal(second.customerDataReturned, false);
  assert.equal(first.requiresSameRequestScopedDataAccess, true);
  assert.equal(second.requiresSameRequestScopedDataAccess, true);
  assert.equal(h.calls.filter(v => v === "atomicCommit").length, 2);
});

test("cross-tenant subject, session and medicine-resource swaps always deny without audit commit", async () => {
  for (const change of ["session", "subject", "resource", "tenant"]) {
    const h = isolatedHarness();
    const overrides = {
      session: { sessionId: h.beta.sessionId },
      subject: { identity: h.beta.identity },
      resource: { resource: h.beta.resource },
      tenant: { resource: { ...h.alpha.resource, tenantId: h.beta.resource.tenantId } },
    }[change];
    const decision = await h.request(h.alpha, overrides);
    assert.equal(decision.allowed, false, change);
    assert.equal(decision.customerDataReturned, false, change);
    assert.equal(h.calls.includes("atomicCommit"), false, change);
  }
});

test("cross-tenant ownership, billing, usage and source grants never authorise", async () => {
  for (const record of ["owner", "grant", "usage", "rights"]) {
    const h = isolatedHarness();
    const original = h.adapters[{
      owner: "loadOwner", grant: "loadSubscription", usage: "loadUsage", rights: "loadSourceGrant",
    }[record]];
    const name = {
      owner: "loadOwner", grant: "loadSubscription", usage: "loadUsage", rights: "loadSourceGrant",
    }[record];
    h.adapters[name] = async () => h.beta.documents[record];
    const decision = await h.request(h.alpha);
    assert.equal(decision.allowed, false, record);
    assert.equal(decision.customerDataReturned, false, record);
    assert.equal(h.calls.includes("atomicCommit"), false, record);
    h.adapters[name] = original;
  }
});

test("revocation and quota revisions changing before atomic commit deny both tenants", async () => {
  for (const target of ["alpha", "beta"]) {
    for (const mutation of ["revoke-session", "revoke-source", "change-usage"]) {
      const h = isolatedHarness();
      const f = h[target];
      h.setBeforeCommit(() => {
        if (mutation === "revoke-session") f.documents.session.revokedAt = at;
        if (mutation === "revoke-source") f.documents.rights.status = "revoked";
        if (mutation === "change-usage") f.documents.usage.searchCount += 1;
      });
      const decision = await h.request(f);
      assert.equal(decision.allowed, false, `${target} ${mutation}`);
      assert.equal(decision.code, "atomic_authorisation_commit_unverified");
      assert.equal(decision.customerDataReturned, false);
    }
  }
});

test("live launch gates off deny each test tenant before any private data loader", async () => {
  for (const field of ["customerLaunchAccepted", "atomicAuthorityCommitApproved", "sourceRightsApproved"]) {
    const h = isolatedHarness();
    for (const f of [h.alpha, h.beta]) {
      const decision = await h.request(f, {
        release: { ...productionRelease, [field]: false },
      });
      assert.equal(decision.allowed, false, field);
      assert.equal(decision.code, "customer_release_not_approved");
      assert.equal(decision.customerDataReturned, false);
    }
    assert.deepEqual(h.calls, []);
  }
});
