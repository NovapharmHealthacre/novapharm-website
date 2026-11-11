/**
 * NovaPharm Intelligence customer access decision boundary.
 *
 * This is NOT a public account-creation endpoint or an entitlement issuer.
 * Production must supply strongly-consistent, independently authenticated
 * loaders over the customer-access ledger. Never hydrate any loader result
 * from cookies, HTTP JSON, Cognito custom attributes or Stripe metadata.
 * No protected API is wired to this module until full acceptance.
 */
import { createHash, randomBytes } from "node:crypto";
import { decideIntelligenceEntitlement } from "./intelligence-subscription-entitlements.mjs";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/u;
const subjectPattern = /^[a-zA-Z0-9-]{8,128}$/u;
const tenantPattern = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

const deny = (code) => Object.freeze({ allowed: false, code, tenantId: null, subject: null });

function validInstant(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)) return null;
  const millis = Date.parse(value);
  if (!Number.isSafeInteger(millis)) return null;
  return new Date(millis).toISOString() === (value.endsWith(".000Z") ? value : value.replace(/Z$/u, ".000Z")) ? millis : null;
}

/** Only issue after durable, atomic session-record creation by the trusted backend. */
export function generateIntelligenceCustomerSessionSecret() {
  const token = randomBytes(32).toString("base64url");
  return Object.freeze({
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    cookieName: "__Host-npi_session",
    maximumLifetimeSeconds: MAX_SESSION_MS / 1000,
  });
}

/**
 * Lookups must use consistent reads and return explicit verifiedServerSide
 * records, backed by the dedicated ledger. The customer request can provide
 * only an opaque cookie and requested feature. Never accept tenantId from it.
 * Any failed read, stale seat, missing approval, or billing mismatch denies.
 */
export async function authoriseIntelligenceCustomer({
  cookieValue, feature, loaders, release, now = new Date().toISOString(),
} = {}) {
  if (typeof cookieValue !== "string" || !tokenPattern.test(cookieValue)) return deny("session_missing");
  if (typeof feature !== "string" || !/^[a-z][a-z-]{2,63}$/u.test(feature)) return deny("feature_invalid");
  const required = ["session", "tenant", "membership", "seat", "billing", "usage"];
  if (!loaders || required.some((name) => typeof loaders[name] !== "function")) return deny("authoritative_store_unavailable");
  const current = validInstant(now);
  if (current === null) return deny("invalid_clock");

  try {
    const tokenHash = createHash("sha256").update(cookieValue).digest("hex");
    const session = await loaders.session(tokenHash);
    if (!session?.verifiedServerSide || session.tokenHash !== tokenHash ||
        session.status !== "active" || session.revokedAt ||
        session.identityProvider !== "cognito-oidc" || session.mfaVerified !== true ||
        !subjectPattern.test(String(session.subject ?? "")) ||
        !tenantPattern.test(String(session.tenantId ?? "")) ||
        !Number.isSafeInteger(session.sessionVersion) || session.sessionVersion < 1) return deny("session_not_authorised");

    const issued = validInstant(session.issuedAt);
    const expires = validInstant(session.expiresAt);
    if (issued === null || expires === null || issued > current ||
        expires <= current || expires <= issued || expires - issued > MAX_SESSION_MS) return deny("session_expired");

    const tenantId = session.tenantId;
    const subject = session.subject;
    const [tenant, membership, seat, billing, usage] = await Promise.all([
      loaders.tenant(tenantId),
      loaders.membership(subject, tenantId),
      loaders.seat(tenantId, subject),
      loaders.billing(tenantId, subject),
      loaders.usage(tenantId, subject),
    ]);

    if (!tenant?.verifiedServerSide || tenant.tenantId !== tenantId ||
        tenant.status !== "active" || tenant.contractAccepted !== true ||
        tenant.ownershipVerified !== true || !subjectPattern.test(String(tenant.ownerSubject ?? "")) ||
        !Number.isSafeInteger(tenant.seatLimit) || tenant.seatLimit < 1 ||
        !Number.isSafeInteger(tenant.activeSeatCount) || tenant.activeSeatCount < 1 ||
        tenant.activeSeatCount > tenant.seatLimit) return deny("tenant_not_approved");

    if (!membership?.verifiedServerSide || membership.subject !== subject ||
        membership.tenantId !== tenantId || membership.status !== "active" ||
        membership.approved !== true || !subjectPattern.test(String(membership.approvedBy ?? ""))) return deny("membership_not_approved");

    if (!seat?.verifiedServerSide || seat.tenantId !== tenantId ||
        seat.subject !== subject || seat.status !== "active" ||
        seat.sessionVersion !== session.sessionVersion ||
        !["owner", "admin", "analyst", "viewer"].includes(seat.role) ||
        !Array.isArray(seat.features) || !seat.features.includes(feature)) return deny("seat_not_authorised");

    if (billing?.verifiedServerSide !== true || usage?.verifiedServerSide !== true ||
        release?.verifiedServerSide !== true) return deny("entitlement_evidence_missing");

    const decision = decideIntelligenceEntitlement({
      principal: {
        verifiedServerSide: true, mfaVerified: true, tenantId, subject,
        identityProvider: "cognito-oidc",
      },
      grant: billing,
      usage,
      release,
      feature,
      now,
    });
    if (!decision.allowed) return deny(decision.code);
    return Object.freeze({
      allowed: true, code: "authorised", tenantId, subject,
      role: seat.role, effectivePlan: decision.effectivePlan,
      remainingSearches: decision.remainingSearches,
    });
  } catch {
    // Storage timeouts and provider failures are denials, never permissive fallback.
    return deny("customer_access_unavailable");
  }
}
