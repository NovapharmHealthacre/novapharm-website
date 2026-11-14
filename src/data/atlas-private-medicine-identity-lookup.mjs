/**
 * Exact-code, private medicine-identity read boundary for the first six
 * NovaPharm Intelligence workflows. Not a free-text search, public API,
 * licensing grant or customer release. No connection is opened by this module.
 *
 * Only a separately approved, least-privilege server runtime can inject the
 * collections and independent session, rights and durable-audit authorities.
 */
const DATABASE = "novapharm_intelligence_production";
const PILOT_WORKSPACE = "novapharm-internal-staging";
const PURPOSE = "private_medicine_identity_research";
const CODES = new Set(["BNF_PRESENTATION_CODE", "SNOMED_CODE"]);
// Canonical UTC whole-second timestamps preserve lexical Mongo comparisons.
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/u;
const IDENT = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const EXACT_BNF_PRESENTATION = /^[A-Z0-9]{15}$/u;
const EXACT_SNOMED_CONCEPT = /^[0-9]{6,18}$/u;
const validExactCode = (system, code) =>
  typeof code === "string" && (system === "BNF_PRESENTATION_CODE"
    ? EXACT_BNF_PRESENTATION.test(code)
    : system === "SNOMED_CODE" && EXACT_SNOMED_CONCEPT.test(code));
const SHA = /^[0-9a-f]{64}$/u;
const FIELDS = Object.freeze([
  "workspace_id", "identity_id", "canonical_name", "code_system", "normalized_code",
  "jurisdiction", "source_id", "source_version", "source_resource_sha256",
  "identity_revision", "rights_revision", "effective_from", "effective_to",
  "verified_at", "status", "is_synthetic",
]);
const PROJECTION = Object.freeze(Object.fromEntries([["_id", 0], ...FIELDS.map(k => [k, 1])]));
const denied = (reason = "identity_read_denied") => Object.assign(
  new Error("Private medicine identity read denied."), { code: reason, statusCode: 403 },
);
const validTime = x => typeof x === "string" && ISO.test(x) &&
  Number.isFinite(Date.parse(x)) &&
  new Date(Date.parse(x)).toISOString().replace(".000Z", "Z") === x;
const validId = x => typeof x === "string" && IDENT.test(x);
const cleanName = x => typeof x === "string" && x.trim().length >= 2 &&
  x.trim().length <= 300 && !/[\u0000-\u001F]/u.test(x);
const approvedSession = (x, principalId, now) => x?.verified === true &&
  x.workspaceId === PILOT_WORKSPACE && x.principalId === principalId &&
  x.role === "board" && validId(x.authorityRevision) &&
  validTime(x.expiresAt) && Date.parse(x.expiresAt) > now;
