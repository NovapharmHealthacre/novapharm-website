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

function assertInternalEvaluationPermitInner({ permit, sourceId, tenantId, domain, country, now }) {
  if (!permit || typeof permit !== "object" || Array.isArray(permit)) {
    throw new Error("Source rights are not approved");
  }
  // Read every potentially mutable authority field exactly once, then
  // validate and project ONLY the immutable snapshot.
  const names = ["decision","rightsStatus","sourceId","tenantId","country",
    "domain","purpose","allowedUses","receiptId","licenseId","rightsVersion",
    "issuedAt","validUntil","revokedAt"];
  const fields = Object.fromEntries(names.map(name=>[name,permit[name]]));
  if (Array.isArray(fields.allowedUses)) fields.allowedUses = Object.freeze([...fields.allowedUses]);
  const approved = Object.freeze(fields);
  // Validate types before Date.parse: even a Symbol or object supplied by a
  // malformed authority adapter must fail closed with the same denial.
  const issued = typeof approved.issuedAt === "string" ? Date.parse(approved.issuedAt) : NaN;
  const expires = typeof approved.validUntil === "string" ? Date.parse(approved.validUntil) : NaN;
  if (approved.decision !== "approved" ||
    approved.rightsStatus !== "approved" ||
    approved.sourceId !== sourceId ||
    approved.tenantId !== tenantId ||
    approved.country !== country ||
    approved.domain !== domain ||
    approved.purpose !== EVALUATION_PURPOSE ||
    !Array.isArray(approved.allowedUses) ||
    !approved.allowedUses.includes(EVALUATION_PURPOSE) ||
    !isId(approved.receiptId) ||
    !isId(approved.licenseId) ||
    !isId(approved.rightsVersion) ||
    !Number.isSafeInteger(now) || now < 0 ||
    !canonicalUtc(approved.issuedAt) || !canonicalUtc(approved.validUntil) ||
    !Number.isFinite(issued) || !Number.isFinite(expires) ||
    issued > now || expires <= now || expires <= issued ||
    expires - issued > 24 * 60 * 60 * 1000 ||
    approved.revokedAt != null) {
    throw new Error("Source rights are not approved");
  }
  return Object.freeze({
    receiptId: approved.receiptId,
    licenseId: approved.licenseId,
    rightsVersion: approved.rightsVersion,
    validUntil: new Date(expires).toISOString()
  });
}

/** Deny even malicious authority object accessors without backend detail leakage. */
export function assertInternalEvaluationPermit(input) {
  try { return assertInternalEvaluationPermitInner(input); }
  catch { throw new Error("Source rights are not approved"); }
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
