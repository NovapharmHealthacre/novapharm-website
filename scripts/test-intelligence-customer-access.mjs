import assert from "node:assert/strict";
import test from "node:test";
import {
  authoriseIntelligenceCustomer,
  generateIntelligenceCustomerSessionSecret,
} from "../src/core/intelligence-customer-access.mjs";

const iso = "2026-11-11T06:00:00.000Z";
const token = generateIntelligenceCustomerSessionSecret();
const subject = "cognito-user-12345678";
const owner = "cognito-owner-12345678";
const tenantId = "tenant-customer-001";

function fixture() {
  const data = {
    session: {
      verifiedServerSide: true, tokenHash: token.tokenHash, status: "active", revokedAt: null,
      identityProvider: "cognito-oidc", mfaVerified: true, subject, tenantId,
      sessionVersion: 1, issuedAt: "2026-11-11T05:00:00.000Z", expiresAt: "2026-11-11T07:00:00.000Z",
    },
    tenant: { verifiedServerSide: true, tenantId, status: "active", contractAccepted: true, ownershipVerified: true, ownerSubject: owner, seatLimit: 5, activeSeatCount: 2 },
    membership: { verifiedServerSide: true, tenantId, subject, status: "active", approved: true, approvedBy: owner },
    seat: { verifiedServerSide: true, tenantId, subject, status: "active", sessionVersion: 1, role: "analyst", features: ["medicine-search"] },
    billing: {
      verifiedServerSide: true, source: "verified-stripe-webhook-ledger", webhookSignatureVerified: true,
      contractAccepted: true, tenantId, subject, stripeCustomerId: "cus_synthetic1234",
      stripeSubscriptionId: "sub_synthetic1234", status: "active", plan: "starter",
      periodStart: "2026-11-01T00:00:00.000Z", periodEnd: "2026-12-01T00:00:00.000Z",
      entitledFeatures: ["medicine-search"],
    },
    usage: { verifiedServerSide: true, tenantId, subject, searchCount: 0, period: "2026-11" },
  };
  const loaders = {
    session: async () => data.session,
    tenant: async () => data.tenant,
    membership: async () => data.membership,
    seat: async () => data.seat,
    billing: async () => data.billing,
    usage: async () => data.usage,
  };
  const release = { verifiedServerSide: true, sourceRightsApproved: true, productionApprovedFeatures: ["medicine-search"] };
  const check = (cookieValue = token.token) => authoriseIntelligenceCustomer({ cookieValue, feature: "medicine-search", loaders, release, now: iso });
  return { data, loaders, release, check };
}

test("session generation creates opaque, hash-addressed tokens, not JWTs", () => {
  assert.match(token.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(token.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(token.cookieName, "__Host-npi_session");
  assert.ok(!token.token.includes("."));
  assert.equal(token.maximumLifetimeSeconds, 43200);
});

test("synthetic fully approved proof admits one permitted scope only", async () => {
  const f = fixture();
  const result = await f.check();
  assert.equal(result.allowed, true);
  assert.equal(result.tenantId, tenantId);
  assert.equal(result.role, "analyst");
  assert.equal(result.remainingSearches, 25);
});

test("missing, arbitrary or forged cookies never authorize", async () => {
  const f = fixture();
  assert.equal((await f.check("")).allowed, false);
  assert.equal((await f.check("x".repeat(43))).allowed, false);
  assert.equal((await f.check("test.jwt.claims")).allowed, false);
});

test("revocation and expiry each deny even with a valid cookie", async () => {
  const f = fixture();
  f.data.session.revokedAt = iso;
  assert.equal((await f.check()).allowed, false);
  f.data.session.revokedAt = null;
  f.data.session.expiresAt = iso;
  assert.equal((await f.check()).allowed, false);
  f.data.session.expiresAt = "2026-11-12T07:00:00.000Z";
  assert.equal((await f.check()).allowed, false);
});

test("membership cannot move between two tenants or evade approval", async () => {
  const f = fixture();
  f.data.membership.tenantId = "other-tenant-001";
  assert.equal((await f.check()).allowed, false);
  f.data.membership.tenantId = tenantId;
  f.data.membership.approved = false;
  assert.equal((await f.check()).allowed, false);
});

test("disabled tenant, overallocated seats and revoked seat version deny", async () => {
  const f = fixture();
  f.data.tenant.status = "suspended";
  assert.equal((await f.check()).allowed, false);
  f.data.tenant.status = "active";
  f.data.tenant.activeSeatCount = 6;
  assert.equal((await f.check()).allowed, false);
  f.data.tenant.activeSeatCount = 2;
  f.data.seat.sessionVersion = 2;
  assert.equal((await f.check()).allowed, false);
});

test("MFA, billing, feature rights, production release and quota deny independently", async () => {
  const f = fixture();
  f.data.session.mfaVerified = false;
  assert.equal((await f.check()).allowed, false);
  f.data.session.mfaVerified = true;
  f.data.billing.status = "past_due";
  assert.equal((await f.check()).allowed, false);
  f.data.billing.status = "active";
  f.data.seat.features = [];
  assert.equal((await f.check()).allowed, false);
  f.data.seat.features = ["medicine-search"];
  f.release.sourceRightsApproved = false;
  assert.equal((await f.check()).allowed, false);
  f.release.sourceRightsApproved = true;
  f.data.usage.searchCount = 25;
  assert.equal((await f.check()).allowed, false);
});

test("store outage and missing authoritative loaders fail closed", async () => {
  const f = fixture();
  f.loaders.seat = async () => { throw new Error("injected outage"); };
  const result = await f.check();
  assert.equal(result.allowed, false);
  assert.equal(result.code, "customer_access_unavailable");
  const withoutStore = await authoriseIntelligenceCustomer({
    cookieValue: token.token, feature: "medicine-search", now: iso,
  });
  assert.equal(withoutStore.allowed, false);
});
