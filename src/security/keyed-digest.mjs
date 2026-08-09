import { createHmac } from "node:crypto";

const localValidationKey = "local-validation-fingerprint-key-change-me";

function fingerprintKey(environment) {
  const configured = String(environment.DATA_FINGERPRINT_SECRET || environment.SESSION_SECRET || "");
  if (Buffer.byteLength(configured, "utf8") >= 32) return configured;
  if (environment.NODE_ENV === "production") {
    throw new Error("DATA_FINGERPRINT_SECRET or SESSION_SECRET must resolve to at least 32 bytes in production.");
  }
  return localValidationKey;
}

function serialise(value) {
  if (typeof value === "string") return value;
  const encoded = JSON.stringify(value);
  return encoded === undefined ? String(value) : encoded;
}

export function keyedDigest(value, { purpose, environment = process.env } = {}) {
  const domain = String(purpose || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,80}$/.test(domain)) throw new Error("A bounded digest purpose is required.");
  // HMAC-SHA256 protects high-entropy upload tokens and non-password audit/idempotency values; user passwords use the separate scrypt verifier.
  // codeql[js/insufficient-password-hash]
  return createHmac("sha256", fingerprintKey(environment))
    .update(`novapharm:${domain}\0`, "utf8")
    .update(serialise(value), "utf8")
    .digest("hex");
}
