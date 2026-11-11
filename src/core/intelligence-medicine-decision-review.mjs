/**
 * PANDORA: human-governed decision transition preflight, NOT a case ledger.
 *
 * The Medicine Investigation Passport has decisionReady=false by design.
 * No Passport, model draft, forecast, browser flag or unsigned graph fingerprint
 * is evidence of approval. This module returns an uncommitted transition
 * PROPOSAL. An authoritative database must atomically compare the case
 * revision, rights revision and audit head, then write an immutable audit event
 * before changing the case status. No customer access or external action.
 */
const id = /^case-[a-f0-9]{32}$/u;
const medicine = /^medicine-[a-f0-9]{32}$/u;
const hash = /^[a-f0-9]{64}$/u;
const tenant = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const subject = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const revision = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const reason = /^[a-z][a-z0-9_]{2,63}$/u;
const maxRightsAgeMs = 120_000;
const denied = code => Object.freeze({
  eligible: false, code, proposal: null, durableStateChanged: false,
  externalActionAllowed: false, customerAccessGranted: false
});
const transitions = Object.freeze({
  submit: { from: ["draft"], to: "under_review", role: "analyst", progression: true },
  review: { from: ["under_review"], to: "approval_pending", role: "independent_reviewer", progression: true },
  approve: { from: ["approval_pending"], to: "approved", role: "independent_approver", progression: true },
  reject: { from: ["under_review", "approval_pending"], to: "rejected", role: "independent_approver" },
  withdraw: { from: ["draft", "under_review"], to: "withdrawn", role: "analyst" },
  revoke: { from: ["approved"], to: "revoked", role: "security_admin" },
});
function instant(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return null;
  const millis = Date.parse(value);
  return Number.isSafeInteger(millis) && new Date(millis).toISOString() === value ? millis : null;
}
function validCase(row) {
  return row && id.test(row.caseId) && tenant.test(row.tenantId) &&
    medicine.test(row.medicineId) && Number.isSafeInteger(row.version) &&
    row.version >= 1 && row.version < Number.MAX_SAFE_INTEGER &&
    typeof row.status === "string" && subject.test(row.proposerId) &&
    hash.test(row.evidenceSnapshotSha256) && revision.test(row.rightsRevision) &&
    (row.reviewerId == null || subject.test(row.reviewerId)) &&
    (row.approverId == null || subject.test(row.approverId));
}
function validManifest(manifest, row, nowMs) {
  if (!manifest || manifest.verifiedServerSide !== true ||
    manifest.tenantId !== row.tenantId || manifest.medicineId !== row.medicineId ||
    manifest.snapshotSha256 !== row.evidenceSnapshotSha256 ||
    manifest.rightsRevision !== row.rightsRevision ||
    manifest.acceptedForDecisionReview !== true || manifest.sourceRightsApproved !== true ||
    manifest.sampleData !== false || manifest.customerSubmitted !== false ||
    manifest.modelGenerated !== false) return false;
  const checkTime = instant(manifest.rightsCheckedAt);
  if (checkTime === null || checkTime > nowMs || nowMs - checkTime > maxRightsAgeMs) return false;
  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0 ||
      manifest.sources.length > 100) return false;
  const seen = new Set();
  let observed = false;
  for (const src of manifest.sources) {
    if (!src || !revision.test(src.sourceId) || !revision.test(src.sourceVersion) ||
        !hash.test(src.provenanceSha256) || !revision.test(src.rightsRevision) ||
        src.rightsRevision !== manifest.rightsRevision ||
        src.allowedForDecisionReview !== true || src.status !== "active" ||
        !["observed_fact", "derived_metric"].includes(src.evidenceType)) return false;
    const key = JSON.stringify([src.sourceId, src.sourceVersion, src.provenanceSha256]);
    if (seen.has(key)) return false;
    seen.add(key);
    if (src.evidenceType === "observed_fact") observed = true;
  }
  return observed;
}

/**
 * Eligibility to PROPOSE a transition, not authority to commit it.
 * loadCurrentAuthority MUST be trusted server code, reading current case,
 * actor/tenant and rights versions together. A durable transaction must
 * revalidate this vector and commit the audit event before changing status.
 */
