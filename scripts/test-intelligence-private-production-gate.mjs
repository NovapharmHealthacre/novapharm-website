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

test("exact unsuffixed Cognito routes and health refuse redirects or insecure PKCE cookies", () => {
  for (const route of ["/healthz", "/auth/customer/start", "/auth/callback"]) {
    assert.ok(source.includes(`"$base_url${route}"`), `Missing canonical live probe: ${route}`);
  }
  assert.match(source, /\$health_status" != "200"/u);
  assert.match(source, /\$start_status" != "302"/u);
  assert.match(source, /\$callback_status" != "401"/u);
  assert.match(source, /novapharm-intelligence-production-eun1\\\.auth\\\.eu-north-1\\\.amazoncognito\\\.com\/oauth2\/authorize/u);
  assert.match(source, /__Host-npi_oidc_tx/u);
  assert.match(source, /httponly/iu);
  assert.match(source, /secure/iu);
  assert.match(source, /do not follow redirects/iu);
  assert.doesNotMatch(source, /curl [^\n]*--location/iu);
  assert.match(source, /medicine\/customer application acceptance remains separate/iu);
});

test("native IAM gateway denial is narrowly bounded when AWS omits Lambda cache headers", () => {
  assert.match(source, /\$status" != "403"/u);
  assert.match(source, /content-type:\.\*application\/json/iu);
  assert.ok(source.includes(`grep -qx '{"message":"Forbidden"}'`));
  assert.match(source, /wc -c <\/tmp\/novapharm-private-api-response/);
  assert.match(source, /-gt 64/);
  assert.match(source, /App-origin 401\/403 responses still require no-store/);
  assert.match(source, /cache-control:\.\*no-store/iu);
  assert.doesNotMatch(source, /authorizationType: NONE|BYPASS_AUTH|ALLOW_ANONYMOUS/u);
});

test("daily live ingress acceptance remains read-only and never self-activates a customer release", () => {
  assert.match(source, /schedule:\s*\n\s*# Daily no-credential live ingress smoke; never deploys or enables customer release\.\s*\n\s*- cron: '17 5 \* \* \*'/u);
  assert.match(source, /permissions:\s*\n\s*contents: read/u);
  assert.doesNotMatch(source, /\b(?:workflow_run|repository_dispatch|pull_request_target):/u);
  assert.doesNotMatch(source, /aws (?:lambda update-function|ecs update-service|cloudformation deploy)|stripe\.com\/v1|github\.com\/repos\/[^ ]+\/dispatches/u);
  assert.match(source, /Production acceptance still requires a credentialed board session/u);
});

test("production HTTPS acceptance explicitly denies all 22 authenticated Intelligence deep links", () => {
  const catalogue = readFileSync("apps/portal/data/intelligence-workspaces.ts", "utf8");
  const defined = [...catalogue.matchAll(/\{ slug: "([^"]+)", title: "[^"]+", group: "[^"]+", state: "(?:existing-read-only|gated)"/gu)]
    .map(x => x[1]);
  assert.equal(defined.length, 22);
  assert.equal(new Set(defined).size, 22);
  const block = source.match(/workspace_slugs=\(\s*([\s\S]*?)\s*\)/u);
  assert.ok(block, "production workflow must enumerate every private workspace");
  const tested = [...block[1].matchAll(/^\s*'([^']+)'\s*$/gmu)].map(x => x[1]);
  assert.equal(tested.length, 22);
  assert.deepEqual(new Set(tested), new Set(defined));
  assert.ok(source.includes("Deny anonymous access to every one of the 22 private workspaces"));
  assert.ok(source.includes('if ! [[ "$status" =~ ^(301|302|303|307|308|401|403)$ ]]'));
  assert.ok(source.includes("'^cache-control:.*no-store'"));
  assert.ok(source.includes("grep -qx '{\"message\":\"Forbidden\"}'"));
  assert.ok(source.includes("All 22 protected workspace paths rejected anonymous access"));
});
