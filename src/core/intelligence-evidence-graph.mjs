/**
 * PANDORA / Medicines Intelligence: bounded, rights-aware evidence relationships.
 *
 * Internal staging contract, NOT a public API or a production graph database.
 * Inputs must be injected by an authenticated server. This module never trusts
 * browser-supplied tenancy, source grants, or AI-generated authority.
 * It does not infer medicine efficacy, market demand, supply or approvals.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  approvedAtlasStagingConfig,
  evidenceFilter,
  listWorkspaceEvidence
} from "../data/atlas-evidence-staging.mjs";

const purpose = "internal_evidence_graph";
const denied = () => Object.assign(new Error("Governed medicine evidence is not authorised."), { statusCode: 403 });
const fingerprint = (...parts) =>
  createHash("sha256").update(parts.map(value => String(value)).join("\u0000")).digest("hex");

function approvedAuthority(authority) {
  return authority && authority.verified === true &&
    typeof authority.principalId === "string" && /^[A-Za-z0-9:_-]{3,128}$/.test(authority.principalId) &&
    typeof authority.workspaceId === "string" &&
    typeof authority.authorityRevision === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(authority.authorityRevision) &&
    Array.isArray(authority.accessScopes) &&
    authority.accessScopes.some(scope => scope === "board" || scope === "admin");
}

function permittedGrant(grant, row, workspaceId, asOf) {
  if (!grant || typeof grant !== "object" || Array.isArray(grant)) return false;
  if (grant.workspaceId !== workspaceId || grant.sourceId !== row.source_id ||
    grant.sourceVersion !== row.source_version || grant.status !== "active" ||
    !Array.isArray(grant.allowedPurposes) || !grant.allowedPurposes.includes(purpose) ||
    typeof grant.rightsRevision !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(grant.rightsRevision)) return false;
  // Current active rights are required even for historical as-of queries.
  if (typeof grant.validFrom !== "string" || !Number.isFinite(Date.parse(grant.validFrom)) ||
    Date.parse(grant.validFrom) > Date.parse(asOf)) return false;
  if (grant.validUntil != null && (typeof grant.validUntil !== "string" ||
    !Number.isFinite(Date.parse(grant.validUntil)) || Date.parse(grant.validUntil) <= Date.parse(asOf))) return false;
  return true;
}

/**
 * Only observed source-to-evidence and evidence-to-medicine relationships.
 * Does not create edges between distinct medicines, organisations or datasets.
 *
 * Mandatory server integrations:
 * - resolveSourceGrant: live trusted source-rights lookup; returns versioned grant
 * - verifyCurrentAuthority: checks principal/tenant AND all source-rights revisions
 *   together at the final read boundary; MUST fail closed on unavailable stores
 * - recordAudit: durable internal audit write, acknowledged by matching eventId
 *
 * This is a staging-only implementation contract until transactional authority
 * freshness, deployment, recovery and tenant-isolation are independently accepted.
 */
