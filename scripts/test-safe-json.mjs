import assert from "node:assert/strict";
import { safeJsonStringify } from "../src/security/safe-json.mjs";

const payload = {
  error: "</script><script>alert('blocked')</script>",
  context: "regulated & governed > promotional",
  separators: "line\u2028paragraph\u2029end",
};
const serialized = safeJsonStringify(payload);

assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/u, "JSON responses must not retain HTML-significant or JavaScript separator characters");
assert.match(serialized, /\\u003c\/script\\u003e/u);
assert.match(serialized, /\\u0026/u);
assert.deepEqual(JSON.parse(serialized), payload, "response hardening must preserve the JSON data model");
assert.equal(safeJsonStringify(undefined), "", "undefined must retain the existing empty-response behavior");
assert.throws(() => safeJsonStringify({ unsupported: 1n }), TypeError, "unsupported JSON values must continue to fail closed");

console.log("Safe JSON tests passed: HTML-significant characters are escaped and JSON round-trips without semantic changes.");
