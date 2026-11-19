/**
 * Read-only, fail-closed four-collection Atlas G2 schema preflight.
 *
 * The rights verifier and the evidence atomic store have separate native
 * migration contracts. This is the shared inspection receipt: the complete
 * rights + evidence + manifest + audit namespace must agree before any
 * regulated source admission is even considered. No MongoDB connection,
 * credentials, index creation or customer release are provided here.
 */
import { medicineRightsUniqueIndexSpec } from "./atlas-private-medicine-rights-index.mjs";
import { atlasG2RequiredUniqueIndexKeys } from "./atlas-medicine-g2-atomic-store.mjs";

const DATABASE = "novapharm_intelligence_production";
const G2_NAME = "g2_unique";
const specs = Object.freeze([
  Object.freeze({
    collection: medicineRightsUniqueIndexSpec.collection,
    indexName: medicineRightsUniqueIndexSpec.name,
    keys: medicineRightsUniqueIndexSpec.keys
  }),
  ...Object.entries(atlasG2RequiredUniqueIndexKeys).map(([collection, keys]) =>
    Object.freeze({ collection, indexName: G2_NAME, keys })
  )
]);
const sameKeys = (actual, required) =>
  actual && typeof actual === "object" && !Array.isArray(actual) &&
  JSON.stringify(Object.entries(actual)) === JSON.stringify(Object.entries(required));

const approvedIndex = (idx, spec) =>
  idx?.name === spec.indexName && idx.unique === true &&
  idx.sparse !== true && idx.hidden !== true &&
  idx.partialFilterExpression == null &&
  idx.expireAfterSeconds == null &&
  (idx.collation == null || idx.collation.locale === "simple") &&
  sameKeys(idx.key, spec.keys);

function statusFor(indexes, spec, hasDocuments) {
  const candidates = indexes.filter(index =>
    index?.name === spec.indexName || sameKeys(index?.key, spec.keys));
  if (candidates.length > 1 || candidates.some(index => !approvedIndex(index, spec))) {
    return "conflicting_index_requires_review";
  }
  if (candidates.length === 1) return "verified";
  return hasDocuments ? "nonempty_collection_requires_review" : "missing_unique_index";
}
async function inspect(database, spec) {
  try {
    const collection = database.collection(spec.collection);
    if (typeof collection?.listIndexes !== "function" ||
        typeof collection?.countDocuments !== "function") {
      throw new Error("native_driver_unavailable");
    }
    const cursor = collection.listIndexes();
    if (typeof cursor?.toArray !== "function") throw new Error("index_cursor_missing");
    const indexes = await cursor.toArray();
    if (!Array.isArray(indexes) || indexes.length > 32) throw new Error("index_inventory_invalid");
    const count = await collection.countDocuments({}, { limit: 1, maxTimeMS: 3000 });
    if (!Number.isSafeInteger(count) || count < 0 || count > 1) {
      throw new Error("collection_existence_check_invalid");
    }
    const hasDocuments = count !== 0;
    return Object.freeze({
      collection: spec.collection,
      indexName: spec.indexName,
      requiredKeys: Object.freeze({ ...spec.keys }),
      requiredUnique: true,
      status: statusFor(indexes, spec, hasDocuments),
      hasDocuments
    });
  } catch {
    // Connection failures are not missing indexes and cannot authorize writes.
    return Object.freeze({
      collection: spec.collection,
      indexName: spec.indexName,
      requiredKeys: Object.freeze({ ...spec.keys }),
      requiredUnique: true,
      status: "inspection_unavailable",
      hasDocuments: null
    });
  }
}

/**
 * "schemaReady" refers ONLY to unique-index installation, not licence,
 * medicine data acceptance, MFA, tenant authorization, model use or launch.
 * This function never calls createIndex or any other database mutation.
 */
export async function inspectAtlasFourUniqueIndexes({ database } = {}) {
  if (database?.databaseName !== DATABASE ||
      typeof database.collection !== "function") {
    throw new Error("Trusted production MongoDB driver database required");
  }
  const inspections = [];
  for (const spec of specs) inspections.push(await inspect(database, spec));
  const schemaReady = inspections.every(x => x.status === "verified");
  const unsafe = inspections.some(x => x.status === "inspection_unavailable" ||
    x.status === "conflicting_index_requires_review" ||
    x.status === "nonempty_collection_requires_review");
  return Object.freeze({
    contract: "novapharm.intelligence.atlas-four-index-preflight.v1",
    database: DATABASE,
    inspectionCount: inspections.length,
    schemaReady,
    mutationCandidate: !schemaReady && !unsafe,
    migrationApproved: false,
    independentBackupVerified: false,
    sourceRightsGranted: false,
    productionIngestionApproved: false,
    customerReleaseApproved: false,
    checks: Object.freeze(inspections)
  });
}

export const atlasFourUniqueIndexRequirements = specs;
