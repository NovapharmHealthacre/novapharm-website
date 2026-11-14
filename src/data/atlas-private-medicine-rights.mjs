/**
 * Read-only private production Atlas source-rights adapter for G2 medicine
 * admission. This does not issue rights, create data, or authenticate people.
 * It may only be instantiated by a trusted backend with database credentials
 * and an independently owned signed-grant verification service.
 */
import { createHash } from "node:crypto";

const WORKSPACE = "novapharm-internal-staging";
const DATABASE = "novapharm_intelligence_production";
const COLLECTION = "npi_source_rights";
const PURPOSE = "private_observed_prescribing_ingestion";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const SHA = /^[0-9a-f]{64}$/u;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u;
const fields = [
  "workspace_id", "source_id", "source_version", "resource_id",
  "resource_sha256", "rights_revision", "terms_sha256",
  "terminology_rights_revision", "allowed_purposes", "status",
  "revoked", "dataset_reuse_approved", "commercial_analysis_approved",
  "third_party_terminology_reuse_approved", "valid_from", "valid_until"
];
// The existing production collection has no unique grant index yet. Refuse
// positive rights receipts until that operational migration is independently
// installed and verified against MongoDB's actual listIndexes metadata.
const requiredUniqueKeys = Object.freeze({
  workspace_id: 1, source_id: 1, source_version: 1,
  resource_id: 1, resource_sha256: 1, rights_revision: 1
});
async function hasRequiredUniqueIndex(collection) {
  if (typeof collection?.listIndexes !== "function") return false;
  try {
    const cursor = collection.listIndexes();
    if (typeof cursor?.toArray !== "function") return false;
    const indexes = await cursor.toArray();
    if (!Array.isArray(indexes) || indexes.length > 32) return false;
    const requiredKeys = Object.entries(requiredUniqueKeys);
    return indexes.some(index =>
      index && index.unique === true &&
      index.sparse !== true &&
      index.partialFilterExpression == null &&
      (index.collation == null || index.collation.locale === "simple") &&
      index.key && typeof index.key === "object" &&
      JSON.stringify(Object.entries(index.key)) === JSON.stringify(requiredKeys)
    );
  } catch {
    return false;
  }
}
const projection = Object.freeze(Object.fromEntries([
  ["_id", 0], ...fields.map(field => [field, 1])
]));
const validId = x => typeof x === "string" && ID.test(x);
const validSha = x => typeof x === "string" && SHA.test(x);
const validUtc = x => typeof x === "string" &&
  ISO.test(x) && Number.isFinite(Date.parse(x));
const safeTime = clock => {
  try {
    const time = clock();
    return Number.isSafeInteger(time) && time >= 0 ? time : null;
  } catch {
    return null;
  }
};
function candidateDigest(record) {
  const shape = fields.map(field => [field, record[field] ?? null]);
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex");
}
function validQuery(x) {
  return x && typeof x === "object" && !Array.isArray(x) &&
    x.workspaceId === WORKSPACE &&
    [x.principalId, x.authorityRevision, x.sourceId, x.sourceVersion,
      x.resourceId, x.rightsRevision].every(validId) &&
    validSha(x.resourceSha256) && x.purpose === PURPOSE;
}
function validateGrant(g, request, now) {
  if (!g || typeof g !== "object" || Array.isArray(g) ||
    Object.keys(g).some(key => !fields.includes(key)) ||
    g.workspace_id !== WORKSPACE || g.source_id !== request.sourceId ||
    g.source_version !== request.sourceVersion ||
    g.resource_id !== request.resourceId ||
    g.resource_sha256 !== request.resourceSha256 ||
    g.rights_revision !== request.rightsRevision ||
    !validSha(g.terms_sha256) ||
    !validId(g.terminology_rights_revision) ||
    g.status !== "active" || g.revoked !== false ||
    g.dataset_reuse_approved !== true ||
    g.commercial_analysis_approved !== true ||
    g.third_party_terminology_reuse_approved !== true ||
    !Array.isArray(g.allowed_purposes) ||
    g.allowed_purposes.length !== 1 || g.allowed_purposes[0] !== PURPOSE ||
    !validUtc(g.valid_from) || Date.parse(g.valid_from) > now ||
    (g.valid_until != null &&
      (!validUtc(g.valid_until) || Date.parse(g.valid_until) <= now))) {
    return false;
  }
  return true;
}

