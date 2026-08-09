import assert from "node:assert/strict";
import { keyedDigest } from "../src/security/keyed-digest.mjs";

const environment = { NODE_ENV: "test", SESSION_SECRET: "s".repeat(48) };
const first = keyedDigest({ record: "synthetic", revision: 1 }, { purpose: "audit-record", environment });
const repeated = keyedDigest({ record: "synthetic", revision: 1 }, { purpose: "audit-record", environment });
const separateDomain = keyedDigest({ record: "synthetic", revision: 1 }, { purpose: "upload-token", environment });

assert.match(first, /^[a-f0-9]{64}$/);
assert.equal(first, repeated, "the same value, purpose and key must remain deterministic");
assert.notEqual(first, separateDomain, "domain separation must prevent cross-purpose digest reuse");
assert.notEqual(
  first,
  keyedDigest({ record: "synthetic", revision: 1 }, { purpose: "audit-record", environment: { ...environment, SESSION_SECRET: "t".repeat(48) } }),
  "a different protected key must produce a different digest",
);
assert.throws(
  () => keyedDigest("synthetic", { purpose: "audit-record", environment: { NODE_ENV: "production" } }),
  /must resolve to at least 32 bytes/,
  "production must fail closed without a protected key",
);

console.log("Keyed digest tests passed: determinism, domain separation, key separation and production fail-closed behavior.");
