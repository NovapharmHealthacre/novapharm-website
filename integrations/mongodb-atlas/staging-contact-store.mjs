/**
 * MongoDB Atlas storage adapter for NovaPharm's SYNTHETIC-ONLY AWS staging.
 * Call only from a private server runtime with verified network access.
 * This module never accepts public visitors or production customer data.
 */
import { randomUUID } from "node:crypto";

const DATABASE = "novapharm_staging";
const COLLECTION = "contact_receipts_synthetic";
const SUBJECT = /^SYNTHETIC[- ]/;
const RESERVED_EMAIL = /^[a-z0-9._%+-]+@example\.(?:com|org|net)$/i;
const ALLOWED_INPUT_KEYS = new Set(["name", "email", "company", "message", "enquiryType", "acceptedSafetyNotice"]);

export function validateSyntheticContact(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid synthetic payload");
  if (Object.keys(input).some(key => !ALLOWED_INPUT_KEYS.has(key))) {
    throw Error("Unexpected synthetic-only input field");
  }
  if (typeof input.name !== "string" || !SUBJECT.test(input.name) || input.name.length > 100) throw Error("Synthetic name required");
  if (typeof input.email !== "string" || !RESERVED_EMAIL.test(input.email) || input.email.length > 100) throw Error("Example-domain email required");
  if (input.company !== "NovaPharm QA") throw Error("Test company required");
  if (typeof input.message !== "string" || !input.message.includes("SYNTHETIC DATA") ||
      input.message.length > 1000 || /[<>]/.test(input.message)) throw Error("Synthetic-only message required");
  if (input.acceptedSafetyNotice !== true) throw Error("Safety acknowledgement required");
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: "NovaPharm QA",
    message: input.message.trim(),
    enquiryType: typeof input.enquiryType === "string" ? input.enquiryType.slice(0,80) : "General enquiry"
  };
}

/**
 * Caller supplies the official MongoClient instance. Reuse client on warm
 * Lambda invocations; do NOT create a new network connection per request.
 * A failed insert is an error; never issue a receipt without write acknowledgement.
 */
export function createSyntheticContactStore({ client, dbName = DATABASE } = {}) {
  if (!client || typeof client.db !== "function") throw Error("Configured MongoDB client required");
  if (dbName !== DATABASE) throw Error("Synthetic staging must use its assigned database");
  const collection = client.db(DATABASE).collection(COLLECTION);
  return {
    async store(input) {
      const payload = validateSyntheticContact(input);
      const id = randomUUID();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      const document = {
        _id: id, ...payload, createdAt, expiresAt,
        environment: "staging", schemaVersion: 1,
        classification: "SYNTHETIC_ONLY", productionAccepted: false,
        notification: "disabled"
      };
      const stored = await collection.insertOne(document, { writeConcern: { w: "majority" } });
      if (!stored?.acknowledged || String(stored.insertedId) !== id) {
        throw Error("MongoDB durable acknowledgement unavailable");
      }
      return { id, persisted: true, staging: true, live: false, notification: "disabled" };
    },
    async verify(id) {
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) throw Error("Invalid test receipt ID");
      const row = await collection.findOne({ _id: id, classification: "SYNTHETIC_ONLY" },
        { projection: { _id: 1, classification: 1, productionAccepted: 1 } });
      return row?.classification === "SYNTHETIC_ONLY" && row?.productionAccepted === false;
    }
  };
}
