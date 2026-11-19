import { strict as assert } from "node:assert";
import test from "node:test";
import { canBuild } from "./check-pages-ancestor-build.mjs";
const a="a".repeat(40), b="b".repeat(40);
test("Current main commit can build",()=>{
  assert.equal(canBuild({candidateSha:a,mainSha:a,candidateToMain:"identical"}),true);
});
test("Verified main ancestor can build even after newer changes",()=>{
  assert.equal(canBuild({candidateSha:a,mainSha:b,candidateToMain:"ahead"}),true);
});
test("Reject rollback, divergence, unknown or unverified input",()=>{
  for(const status of ["behind","diverged","identical","unknown",undefined]){
    assert.equal(canBuild({candidateSha:a,mainSha:b,candidateToMain:status}),false);
  }
  assert.equal(canBuild({candidateSha:"",mainSha:b,candidateToMain:"ahead"}),false);
  assert.equal(canBuild({candidateSha:a,mainSha:"",candidateToMain:"ahead"}),false);
  assert.equal(canBuild({candidateSha:a,mainSha:a,candidateToMain:"ahead"}),false);
});
