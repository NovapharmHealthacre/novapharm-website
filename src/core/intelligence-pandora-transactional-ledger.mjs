/**
 * PANDORA private transactional case ledger candidate (staging only).
 *
 * No public endpoint, autonomous action or implicit source licence.
 * This requires a replica-set MongoDB transaction spanning cases, authority,
 * source rights, evidence manifests and audit. All record mutations that revoke
 * rights or identity MUST write the same fenced documents in this database.
 * Production activation needs independent security and release acceptance.
 */
import { createHash, randomUUID } from "node:crypto";
import { proposeMedicineDecisionTransition } from "./intelligence-medicine-decision-review.mjs";
import { verifyPandoraStagingUniqueIndexes } from "../data/atlas-pandora-staging-indexes.mjs";

export const pandoraStagingCollections = Object.freeze({
  cases: "nova_decision_cases_staging",
  manifests: "nova_decision_manifests_staging",
  authorities: "nova_decision_authorities_staging",
  rights: "nova_decision_rights_staging",
  events: "nova_decision_events_staging"
});
const casePattern = /^case-[a-f0-9]{32}$/u;
const tenantPattern = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const subjectPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const reasonPattern = /^[a-z][a-z0-9_]{2,63}$/u;
const hashPattern = /^[a-f0-9]{64}$/u;
const timePattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u;
const progression = new Set(["submit", "review", "approve"]);
const actions = new Set(["submit", "review", "approve", "reject", "withdraw", "revoke"]);
const stop = code => Object.assign(new Error("PANDORA decision transaction denied."), { code, statusCode: 403 });
const digest = event => createHash("sha256").update(JSON.stringify(event)).digest("hex");
const accepted = result => result?.matchedCount === 1 && result?.modifiedCount === 1;

function requireConfig(environment, client, db) {
  if (environment.ATLAS_ENVIRONMENT !== "staging" ||
      environment.PANDORA_STAGING_DECISION_LEDGER_ENABLED !== "true" ||
      environment.PANDORA_STAGING_DECISION_AUDIT_ENABLED !== "true" ||
      environment.PANDORA_ALLOW_EXTERNAL_ACTIONS === "true" ||
      environment.PANDORA_ALLOW_PUBLIC_ACCESS === "true" ||
      environment.PANDORA_OWNER_FINAL_APPROVAL_REQUIRED !== "true" ||
      !subjectPattern.test(environment.PANDORA_FINAL_APPROVER_SUBJECT_ID ?? "")) throw stop("ledger_disabled");
  if (typeof client?.startSession !== "function" || typeof db?.collection !== "function" ||
      db.databaseName !== "novapharm_staging") throw stop("storage_unavailable");
  const entries = Object.values(pandoraStagingCollections).map(name => db.collection(name));
  const tables = Object.fromEntries(Object.keys(pandoraStagingCollections).map((key, i) => [key, entries[i]]));
  if (["cases", "manifests", "authorities"].some(key => typeof tables[key]?.findOne !== "function") ||
      ["cases", "authorities", "rights"].some(key => typeof tables[key]?.updateOne !== "function") ||
      typeof tables.events?.insertOne !== "function") throw stop("storage_unavailable");
  return tables;
}

function readCase(raw, requestedCase, requestedTenant) {
  if (!raw || raw.case_id !== requestedCase || raw.tenant_id !== requestedTenant) throw stop("case_not_found");
  return {
    caseId: raw.case_id, tenantId: raw.tenant_id, medicineId: raw.medicine_id,
    version: raw.version, status: raw.status, proposerId: raw.proposer_id,
    reviewerId: raw.reviewer_id ?? null, approverId: raw.approver_id ?? null,
    evidenceSnapshotSha256: raw.evidence_snapshot_sha256, rightsRevision: raw.rights_revision
  };
}
function manifestFromStore(raw, record, rightsCheckedAt) {
  if (!raw || raw.tenant_id !== record.tenantId || raw.case_id !== record.caseId ||
      raw.medicine_id !== record.medicineId ||
      raw.snapshot_sha256 !== record.evidenceSnapshotSha256 ||
      raw.rights_revision !== record.rightsRevision ||
      raw.accepted_for_decision_review !== true ||
      raw.sample_data !== false || raw.customer_submitted !== false ||
      raw.model_generated !== false || !Array.isArray(raw.sources)) throw stop("manifest_not_accepted");
  return {
    verifiedServerSide: true, tenantId: record.tenantId,
    medicineId: record.medicineId, snapshotSha256: record.evidenceSnapshotSha256,
    rightsRevision: record.rightsRevision, acceptedForDecisionReview: true,
    sourceRightsApproved: true, sampleData: false, customerSubmitted: false,
    modelGenerated: false, rightsCheckedAt,
    sources: raw.sources.map(s => ({
      sourceId: s.source_id, sourceVersion: s.source_version,
      provenanceSha256: s.provenance_sha256, rightsRevision: s.rights_revision,
      allowedForDecisionReview: s.allowed_for_decision_review === true,
      status: s.status, evidenceType: s.evidence_type
    }))
  };
}

