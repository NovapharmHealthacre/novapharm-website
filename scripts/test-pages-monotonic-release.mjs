import test from "node:test";
import assert from "node:assert/strict";
import {
  canShip, gitBlobSha, LEGACY_PAGES_DEPLOYMENT_SHA,
  OWNER_BRANDING_SIGNOFF_SHA, REVIEWED_LEGACY_CONTACT_BLOB
} from "./check-pages-monotonic-release.mjs";

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

test("historical Git Pages deployment can be bridged only with pinned independent evidence", () => {
  const proof = {
    currentLegacyBranchSha: LEGACY_PAGES_DEPLOYMENT_SHA,
    mainProtected: true,
    legacyBranchProtected: true,
    liveContactBlob: REVIEWED_LEGACY_CONTACT_BLOB,
    signoffToCandidate: "ahead"
  };
  const args = {
    publishedSha: LEGACY_PAGES_DEPLOYMENT_SHA,
    candidateSha: b,
    mainSha: c,
    publishedToCandidate: "no_common_ancestor",
    candidateToMain: "ahead",
    legacyProof: proof
  };
  assert.equal(canShip(args), true);
  assert.equal(canShip({...args, candidateToMain: "identical", mainSha:b}), true);
  assert.equal(canShip({...args, legacyProof:{...proof, signoffToCandidate:"identical"}}),true);

  for (const changes of [
    {publishedSha:a},
    {publishedToCandidate:"diverged"},
    {publishedToCandidate:undefined},
    {candidateToMain:"behind"},
    {candidateToMain:"diverged"},
    {legacyProof:null},
    {legacyProof:{}}
  ]) assert.equal(canShip({...args,...changes}),false,JSON.stringify(changes));

  for (const changes of [
    {currentLegacyBranchSha:a},
    {mainProtected:false},
    {legacyBranchProtected:false},
    {liveContactBlob:a},
    {signoffToCandidate:"behind"},
    {signoffToCandidate:"diverged"},
    {signoffToCandidate:null}
  ]) assert.equal(canShip({...args,legacyProof:{...proof,...changes}}),false,JSON.stringify(changes));
});

test("legacy bridge compares real Git blob bytes, never hex text or unprefixed SHA1", () => {
  assert.equal(gitBlobSha("hello"),"b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0");
  assert.equal(gitBlobSha(Buffer.from("hello")),"b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0");
  assert.equal(LEGACY_PAGES_DEPLOYMENT_SHA.length,40);
  assert.equal(OWNER_BRANDING_SIGNOFF_SHA.length,40);
  assert.equal(REVIEWED_LEGACY_CONTACT_BLOB.length,40);
});
