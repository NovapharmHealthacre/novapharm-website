import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = await readFile(resolve("src/core/enterprise-domain-service.mjs"), "utf8");
const preserved = await readFile(resolve("src/core/enterprise-domain-service-base.mjs"), "utf8");

assert.match(source, /export \* from "\.\/enterprise-domain-service-base\.mjs"/u);
assert.match(source, /const snapshot = await base\.enterpriseModuleSnapshot\(code, context\)/u);
assert.match(source, /if \(snapshot\.module\.area !== "admin"\) return snapshot/u);

for (const slug of ["dashboard", "local-review", "users", "content", "analytics"]) {
  assert.match(source, new RegExp(`case "${slug}"`, "u"), `Admin ${slug} must have an authored snapshot branch.`);
}

for (const title of ["Priority workflow queue", "Schema evidence", "Governed identities", "Publication governance", "Domain event stream"]) {
  assert.ok(source.includes(title), `Missing authored Admin section: ${title}`);
}

assert.doesNotMatch(source, /password_hash|password_salt|network_fingerprint|details_json/iu, "Admin overlay must never select sensitive identity/security fields.");
assert.doesNotMatch(source, /SELECT\s+id,\s*username,\s*access_type/iu, "Admin overlay must not expose session identifiers.");
assert.match(source, /Admin module requires an authored snapshot/u, "Unexpected Admin modules must fail closed instead of falling back to a generic dashboard.");
assert.match(preserved, /async function customerSnapshot/u);
assert.match(preserved, /async function employeeSnapshot/u);
assert.match(preserved, /async function executiveSnapshot/u);
assert.match(preserved, /async function adminSnapshot/u);

console.log(JSON.stringify({
  authoredAdminModules: 5,
  delegatedNonAdminModules: 49,
  sensitiveIdentityFieldsExcluded: true,
  genericAdminFallback: false
}, null, 2));
