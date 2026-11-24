import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { canShip, compareStatus, REVIEWED_LEGACY_PAGES_SHA } from "./check-pages-monotonic-release.mjs";

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
  const legacy = "f82e3ab9391ec7d9185c254a7cc5877b5885a62b";
  const proposal = { publishedSha: legacy, candidateSha: b, mainSha: c,
    publishedToCandidate: "unrelated", candidateToMain: "ahead" };
  assert.equal(canShip({ ...proposal, legacyBridgeVerified: true }), true);
  for (const change of [
    { legacyBridgeVerified: false },
    { legacyBridgeVerified: "true" },
    { publishedSha: a, legacyBridgeVerified: true },
    { publishedSha: "462fe8f33f8b09c007e61ef4908542d4e2bd0a7e", legacyBridgeVerified: true },
    { publishedSha: "827fdf67341fe2f289e6d1a7810f847521b05dac", legacyBridgeVerified: true },
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


test("ancestry comparison filters GitHub response to status before buffering", () => {
  const repo = "owner/repo";
  for (const status of ["ahead", "identical", "behind", "diverged"]) {
    assert.equal(compareStatus(repo, a, b, (command, args, options) => {
      assert.equal(command, "gh");
      assert.deepEqual(args, ["api", "repos/owner/repo/compare/" + a + "..." + b, "--jq", ".status"]);
      assert.equal(options.timeout, 15000);
      return status + "\n";
    }), status);
  }
  for (const bad of ["", "null", "unrelated", "ahead\nbehind"]) {
    assert.throws(() => compareStatus(repo, a, b, () => bad), /Invalid GitHub comparison status/);
  }
});

test("comparison errors never grant rollback or broaden legacy exception", () => {
  const fail = stderr => () => { throw Object.assign(new Error("gh failed"), { stderr }); };
  const legacy404 = "gh: No common ancestor between " + REVIEWED_LEGACY_PAGES_SHA + " and " + b + ". (HTTP 404)";
  assert.equal(compareStatus("owner/repo", REVIEWED_LEGACY_PAGES_SHA, b, fail(legacy404)), "unrelated");
  assert.throws(() => compareStatus("owner/repo", a, b, fail(legacy404)), /gh failed/);
  for (const stderr of ["ENOBUFS", "HTTP 403", "HTTP 404", "HTTP 429"]) {
    assert.throws(() => compareStatus("owner/repo", REVIEWED_LEGACY_PAGES_SHA, b, fail(stderr)), /gh failed/);
  }
});

 test("reviewed coupon bridge pins both successor retail assets and lineage", () => {
  const guard = readFileSync(new URL("./check-pages-monotonic-release.mjs", import.meta.url), "utf8");
  assert.ok(guard.includes('const PREVIOUS_REVIEWED_LEGACY_PAGES_SHA = "827fdf67341fe2f289e6d1a7810f847521b05dac"'));
  assert.ok(guard.includes('const retailAnchor = "df42e20f79a00184c7a59403d713ad77bdbb0c52"'));
  assert.ok(guard.includes('compareStatus(repo, retailAnchor, candidateSha)'));
  assert.ok(guard.includes('"assets/css/nutraxin-retail-store.css": "10f56efb33df28b82645874c7e383049bf5d8a20"'));
  assert.ok(guard.includes('"assets/js/nutraxin-retail-store.js": "68bd6b6bd152c4b1ad92ea995fe16fceb4930111"'));
  assert.ok(guard.includes('gitBlobSha(readFileSync(resolve(path))) !== expected'));
});
