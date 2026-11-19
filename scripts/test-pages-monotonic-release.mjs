import test from "node:test";
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