/**
 * Execute ONE transition using a real Mongo transaction; never call this with
 * a browser-owned actor. All collection handles must be from one private Atlas
 * staging database. The caller controls no Mongo selectors or persisted fields.
 *
 * A majority commit is necessary, not sufficient for production: the source-
 * rights revocation writers must use these same fenced rights records and the
 * organisation must enforce audit immutability and a verified restore policy.
 */
export async function commitPandoraMedicineDecision({
  client, db, request, actor, release, environment = process.env,
  now = new Date().toISOString()
} = {}) {
  const tables = requireConfig(environment, client, db);
  if (!request || !casePattern.test(request.caseId) ||
      !tenantPattern.test(request.tenantId) ||
      !actions.has(request.action) ||
      !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion < 1 ||
      !reasonPattern.test(request.reasonCode ?? "") ||
      !actor?.verifiedServerSide || actor.mfaVerified !== true ||
      actor.tenantId !== request.tenantId || !subjectPattern.test(actor.subjectId) ||
      !release?.verifiedServerSide || release.privateDecisionReviewApproved !== true ||
      !timePattern.test(now) || new Date(now).toISOString() !== now) throw stop("request_or_release_not_approved");
  // The owner is the only final decision approver. Their identity is a
  // verified OIDC subject configured by the private authority, never a name,
  // browser claim or self-assigned user profile. Review remains independent.
  if (["approve", "reject"].includes(request.action) &&
      actor.subjectId !== environment.PANDORA_FINAL_APPROVER_SUBJECT_ID) {
    throw stop("owner_final_approver_required");
  }
  const timeMs = Date.parse(now);
  // Do not allow transactional commits without actual uniqueness guarantees.
  // The index check is against the connected server, never a caller assertion.
  await verifyPandoraStagingUniqueIndexes({ db, environment });
  const session = client.startSession();
  if (typeof session?.withTransaction !== "function" || typeof session?.endSession !== "function") throw stop("transaction_unavailable");

  try {
    const receipt = await session.withTransaction(async () => {
      const original = await tables.cases.findOne({
        case_id: request.caseId, tenant_id: request.tenantId
      }, { session });
      const record = readCase(original, request.caseId, request.tenantId);
      if (record.version !== request.expectedVersion) throw stop("stale_case_version");

      // An authority row is not trusted solely on read. The write fence forces
      // a transaction conflict with a competing revocation on the same row.
      const identity = await tables.authorities.findOne({
        tenant_id: record.tenantId, subject_id: actor.subjectId
      }, { session });
      if (!identity || identity.verified !== true || identity.mfa_verified !== true ||
          identity.revoked_at != null || !timePattern.test(identity.session_expires_at ?? "") ||
          !Number.isFinite(Date.parse(identity.session_expires_at)) ||
          Date.parse(identity.session_expires_at) <= timeMs ||
          !subjectPattern.test(identity.authority_revision ?? "") ||
          !subjectPattern.test(identity.role ?? "")) throw stop("authority_unavailable");
      const authority = await tables.authorities.updateOne({
        tenant_id: record.tenantId, subject_id: actor.subjectId,
        authority_revision: identity.authority_revision, role: identity.role,
        verified: true, mfa_verified: true, revoked_at: null,
        session_expires_at: { $gt: now }
      }, { $inc: { decision_commit_fence: 1 } }, { session });
      if (!accepted(authority)) throw stop("authority_changed");

      let manifest = null;
      if (progression.has(request.action)) {
        const stored = await tables.manifests.findOne({
          tenant_id: record.tenantId, case_id: record.caseId,
          snapshot_sha256: record.evidenceSnapshotSha256,
          rights_revision: record.rightsRevision
        }, { session });
        manifest = manifestFromStore(stored, record, now);
        if (manifest.sources.length < 1 || manifest.sources.length > 100) throw stop("sources_unavailable");
        const seen = new Set();
        for (const source of manifest.sources) {
          if (!subjectPattern.test(source.sourceId ?? "") ||
              !subjectPattern.test(source.sourceVersion ?? "") ||
              !hashPattern.test(source.provenanceSha256 ?? "") ||
              source.allowedForDecisionReview !== true ||
              source.status !== "active" ||
              source.rightsRevision !== record.rightsRevision) throw stop("invalid_source");
          const key = JSON.stringify([source.sourceId, source.sourceVersion, source.provenanceSha256]);
          if (seen.has(key)) throw stop("duplicate_source");
          seen.add(key);
          // No inferred licence. Enforce the current explicit, purpose-bound
          // grant, with a write fence for serialisation against revocations.
          const rights = await tables.rights.updateOne({
            tenant_id: record.tenantId, source_id: source.sourceId,
            source_version: source.sourceVersion, rights_revision: record.rightsRevision,
            status: "active", allowed_purposes: "decision_review",
            valid_from: { $lte: now }, $or: [
              { valid_until: null }, { valid_until: { $gt: now } }
            ]
          }, { $inc: { decision_commit_fence: 1 } }, { session });
          if (!accepted(rights)) throw stop("source_rights_unavailable");
        }
      }
      const proposal = await proposeMedicineDecisionTransition({
        caseRecord: record,
        request: { action: request.action, expectedVersion: request.expectedVersion,
          reasonCode: request.reasonCode },
        actor: { verifiedServerSide: true, mfaVerified: true,
          tenantId: record.tenantId, subjectId: actor.subjectId,
          role: identity.role, authorityRevision: identity.authority_revision },
        manifest,
        release,
        now,
        loadCurrentAuthority: async () => ({
          verified: true, caseId: record.caseId, tenantId: record.tenantId,
          currentVersion: record.version, actorAuthorityRevision: identity.authority_revision,
          currentRightsRevision: record.rightsRevision
        })
      });
      if (!proposal.eligible || !proposal.proposal ||
          proposal.proposal.expectedVersion !== record.version) throw stop(proposal.code);

      const eventId = randomUUID();
      const event = {
        contract: "novapharm.pandora.decision-audit.v1",
        event_id: eventId, case_id: record.caseId, tenant_id: record.tenantId,
        medicine_id: record.medicineId, version: proposal.proposal.proposedVersion,
        previous_status: record.status, status: proposal.proposal.proposedStatus,
        action: request.action, reason_code: request.reasonCode,
        actor_id: actor.subjectId, actor_authority_revision: identity.authority_revision,
        evidence_snapshot_sha256: record.evidenceSnapshotSha256,
        rights_revision: progression.has(request.action) ? record.rightsRevision : null,
        previous_event_sha256: original.audit_head_sha256 ?? null,
        recorded_at: now
      };
      if (event.previous_event_sha256 !== null &&
          !hashPattern.test(event.previous_event_sha256)) throw stop("audit_chain_invalid");
      const eventHash = digest(event);
      const changes = {
        version: proposal.proposal.proposedVersion,
        status: proposal.proposal.proposedStatus,
        audit_head_sha256: eventHash,
        last_decision_at: now
      };
      if (request.action === "review") changes.reviewer_id = actor.subjectId;
      if (request.action === "approve") changes.approver_id = actor.subjectId;
      const result = await tables.cases.updateOne({
        case_id: record.caseId, tenant_id: record.tenantId,
        version: record.version, status: record.status,
        evidence_snapshot_sha256: record.evidenceSnapshotSha256,
        rights_revision: record.rightsRevision,
        audit_head_sha256: original.audit_head_sha256 ?? null
      }, { $set: changes }, { session });
      if (!accepted(result)) throw stop("concurrent_case_change");
      const written = await tables.events.insertOne({
        ...event, event_sha256: eventHash
      }, { session });
      if (!written?.acknowledged || written.insertedId == null) throw stop("audit_write_failed");
      return Object.freeze({
        committed: true, status: "staging_transaction_committed",
        caseId: record.caseId, tenantId: record.tenantId,
        version: changes.version, decisionStatus: changes.status,
        auditEventId: eventId, auditSha256: eventHash,
        externalActionAllowed: false, customerAccessGranted: false
      });
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority", j: true },
      readPreference: "primary"
    });
    if (receipt?.committed !== true) throw stop("transaction_not_committed");
    return receipt;
  } finally {
    await session.endSession();
  }
}
