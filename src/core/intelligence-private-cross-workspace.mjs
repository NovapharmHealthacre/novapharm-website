/**
 * Private, bounded cross-workspace evidence composer for the six Intelligence
 * workstreams. All source data and authority must originate from trusted server
 * adapters. This is NOT a production data store, entitlement, licence grant,
 * customer API, AI egress path, regulatory opinion or release certification.
 * It does not fetch, persist, buy, bid, email, infer an identity or grant access.
 */
import { createHash, randomUUID } from "node:crypto";

const kinds = Object.freeze({
  identity_code: "medicine_knowledge_graph",
  pack_relationship: "medicine_knowledge_graph",
  supplier_relationship: "medicine_knowledge_graph",
  jurisdiction_authorisation: "medicine_knowledge_graph",
  source_ingestion: "data_operations_governance",
  partition_reconciliation: "data_operations_governance",
  source_revocation_test: "data_operations_governance",
  shortage_notice: "supply_tender_intelligence",
  tender_notice: "supply_tender_intelligence",
  tender_award: "supply_tender_intelligence",
  trial_registration: "biotech_capital_intelligence",
  company_asset_relationship: "biotech_capital_intelligence",
  capital_event: "biotech_capital_intelligence",
  scientific_evaluation: "research_evaluation",
  tenant_isolation_test: "enterprise_operations",
  audit_integrity_test: "enterprise_operations",
  restore_drill: "enterprise_operations"
});
const areas = Object.freeze([...new Set(Object.values(kinds))]);
const validId = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const validTenant = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const validMedicine = /^medicine-[a-f0-9]{32}$/u;
const sha256 = /^[a-f0-9]{64}$/u;
const datePattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u;
const sourceKeys = new Set([
  "sourceId", "sourceVersion", "rightsRevision", "sourceSha256", "status",
  "rightsStatus", "allowedPurposes", "thirdPartyRightsReviewed", "verifiedServerSide",
  "nonSampleAccepted", "validFrom", "validUntil", "revokedAt"
]);
const recordKeys = new Set([
  "evidenceId", "kind", "tenantId", "medicineId", "sourceId", "sourceVersion",
  "rightsRevision", "sourceSha256", "provenanceSha256", "publisherRecordId",
  "observedAt", "recordedAt", "validFrom", "validUntil", "matchStatus",
  "evidenceType", "verifiedServerSide", "acceptedFromNonSampleData"
]);
const denied = code => Object.assign(new Error("Private Intelligence evidence unavailable."), { code, statusCode: 403 });
const unavailable = () => Object.assign(new Error("Private Intelligence authority or audit unavailable."), { statusCode: 503 });
const simple = value => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;
const fields = (item, allowed) => simple(item) && Object.keys(item).every(key => allowed.has(key));
const time = value => typeof value === "string" && datePattern.test(value) && Number.isFinite(Date.parse(value)) &&
  new Date(Date.parse(value)).toISOString() === value ? Date.parse(value) : null;
const digest = (...parts) => createHash("sha256").update(parts.map(x => String(x)).join("\0")).digest("hex");
const sourceKey = (id, version) => JSON.stringify([id, version]);
const scoreType = kind => ["scientific_evaluation", "tenant_isolation_test", "audit_integrity_test", "restore_drill",
  "partition_reconciliation", "source_revocation_test"].includes(kind) ? "derived_metric" : "observed_fact";

function validAuthority(authority, release) {
  return simple(authority) && authority.verifiedServerSide === true && authority.mfaVerified === true &&
    authority.sessionActive === true && validTenant.test(authority.tenantId ?? "") &&
    validId.test(authority.subjectId ?? "") && validId.test(authority.authorityRevision ?? "") &&
    Array.isArray(authority.accessScopes) && authority.accessScopes.some(x => x === "board" || x === "admin") &&
    simple(release) && release.verifiedServerSide === true && release.environment === "private_staging" &&
    release.privateResearchApproved === true && release.customerAccessEnabled === false &&
    release.customerPublishingEnabled === false && release.outboundActionsEnabled === false;
}

function sourceValid(s, at) {
  const from = time(s?.validFrom); const until = s?.validUntil == null ? null : time(s.validUntil);
  return fields(s, sourceKeys) && validId.test(s.sourceId ?? "") && validId.test(s.sourceVersion ?? "") &&
    validId.test(s.rightsRevision ?? "") && sha256.test(s.sourceSha256 ?? "") &&
    s.verifiedServerSide === true && s.status === "accepted" && s.rightsStatus === "active" &&
    s.thirdPartyRightsReviewed === true && s.nonSampleAccepted === true && s.revokedAt === null &&
    Array.isArray(s.allowedPurposes) && s.allowedPurposes.includes("internal_cross_workspace_research") &&
    s.allowedPurposes.every(x => typeof x === "string" && validId.test(x)) &&
    from !== null && from <= at && (s.validUntil == null || (until !== null && until > at));
}
function evidenceValid(e, authority, medicineId, s, at) {
  const observed = time(e?.observedAt), recorded = time(e?.recordedAt);
  const from = time(e?.validFrom), until = e?.validUntil == null ? null : time(e.validUntil);
  return fields(e, recordKeys) && Object.hasOwn(kinds, e.kind) &&
    validId.test(e.evidenceId ?? "") && validId.test(e.publisherRecordId ?? "") &&
    e.tenantId === authority.tenantId && e.medicineId === medicineId &&
    e.sourceId === s.sourceId && e.sourceVersion === s.sourceVersion &&
    e.rightsRevision === s.rightsRevision && e.sourceSha256 === s.sourceSha256 &&
    sha256.test(e.provenanceSha256 ?? "") && e.verifiedServerSide === true &&
    e.acceptedFromNonSampleData === true && e.evidenceType === scoreType(e.kind) &&
    ["authoritative_exact", "unresolved"].includes(e.matchStatus) &&
    observed !== null && recorded !== null && from !== null &&
    observed <= at && recorded <= at && from <= at &&
    (e.validUntil == null || (until !== null && until > at));
}

