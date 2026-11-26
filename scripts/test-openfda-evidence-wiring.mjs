import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("FDA extended evidence is board-authenticated, flag-disabled, and rate-limited before request", () => {
  const backend = read("server.mjs");
  const route = backend.slice(backend.indexOf('if (pathname === "/api/v1/intelligence/regulatory/us/fda-evidence"'));
  assert.match(route, /const session = await scopedAuthentication\(request, response, \["board"\]\)/);
  assert.match(route, /NPI_OPENFDA_EVIDENCE_ENABLED !== "true"/);
  assert.match(route, /rateLimit\(request, "openfda-extended-evidence", 5, 60 \* 1000\)/);
  assert.match(route, /await searchFdaEvidence\(/);
  assert.ok(route.indexOf("scopedAuthentication") < route.indexOf("NPI_OPENFDA_EVIDENCE_ENABLED"));
  assert.ok(route.indexOf("NPI_OPENFDA_EVIDENCE_ENABLED") < route.indexOf("rateLimit"));
  assert.ok(route.indexOf("rateLimit") < route.indexOf("searchFdaEvidence"));
});
test("Next gateway is exact GET-only, no-store, and protected", () => {
  const source = read("apps/portal/app/gateway/[...path]/route.ts");
  assert.match(source, /fda-evidence\$\//);
  assert.match(source, /path === "v1\/intelligence\/regulatory\/us\/fda-evidence"/);
  assert.match(source, /request\.method !== "GET"/);
  assert.match(source, /Cache-Control/);
  assert.match(source, /no-store/);
});
test("FDA React view never fetches FDA directly or persists keys and records", () => {
  const ui = read("apps/portal/components/us-fda-evidence.tsx");
  const app = read("apps/portal/components/medicines-intelligence.tsx");
  assert.match(app, /<UsFdaEvidence \/>/);
  assert.match(ui, /gatewayJson<EvidenceResponse>/);
  assert.match(ui, /role="status"/);
  assert.match(ui, /Official FDA dataset documentation/);
  assert.doesNotMatch(ui, /api\.fda\.gov|localStorage|sessionStorage|OPENFDA_API_KEY/);
});
test("existing independent owner release restrictions remain enforced", () => {
  const limits = JSON.parse(read("config/intelligence/owner-production-constraints.json"));
  assert.equal(limits.productionSignoff, "not_granted");
  assert.equal(limits.productionPermissions.admitUnapprovedMedicineData, false);
  assert.equal(limits.productionPermissions.activatePublicCustomerAccess, false);
  assert.equal(limits.productionPermissions.cutOverPortalDnsOrApiMapping, false);
});
