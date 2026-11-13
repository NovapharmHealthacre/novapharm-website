/**
 * The G2 boundary between the strictly validated NHSBSA EPD *candidate* and
 * a durable, private, audited admission. No Atlas credentials, HTTP or side
 * effects are implemented here: independently trusted server adapters MUST
 * supply the authority, rights, atomic write and readback operations.
 *
 * This is not a customer read permission, a source licence, or an AI release.
 * The existing G1 validator still rejects unlicensed BNF/SNOMED mappings,
 * synthetic patient data, imprecise matches, invalid source hashes and totals.
 */
import { createHash, randomUUID } from "node:crypto";
import { prepareOfficialMedicineEvidenceCandidate } from "./medicine-evidence-admission.mjs";

const WORKSPACE = "novapharm-internal-staging";
const SHA = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u;

function deny(code) {
  throw Object.assign(new Error("Private medicine evidence admission refused."), {
    code, statusCode: 403
  });
}
function timestamp(s) {
  return typeof s === "string" && ISO.test(s) && Number.isFinite(Date.parse(s));
}
function identity(authority) {
  return authority && typeof authority === "object" && !Array.isArray(authority) &&
    authority.verifiedBySessionService === true &&
    authority.workspaceId === WORKSPACE &&
    ID.test(authority.principalId ?? "") &&
    ID.test(authority.authorityRevision ?? "") &&
    authority.customerAccess === false &&
    Array.isArray(authority.scopes) &&
    authority.scopes.some(s => s === "board" || s === "admin");
}
function liveRights(receipt, candidate, grant, now) {
  return receipt && typeof receipt === "object" && !Array.isArray(receipt) &&
    receipt.verifiedByRightsAuthority === true &&
    receipt.status === "active" && receipt.revoked === false &&
    receipt.workspaceId === WORKSPACE &&
    receipt.sourceId === candidate.sourceId &&
    receipt.sourceVersion === candidate.sourceVersion &&
    receipt.resourceId === candidate.resourceId &&
    receipt.resourceSha256 === candidate.resourceSha256 &&
    receipt.rightsRevision === grant.rightsRevision &&
    receipt.termsSha256 === grant.termsSha256 &&
    receipt.terminologyRightsRevision === grant.terminologyRightsRevision &&
    receipt.datasetReuseApproved === true &&
    receipt.commercialAnalysisApproved === true &&
    receipt.thirdPartyTerminologyReuseApproved === true &&
    Array.isArray(receipt.allowedPurposes) &&
    receipt.allowedPurposes.includes("private_observed_prescribing_ingestion") &&
    timestamp(receipt.checkedAt) &&
    Date.parse(receipt.checkedAt) <= now &&
    now - Date.parse(receipt.checkedAt) <= 60_000 &&
    timestamp(receipt.validFrom) &&
    Date.parse(receipt.validFrom) <= now &&
    (receipt.validUntil == null ||
      (timestamp(receipt.validUntil) && Date.parse(receipt.validUntil) > now));
}
function immutable(rows) {
  return Object.freeze(rows.map(row => Object.freeze({ ...row })));
}

/**
 * G2 candidate -> private admitted record set. The commit adapter MUST
 * atomically write every candidate row, a source manifest and an append-only
 * audit receipt, with no partial transaction on failure. The readback adapter
 * MUST query independent durable state, not echo the input.
 *
 * This function cannot create a licence, approve customer access or execute
 * NOVA. Audit/rights/tenant freshness are rechecked at the last boundary.
 */
