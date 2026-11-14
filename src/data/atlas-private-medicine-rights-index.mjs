/**
 * Default-dry-run production rights index migration. It never creates grants,
 * medicine observations, patient records or customer entitlements.
 * Run only from separately authenticated server-side maintenance tooling.
 */
const DATABASE = "novapharm_intelligence_production";
const COLLECTION = "npi_source_rights";
const INDEX_NAME = "rights_unique_exact_resource_revision";
const KEYS = Object.freeze({
  workspace_id: 1, source_id: 1, source_version: 1,
  resource_id: 1, resource_sha256: 1, rights_revision: 1
});
const CHANGE_ID = /^[A-Za-z][A-Za-z0-9._:-]{7,127}$/u;

function exactKeys(index) {
  return index?.key && typeof index.key === "object" &&
    !Array.isArray(index.key) &&
    JSON.stringify(Object.entries(index.key)) === JSON.stringify(Object.entries(KEYS));
}
function exactUnique(index) {
  return exactKeys(index) && index.unique === true &&
    index.sparse !== true && index.partialFilterExpression == null &&
    index.expireAfterSeconds == null &&
    (index.collation == null || index.collation.locale === "simple");
}
async function readIndexes(collection) {
  if (typeof collection?.listIndexes !== "function") throw new Error("Missing index inventory");
  const cursor = collection.listIndexes();
  if (typeof cursor?.toArray !== "function") throw new Error("Missing index cursor");
  const indexes = await cursor.toArray();
  if (!Array.isArray(indexes) || indexes.length > 32) throw new Error("Invalid index inventory");
  return indexes;
}

/**
 * The operator callback must independently validate an MFA-backed human
 * reviewer and signed change authorization; a caller-supplied mock is never
 * sufficient in production. Credentials must never be browser accessible.
 */
export async function ensurePrivateMedicineRightsUniqueIndex({
  database, apply = false, changeTicket, authorizeMigration
} = {}) {
  if (database?.databaseName !== DATABASE || typeof database.collection !== "function") {
    throw new Error("Trusted private Atlas database required");
  }
  if (typeof apply !== "boolean") throw new Error("Invalid migration mode");
  const collection = database.collection(COLLECTION);
  const before = await readIndexes(collection);
  if (before.some(exactUnique)) {
    return Object.freeze({status: "verified", indexName: INDEX_NAME, changed: false});
  }
  if (before.some(i => i?.name === INDEX_NAME || exactKeys(i))) {
    throw new Error("Conflicting rights index requires independent review");
  }
  if (typeof collection.countDocuments !== "function") {
    throw new Error("Rights collection count unavailable");
  }
  const count = await collection.countDocuments({}, {limit: 1});
  if (count !== 0) throw new Error("Nonempty rights collection requires supervised migration");
  if (!apply) {
    return Object.freeze({status: "review_required", indexName: INDEX_NAME, changed: false});
  }
  if (typeof changeTicket !== "string" || !CHANGE_ID.test(changeTicket) ||
      typeof authorizeMigration !== "function") {
    throw new Error("Independent database migration authority required");
  }
  const approval = await authorizeMigration(Object.freeze({
    changeTicket, database: DATABASE, collection: COLLECTION,
    indexName: INDEX_NAME, indexKeys: KEYS,
    unique: true, customerAccessEnabled: false, rightsGranted: false
  }));
  if (approval !== true) throw new Error("Independent migration approval denied");
  // Approval and operator review can take time. Refuse if new grants or
  // conflicting indexes appeared after the initial read-only preflight.
  const latest = await readIndexes(collection);
  if (latest.some(i => i?.name === INDEX_NAME || exactKeys(i)) ||
      await collection.countDocuments({}, {limit: 1}) !== 0) {
    throw new Error("Rights collection changed during migration approval");
  }
  if (typeof collection.createIndex !== "function") throw new Error("Index writer unavailable");
  const created = await collection.createIndex(KEYS, {
    name: INDEX_NAME, unique: true, sparse: false,
    collation: {locale: "simple"}, writeConcern: {w: "majority"}
  });
  if (created !== INDEX_NAME) throw new Error("Index creation not attested");
  const after = await readIndexes(collection);
  if (!after.some(i => i?.name === INDEX_NAME && exactUnique(i))) {
    throw new Error("Unique index not verified after creation");
  }
  return Object.freeze({status: "created_and_verified", indexName: INDEX_NAME,
    changed: true, approvedChangeTicket: changeTicket,
    rightsGranted: false, customerAccessEnabled: false});
}
export const medicineRightsUniqueIndexSpec = Object.freeze({
  database: DATABASE, collection: COLLECTION,
  name: INDEX_NAME, keys: KEYS, customerReleaseApproved: false
});