function currentRights(rights, row, now) {
  return rights?.verified === true && rights.active === true &&
    rights.workspaceId === PILOT_WORKSPACE &&
    rights.sourceId === row.source_id &&
    rights.sourceVersion === row.source_version &&
    rights.rightsRevision === row.rights_revision &&
    rights.allowedPurpose === PURPOSE &&
    validTime(rights.checkedAt) &&
    Date.parse(rights.checkedAt) <= now &&
    now - Date.parse(rights.checkedAt) <= 60_000 &&
    (rights.validUntil == null ||
      (validTime(rights.validUntil) && Date.parse(rights.validUntil) > now));
}
function checkRow(row, { sourceCode, codeSystem, asOf }) {
  if (!row || typeof row !== "object" || Array.isArray(row) ||
      Object.keys(row).some(k => !FIELDS.includes(k)) ||
      row.workspace_id !== PILOT_WORKSPACE || row.code_system !== codeSystem ||
      row.normalized_code !== sourceCode || row.jurisdiction !== "England" ||
      row.status !== "accepted" || row.is_synthetic !== false ||
      !validId(row.identity_id) || !cleanName(row.canonical_name) ||
      !validId(row.source_id) || !validId(row.source_version) ||
      !validId(row.identity_revision) || !validId(row.rights_revision) ||
      !SHA.test(row.source_resource_sha256) || !validTime(row.effective_from) ||
      !validTime(row.verified_at) ||
      Date.parse(row.verified_at) > Date.parse(asOf) ||
      Date.parse(row.effective_from) > Date.parse(asOf) ||
      (row.effective_to !== null && (!validTime(row.effective_to) ||
        Date.parse(row.effective_to) <= Date.parse(asOf)))) {
    throw denied("source_identity_unverified");
  }
}
export function createPrivateAtlasMedicineIdentityLookup({
  database, verifyPrivateSession, verifyCurrentSourceRights,
  recordReadAudit, clock = Date.now,
} = {}) {
  if (database?.databaseName !== DATABASE || typeof database.collection !== "function" ||
      typeof verifyPrivateSession !== "function" ||
      typeof verifyCurrentSourceRights !== "function" ||
      typeof recordReadAudit !== "function" || typeof clock !== "function") {
    throw denied("private_identity_service_unconfigured");
  }
  const identities = database.collection("npi_medicine_identity");
  if (!identities || typeof identities.find !== "function") {
    throw denied("private_identity_store_unavailable");
  }
  async function lookup({ principalId, workspaceId, codeSystem, sourceCode, asOf } = {}) {
    if (workspaceId !== PILOT_WORKSPACE || !validId(principalId) ||
        !CODES.has(codeSystem) || !validExactCode(codeSystem, sourceCode) ||
        !validTime(asOf)) {
      throw denied("invalid_exact_identity_request");
    }
    const now = clock();
    if (!Number.isSafeInteger(now) || now <= 0 || Date.parse(asOf) > now) {
      throw denied("invalid_exact_identity_request");
    }
    const context = Object.freeze({ principalId, workspaceId, purpose: PURPOSE, asOf });
    const session = await verifyPrivateSession(context);
    if (!approvedSession(session, principalId, now)) throw denied("private_session_not_accepted");
    const filter = {
      workspace_id: PILOT_WORKSPACE, code_system: codeSystem,
      normalized_code: sourceCode, jurisdiction: "England",
      status: "accepted", is_synthetic: false,
      effective_from: { $lte: asOf },
      $or: [{ effective_to: null }, { effective_to: { $gt: asOf } }],
    };
    const cursor = identities.find(filter, {
      projection: PROJECTION, maxTimeMS: 3000,
    });
    if (!cursor || typeof cursor.limit !== "function") throw denied("private_identity_store_unavailable");
    const bounded = cursor.limit(3);
    if (!bounded || typeof bounded.toArray !== "function") throw denied("private_identity_store_unavailable");
    const rows = await bounded.toArray();
    if (!Array.isArray(rows) || rows.length > 2) throw denied("ambiguous_identity_not_resolved");
    for (const row of rows) checkRow(row, { sourceCode, codeSystem, asOf });
    // Conflicts are not sorted or guessed into one medicine.
    const state = rows.length === 0 ? "no_accepted_identity" :
      rows.length > 1 ? "multiple_current_mappings_require_review" : "accepted_identity_source_checked";
    // Even ambiguous mappings may contain licensed terminology: do not
    // reveal the existence of multiple current rows without checking rights
    // on every underlying publisher/version/revision first.
    const checkedGrants = [];
    for (const row of rows) {
      const rights = await verifyCurrentSourceRights(Object.freeze({
        ...context, sourceId: row.source_id,
        sourceVersion: row.source_version, rightsRevision: row.rights_revision,
      }));
      const checkedAt = clock();
      if (!Number.isSafeInteger(checkedAt) || checkedAt < now ||
          !currentRights(rights, row, checkedAt)) {
        throw denied("source_rights_not_accepted");
      }
      checkedGrants.push({ rights, row });
    }
    const rechecked = await verifyPrivateSession(context);
    const afterReadNow = clock();
    if (!Number.isSafeInteger(afterReadNow) || afterReadNow < now ||
        !approvedSession(rechecked, principalId, afterReadNow) ||
        rechecked.authorityRevision !== session.authorityRevision) {
      throw denied("session_revoked_during_read");
    }
    if (checkedGrants.some(({ rights, row }) => !currentRights(rights, row, afterReadNow))) {
      throw denied("source_rights_revoked_during_read");
    }
    const audit = await recordReadAudit(Object.freeze({
      ...context, codeSystem, sourceCode, state,
      sourceId: rows.length === 1 ? rows[0].source_id : null,
      identityId: rows.length === 1 ? rows[0].identity_id : null,
    }));
    if (!audit || audit.committed !== true || !validId(audit.eventId)) {
      throw denied("read_audit_unavailable");
    }
    const responseNow = clock();
    if (!Number.isSafeInteger(responseNow) || responseNow < afterReadNow ||
        !approvedSession(rechecked, principalId, responseNow) ||
        checkedGrants.some(({ rights, row }) => !currentRights(rights, row, responseNow))) {
      throw denied("authority_expired_before_response");
    }
    const row = rows.length === 1 ? rows[0] : null;
    return Object.freeze({
      contract: "novapharm.intelligence.private-exact-medicine-identity.v1",
      state, query: Object.freeze({ codeSystem, sourceCode, asOf }),
      identity: row ? Object.freeze({
        identityId: row.identity_id, canonicalName: row.canonical_name.trim(),
        codeSystem: row.code_system, sourceCode: row.normalized_code,
        sourceId: row.source_id, sourceVersion: row.source_version,
        sourceResourceSha256: row.source_resource_sha256,
        identityRevision: row.identity_revision, rightsRevision: row.rights_revision,
        effectiveFrom: row.effective_from, effectiveTo: row.effective_to,
      }) : null,
      noMarketOrClinicalClaims: true,
      customerReleaseApproved: false,
      productionCertified: false,
      auditEventId: audit.eventId,
    });
  }
  return Object.freeze({ lookup });
}
