/**
 * Internal vendor-neutral enterprise research read boundary.
 *
 * Foundry-like ontology views, Prisma-like security summaries, Bloomberg-like
 * observed series and NOVA citation references share one fail-closed gate.
 * This is NOT a native third-party connector, a model endpoint, a browser API,
 * an endorsement of source rights, or permission to activate customers.
 *
 * All callbacks must be independently implemented by a trusted server, using
 * authoritative stores and durable audit writes; never bind browser parameters
 * directly to authority, grants, records or verification callbacks.
 */
import { createHash, randomUUID } from "node:crypto";

const PURPOSE = "enterprise_internal_research";
const WORKSPACE = /^[a-z0-9][a-z0-9_-]{2,63}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const SHA = /^[a-f0-9]{64}$/u;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u;
const CAPABILITIES = Object.freeze({
  foundry_ops: "ontology_edge",
  cloud_security: "security_finding",
  pharma_markets: "market_observation",
  nova_research: "evidence_reference"
});
const FIELDS = Object.freeze({
  ontology_edge: ["subjectId", "predicate", "objectId"],
  security_finding: ["findingId", "severity", "disposition"],
  market_observation: ["metricId", "value", "unit", "observationType", "region"],
  evidence_reference: ["evidenceId", "contentSha256"]
});
const COMMON = [
  "recordId", "workspaceId", "capability", "sourceId", "sourceVersion",
  "evidenceSha256", "payloadSha256", "state", "isSynthetic", "observedAt",
  "recordedAt", "payload"
];

export const enterpriseResearchCapabilities = Object.freeze(
  Object.keys(CAPABILITIES)
);

const denied = () => Object.assign(
  new Error("Governed enterprise research access is not authorised."),
  { code: "enterprise_research_denied", statusCode: 403 }
);
const digest = value => createHash("sha256").update(value).digest("hex");
const date = x => typeof x === "string" && ISO.test(x) && Number.isFinite(Date.parse(x));
const validId = x => typeof x === "string" && ID.test(x);
const exactFields = (obj, fields) =>
  obj && typeof obj === "object" && !Array.isArray(obj) &&
  Object.keys(obj).length === fields.length &&
  Object.keys(obj).every(key => fields.includes(key)) &&
  fields.every(key => Object.hasOwn(obj, key));

function validPayload(kind, p) {
  if (!exactFields(p, FIELDS[kind])) return false;
  switch (kind) {
    case "ontology_edge":
      return validId(p.subjectId) && ["classified_as", "published_by", "source_of", "related_to"].includes(p.predicate) &&
        validId(p.objectId);
    case "security_finding":
      return validId(p.findingId) &&
        ["critical", "high", "medium", "low", "informational"].includes(p.severity) &&
        ["open", "mitigated", "resolved", "risk_accepted"].includes(p.disposition);
    case "market_observation":
      return validId(p.metricId) && typeof p.value === "number" && Number.isFinite(p.value) &&
        Math.abs(p.value) <= 1e12 && validId(p.unit) &&
        p.observationType === "observed" && /^[A-Z]{2}$/u.test(p.region);
    case "evidence_reference":
      return validId(p.evidenceId) && typeof p.contentSha256 === "string" && SHA.test(p.contentSha256);
    default:
      return false;
  }
}
function validRecord(row, workspaceId, capability, kind, asOf, now) {
  return exactFields(row, COMMON) && row.workspaceId === workspaceId &&
    row.capability === capability && validId(row.recordId) &&
    validId(row.sourceId) && validId(row.sourceVersion) &&
    row.state === "accepted" && row.isSynthetic === false &&
    typeof row.evidenceSha256 === "string" && SHA.test(row.evidenceSha256) &&
    typeof row.payloadSha256 === "string" && SHA.test(row.payloadSha256) &&
    validPayload(kind, row.payload) &&
    row.payloadSha256 === digest(JSON.stringify(row.payload)) &&
    date(row.observedAt) && date(row.recordedAt) &&
    Date.parse(row.observedAt) <= Date.parse(asOf) &&
    Date.parse(row.recordedAt) <= now;
}
function validGrant(grant, row, capability, workspaceId, now) {
  return grant && typeof grant === "object" && !Array.isArray(grant) &&
    grant.workspaceId === workspaceId &&
    grant.sourceId === row.sourceId && grant.sourceVersion === row.sourceVersion &&
    grant.status === "active" && grant.revokedAt == null &&
    grant.verifiedByRightsAuthority === true &&
    validId(grant.rightsRevision) && SHA.test(grant.decisionSha256) &&
    Array.isArray(grant.allowedPurposes) && grant.allowedPurposes.includes(PURPOSE) &&
    Array.isArray(grant.allowedCapabilities) && grant.allowedCapabilities.includes(capability) &&
    date(grant.validFrom) && Date.parse(grant.validFrom) <= now &&
    (grant.validUntil === null ||
      (date(grant.validUntil) && Date.parse(grant.validUntil) > now));
}