// G2's three additional private collections also require real compound
// uniqueness. _id-only and nonunique query indexes are not substitutes.
const G2 = Object.freeze({
  npi_medicine_evidence: Object.freeze({
    name: "g2_evidence_unique_source_row",
    keys: Object.freeze({ workspace_id: 1, source_id: 1,
      source_version: 1, resource_id: 1, row_id: 1 })
  }),
  npi_evidence_manifests: Object.freeze({
    name: "g2_manifest_unique_digest",
    keys: Object.freeze({ workspace_id: 1, manifest_sha256: 1 })
  }),
  npi_audit_events: Object.freeze({
    name: "g2_audit_unique_event",
    keys: Object.freeze({ workspace_id: 1, event_id: 1 })
  })
});
function matchesG2(index, keys) {
  return index?.key && typeof index.key === "object" &&
    !Array.isArray(index.key) &&
    JSON.stringify(Object.entries(index.key)) === JSON.stringify(Object.entries(keys));
}
function safeG2(index, keys) {
  return matchesG2(index, keys) && index.unique === true &&
    index.sparse !== true && index.partialFilterExpression == null &&
    index.expireAfterSeconds == null &&
    (index.collation == null || index.collation.locale === "simple");
}

/**
 * Default read-only preflight for the three G2 evidence, manifest and audit
 * collections. Creation of multiple indexes is NOT atomic: on a partial
 * failure retain any created indexes, stop and independently reconcile. Never
 * drop indexes or fabricate evidence/release rights during recovery.
 */
export async function ensureG2PrivateMedicineUniqueIndexes({
  database, apply = false, changeTicket, authorizeMigration
} = {}) {
  if (database?.databaseName !== DATABASE ||
      typeof database.collection !== "function") {
    throw new Error("Trusted private Atlas database required");
  }
  if (typeof apply !== "boolean") throw new Error("Invalid migration mode");
  const pending = [];
  const existing = [];
  for (const [collectionName, spec] of Object.entries(G2)) {
    const collection = database.collection(collectionName);
    const indexes = await readIndexes(collection);
    if (indexes.some(index => safeG2(index, spec.keys))) {
      existing.push(collectionName);
      continue;
    }
    if (indexes.some(index => index?.name === spec.name ||
        matchesG2(index, spec.keys))) {
      throw new Error("Conflicting G2 unique index requires independent review");
    }
    if (typeof collection?.countDocuments !== "function" ||
        await collection.countDocuments({}, {limit: 1}) !== 0) {
      throw new Error("Nonempty or unavailable G2 collection needs supervised migration");
    }
    pending.push({collectionName, spec, collection});
  }
  if (!apply) return Object.freeze({
    status: "review_required", changed: false,
    existing: Object.freeze(existing), pending: Object.freeze(pending.map(p => p.collectionName))
  });
  if (typeof changeTicket !== "string" || !CHANGE_ID.test(changeTicket) ||
      typeof authorizeMigration !== "function") {
    throw new Error("Independent database migration authority required");
  }
  const verified = await authorizeMigration(Object.freeze({
    changeTicket, database: DATABASE,
    scope: "private_g2_evidence_manifest_audit_unique_indexes",
    unique: true, customerAccessEnabled: false, rightsGranted: false
  }));
  if (verified !== true) throw new Error("Independent migration approval denied");
  const applied = [];
  for (const {collectionName, spec, collection} of pending) {
    // G2 index creation is not an atomic multi-collection operation. Recheck
    // each exact collection immediately before its independently authorised
    // index write; a stale preflight must never approve a newly occupied set.
    const latest = await readIndexes(collection);
    if (latest.some(index => index?.name === spec.name ||
        matchesG2(index, spec.keys)) ||
        await collection.countDocuments({}, {limit: 1}) !== 0) {
      throw new Error("G2 collection changed during migration approval");
    }
    if (typeof collection.createIndex !== "function") {
      throw new Error("Private G2 unique index writer unavailable");
    }
    const receipt = await collection.createIndex(spec.keys, {
      name: spec.name, unique: true, sparse: false,
      collation: {locale: "simple"}, writeConcern: {w: "majority"}
    });
    if (receipt !== spec.name) throw new Error("G2 unique index creation not attested");
    const after = await readIndexes(collection);
    if (!after.some(index => index?.name === spec.name && safeG2(index, spec.keys))) {
      throw new Error("G2 unique index not independently verified");
    }
    applied.push(collectionName);
  }
  return Object.freeze({
    status: "created_and_verified", changed: applied.length > 0,
    applied: Object.freeze(applied), existing: Object.freeze(existing),
    approvedChangeTicket: changeTicket, rightsGranted: false, customerAccessEnabled: false
  });
}
export const g2MedicineUniqueIndexSpecs = G2;