export async function readGovernedMedicineEvidenceGraph({
  collection, authority, medicineIdentity, asOf, resolveSourceGrant,
  verifyCurrentAuthority, recordAudit, environment = process.env, limit = 30
} = {}) {
  approvedAtlasStagingConfig(environment);
  if (!approvedAuthority(authority) || typeof asOf !== "string") throw denied();
  if (typeof resolveSourceGrant !== "function" ||
    typeof verifyCurrentAuthority !== "function" || typeof recordAudit !== "function") throw denied();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw denied();

  const scoped = evidenceFilter({ workspaceId: authority.workspaceId, medicineIdentity, asOf });
  const records = await listWorkspaceEvidence(collection, {
    workspaceId: scoped.workspace_id, medicineIdentity: scoped.medicine_identity,
    asOf, limit
  });
  const selected = [];
  const grantRevisions = new Map();
  for (const row of records) {
    // Atlas's observed_at query is not sufficient for an as-of read:
    // records not yet ingested at that time cannot enter historical views.
    if (Date.parse(row.observed_at) > Date.parse(asOf) || Date.parse(row.recorded_at) > Date.parse(asOf)) continue;
    const grant = await resolveSourceGrant({
      workspaceId: scoped.workspace_id, sourceId: row.source_id,
      sourceVersion: row.source_version, purpose, asOf
    });
    if (!permittedGrant(grant, row, scoped.workspace_id, asOf)) continue;
    const key = JSON.stringify([row.source_id, row.source_version]);
    const prior = grantRevisions.get(key);
    if (prior && prior !== grant.rightsRevision) throw denied();
    grantRevisions.set(key, grant.rightsRevision);
    selected.push(row);
  }

  // The injected verifier must authoritatively check freshness of the complete
  // permission vector before any evidence metadata is returned.
  const revisions = [...grantRevisions].map(([source, revision]) => ({ source: JSON.parse(source), revision }));
  const fresh = await verifyCurrentAuthority({
    principalId: authority.principalId, workspaceId: scoped.workspace_id,
    authorityRevision: authority.authorityRevision, sourceRightsRevisions: revisions
  });
  if (fresh !== true) throw denied();

  const medicineNodeId = "medicine:" + fingerprint(scoped.workspace_id, scoped.medicine_identity);
  const sources = new Map();
  const evidence = new Map();
  const edges = new Map();
  for (const row of selected) {
    const sourceNodeId = "source:" + fingerprint(scoped.workspace_id, row.source_id, row.source_version);
    const evidenceNodeId = "evidence:" + fingerprint(scoped.workspace_id, row.source_id,
      row.source_version, row.observed_at, row.recorded_at, row.provenance_sha256);
    sources.set(sourceNodeId, {
      id: sourceNodeId, kind: "source", sourceId: row.source_id, sourceVersion: row.source_version
    });
    evidence.set(evidenceNodeId, {
      id: evidenceNodeId, kind: "evidence", evidenceType: row.evidence_type,
      observedAt: row.observed_at, recordedAt: row.recorded_at,
      provenanceSha256: row.provenance_sha256
    });
    const a = { from: medicineNodeId, to: evidenceNodeId, relation: "has_recorded_evidence" };
    const b = { from: evidenceNodeId, to: sourceNodeId, relation: "recorded_from_source" };
    edges.set(JSON.stringify(a), a);
    edges.set(JSON.stringify(b), b);
  }
  const ordered = values => [...values].sort((a, b) => a.id.localeCompare(b.id));
  const nodes = [
    { id: medicineNodeId, kind: "medicine" },
    ...ordered(sources.values()), ...ordered(evidence.values())
  ];
  const relationships = [...edges.values()].sort((a, b) =>
    a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.relation.localeCompare(b.relation));

  // No medicine names, clinical text, raw prompts, patient identifiers or keys
  // enter the security event. Audit errors block the graph result.
  const eventId = randomUUID();
  const auditReceipt = await recordAudit({
    eventId, action: "intelligence.evidence_graph.read",
    actorId: authority.principalId, workspaceId: scoped.workspace_id,
    authorityRevision: authority.authorityRevision,
    medicineFingerprint: fingerprint(scoped.workspace_id, scoped.medicine_identity),
    evidenceCount: evidence.size, sourceCount: sources.size,
    provenanceDigest: fingerprint(...ordered(evidence.values()).map(e => e.provenanceSha256))
  });
  if (auditReceipt?.committed !== true || auditReceipt.eventId !== eventId) {
    throw Object.assign(new Error("Evidence audit was not durably confirmed."), { statusCode: 503 });
  }

  return {
    status: "staging_contract_only", dataState: evidence.size ? "governed_metadata" : "no_authorised_evidence",
    workspaceId: scoped.workspace_id, asOf, graphMode: "observed_one_hop_only",
    nodes, relationships,
    limitations: [
      "Metadata and provenance only; no source-body text, clinical conclusions or commercial forecasts.",
      "Source grants and session authority require a trusted, consistent production store before customer access.",
      "No evidence graph, forecast or simulation is a medicine approval, supply guarantee or clinical recommendation."
    ],
    auditEventId: eventId
  };
}