/**
 * A bounded, rights-checked record read for one of four enterprise capabilities.
 * Never invokes a model, vendor endpoint or third-party API. No free-text input,
 * medical advice, procurement, export, writes or proprietary licensed feeds.
 *
 * The trusted verifier MUST atomically check current tenant/session authority
 * together with every supplied source-rights revision at the read boundary.
 * Audit writes MUST be durable and acknowledge the exact eventId.
 */
export async function readGovernedEnterpriseRecords({
  authority, capability, asOf, loadRecords, resolveSourceGrant,
  verifyCurrentAuthority, recordAudit, clock = () => Date.now(),
  limit = 20, nativeVendor = false
} = {}) {
  if (!authority || authority.verified !== true ||
      !validId(authority.principalId) || !WORKSPACE.test(authority.workspaceId ?? "") ||
      !validId(authority.authorityRevision) ||
      !Array.isArray(authority.accessScopes) ||
      !authority.accessScopes.some(role => ["board", "admin", "intelligence:research"].includes(role)) ||
      !Object.hasOwn(CAPABILITIES, capability) || !date(asOf) || nativeVendor !== false ||
      !Number.isInteger(limit) || limit < 1 || limit > 20 ||
      [loadRecords, resolveSourceGrant, verifyCurrentAuthority, recordAudit]
        .some(fn => typeof fn !== "function")) throw denied();
  const now = clock();
  if (!Number.isSafeInteger(now) || now < Date.parse(asOf)) throw denied();
  const ctx = {
    principalId: authority.principalId, workspaceId: authority.workspaceId,
    authorityRevision: authority.authorityRevision, purpose: PURPOSE
  };
  // Reject invalid identity *before* touching trusted evidence storage.
  if ((await verifyCurrentAuthority({ ...ctx, sourceRightsRevisions: [] })) !== true) throw denied();
  const rows = await loadRecords({
    workspaceId: authority.workspaceId, capability, asOf, limit, purpose: PURPOSE
  });
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > limit) throw denied();
  const ids = new Set(), revisions = new Map();
  for (const row of rows) {
    if (!validRecord(row, authority.workspaceId, capability, CAPABILITIES[capability], asOf, now) ||
        ids.has(row.recordId)) throw denied();
    ids.add(row.recordId);
    const grant = await resolveSourceGrant({
      workspaceId: authority.workspaceId, sourceId: row.sourceId,
      sourceVersion: row.sourceVersion, capability, purpose: PURPOSE
    });
    if (!validGrant(grant, row, capability, authority.workspaceId, now)) throw denied();
    const key = JSON.stringify([row.sourceId, row.sourceVersion]);
    if (revisions.has(key) && revisions.get(key) !== grant.rightsRevision) throw denied();
    revisions.set(key, grant.rightsRevision);
  }
  const sourceRightsRevisions = [...revisions].sort(([a],[b]) => a.localeCompare(b))
    .map(([source,revision]) => ({ source: JSON.parse(source), revision }));
  if ((await verifyCurrentAuthority({ ...ctx, sourceRightsRevisions })) !== true) throw denied();
  const eventId = randomUUID();
  const recordDigest = digest(rows.map(row =>
    [row.recordId, row.evidenceSha256, row.payloadSha256].join(":")).sort().join("\n"));
  const receipt = await recordAudit({
    eventId, action: "enterprise.read.pre_release", capability,
    workspaceId: authority.workspaceId, principalId: authority.principalId,
    authorityRevision: authority.authorityRevision, recordCount: rows.length,
    recordDigest, sourceRightsRevisions, noRawSourceText: true
  });
  if (receipt?.committed !== true || receipt.eventId !== eventId) throw denied();
  // Ensure authority or source rights weren't revoked while audit was written.
  if ((await verifyCurrentAuthority({ ...ctx, sourceRightsRevisions })) !== true) throw denied();
  return {
    contract: "novapharm.intelligence.enterprise-read.v1",
    capability, purpose: PURPOSE, vendorMode: "vendor_neutral_only",
    nativeVendorConnected: false, productionCertified: false,
    workspaceId: authority.workspaceId, asOf, auditEventId: eventId,
    recordDigest,
    records: rows.map(row => ({
      recordId: row.recordId, sourceId: row.sourceId,
      sourceVersion: row.sourceVersion, evidenceSha256: row.evidenceSha256,
      observedAt: row.observedAt, payload: { ...row.payload }
    }))
  };
}
