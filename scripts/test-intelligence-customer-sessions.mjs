import assert from "node:assert/strict";
import test from "node:test";
import { createApprovedIntelligenceCustomerSession, revokeIntelligenceCustomerSession } from "../src/core/intelligence-customer-sessions.mjs";
import { intelligenceCustomerOidc } from "../src/core/intelligence-customer-oidc.mjs";

const now = "2026-11-11T06:00:00.000Z";
const subject = "cognito-user-12345678";
const owner = "cognito-owner-12345678";
const tenantId = "tenant-customer-001";
const identity = { identityVerified: true, verifiedIssuer: intelligenceCustomerOidc.issuer, mfaVerified: true, verifiedCognitoSubject: subject, grantsTenantAccess: false };
const release = { verifiedServerSide: true, customerLaunchAccepted: true, sourceRightsApproved: true, productionApprovedFeatures: ["medicine-search"] };
function fixture() {
  const data = {
    member: { verifiedServerSide: true, subject, tenantId, approved: true, approvedBy: owner, status: "active" },
    tenant: { verifiedServerSide: true, tenantId, status: "active", contractAccepted: true, ownershipVerified: true, ownerSubject: owner, seatLimit: 5, activeSeatCount: 1 },
    seat: { verifiedServerSide: true, tenantId, subject, status: "active", sessionVersion: 1, role: "analyst", features: ["medicine-search"] },
    bill: { verifiedServerSide: true, source: "verified-stripe-webhook-ledger", webhookSignatureVerified: true, contractAccepted: true,
      tenantId, subject, stripeCustomerId: "cus_synthetic12345", stripeSubscriptionId: "sub_synthetic12345",
      plan: "starter", status: "active", periodStart: "2026-11-01T00:00:00.000Z", periodEnd: "2026-12-01T00:00:00.000Z", entitledFeatures: ["medicine-search"] },
    usage: { verifiedServerSide: true, tenantId, subject, period: "2026-11", searchCount: 0 },
  };
  let writes = 0;
  const adapters = {
    membership: async () => [data.member],
    tenant: async () => data.tenant,
    seat: async () => data.seat,
    billing: async () => data.bill,
    usage: async () => data.usage,
    commitSession: async (command) => {
      writes++;
      return { committed: true, revocationFenceVerified: true, auditRecorded: true, tenantId, subject, tokenHash: command.tokenHash };
    },
  };
  const create = (overrides = {}) => createApprovedIntelligenceCustomerSession({ identity, adapters, release, now, ...overrides });
  return { data, adapters, create, get writes() { return writes; } };
}

test("synthetic accepted session uses an opaque secure host-only cookie, stored hash and TTL", async () => {
  const f = fixture();
  const result = await f.create();
  assert.equal(result.activated, true);
  assert.equal(result.sessionCookie.name, "__Host-npi_session");
  assert.equal(result.sessionCookie.httpOnly, true);
  assert.equal(result.sessionCookie.secure, true);
  assert.equal(result.sessionCookie.sameSite, "lax");
  assert.equal(result.sessionCookie.path, "/");
  assert.equal(result.sessionCookie.maxAge, 43200);
  assert.match(result.sessionCookie.value, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(f.writes, 1);
});

test("no user identity, no MFA and missing launch permission cannot create sessions", async () => {
  const f = fixture();
  for (const changes of [
    { identity: { ...identity, mfaVerified: false } },
    { identity: { ...identity, identityVerified: false } },
    { identity: { ...identity, verifiedIssuer: "https://forged.example" } },
    { release: { ...release, customerLaunchAccepted: false } },
    { release: { ...release, sourceRightsApproved: false } },
    { adapters: null },
  ]) assert.equal((await f.create(changes)).activated, false);
  assert.equal(f.writes, 0);
});

test("unapproved membership or more than one tenant denies", async () => {
  const f = fixture();
  f.adapters.membership = async () => [f.data.member, f.data.member];
  assert.equal((await f.create()).activated, false);
  f.adapters.membership = async () => [{ ...f.data.member, approved: false }];
  assert.equal((await f.create()).activated, false);
  assert.equal(f.writes, 0);
});

test("revoked tenant, seat, billing or quota deny without writing token", async () => {
  const f = fixture();
  f.data.tenant.ownershipVerified = false;
  assert.equal((await f.create()).activated, false);
  f.data.tenant.ownershipVerified = true;
  f.data.seat.status = "revoked";
  assert.equal((await f.create()).activated, false);
  f.data.seat.status = "active";
  f.data.bill.status = "past_due";
  assert.equal((await f.create()).activated, false);
  f.data.bill.status = "active";
  f.data.usage.searchCount = 25;
  assert.equal((await f.create()).activated, false);
  assert.equal(f.writes, 0);
});

test("atomic grant must confirm revocation fence and audit", async () => {
  const f = fixture();
  f.adapters.commitSession = async command => ({ committed: true, auditRecorded: false, revocationFenceVerified: true, tenantId, subject, tokenHash: command.tokenHash });
  assert.equal((await f.create()).activated, false);
});

test("revoking a synthetic live session requires a durable audited commit", async () => {
  const f = fixture();
  const start = await f.create();
  const stored = { verifiedServerSide: true, status: "active", tokenHash: "" , subject, tenantId, sessionVersion: 1 };
  const { createHash } = await import("node:crypto");
  stored.tokenHash = createHash("sha256").update(start.sessionCookie.value).digest("hex");
  const adapters = {
    loadSession: async () => stored,
    commitRevocation: async () => ({ committed: true, revocationFenceVerified: true, auditRecorded: true }),
  };
  assert.equal((await revokeIntelligenceCustomerSession({ cookieValue: start.sessionCookie.value, adapters, now })).revoked, true);
  adapters.commitRevocation = async () => ({ committed: true, auditRecorded: false, revocationFenceVerified: true });
  assert.equal((await revokeIntelligenceCustomerSession({ cookieValue: start.sessionCookie.value, adapters, now })).revoked, false);
  assert.equal((await revokeIntelligenceCustomerSession({ cookieValue: "untrusted.jwt", adapters, now })).revoked, false);
});
