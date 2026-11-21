import assert from "node:assert/strict";
import test from "node:test";
import {
  branchesRequiringProtection, evaluatePublishingBranchProtection,
  validateRepository
} from "./check-release-branch-protection.mjs";

const a = "a".repeat(40), b = "b".repeat(40);
const protectedBranches = () => ({
  main: { name:"main", protected:true, commit:{sha:a} },
  "gh-pages": { name:"gh-pages", protected:true, commit:{sha:b} }
});

test("both correctly scoped branches with valid Git SHA and protected=true are the minimum preflight", () => {
  const outcome=evaluatePublishingBranchProtection(protectedBranches());
  assert.equal(outcome.allowPublishing,true);
  assert.deepEqual(outcome.issues,[]);
  assert.equal(outcome.branches.length,2);
  assert.deepEqual([...branchesRequiringProtection],["main","gh-pages"]);
  assert.match(outcome.disclaimer,/not proof/);
  assert.equal("independentHigAcceptance" in outcome,false);
  assert.equal("ownerReleaseApproved" in outcome,false);
});

test("both observed public branches unprotected fail closed even when commits are present", () => {
  const data=protectedBranches();
  data.main.protected=false;
  data["gh-pages"].protected=false;
  const verdict=evaluatePublishingBranchProtection(data);
  assert.equal(verdict.allowPublishing,false);
  assert.equal(verdict.issues.filter(x=>x.includes("unprotected")).length,2);
});

test("one unprotected branch, name spoofing or missing information cannot permit deployment", () => {
  for (const target of branchesRequiringProtection) {
    const data=protectedBranches();
    data[target].protected=false;
    assert.equal(evaluatePublishingBranchProtection(data).allowPublishing,false);
    const missing=protectedBranches();
    delete missing[target];
    assert.equal(evaluatePublishingBranchProtection(missing).allowPublishing,false);
    const invalidSha=protectedBranches();
    invalidSha[target].commit.sha="not-a-commit";
    assert.equal(evaluatePublishingBranchProtection(invalidSha).allowPublishing,false);
    const wrongName=protectedBranches();
    wrongName[target].name="main-production";
    assert.equal(evaluatePublishingBranchProtection(wrongName).allowPublishing,false);
    const unknown=protectedBranches();
    delete unknown[target].protected;
    assert.equal(evaluatePublishingBranchProtection(unknown).allowPublishing,false);
  }
});

test("reject invalid input and attempts to apply the gate to a different repository", () => {
  for (const invalid of [null,[],undefined,"text"])
    assert.throws(()=>evaluatePublishingBranchProtection(invalid),/evidence must be a record/);
  assert.equal(validateRepository("NovapharmHealthacre/novapharm-website"),
    "NovapharmHealthacre/novapharm-website");
  for (const invalid of ["attacker/repo", "owner/name\nmore", "https://example.com/repo", "", "../repo"])
    assert.throws(()=>validateRepository(invalid),/wrong repository|Untrusted repository/);
});

test("branch protection metadata never claims human or native Apple HIG acceptance", () => {
  const verdict=evaluatePublishingBranchProtection(protectedBranches());
  for(const unsupported of ["humanApprovals","branchRulesComplete","allHigTopicsAccepted","directPushNegativeTestPassed",
    "signedNativeAppAccepted","protectedApiAccepted"])
    assert.equal(unsupported in verdict,false);
});
