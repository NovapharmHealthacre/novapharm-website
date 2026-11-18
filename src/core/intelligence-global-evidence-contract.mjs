/**
 * NovaPharm Intelligence global evidence boundary — internal evaluation only.
 *
 * This validates the SHAPE of a trusted server-side source-rights decision. It
 * does not verify a legal agreement or cryptographic signature, and MUST NOT be
 * exposed as an HTTP endpoint or called with client-supplied grants.
 */
import { createHash } from "node:crypto";

export const EVALUATION_PURPOSE = "internal-evaluation";
export const EVIDENCE_STATE = "unreconciled_upstream_preview";

const isId = (value) => typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9_:.@-]{1,127}$/.test(value);
const utcIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const canonicalUtc = value => typeof value === "string" && utcIso.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;

export function assertInternalEvaluationPermit({ permit, sourceId, tenantId, domain, country, now }) {
  if (!permit || typeof permit !== "object" || Array.isArray(permit)) {
    throw new Error("Source rights are not approved");
  }
  // Validate types before Date.parse: even a Symbol or object supplied by a
  // malformed authority adapter must fail closed with the same denial.
  const issued = typeof permit.issuedAt === "string" ? Date.parse(permit.issuedAt) : NaN;
  const expires = typeof permit.validUntil === "string" ? Date.parse(permit.validUntil) : NaN;
  if (permit.decision !== "approved" ||
    permit.rightsStatus !== "approved" ||
    permit.sourceId !== sourceId ||
    permit.tenantId !== tenantId ||
    permit.country !== country ||
    permit.domain !== domain ||
    permit.purpose !== EVALUATION_PURPOSE ||
    !Array.isArray(permit.allowedUses) ||
    !permit.allowedUses.includes(EVALUATION_PURPOSE) ||
    !isId(permit.receiptId) ||
    !isId(permit.licenseId) ||
    !isId(permit.rightsVersion) ||
    !Number.isFinite(now) ||
    !canonicalUtc(permit.issuedAt) || !canonicalUtc(permit.validUntil) ||
    !Number.isFinite(issued) || !Number.isFinite(expires) ||
    issued > now || expires <= now || expires <= issued ||
    expires - issued > 24 * 60 * 60 * 1000 ||
    permit.revokedAt != null) {
    throw new Error("Source rights are not approved");
  }
  return Object.freeze({
    receiptId: permit.receiptId,
    licenseId: permit.licenseId,
    rightsVersion: permit.rightsVersion,
    validUntil: new Date(expires).toISOString()
  });
}

export function buildEvaluationEnvelope({ plan, normalized, raw, grant, capturedAt }) {
  const when = new Date(capturedAt);
  if (!plan || !normalized || normalized.canPublish !== false ||
      normalized.dataState !== EVIDENCE_STATE ||
      normalized.sourceId !== plan.sourceId ||
      normalized.jurisdiction !== plan.country ||
      !Array.isArray(normalized.records) ||
      !grant || !isId(grant.receiptId) ||
      !canonicalUtc(grant.validUntil) ||
      !Number.isFinite(when.getTime()) ||
      when.getTime() >= Date.parse(grant.validUntil)) {
    throw new Error("Invalid evaluation envelope");
  }
  const rawSerialized = JSON.stringify(raw);
  if (typeof rawSerialized !== "string" || rawSerialized.length > 262144) {
    throw new Error("Invalid evaluation payload");
  }
  const rawSha256 = createHash("sha256").update(rawSerialized, "utf8").digest("hex");
  return Object.freeze({
    ...normalized,
    domain: plan.domain,
    purpose: EVALUATION_PURPOSE,
    retrievedAt: when.toISOString(),
    responseSha256: rawSha256,
    rightsReceiptId: grant.receiptId,
    rightsVersion: grant.rightsVersion,
    publishDecision: "DENIED_UNTIL_INDEPENDENT_DATA_ADMISSION",
    clinicalDecisionReady: false,
    commercialDecisionReady: false
  });
}

export function validateSourceEvidenceAdmission(candidate) {
  // Deliberate fail-closed first phase: no API adapter may self-approve a
  // regulatory, clinical, market or economic observation for client delivery.
  if (!candidate || candidate.canPublish !== false) {
    throw new Error("Evaluation data cannot be published");
  }
  return Object.freeze({ admitted: false, reason: "INDEPENDENT_ADMISSION_REQUIRED" });
}
