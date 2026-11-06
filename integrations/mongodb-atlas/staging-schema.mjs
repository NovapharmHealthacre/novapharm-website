/**
 * Source-only MongoDB Atlas staging setup. Run only from an approved
 * application runtime AFTER fixed-egress access and least privilege are proven.
 * Do not call this script via a public HTTP route.
 */
export const SYNTHETIC_CONTACT_SCHEMA = Object.freeze({
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "classification", "environment", "createdAt", "expiresAt", "productionAccepted"],
    properties: {
      _id: { bsonType: "string" },
      classification: { enum: ["SYNTHETIC_ONLY"] },
      environment: { enum: ["staging"] },
      createdAt: { bsonType: "date" },
      expiresAt: { bsonType: "date" },
      productionAccepted: { enum: [false] },
      email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@example\\.(com|org|net)$" },
      company: { enum: ["NovaPharm QA"] }
    }
  }
});

/**
 * This requires a one-time Atlas dbAdmin role, NOT the readWrite application
 * credential. The current Atlas connector cannot specify TTL index options.
 */
export async function installStagingRetention({ database }) {
  if (!database || typeof database.command !== "function") throw Error("Atlas administrative database handle required");
  if (database.databaseName !== "novapharm_staging") throw Error("Refusing to alter a production/foreign database");
  await database.command({
    collMod: "contact_receipts_synthetic",
    validator: SYNTHETIC_CONTACT_SCHEMA,
    validationLevel: "strict",
    validationAction: "error"
  });
  const collection = database.collection("contact_receipts_synthetic");
  await collection.createIndex({ expiresAt: 1 }, { name: "synthetic_ttl_24h", expireAfterSeconds: 0 });
  return { database: database.databaseName, ttlSeconds: 0, validation: "strict-error", syntheticOnly: true };
}