/**
 * The DB object must be server-created and scoped to the production namespace.
 * 'verifySignedGrant' must use an independent trusted grant-verification source
 * (not a truthy flag stored in MongoDB). A forged record alone never suffices.
 *
 * This adapter intentionally cannot grant admission from Atlas itself: G2 must
 * also verify live MFA/board authority, atomically commit, read back and audit.
 */
export function createAtlasPrivateMedicineRightsVerifier({
  database, verifySignedGrant, clock = Date.now
} = {}) {
  if (database?.databaseName !== DATABASE ||
    typeof database.collection !== "function" ||
    typeof verifySignedGrant !== "function" ||
    typeof clock !== "function") {
    throw new Error("Trusted private medicine rights backend is required.");
  }
  const collection = database.collection(COLLECTION);
  if (typeof collection?.find !== "function") {
    throw new Error("Production source-rights collection unavailable.");
  }
  return async function verifyCurrentRights(request) {
    if (!validQuery(request)) return null;
    if (!(await hasRequiredUniqueIndex(collection))) return null;
    // Exact scalar selectors only; no untrusted operators or dynamic projection.
    const query = Object.freeze({
      workspace_id: WORKSPACE,
      source_id: request.sourceId,
      source_version: request.sourceVersion,
      resource_id: request.resourceId,
      resource_sha256: request.resourceSha256,
      rights_revision: request.rightsRevision
    });
    const cursor = collection.find(query, { projection });
    if (typeof cursor?.limit !== "function") return null;
    const grants = await cursor.limit(2).toArray();
    if (!Array.isArray(grants) || grants.length !== 1) return null;
    const now = safeTime(clock);
    const g = grants[0];
    if (now === null || !validateGrant(g, request, now)) return null;
    const digest = candidateDigest(g);
    let signed;
    try {
      signed = await verifySignedGrant(Object.freeze({
        grantDigestSha256: digest, workspaceId: WORKSPACE,
        sourceId: request.sourceId, sourceVersion: request.sourceVersion,
        rightsRevision: request.rightsRevision, purpose: PURPOSE
      }));
    } catch {
      return null;
    }
    // Signer identity and signature verification MUST be external and current.
    if (!signed || signed.verifiedSignature !== true ||
      signed.grantDigestSha256 !== digest ||
      !validId(signed.verifierId) ||
      signed.revoked !== false ||
      !validUtc(signed.checkedAt) ||
      Date.parse(signed.checkedAt) > now ||
      now - Date.parse(signed.checkedAt) > 60_000) return null;
    const postCheck = safeTime(clock);
    if (postCheck === null || postCheck < now ||
      postCheck - Date.parse(signed.checkedAt) > 60_000 ||
      (g.valid_until != null && Date.parse(g.valid_until) <= postCheck)) return null;
    return Object.freeze({
      verifiedByRightsAuthority: true,
      status: "active", revoked: false,
      workspaceId: WORKSPACE,
      sourceId: g.source_id,
      sourceVersion: g.source_version,
      resourceId: g.resource_id,
      resourceSha256: g.resource_sha256,
      rightsRevision: g.rights_revision,
      termsSha256: g.terms_sha256,
      terminologyRightsRevision: g.terminology_rights_revision,
      datasetReuseApproved: true,
      commercialAnalysisApproved: true,
      thirdPartyTerminologyReuseApproved: true,
      allowedPurposes: Object.freeze([PURPOSE]),
      checkedAt: new Date(postCheck).toISOString(),
      validFrom: g.valid_from,
      validUntil: g.valid_until ?? null
    });
  };
}

export const atlasPrivateMedicineRightsSource = Object.freeze({
  database: DATABASE,
  collection: COLLECTION,
  workspace: WORKSPACE,
  purpose: PURPOSE,
  customerAccessEnabled: false,
  writesImplemented: false,
  sourceLicenceGranted: false,
  productionReady: false
});