export async function proposeMedicineDecisionTransition({
  caseRecord, request, actor, manifest, release, loadCurrentAuthority,
  now = new Date().toISOString(),
} = {}) {
  const when = instant(now);
  if (when === null) return denied("clock_invalid");
  if (!validCase(caseRecord)) return denied("case_invalid");
  if (!request || !Object.hasOwn(transitions, request.action) ||
      !Number.isSafeInteger(request.expectedVersion) ||
      request.expectedVersion !== caseRecord.version ||
      !reason.test(request.reasonCode ?? "")) return denied("transition_invalid_or_stale");
  const transition = transitions[request.action];
  if (!transition.from.includes(caseRecord.status)) return denied("invalid_state_transition");
  if (!actor?.verifiedServerSide || actor.mfaVerified !== true ||
    actor.tenantId !== caseRecord.tenantId || !subject.test(actor.subjectId) ||
    !revision.test(actor.authorityRevision) || actor.role !== transition.role ||
    !release?.verifiedServerSide || release.privateDecisionReviewApproved !== true ||
    typeof loadCurrentAuthority !== "function") return denied("actor_or_release_not_approved");

  const isProposer = actor.subjectId === caseRecord.proposerId;
  if (request.action === "submit" || request.action === "withdraw") {
    if (!isProposer) return denied("separation_of_duties");
  } else if (isProposer) return denied("separation_of_duties");
  if (request.action === "review" &&
      (caseRecord.reviewerId != null || actor.subjectId === caseRecord.approverId)) {
    return denied("separation_of_duties");
  }
  if (request.action === "approve" || request.action === "reject") {
    if (actor.subjectId === caseRecord.reviewerId ||
        (request.action === "approve" &&
          (!subject.test(String(caseRecord.reviewerId ?? "")) ||
           caseRecord.reviewerId === caseRecord.proposerId))) {
      return denied("separation_of_duties");
    }
  }
  if (request.action === "revoke" && actor.subjectId === caseRecord.approverId) {
    return denied("separation_of_duties");
  }
  // A revoked source must never block withdrawal, rejection or revocation,
  // which reduce risk. Progression requires a fresh independently accepted
  // fact, rights vector, and a compatible previously recorded case snapshot.
  if (transition.progression && !validManifest(manifest, caseRecord, when)) {
    return denied("evidence_or_source_rights_not_accepted");
  }

  let authority;
  try {
    authority = await loadCurrentAuthority({
      caseId: caseRecord.caseId, tenantId: caseRecord.tenantId,
      expectedVersion: caseRecord.version, subjectId: actor.subjectId,
      actorAuthorityRevision: actor.authorityRevision,
      evidenceSnapshotSha256: caseRecord.evidenceSnapshotSha256,
      rightsRevision: transition.progression ? caseRecord.rightsRevision : null,
    });
  } catch {
    return denied("authority_unavailable");
  }
  if (authority?.verified !== true || authority.tenantId !== caseRecord.tenantId ||
      authority.caseId !== caseRecord.caseId ||
      authority.currentVersion !== caseRecord.version ||
      authority.actorAuthorityRevision !== actor.authorityRevision ||
      (transition.progression && authority.currentRightsRevision !== caseRecord.rightsRevision)) {
    return denied("authority_revoked_or_stale");
  }

  const proposal = Object.freeze({
    contract: "novapharm.intelligence.decision-transition-proposal.v1",
    caseId: caseRecord.caseId,
    tenantId: caseRecord.tenantId,
    medicineId: caseRecord.medicineId,
    expectedVersion: caseRecord.version,
    proposedVersion: caseRecord.version + 1,
    previousStatus: caseRecord.status,
    proposedStatus: transition.to,
    action: request.action,
    reasonCode: request.reasonCode,
    actorId: actor.subjectId,
    authorityRevision: actor.authorityRevision,
    evidenceSnapshotSha256: caseRecord.evidenceSnapshotSha256,
    rightsRevision: transition.progression ? caseRecord.rightsRevision : null,
    requiresAtomicCompareAndSwap: true,
    requiresFreshRightsCheckAtCommit: transition.progression === true,
    requiresDurableAuditCommit: true,
    isAuthoritativeCaseRecord: false,
    externalActionAllowed: false,
    customerAccessGranted: false,
  });
  return Object.freeze({
    eligible: true, code: "proposal_only_not_committed",
    proposal, durableStateChanged: false,
    externalActionAllowed: false, customerAccessGranted: false,
  });
}
