import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(".github/workflows/intelligence-private-production-gate.yml", "utf8");

test("all protected intelligence evidence endpoints are rejected without a live session", () => {
  for (const route of [
    "/gateway/v1/intelligence/regulatory/us/fda-labels?drug=apixaban",
    "/gateway/v1/intelligence/evidence/us/clinical-trials?intervention=apixaban",
    "/gateway/v1/intelligence/readiness",
  ]) {
    assert.ok(source.includes(route), `missing live unauthenticated denial probe for ${route}`);
  }
  assert.match(source, /\^\(401\|403\)\$/u);
  assert.match(source, /cache-control:\.\*no-store/iu);
  assert.ok(source.includes('if [ "$status" = "200" ]; then'));
});

test("HTTPS ingress rejects public/indexable production portal responses", () => {
  assert.match(source, /^\s*(?:portal|origin)="https:\/\/intelligence\.novapharmhealthcare\.com"$/mu);
  assert.match(source, /^\s*host="intelligence\.novapharmhealthcare\.com"$/mu);
  // Validate the actual shell assignments, rather than matching a URL substring.
  const assignments = [...source.matchAll(/^\s*(?:portal|origin)="([^"]+)"$/gmu)].map((match) => match[1]);
  assert.deepEqual(assignments, [
    "https://intelligence.novapharmhealthcare.com",
    "https://intelligence.novapharmhealthcare.com",
  ]);
  assert.match(source, /NUTRAXIN \/ CUSTOMER ACCOUNT\|Welcome to Nutraxin/u);
  assert.match(source, /getent ahostsv4/u);
  assert.match(source, /\^x-robots-tag:\.\*noindex/iu);
  assert.match(source, /No resource was created|X-Robots-Tag: noindex|noindex/u);
  assert.match(source, /Production acceptance still requires a credentialed board session/u);
});

test("live verification is an explicit dispatch, not unapproved PR deployment", () => {
  assert.match(source, /workflow_dispatch:/u);
  assert.doesNotMatch(source, /pull_request:/u);
  assert.doesNotMatch(source, /aws ecs update-service|az deployment group create|stripe\.com\/v1/u);
});
