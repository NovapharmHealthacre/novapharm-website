/**
 * G2 index migration for the private Atlas medicine-evidence transaction store.
 *
 * No credentials, connection, filesystem write, network call or launch switch.
 * A separately authorised, private deployment agent injects the MongoDB driver
 * database and a trusted approval function. Read-only inspection is the default.
 */
import { atlasG2RequiredUniqueIndexKeys } from "./atlas-medicine-g2-atomic-store.mjs";

const DB = "novapharm_intelligence_production";
const INDEX = "g2_unique";
const collections = Object.keys(atlasG2RequiredUniqueIndexKeys);
const deny = (code) => Object.assign(new Error("Atlas G2 index migration denied: " + code), {
  code, statusCode: 409,
});
const exactKeys = (actual, required) =>
  actual && typeof actual === "object" &&
  JSON.stringify(Object.entries(actual)) === JSON.stringify(Object.entries(required));
const correctIndex = (index, required) =>
  index?.name === INDEX &&
  index.unique === true && index.sparse !== true &&
  index.partialFilterExpression == null &&
  (index.collation == null || index.collation.locale === "simple") &&
  exactKeys(index.key, required);

function validateDatabase(database) {
  if (!database || database.databaseName !== DB || typeof database.collection !== "function") {
    throw deny("wrong_database_or_missing_private_driver");
  }
}
async function inspectCollection(database, name) {
  const collection = database.collection(name);
  if (!collection || typeof collection.listIndexes !== "function" ||
      typeof collection.countDocuments !== "function") {
    throw deny("collection_driver_unavailable");
  }
  const indexes = await collection.listIndexes().toArray();
  if (!Array.isArray(indexes) || indexes.length > 32) throw deny("index_inventory_unavailable");
  const required = atlasG2RequiredUniqueIndexKeys[name];
  const candidates = indexes.filter(x => x?.name === INDEX || exactKeys(x?.key, required));
  const correct = candidates.filter(x => correctIndex(x, required));
  // Any incompatible G2 name or same exact field tuple with different
  // uniqueness/collation needs independent reconciliation, not silent repair.
  if (correct.length > 1 || candidates.some(x => !correct.includes(x))) {
    throw deny("incompatible_existing_index");
  }
  // Existence-only bound: do not scan/copy/download medicine evidence.
  // Collections with any records are not safe for first-time index creation.
  const count = await collection.countDocuments({}, { limit: 1, maxTimeMS: 3000 });
  if (!Number.isSafeInteger(count) || count < 0 || count > 1) {
    throw deny("collection_count_unavailable");
  }
  const compliant = correct.length === 1;
  if (!compliant && count !== 0) throw deny("nonempty_collection_requires_reconciliation");
  return Object.freeze({ name, required, compliant, empty: count === 0 });
}

export async function inspectAtlasG2UniqueIndexes({ database } = {}) {
  validateDatabase(database);
  const checks = [];
  // Observe all three before performing any mutation in the separate action.
  for (const name of collections) {
    checks.push(await inspectCollection(database, name));
  }
  return Object.freeze({
    contract: "novapharm.intelligence.atlas-g2-index-preflight.v1",
    database: DB,
    ready: checks.every(x => x.compliant),
    mutationRequired: checks.some(x => !x.compliant),
    customerReleaseApproved: false,
    productionIngestionApproved: false,
    checks: Object.freeze(checks.map(x => Object.freeze({
      collection: x.name,
      indexName: INDEX,
      requiredKeys: Object.freeze({ ...x.required }),
      uniqueRequired: true,
      verified: x.compliant,
      empty: x.empty,
    }))),
  });
}

/**
 * Executable only by a trusted, explicitly approved private deployment agent.
 * No browser-supplied boolean, untrusted tenant assertion or release candidate
 * is sufficient. The authority callback must independently authenticate the
 * operator/change ticket and confirm that production writes are quiesced.
 *
 * MongoDB index creation is not a multi-collection transaction. If a step fails
 * the already-created unique indexes are kept (never silently dropped), and a
 * subsequent approved invocation can resume after independent preflight.
 */
export async function applyAtlasG2UniqueIndexes({
  database, verifyMigrationAuthority, afterVerifiedIndex,
} = {}) {
  validateDatabase(database);
  if (typeof verifyMigrationAuthority !== "function") throw deny("approval_callback_missing");
  if (afterVerifiedIndex !== undefined && typeof afterVerifiedIndex !== "function") {
    throw deny("invalid_audit_callback");
  }
  const preflight = await inspectAtlasG2UniqueIndexes({ database });
  if (preflight.ready) return Object.freeze({
    contract: "novapharm.intelligence.atlas-g2-index-migration.v1",
    changed: Object.freeze([]), ready: true,
    productionIngestionApproved: false, customerReleaseApproved: false,
  });
  const auth = await verifyMigrationAuthority(Object.freeze({
    operation: "create_g2_unique_indexes", database: DB,
    collections: Object.freeze([...collections]),
  }));
  if (!auth || auth.authorized !== true || auth.productionWritesQuiesced !== true ||
      typeof auth.operatorId !== "string" || !/^[a-zA-Z0-9._:-]{4,128}$/u.test(auth.operatorId) ||
      typeof auth.changeTicket !== "string" || !/^[a-zA-Z0-9._:-]{4,128}$/u.test(auth.changeTicket)) {
    throw deny("independent_approval_required");
  }
  if (typeof afterVerifiedIndex !== "function") {
    throw deny("durable_migration_audit_required");
  }
  const changed = [];
  for (const spec of preflight.checks) {
    // Re-inspect immediately before each create; abort if the system changed.
    const current = await inspectCollection(database, spec.collection);
    if (current.compliant) continue;
    const collection = database.collection(spec.collection);
    if (typeof collection.createIndex !== "function") throw deny("unique_index_driver_unavailable");
    // `unique: true` is mandatory; no non-unique fallback.
    const created = await collection.createIndex(current.required, {
      name: INDEX, unique: true,
    });
    if (created !== INDEX) throw deny("index_creation_unverified");
    const verified = await inspectCollection(database, spec.collection);
    if (!verified.compliant) throw deny("index_creation_unverified");
    changed.push(spec.collection);
    const audit = await afterVerifiedIndex(Object.freeze({
      collection: spec.collection, indexName: INDEX,
      operatorId: auth.operatorId, changeTicket: auth.changeTicket,
    }));
    if (!audit || audit.persisted !== true) throw deny("migration_audit_failed");
  }
  const finish = await inspectAtlasG2UniqueIndexes({ database });
  if (!finish.ready) throw deny("migration_incomplete");
  return Object.freeze({
    contract: "novapharm.intelligence.atlas-g2-index-migration.v1",
    changed: Object.freeze([...changed]), ready: true,
    // Indexes are necessary but not sufficient for any medicine release.
    productionIngestionApproved: false, customerReleaseApproved: false,
  });
}
