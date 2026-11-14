/**
 * Private, default-OFF MongoDB transaction store for the G2 NHSBSA medicine
 * evidence admission boundary. It never opens a connection, accepts requests,
 * grants rights, publishes data, or enables NOVA/customer access.
 *
 * The private runtime must inject a least-privilege Atlas client, database,
 * and independent live authorization/rights verification callbacks.
 * Mandatory UNIQUE indexes are inspected on every write: absent indexes
 * cause a hard failure, including in the current empty production database.
 */
import { createHash, randomUUID } from "node:crypto";

const DB = "novapharm_intelligence_production";
const WORKSPACE = "novapharm-internal-staging";
const CONTRACT = "novapharm.private-medicine-atomic-admission.v1";
const SHA = /^[0-9a-f]{64}$/u;
const REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EVIDENCE = "npi_medicine_evidence";
const MANIFEST = "npi_evidence_manifests";
const AUDIT = "npi_audit_events";
const ACTIVE = "privately_admitted_not_published";
const QUARANTINED = "quarantined_never_publish";

export const atlasG2RequiredUniqueIndexKeys = Object.freeze({
  [EVIDENCE]: Object.freeze({
    workspace_id: 1, source_id: 1, source_version: 1,
    resource_id: 1, row_id: 1
  }),
  [MANIFEST]: Object.freeze({ workspace_id: 1, manifest_sha256: 1 }),
  [AUDIT]: Object.freeze({ workspace_id: 1, event_id: 1 })
});
const indexRequirements = atlasG2RequiredUniqueIndexKeys;

const inputRowFields = new Set([
  "workspace_id", "medicine_identity", "code_system", "source_code",
  "source_id", "source_version", "resource_id", "resource_sha256",
  "row_id", "provenance_sha256",
  "period", "jurisdiction", "geography_id", "metric", "unit", "value",
  "evidence_type", "identity_revision", "rights_revision", "status"
]);
const ident = x => typeof x === "string" && REF.test(x);
const sha = x => typeof x === "string" && SHA.test(x);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const denied = reason => {
  throw Object.assign(new Error("Private Atlas G2 storage denied."), {
    code: reason
  });
};
const safeNow = clock => {
  try {
    const now = clock();
    return Number.isSafeInteger(now) && now >= 0 ? new Date(now).toISOString() : null;
  } catch {
    return null;
  }
};

function requireCommitPayload(p) {
  if (!p || typeof p !== "object" || Array.isArray(p) ||
    p.contract !== CONTRACT || p.workspaceId !== WORKSPACE ||
    !ident(p.principalId) || !ident(p.authorityRevision) ||
    p.sourceId !== "nhsbsa_english_prescribing" ||
    !ident(p.sourceVersion) || !ident(p.resourceId) ||
    !sha(p.resourceSha256) || !sha(p.rowsDigest) ||
    !sha(p.manifestSha256) || !UUID.test(p.eventId) ||
    !ident(p.rightsRevision) || !/^\d{4}-(0[1-9]|1[0-2])$/u.test(p.period) ||
    !Number.isSafeInteger(p.rowCount) || p.rowCount < 1 ||
    p.rowCount > 5000 || !Number.isFinite(p.reconciliationTotal) ||
    p.reconciliationTotal < 0 || p.customerPublishApproved !== false ||
    !Array.isArray(p.records) || p.records.length !== p.rowCount) {
    denied("invalid_g2_commit_payload");
  }
  const ids = new Set(), hashes = new Set();
  let total = 0;
  for (const row of p.records) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
      Object.keys(row).some(k => !inputRowFields.has(k)) ||
      row.workspace_id !== WORKSPACE ||
      row.source_id !== p.sourceId ||
      row.source_version !== p.sourceVersion ||
      row.resource_id !== p.resourceId ||
      row.resource_sha256 !== p.resourceSha256 ||
      row.period !== p.period ||
      row.rights_revision !== p.rightsRevision ||
      row.status !== "candidate_not_accepted" ||
      row.evidence_type !== "observed_fact" ||
      !ident(row.medicine_identity) || !ident(row.row_id) ||
      !["BNF_PRESENTATION_CODE", "SNOMED_CODE"].includes(row.code_system) ||
      !ident(row.source_code) ||
      !ident(row.identity_revision) || !ident(row.geography_id) ||
      !sha(row.provenance_sha256) || row.jurisdiction !== "England" ||
      !["items", "quantity", "nic", "actual_cost"].includes(row.metric) ||
      row.unit !== ({ items: "items", quantity: "units", nic: "GBP", actual_cost: "GBP" })[row.metric] ||
      !Number.isFinite(row.value) || row.value < 0 ||
      ids.has(row.row_id) || hashes.has(row.provenance_sha256)) {
      denied("invalid_g2_source_row");
    }
    ids.add(row.row_id);
    hashes.add(row.provenance_sha256);
    total += row.value;
  }
  const digest = createHash("sha256").update(
    p.records.map(row => row.row_id + ":" + row.provenance_sha256).join("\n")
  ).digest("hex");
  if (digest !== p.rowsDigest ||
    Math.abs(total - p.reconciliationTotal) > 1e-6) denied("g2_source_reconciliation_failed");
}

