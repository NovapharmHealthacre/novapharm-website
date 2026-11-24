import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { canShip } from "./check-pages-monotonic-release.mjs";

const a="a".repeat(40), b="b".repeat(40), c="c".repeat(40);
test("approved newer build may publish despite unrelated newer main commits", () => {
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:"ahead"}),true);
});
test("current main and candidate exactly match", () => {
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:b,publishedToCandidate:"ahead",candidateToMain:"identical"}),true);
});
test("publishing the already live build is safe but a rollback is not", () => {
  assert.equal(canShip({publishedSha:b,candidateSha:b,mainSha:c,publishedToCandidate:"identical",candidateToMain:"ahead"}),true);
  assert.equal(canShip({publishedSha:c,candidateSha:b,mainSha:c,publishedToCandidate:"behind",candidateToMain:"ahead"}),false);
});
test("diverged history, missing deployment and unknown comparisons fail closed", () => {
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"diverged",candidateToMain:"ahead"}),false);
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:"behind"}),false);
  assert.equal(canShip({publishedSha:"",candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:"ahead"}),false);
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:undefined}),false);
});


test("unrelated legacy branch is accepted only with exact independent migration proof", () => {
  const legacy = "827fdf67341fe2f289e6d1a7810f847521b05dac";
  const proposal = { publishedSha: legacy, candidateSha: b, mainSha: c,
    publishedToCandidate: "unrelated", candidateToMain: "ahead" };
  assert.equal(canShip({ ...proposal, legacyBridgeVerified: true }), true);
  for (const change of [
    { legacyBridgeVerified: false },
    { legacyBridgeVerified: "true" },
    { publishedSha: a, legacyBridgeVerified: true },
    { publishedSha: "462fe8f33f8b09c007e61ef4908542d4e2bd0a7e", legacyBridgeVerified: true },
    { candidateToMain: "behind", legacyBridgeVerified: true },
    { candidateToMain: "diverged", legacyBridgeVerified: true },
    { candidateToMain: undefined, legacyBridgeVerified: true },
    { publishedToCandidate: "behind", legacyBridgeVerified: true },
    { publishedToCandidate: undefined, legacyBridgeVerified: true }
  ]) assert.equal(canShip({ ...proposal, ...change }), false,
    "Legacy migration must fail closed: " + JSON.stringify(change));
});

test("deployment passes owner-scoped manual release inputs to the independent guard", () => {
  const workflow = readFileSync(new URL(
    "../.github/workflows/publish-aws-contact-production.yml", import.meta.url), "utf8");
  assert.match(workflow, /RELEASE_EVENT: \$\{\{ github\.event_name \}\}/);
  assert.match(workflow, /BRANDING_ONLY: \$\{\{ inputs\.branding_only \}\}/);
  assert.match(workflow, /CONTACT_API_ORIGIN: \$\{\{ inputs\.contact_api_origin \}\}/);
});
