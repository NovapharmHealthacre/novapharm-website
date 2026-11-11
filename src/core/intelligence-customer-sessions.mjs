/**
 * Customer session issuance and revocation (server-side only).
 *
 * Verified Cognito identity is NOT sufficient. Inject only trusted, durable,
 * consistent customer ledger adapters from the server environment. All access
 * is denied until owner-approved tenant, seat, contract, billing, data rights
 * and an atomic revocation-fenced session write are verified.
 */
import { createHash } from "node:crypto";
import { intelligenceCustomerOidc } from "./intelligence-customer-oidc.mjs";
import { generateIntelligenceCustomerSessionSecret } from "./intelligence-customer-access.mjs";
import { decideIntelligenceEntitlement } from "./intelligence-subscription-entitlements.mjs";

const subjectPattern = /^[a-zA-Z0-9-]{8,128}$/u;
const tenantPattern = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/u;
const MAX_AGE_MS = 43_200_000;
const deny = (code) => Object.freeze({ activated: false, code });

function time(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(value)) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString() === value ? t : null;
}

const required = ["membership", "tenant", "seat", "billing", "usage", "commitSession"];

export async function createApprovedIntelligenceCustomerSession({
  identity, adapters, release, now = new Date().toISOString(),
} = {}) {
  if (!identity || identity.identityVerified !== true ||
      identity.verifiedIssuer !== intelligenceCustomerOidc.issuer ||
      identity.mfaVerified !== true ||
      identity.grantsTenantAccess !== false ||
      !subjectPattern.test(String(identity.verifiedCognitoSubject || ""))) return deny("strong_identity_required");
  if (!release?.verifiedServerSide || release.customerLaunchAccepted !== true ||
      release.sourceRightsApproved !== true || release.productionApprovedFeatures?.includes("medicine-search") !== true) return deny("customer_release_not_accepted");
  if (!adapters || required.some((name) => typeof adapters[name] !== "function")) return deny("customer_session_store_unavailable");
  const clock = time(now);
  if (clock === null) return deny("invalid_clock");
  try {
    const subject = identity.verifiedCognitoSubject;
    // A query must return one and only one approved tenant, not an HTTP input.
    const memberships = await adapters.membership(subject);
    if (!Array.isArray(memberships) || memberships.length !== 1) return deny("unique_membership_required");
    const member = memberships[0];
    if (member?.verifiedServerSide !== true || member.subject !== subject ||
        member.status !== "active" || member.approved !== true ||
        !subjectPattern.test(String(member.approvedBy || "")) ||
        !tenantPattern.test(String(member.tenantId || ""))) return deny("membership_not_approved");
    const tenantId = member.tenantId;
    const [tenant, seat, billing, usage] = await Promise.all([
      adapters.tenant(tenantId), adapters.seat(tenantId, subject),
      adapters.billing(tenantId, subject), adapters.usage(tenantId, subject),
    ]);
    if (tenant?.verifiedServerSide !== true || tenant.tenantId !== tenantId ||
        tenant.status !== "active" || tenant.contractAccepted !== true ||
        tenant.ownershipVerified !== true || !subjectPattern.test(String(tenant.ownerSubject || "")) ||
        !Number.isSafeInteger(tenant.seatLimit) || tenant.seatLimit <= 0 ||
        !Number.isSafeInteger(tenant.activeSeatCount) || tenant.activeSeatCount < 1 ||
        tenant.activeSeatCount > tenant.seatLimit) return deny("tenant_not_approved");
    if (seat?.verifiedServerSide !== true || seat.tenantId !== tenantId ||
        seat.subject !== subject || seat.status !== "active" ||
        !["owner", "admin", "analyst", "viewer"].includes(seat.role) ||
        !Number.isSafeInteger(seat.sessionVersion) || seat.sessionVersion < 1 ||
        !Array.isArray(seat.features) || !seat.features.includes("medicine-search")) return deny("customer_seat_not_approved");
    const entitlement = decideIntelligenceEntitlement({
      principal: { verifiedServerSide: true, mfaVerified: true, identityProvider: "cognito-oidc", tenantId, subject },
      grant: billing, usage, release, feature: "medicine-search", now,
    });
    if (!entitlement.allowed) return deny(entitlement.code);

    const session = generateIntelligenceCustomerSessionSecret();
    const expiry = new Date(clock + MAX_AGE_MS).toISOString();
    const command = Object.freeze({
      tenantId, subject, role: seat.role, sessionVersion: seat.sessionVersion,
      tokenHash: session.tokenHash, issuedAt: now, expiresAt: expiry,
      ttlEpoch: Math.floor((clock + MAX_AGE_MS) / 1000),
      identityProvider: "cognito-oidc", mfaVerified: true, status: "active",
      // The durable adapter MUST transactionally recheck all subject, tenant,
      // seat, subscription, release and quota revisions, then write a hash only.
    });
    const committed = await adapters.commitSession(command);
    if (committed?.committed !== true ||
        committed.revocationFenceVerified !== true ||
        committed.auditRecorded !== true ||
        committed.tenantId !== tenantId || committed.subject !== subject ||
        committed.tokenHash !== session.tokenHash) return deny("session_commit_not_verified");
    return Object.freeze({
      activated: true, code: "approved_customer_session",
      sessionCookie: Object.freeze({
        name: "__Host-npi_session", value: session.token,
        httpOnly: true, secure: true, sameSite: "lax",
        path: "/", maxAge: MAX_AGE_MS / 1000,
      }),
      // Metadata returned to server only, never used as a client grant.
      tenantId, subject, sessionVersion: seat.sessionVersion,
    });
  } catch {
    return deny("customer_session_store_unavailable");
  }
}

/** Revocation must be durably committed before claiming logout complete. */
export async function revokeIntelligenceCustomerSession({ cookieValue, adapters, now = new Date().toISOString() } = {}) {
  if (!tokenPattern.test(String(cookieValue || "")) || !adapters ||
      typeof adapters.loadSession !== "function" ||
      typeof adapters.commitRevocation !== "function" || time(now) === null) return Object.freeze({ revoked: false });
  try {
    const tokenHash = createHash("sha256").update(cookieValue).digest("hex");
    const stored = await adapters.loadSession(tokenHash);
    if (!stored?.verifiedServerSide || stored.tokenHash !== tokenHash ||
        stored.status !== "active" || stored.revokedAt) return Object.freeze({ revoked: false });
    const result = await adapters.commitRevocation({
      tokenHash, subject: stored.subject, tenantId: stored.tenantId,
      sessionVersion: stored.sessionVersion, revokedAt: now,
    });
    return Object.freeze({ revoked: result?.committed === true && result?.auditRecorded === true && result?.revocationFenceVerified === true });
  } catch {
    return Object.freeze({ revoked: false });
  }
}