function exactIndex(index, required) {
  return index?.unique === true && index.sparse !== true &&
    index.partialFilterExpression == null &&
    (index.collation == null || index.collation.locale === "simple") &&
    index.key && typeof index.key === "object" &&
    JSON.stringify(Object.entries(index.key)) ===
      JSON.stringify(Object.entries(required));
}

async function requireUniqueIndexes(collections) {
  for (const [name, required] of Object.entries(indexRequirements)) {
    const collection = collections[name];
    if (typeof collection?.listIndexes !== "function") denied("unique_index_unavailable");
    let indexes;
    try {
      const cursor = collection.listIndexes();
      indexes = await cursor.toArray();
    } catch {
      denied("unique_index_unavailable");
    }
    if (!Array.isArray(indexes) || indexes.length > 32 ||
      !indexes.some(index => exactIndex(index, required))) {
      denied("unique_index_unavailable");
    }
  }
}

function readRequest(p) {
  return p && typeof p === "object" && p.workspaceId === WORKSPACE &&
    ident(p.transactionId) && sha(p.manifestSha256) &&
    UUID.test(p.eventId) &&
    Number.isSafeInteger(p.expectedRows) &&
    p.expectedRows >= 1 && p.expectedRows <= 5000;
}

export function createAtlasG2AtomicStore({
  client, database, verifyTransactionAuthority,
  verifyTransactionRights, verifyTransactionIdentity,
  verifyTransactionSource, clock = Date.now
} = {}) {
  if (database?.databaseName !== DB ||
    typeof database.collection !== "function" ||
    typeof client?.startSession !== "function" ||
    typeof verifyTransactionAuthority !== "function" ||
    typeof verifyTransactionRights !== "function" ||
    typeof verifyTransactionIdentity !== "function" ||
    typeof verifyTransactionSource !== "function" ||
    typeof clock !== "function") denied("trusted_atlas_runtime_required");

  const collections = Object.fromEntries(
    [EVIDENCE, MANIFEST, AUDIT].map(name => [name, database.collection(name)])
  );
  const evidence = collections[EVIDENCE], manifests = collections[MANIFEST],
    audit = collections[AUDIT];
  if (typeof evidence?.insertMany !== "function" ||
    typeof evidence?.updateMany !== "function" ||
    typeof evidence?.countDocuments !== "function" ||
    typeof manifests?.insertOne !== "function" ||
    typeof manifests?.findOne !== "function" ||
    typeof manifests?.updateOne !== "function" ||
    typeof audit?.insertOne !== "function" ||
    typeof audit?.findOne !== "function") denied("trusted_atlas_collections_required");

  async function inTransaction(work) {
    const session = client.startSession();
    if (typeof session?.withTransaction !== "function" ||
      typeof session?.endSession !== "function") denied("transaction_session_unavailable");
    try {
      return await session.withTransaction(
        async () => work(session),
        {
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority", j: true },
          readPreference: "primary"
        }
      );
    } finally {
      await session.endSession();
    }
  }

  async function commitAtomic(p) {
    requireCommitPayload(p);
    await requireUniqueIndexes(collections);
    const at = safeNow(clock);
    if (!at) denied("trusted_clock_unavailable");
    const transactionId = randomUUID();
    try {
      await inTransaction(async session => {
        const check = Object.freeze({
          workspaceId: WORKSPACE, principalId: p.principalId,
          authorityRevision: p.authorityRevision,
          sourceId: p.sourceId, sourceVersion: p.sourceVersion,
          resourceId: p.resourceId, resourceSha256: p.resourceSha256,
          rightsRevision: p.rightsRevision
        });
        if (await verifyTransactionAuthority(check, session) !== true ||
            await verifyTransactionRights(check, session) !== true) {
          denied("live_authority_or_rights_revoked");
        }
        // Source rights do not establish that a particular code, strength,
        // form, brand or effective-month resolves to this canonical identity.
        // Independently re-check every exact identity against authority-owned
        // temporal mappings within this transaction, never trust G1 boolean
        // identity_proof fields or model-generated aliases.
        const identityCheck = Object.freeze({
          workspaceId: WORKSPACE, sourceId: p.sourceId,
          sourceVersion: p.sourceVersion, resourceId: p.resourceId,
          resourceSha256: p.resourceSha256, period: p.period,
          rows: Object.freeze(p.records.map(row => Object.freeze({
            rowId: row.row_id, provenanceSha256: row.provenance_sha256,
            medicineIdentity: row.medicine_identity,
            codeSystem: row.code_system,
            sourceCode: row.source_code,
            mappingRevision: row.identity_revision
          })))
        });
        if (await verifyTransactionIdentity(identityCheck, session) !== true) {
          denied("live_canonical_identity_unverified");
        }
        // A source snapshot boolean in G1 is insufficient for G2. Check
        // an independently signed publisher receipt, partition digest,
        // exact period and controlled metric total while still private.
        const sourceCheck = Object.freeze({
          workspaceId: WORKSPACE, sourceId: p.sourceId,
          sourceVersion: p.sourceVersion, resourceId: p.resourceId,
          resourceSha256: p.resourceSha256, reportingPeriod: p.period,
          rowCount: p.rowCount, rowsDigest: p.rowsDigest,
          reconciliationTotal: p.reconciliationTotal
        });
        if (await verifyTransactionSource(sourceCheck, session) !== true) {
          denied("live_source_reconciliation_unverified");
        }
        const duplicate = await manifests.findOne({
          workspace_id: WORKSPACE, manifest_sha256: p.manifestSha256
        }, { session, projection: { _id: 1 } });
        if (duplicate) denied("duplicate_manifest");
        const rows = p.records.map(row => ({
          ...row, transaction_id: transactionId,
          manifest_sha256: p.manifestSha256,
          evidence_event_id: p.eventId,
          recorded_at: at,
          status: ACTIVE, customer_publish_approved: false
        }));
        const inserted = await evidence.insertMany(rows, { session, ordered: true });
        if (!inserted?.acknowledged || inserted.insertedCount !== p.rowCount) {
          denied("evidence_write_not_acknowledged");
        }
        const m = await manifests.insertOne({
          workspace_id: WORKSPACE, transaction_id: transactionId,
          manifest_sha256: p.manifestSha256, event_id: p.eventId,
          source_id: p.sourceId, source_version: p.sourceVersion,
          resource_id: p.resourceId, resource_sha256: p.resourceSha256,
          rights_revision: p.rightsRevision, row_count: p.rowCount,
          reconciliation_total: p.reconciliationTotal,
          rows_digest: p.rowsDigest,
          status: ACTIVE, customer_publish_approved: false, recorded_at: at
        }, { session });
        if (m?.acknowledged !== true || m.insertedId == null) {
          denied("manifest_write_not_acknowledged");
        }
        const a = await audit.insertOne({
          workspace_id: WORKSPACE, event_id: p.eventId,
          transaction_id: transactionId, manifest_sha256: p.manifestSha256,
          action: "medicine_evidence.private_admission",
          actor_id: p.principalId, authority_revision: p.authorityRevision,
          rights_revision: p.rightsRevision, observed_rows: p.rowCount,
          customer_publish_approved: false, recorded_at: at
        }, { session });
        if (a?.acknowledged !== true || a.insertedId == null) {
          denied("audit_write_not_acknowledged");
        }
      });
    } catch (error) {
      if (error?.code === "live_authority_or_rights_revoked" ||
          error?.code === "live_canonical_identity_unverified" ||
          error?.code === "live_source_reconciliation_unverified") throw error;
      denied("atomic_transaction_failed");
    }
    return Object.freeze({
      committed: true, transactionId, workspaceId: WORKSPACE,
      eventId: p.eventId, manifestSha256: p.manifestSha256,
      rowCount: p.rowCount, customerPublishApproved: false
    });
  }

  async function readBackCommit(p) {
    if (!readRequest(p)) return null;
    const scope = { workspace_id: WORKSPACE, transaction_id: p.transactionId };
    const majority = { readConcern: { level: "majority" } };
    try {
      // Fresh independent reads, never echoes of the commit payload.
      const [all, admitted, manifest, receipt] = await Promise.all([
        evidence.countDocuments(scope, majority),
        evidence.countDocuments({ ...scope, status: ACTIVE,
          customer_publish_approved: false }, majority),
        manifests.findOne({ ...scope, manifest_sha256: p.manifestSha256,
          event_id: p.eventId }, majority),
        audit.findOne({ ...scope, event_id: p.eventId,
          manifest_sha256: p.manifestSha256,
          action: "medicine_evidence.private_admission" }, majority)
      ]);
      if (all !== p.expectedRows || admitted !== p.expectedRows ||
        manifest?.status !== ACTIVE || manifest?.row_count !== p.expectedRows ||
        manifest?.customer_publish_approved !== false ||
        receipt?.customer_publish_approved !== false) return null;
      return Object.freeze({
        durable: true, workspaceId: WORKSPACE,
        transactionId: p.transactionId, manifestSha256: p.manifestSha256,
        eventId: p.eventId, acceptedRows: admitted,
        auditCommitted: true, customerPublishApproved: false
      });
    } catch {
      return null;
    }
  }

  async function quarantineCommitted(p) {
    if (!p || typeof p !== "object" ||
      p.workspaceId !== WORKSPACE || !ident(p.transactionId) ||
      !sha(p.manifestSha256) || !UUID.test(p.eventId) ||
      !["durable_audit_or_manifest_missing",
        "authority_recheck_failed_after_commit",
        "rights_recheck_failed_after_commit",
        "clock_recheck_failed_after_commit"].includes(p.reason) ||
      p.customerPublishApproved !== false) denied("invalid_quarantine_request");
    await requireUniqueIndexes(collections);
    const now = safeNow(clock), quarantineEvent = randomUUID();
    if (!now) denied("trusted_clock_unavailable");
    try {
      await inTransaction(async session => {
        const scope = { workspace_id: WORKSPACE, transaction_id: p.transactionId,
          manifest_sha256: p.manifestSha256 };
        const manifest = await manifests.findOne({
          ...scope, event_id: p.eventId
        }, { session });
        if (!manifest || manifest.customer_publish_approved !== false ||
          manifest.status !== ACTIVE) denied("quarantine_manifest_missing");
        const affected = await evidence.updateMany({
          ...scope, status: ACTIVE, customer_publish_approved: false
        }, { $set: { status: QUARANTINED, quarantined_at: now } }, { session });
        if (!affected?.acknowledged || affected.matchedCount !== manifest.row_count ||
          affected.modifiedCount !== manifest.row_count) denied("quarantine_rows_mismatch");
        const m = await manifests.updateOne({
          ...scope, event_id: p.eventId, status: ACTIVE,
          customer_publish_approved: false
        }, { $set: { status: QUARANTINED, quarantined_at: now } }, { session });
        if (!m?.acknowledged || m.modifiedCount !== 1) denied("quarantine_manifest_not_changed");
        const result = await audit.insertOne({
          workspace_id: WORKSPACE, event_id: quarantineEvent,
          original_event_id: p.eventId,
          transaction_id: p.transactionId, manifest_sha256: p.manifestSha256,
          action: "medicine_evidence.quarantine", reason: p.reason,
          customer_publish_approved: false, recorded_at: now
        }, { session });
        if (!result?.acknowledged || result.insertedId == null) {
          denied("quarantine_audit_not_written");
        }
      });
    } catch {
      denied("quarantine_transaction_failed");
    }
    // An acknowledged transaction does not substitute for independent durable
    // readback. A missing quarantine manifest/audit cannot attest success.
    const scope = {
      workspace_id: WORKSPACE, transaction_id: p.transactionId,
      manifest_sha256: p.manifestSha256
    };
    const majority = { readConcern: { level: "majority" } };
    let proof;
    try {
      const [manifest, receipt] = await Promise.all([
        manifests.findOne({ ...scope, event_id: p.eventId,
          status: QUARANTINED, customer_publish_approved: false }, majority),
        audit.findOne({ ...scope, event_id: quarantineEvent,
          original_event_id: p.eventId,
          action: "medicine_evidence.quarantine", reason: p.reason,
          customer_publish_approved: false }, majority)
      ]);
      const quarantined = await evidence.countDocuments({
        ...scope, status: QUARANTINED,
        customer_publish_approved: false
      }, majority);
      proof = manifest && receipt &&
        Number.isSafeInteger(manifest.row_count) &&
        quarantined === manifest.row_count &&
        manifest.row_count >= 1;
    } catch {
      proof = false;
    }
    if (!proof) denied("quarantine_durable_readback_failed");
    // This confirms the quarantine transaction, not a rights grant or release.
    return Object.freeze({
      quarantined: true, workspaceId: WORKSPACE,
      transactionId: p.transactionId, manifestSha256: p.manifestSha256,
      eventId: p.eventId, reason: p.reason, auditCommitted: true,
      customerPublishApproved: false
    });
  }
  return Object.freeze({ commitAtomic, readBackCommit, quarantineCommitted });
}

export const atlasG2AtomicStorageStatus = Object.freeze({
  sourceOnly: true, productionWired: false, customerAccessEnabled: false,
  dataRightsVerified: false, nativeMongoTransactionRequired: true,
  uniqueIndexesRequired: true
});