export async function admitPrivateOfficialMedicineEvidence({
  snapshot, rows, grant, release, authority,
  verifyCurrentRights, verifyCurrentAuthority, commitAtomic, readBackCommit,
  now = new Date()
} = {}) {
  if (!identity(authority)) deny("trusted_private_authority_required");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      !timestamp(release?.checkedAt) ||
      Math.abs(now.getTime() - Date.parse(release.checkedAt)) > 60_000) {
    deny("release_freshness_invalid");
  }
  if ([verifyCurrentRights, verifyCurrentAuthority, commitAtomic, readBackCommit]
    .some(f => typeof f !== "function")) deny("trusted_storage_adapters_required");

  const candidate = prepareOfficialMedicineEvidenceCandidate({ snapshot, rows, grant, release });
  if (candidate.status !== "candidate_validated_not_accepted" ||
      candidate.customerPublishApproved !== false ||
      candidate.acceptedObservations !== 0 ||
      candidate.records.some(row => row.workspace_id !== WORKSPACE ||
        row.status !== "candidate_not_accepted")) deny("invalid_validated_candidate");

  const check = {
    principalId: authority.principalId,
    workspaceId: WORKSPACE,
    authorityRevision: authority.authorityRevision,
    sourceId: candidate.sourceId, sourceVersion: candidate.sourceVersion,
    resourceId: candidate.resourceId, resourceSha256: candidate.resourceSha256,
    rightsRevision: grant.rightsRevision,
    purpose: "private_observed_prescribing_ingestion"
  };
  if (await verifyCurrentAuthority(Object.freeze({ ...check })) !== true) {
    deny("authority_revoked_before_commit");
  }
  const before = await verifyCurrentRights(Object.freeze({ ...check }));
  if (!liveRights(before, candidate, grant, now.getTime())) deny("rights_revoked_before_commit");

  const manifestSha256 = createHash("sha256").update(JSON.stringify([
    "novapharm.private-source-admission.v1", WORKSPACE, candidate.sourceId,
    candidate.sourceVersion, candidate.resourceId, candidate.resourceSha256,
    candidate.period, candidate.rowsDigest, candidate.rowCount,
    candidate.reconciliationTotal, grant.rightsRevision
  ])).digest("hex");
  const eventId = randomUUID();
  const payload = Object.freeze({
    contract: "novapharm.private-medicine-atomic-admission.v1",
    workspaceId: WORKSPACE,
    principalId: authority.principalId,
    authorityRevision: authority.authorityRevision,
    sourceId: candidate.sourceId,
    sourceVersion: candidate.sourceVersion,
    resourceId: candidate.resourceId,
    resourceSha256: candidate.resourceSha256,
    period: candidate.period,
    rowsDigest: candidate.rowsDigest,
    reconciliationTotal: candidate.reconciliationTotal,
    rowCount: candidate.rowCount,
    rightsRevision: candidate.rightsRevision,
    manifestSha256,
    eventId,
    customerPublishApproved: false,
    records: immutable(candidate.records)
  });

  // Do not give write access to the caller. The server-owned adapter must
  // enforce the checked workspace, status transition, idempotency and ledger.
  const written = await commitAtomic(payload);
  if (!written || written.committed !== true ||
      !ID.test(written.transactionId ?? "") ||
      written.eventId !== eventId ||
      written.manifestSha256 !== manifestSha256 ||
      written.workspaceId !== WORKSPACE ||
      written.rowCount !== candidate.rowCount ||
      written.customerPublishApproved !== false) {
    deny("atomic_commit_not_attested");
  }
  const read = await readBackCommit(Object.freeze({
    transactionId: written.transactionId, workspaceId: WORKSPACE,
    manifestSha256, eventId, expectedRows: candidate.rowCount
  }));
  if (!read || read.durable !== true ||
      read.workspaceId !== WORKSPACE ||
      read.transactionId !== written.transactionId ||
      read.eventId !== eventId ||
      read.manifestSha256 !== manifestSha256 ||
      read.acceptedRows !== candidate.rowCount ||
      read.auditCommitted !== true ||
      read.customerPublishApproved !== false) {
    deny("durable_audit_or_manifest_missing");
  }

  // A late revocation cannot turn a committed record into an authorised read.
  if (await verifyCurrentAuthority(Object.freeze({ ...check })) !== true) {
    deny("authority_revoked_after_commit");
  }
  const after = await verifyCurrentRights(Object.freeze({ ...check }));
  if (!liveRights(after, candidate, grant, now.getTime())) deny("rights_revoked_after_commit");

  return Object.freeze({
    contract: "novapharm.private-medicine-atomic-admission.v1",
    status: "privately_admitted_requires_independent_release",
    workspaceId: WORKSPACE,
    manifestSha256,
    auditEventId: eventId,
    transactionId: written.transactionId,
    acceptedPrivateRows: candidate.rowCount,
    sourceId: candidate.sourceId,
    sourceVersion: candidate.sourceVersion,
    resourceSha256: candidate.resourceSha256,
    rightsRevision: candidate.rightsRevision,
    customerPublishApproved: false,
    customerAccessEnabled: false,
    productionCertified: false,
    aiExecutionApproved: false,
    requiresIndependentSourceAndScientificAcceptance: true
  });
}
