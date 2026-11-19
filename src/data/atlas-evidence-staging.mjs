/**
 * NovaPharm Intelligence MongoDB Atlas staging contract.
 * This is intentionally NOT a replacement for the SQL-backed portal sessions,
 * approvals, payments or regulated wholesale data.
 * No MongoDB connection, network access or user-supplied query selectors are exposed.
 */
export const atlasEvidenceCollection = "nova_medicine_evidence_staging";
export const atlasIngestionCollection = "nova_ingestion_runs_staging";
export const atlasStagingDatabase = "novapharm_staging";

const kinds = new Set([
  "observed_fact",
  "derived_metric",
  "model_forecast",
  "commercial_assumption",
  "recommendation"
]);
const safeWorkspace = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const safeIdentity = /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,127}$/;
const safeSource = /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,127}$/;
const isoTimestamp = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;

function scalar(value, expression, label) {
  if (typeof value !== "string" || !expression.test(value)) {
    throw new Error("Invalid " + label + ".");
  }
  return value;
}
function timestamp(value, label) {
  if (typeof value !== "string" || !isoTimestamp.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error("Invalid " + label + ".");
  }
  return value;
}

export function approvedAtlasStagingConfig(environment = process.env) {
  if (environment.ATLAS_EVIDENCE_READ_ENABLED !== "true") throw new Error("Atlas evidence access disabled.");
  if (environment.ATLAS_ENVIRONMENT !== "staging") throw new Error("Atlas environment is not staging.");
  if (environment.MONGODB_DATABASE !== atlasStagingDatabase ||
    environment.MONGODB_EVIDENCE_COLLECTION !== atlasEvidenceCollection) {
    throw new Error("Unapproved Atlas database/collection.");
  }
  if (environment.ATLAS_ALLOW_PUBLIC_NETWORK === "true" ||
    environment.ATLAS_ALLOW_PATIENT_DATA === "true") {
    throw new Error("Atlas staging forbids public connectivity or patient data.");
  }
  // Credentials must be resolved only by a private runtime with a narrowly scoped
  // secret and managed network source. This module never reads or logs secrets.
  return Object.freeze({ database: atlasStagingDatabase, collection: atlasEvidenceCollection });
}

export function evidenceFilter({ workspaceId, medicineIdentity, asOf } = {}) {
  const workspace_id = scalar(workspaceId, safeWorkspace, "workspace ID");
  const medicine_identity = scalar(medicineIdentity, safeIdentity, "medicine identity");
  const filter = { workspace_id, medicine_identity };
  if (asOf !== undefined) filter.observed_at = { $lte: timestamp(asOf, "as-of timestamp") };
  return Object.freeze(filter);
}

/** Allowed metadata only; no source text, PHI, customer email or secrets. */
export function validateEvidenceMetadata(item) {
  if (!item || typeof item !== "object" || Array.isArray(item) || Object.getPrototypeOf(item) !== Object.prototype) {
    throw new Error("Evidence metadata must be a simple object.");
  }
  const allowed = new Set([
    "workspace_id", "medicine_identity", "source_id", "source_version",
    "evidence_type", "observed_at", "recorded_at", "provenance_sha256"
  ]);
  if (Object.keys(item).some(key => !allowed.has(key))) throw new Error("Unapproved evidence metadata field.");
  if (!kinds.has(item.evidence_type)) throw new Error("Unapproved evidence classification.");
  const hash = scalar(item.provenance_sha256, /^[a-f0-9]{64}$/, "provenance hash");
  const metadata = {
    workspace_id: scalar(item.workspace_id, safeWorkspace, "workspace ID"),
    medicine_identity: scalar(item.medicine_identity, safeIdentity, "medicine identity"),
    source_id: scalar(item.source_id, safeSource, "source ID"),
    source_version: scalar(item.source_version, safeSource, "source version"),
    evidence_type: item.evidence_type,
    observed_at: timestamp(item.observed_at, "observation time"),
    recorded_at: timestamp(item.recorded_at, "record time"),
    provenance_sha256: hash
  };
  return Object.freeze(metadata);
}

/**
 * Caller must inject the already-authenticated, private, read-only collection.
 * Never spread user input into a MongoDB query or omit a workspace constraint.
 */
export async function listWorkspaceEvidence(collection, { workspaceId, medicineIdentity, asOf, limit = 30 }) {
  if (!collection || typeof collection.find !== "function") throw new Error("An approved read-only collection is required.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid evidence page size.");
  const filter = evidenceFilter({ workspaceId, medicineIdentity, asOf });
  const cursor = collection.find(filter, {
    projection: {
      _id: 0,
      workspace_id: 1,
      medicine_identity: 1,
      source_id: 1,
      source_version: 1,
      evidence_type: 1,
      observed_at: 1,
      recorded_at: 1,
      provenance_sha256: 1
    }
  });
  if (!cursor || typeof cursor.sort !== "function") throw new Error("Invalid Atlas query cursor.");
  const records = await cursor.sort({ observed_at: -1 }).limit(limit).toArray();
  if (!Array.isArray(records)) throw new Error("Invalid Atlas response.");
  // Double enforce tenant+medicine containment in case of a faulty adapter.
  return records.map(item => {
    const row = validateEvidenceMetadata(item);
    if (row.workspace_id !== filter.workspace_id || row.medicine_identity !== filter.medicine_identity) {
      throw new Error("Atlas returned an out-of-scope evidence record.");
    }
    return row;
  });
}
