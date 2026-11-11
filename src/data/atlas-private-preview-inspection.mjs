/**
 * Operator-only verification of the free Atlas preview. Not an HTTP endpoint,
 * customer data API or source-rights approval.
 * Dependencies are injected by a trusted private runtime; never log secrets.
 */
import { isDeepStrictEqual } from "node:util";
import {
  assessFreePreviewInventory, freePreviewAtlasCollections,
  freePreviewAtlasIndexSpecs, freePreviewAtlasTarget,
} from "./atlas-free-preview.mjs";

export const freePreviewSecureParameter = "/novapharm/intelligence/preview/mongodb-observer-uri";
const expectedHost = "npi-bootstrap.t9cf7ht.mongodb.net";
const expectedUser = "npi_preview_observer";

function requireOperatorEnvironment(env) {
  if (!env || env.AWS_REGION !== "eu-north-1" ||
      env.NPI_ATLAS_PRIVATE_INSPECTION_ENABLED !== "true" ||
      env.NPI_ATLAS_PREVIEW_ONLY !== "true" ||
      env.NPI_ATLAS_CUSTOMER_ACCESS_ENABLED !== "false" ||
      env.NPI_ATLAS_BILLING_ENABLED !== "false" ||
      env.NPI_ATLAS_PATIENT_DATA_ENABLED !== "false") {
    throw new Error("Private free-tier Atlas inspection is disabled.");
  }
}

/** Reject arbitrary hosts, database names, protocols and disabled TLS. */
export function verifyPrivatePreviewUri(value) {
  if (typeof value !== "string" || value.length > 4096 || value.length < 80) {
    throw new Error("Unapproved private Atlas connection target.");
  }
  let uri;
  try { uri = new URL(value); } catch { throw new Error("Unapproved private Atlas connection target."); }
  if (uri.protocol !== "mongodb+srv:" || uri.hostname !== expectedHost ||
      uri.username !== expectedUser || !uri.password || uri.port || uri.hash ||
      uri.pathname !== "/" + freePreviewAtlasTarget.database ||
      uri.searchParams.get("tls") === "false" ||
      uri.searchParams.get("ssl") === "false" ||
      uri.searchParams.get("directConnection") === "true" ||
      (uri.searchParams.has("authSource") && uri.searchParams.get("authSource") !== "admin")) {
    throw new Error("Unapproved private Atlas connection target.");
  }
  return value;
}

function identicalKeys(actual, required) {
  return isDeepStrictEqual(Object.entries(actual ?? {}), Object.entries(required));
}

/**
 * Operator action ONLY, not imported by customer routes. readParameter must
 * be backed by SSM GetParameter({Name,WithDecryption:true}) under narrow IAM;
 * createClient must use the official MongoDB Node driver from a verified
 * private outbound network. This does not create any network access.
 */
export async function inspectPrivateAtlasPreview({
  environment = process.env, readParameter, createClient,
} = {}) {
  requireOperatorEnvironment(environment);
  if (typeof readParameter !== "function" || typeof createClient !== "function") {
    throw new Error("Private Atlas operator dependencies are unavailable.");
  }
  let client;
  try {
    const secret = await readParameter({ Name: freePreviewSecureParameter, WithDecryption: true });
    const uri = verifyPrivatePreviewUri(secret?.Parameter?.Value);
    client = await createClient(uri, {
      serverSelectionTimeoutMS: 3500,
      connectTimeoutMS: 3500,
      maxPoolSize: 3,
      minPoolSize: 0,
      retryWrites: false,
    });
    if (!client || typeof client.connect !== "function" ||
        typeof client.db !== "function" || typeof client.close !== "function") {
      throw new Error("Invalid private MongoDB client.");
    }
    await client.connect();
    const db = client.db(freePreviewAtlasTarget.database);
    if (!db || typeof db.command !== "function" ||
        typeof db.listCollections !== "function" ||
        typeof db.collection !== "function") throw new Error("Invalid private MongoDB database.");
    const ping = await db.command({ ping: 1 });
    if (ping?.ok !== 1) throw new Error("MongoDB ping failed.");
    const rawCollections = await db.listCollections({}, { nameOnly: true }).toArray();
    if (!Array.isArray(rawCollections)) throw new Error("Invalid collection inventory.");
    const names = rawCollections.map(row => row.name);
    const counts = {};
    for (const name of Object.values(freePreviewAtlasCollections)) {
      if (!names.includes(name)) continue;
      const coll = db.collection(name);
      if (typeof coll.countDocuments !== "function" ||
          typeof coll.listIndexes !== "function") throw new Error("Invalid private collection adapter.");
      counts[name] = await coll.countDocuments({});
      const indexes = await coll.listIndexes().toArray();
      const expected = freePreviewAtlasIndexSpecs.find(index => index.collection === name);
      if (!Array.isArray(indexes) || !expected ||
          !indexes.some(index => index.name === expected.name && identicalKeys(index.key, expected.keys))) {
        throw new Error("Expected governance index not present.");
      }
    }
    const status = assessFreePreviewInventory({ collections: names, counts });
    return Object.freeze({
      cluster: freePreviewAtlasTarget.clusterName,
      region: "eu-north-1",
      database: freePreviewAtlasTarget.database,
      privatePingSucceeded: true,
      schemaPresent: status.schemaPresent,
      counts: status.counts,
      acceptedMedicineRows: 0,
      licensedSourceRightsVerified: false,
      customerAccessAllowed: false,
      enterpriseProductionAccepted: false,
    });
  } catch {
    throw new Error("Private Atlas connection or governance inspection unavailable.");
  } finally {
    if (client && typeof client.close === "function") await client.close().catch(() => {});
  }
}
