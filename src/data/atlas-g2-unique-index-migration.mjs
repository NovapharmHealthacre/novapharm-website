/**
 * NovaPharm Intelligence G2: PRIVATE schema-only Atlas unique index migration.
 *
 * Default behavior is a non-mutating plan. Applying requires an explicit
 * independently reviewed change record and an empty target namespace.
 * This does not grant medicine source rights or make evidence customer-visible.
 *
 * This accepts server-owned MongoDB Driver collections; no connection strings,
 * public routes, payment controls, network or credentials are handled here.
 */
const DATABASE = "novapharm_intelligence_production";

export const g2UniqueIndexRequirements = Object.freeze([
  Object.freeze({
    collection: "npi_source_rights",
    name: "g2_rights_unique_resource_revision",
    key: Object.freeze({
      workspace_id: 1, source_id: 1, source_version: 1,
      resource_id: 1, resource_sha256: 1, rights_revision: 1
    })
  }),
  Object.freeze({
    collection: "npi_medicine_evidence",
    name: "g2_evidence_unique_source_row",
    key: Object.freeze({
      workspace_id: 1, source_id: 1, source_version: 1,
      resource_id: 1, row_id: 1
    })
  }),
  Object.freeze({
    collection: "npi_evidence_manifests",
    name: "g2_manifest_unique_workspace_digest",
    key: Object.freeze({ workspace_id: 1, manifest_sha256: 1 })
  }),
  Object.freeze({
    collection: "npi_audit_events",
    name: "g2_audit_unique_workspace_event",
    key: Object.freeze({ workspace_id: 1, event_id: 1 })
  })
]);

function deny(code) {
  throw Object.assign(new Error("Private Atlas G2 index migration denied: " + code), { code });
}

function exactUnique(index, requirement) {
  return index && index.unique === true &&
    index.sparse !== true && index.partialFilterExpression == null &&
    (index.collation == null || index.collation.locale === "simple") &&
    index.key && typeof index.key === "object" &&
    JSON.stringify(Object.entries(index.key)) ===
    JSON.stringify(Object.entries(requirement.key));
}

function requireDatabase(database) {
  if (database?.databaseName !== DATABASE ||
      typeof database.collection !== "function" ||
      typeof database.listCollections !== "function") deny("wrong_or_untrusted_database");
}

async function inspect(database) {
  requireDatabase(database);
  const handle = database.listCollections({}, { nameOnly: true });
  if (typeof handle?.toArray !== "function") deny("collection_inventory_unavailable");
  const listed = await handle.toArray();
  if (!Array.isArray(listed) || listed.length > 100 ||
      listed.some(x => typeof x?.name !== "string")) {
    deny("collection_inventory_invalid");
  }
  const names = new Set(listed.map(x => x.name));
  const result = [];
  for (const requirement of g2UniqueIndexRequirements) {
    if (!names.has(requirement.collection)) deny("required_collection_missing");
    const collection = database.collection(requirement.collection);
    if (typeof collection?.listIndexes !== "function" ||
        typeof collection?.countDocuments !== "function" ||
        typeof collection?.createIndex !== "function") {
      deny("collection_adapter_unavailable");
    }
    const cursor = collection.listIndexes();
    if (typeof cursor?.toArray !== "function") deny("index_inventory_unavailable");
    const [indexes, count] = await Promise.all([
      cursor.toArray(), collection.countDocuments({})
    ]);
    if (!Array.isArray(indexes) || indexes.length > 64 ||
      !Number.isSafeInteger(count) || count < 0) deny("inventory_unverifiable");
    const exact = indexes.find(index => exactUnique(index, requirement));
    const namedCollision = indexes.some(index =>
      index.name === requirement.name && !exactUnique(index, requirement));
    result.push(Object.freeze({
      collection: requirement.collection, requiredIndex: requirement.name,
      documentCount: count, exactUniqueIndexPresent: Boolean(exact),
      namedCollision, existingIndexCount: indexes.length
    }));
  }
  return Object.freeze({
    contract: "novapharm.intelligence.private-g2-unique-schema.v1",
    database: DATABASE,
    customerAccessEnabled: false, sourceRightsGranted: false,
    collections: Object.freeze(result),
    ready: result.every(x => x.exactUniqueIndexPresent),
    safeToApply: result.every(x => x.documentCount === 0 && !x.namedCollision),
    requiresOperatorReview: true
  });
}

/** Non-mutating read-only inventory. */
export async function planAtlasG2UniqueIndexes({ database } = {}) {
  return inspect(database);
}

/**
 * Deliberately not a migration executable or API route: a trusted database
 * operator must supply the already-connected database and independently
 * authorised change receipt. This cannot establish the human review itself.
 *
 * Warning: MongoDB cannot atomically create indexes across four collections.
 * A partial failure requires inspection and idempotent retry, not a false
 * rollback claim. Data ingestion must remain OFF throughout this change.
 */
export async function applyAtlasG2UniqueIndexes({
  database, approval, productionAdmissionEnabled = false
} = {}) {
  if (productionAdmissionEnabled !== false ||
      approval?.environment !== "private_schema_only" ||
      approval?.customerAccessEnabled !== false ||
      approval?.ingestionEnabled !== false ||
      approval?.independentReviewerVerified !== true ||
      approval?.operatorConfirmedBackup !== true ||
      !/^[A-Z][A-Z0-9_-]{5,79}$/u.test(approval?.changeId ?? "")) {
    deny("independent_schema_change_approval_required");
  }
  const before = await inspect(database);
  if (!before.safeToApply) deny("schema_change_preflight_failed");
  const toApply = g2UniqueIndexRequirements.filter(r =>
    !before.collections.find(x => x.collection === r.collection).exactUniqueIndexPresent);
  for (const requirement of toApply) {
    const collection = database.collection(requirement.collection);
    const created = await collection.createIndex(requirement.key, {
      name: requirement.name,
      unique: true,
      sparse: false,
      collation: { locale: "simple" }
    });
    if (created !== requirement.name) deny("index_creation_not_attested");
    // Verify this single index before proceeding to the next collection.
    const verified = await collection.listIndexes().toArray();
    if (!Array.isArray(verified) ||
        !verified.some(index => exactUnique(index, requirement))) {
      deny("index_readback_not_attested");
    }
  }
  const after = await inspect(database);
  if (!after.ready || !after.safeToApply) deny("migration_postcheck_failed");
  return Object.freeze({
    ...after, applied: true,
    createdIndexNames: Object.freeze(toApply.map(x => x.name)),
    sourceRightsGranted: false, customerAccessEnabled: false,
    productionAdmissionEnabled: false
  });
}