/**
 * Existing server-side adapters must supply source-rights-approved, non-sample
 * records, a live authority+rights revision fence and a durable audit receipt.
 * A caller could fake injected evidence, so returned state ALWAYS remains a
 * private candidate; separate independent runtime acceptance is mandatory.
 */
export async function composePrivateMedicineCrossWorkspace({
  authority, release, medicineId, asOf, sources = [], evidence = [],
  verifyCurrentAuthority, recordAudit
} = {}) {
  if (!validAuthority(authority, release) || !validMedicine.test(medicineId ?? "") ||
      time(asOf) === null || typeof verifyCurrentAuthority !== "function" ||
      typeof recordAudit !== "function" || !Array.isArray(sources) || sources.length > 40 ||
      !Array.isArray(evidence) || evidence.length > 250) throw denied("request_not_authorised");
  const at = time(asOf);
  const sourceMap = new Map();
  for (const source of sources) {
    if (!sourceValid(source, at)) throw denied("source_rights_not_accepted");
    const key = sourceKey(source.sourceId, source.sourceVersion);
    if (sourceMap.has(key)) throw denied("duplicate_source_contract");
    sourceMap.set(key, source);
  }
  const items = new Map(areas.map(area => [area, []]));
  const unresolved = new Map(areas.map(area => [area, 0]));
  const seenEvidence = new Set();
  for (const row of evidence) {
    const source = sourceMap.get(sourceKey(row?.sourceId, row?.sourceVersion));
    if (!source || !evidenceValid(row, authority, medicineId, source, at) || seenEvidence.has(row.evidenceId)) {
      throw denied("unaccepted_or_conflicting_evidence");
    }
    seenEvidence.add(row.evidenceId);
    const area = kinds[row.kind];
    if (row.matchStatus === "unresolved") {
      // An ambiguous medicine/pack/jurisdiction relationship never becomes a fact.
      unresolved.set(area, unresolved.get(area) + 1);
      continue;
    }
    items.get(area).push(Object.freeze({
      kind: row.kind, evidenceId: row.evidenceId, publisherRecordId: row.publisherRecordId,
      sourceId: row.sourceId, sourceVersion: row.sourceVersion,
      sourceSha256: row.sourceSha256, provenanceSha256: row.provenanceSha256,
      observedAt: row.observedAt, recordedAt: row.recordedAt, validFrom: row.validFrom,
      validUntil: row.validUntil, evidenceType: row.evidenceType,
      semanticStatus: "record_linked_not_independently_production_certified"
    }));
  }
  const rightsVector = [...sourceMap.values()].map(s => ({
    sourceId: s.sourceId, sourceVersion: s.sourceVersion,
    rightsRevision: s.rightsRevision, sourceSha256: s.sourceSha256
  })).sort((a,b) => sourceKey(a.sourceId,a.sourceVersion).localeCompare(sourceKey(b.sourceId,b.sourceVersion)));
  let fresh;
  try {
    fresh = await verifyCurrentAuthority({
      tenantId: authority.tenantId, subjectId: authority.subjectId,
      authorityRevision: authority.authorityRevision, medicineId, rightsVector
    });
  } catch { throw unavailable(); }
  if (fresh !== true) throw denied("revoked_or_stale_authority");
  const counts = Object.fromEntries(areas.map(area => [area, {
    acceptedLinkedCandidateCount: items.get(area).length, unresolvedMatchCount: unresolved.get(area)
  }]));
  const eventId = randomUUID();
  let receipt;
  try {
    receipt = await recordAudit({
      eventId, action: "intelligence.private_cross_workspace.read", actorId: authority.subjectId,
      tenantId: authority.tenantId, authorityRevision: authority.authorityRevision,
      medicineFingerprint: digest(authority.tenantId, medicineId),
      sourceRightsDigest: digest(JSON.stringify(rightsVector)), counts
    });
  } catch { throw unavailable(); }
  if (receipt?.eventId !== eventId || receipt?.committed !== true ||
      receipt?.majorityAcknowledged !== true) throw unavailable();
  return Object.freeze({
    contract: "novapharm.intelligence.private-cross-workspace.v1",
    status: "private_candidate_only", customerLive: false, customerReleaseApproved: false,
    sourceRightsProductionCertified: false, independentlyAccepted: false,
    tenantId: authority.tenantId, medicineId, asOf,
    workstreams: areas.map(area => ({
      id: area, ...counts[area], status: "candidate_requires_independent_runtime_acceptance",
      evidenceRefs: items.get(area).sort((a,b) => a.evidenceId.localeCompare(b.evidenceId))
    })),
    auditEventId: eventId,
    limitations: [
      "Only an authenticated, private server may use this staging read-model; no customer access or AI egress.",
      "Source-rights and evidence inputs are injected, not independently certified by this function.",
      "Unresolved identities are excluded; notices do not prove tender eligibility, stock or commercial opportunity.",
      "Trial registration and capital events do not imply efficacy, regulatory approval or investment merit.",
      "Scientific benchmark and tenant/recovery receipts do not replace independent production tests."
    ]
  });
}
