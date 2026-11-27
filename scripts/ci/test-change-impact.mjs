import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planImpact, changedPaths } from "./plan-change-impact.mjs";
import { REPO_ROOT, POLICY_FILE } from "./verify-unified-ci-contract.mjs";
const policy = JSON.parse(readFileSync(join(REPO_ROOT, POLICY_FILE), "utf8"));

test("overlapping coverage is reported, without removing any actual validation", () => {
  const plan = planImpact(["apps/portal/components/wms-prototype-workspace-map.tsx"], policy);
  assert.equal(plan.decision, "direct-impact-candidate");
  assert.ok(plan.directDomains.includes("distribution-wms-and-supply-chain"));
  assert.ok(plan.directDomains.includes("customer-employee-portal-and-security"));
  assert.equal(plan.actualRequiredDomains.length, Object.keys(policy.domains).length);
  assert.deepEqual(plan.actualRequiredWorkflows, [...policy.criticalWorkflows].sort());
  assert.equal(plan.testsSkipped, 0);
});

test("shared, publishing, unknown, malformed and empty diffs fail closed to the full estate", () => {
  for (const paths of [[], ["package-lock.json"], ["packages/auth/src/index.ts"], [".github/workflows/publish-aws-contact-production.yml"], ["some/new/file"], ["../outside"], ["apps//portal"]]) {
    const plan = planImpact(paths, policy);
    assert.equal(plan.decision, "full-estate");
    assert.deepEqual(plan.candidateDomains, plan.actualRequiredDomains);
    assert.equal(plan.testsSkipped, 0);
  }
});

test("exact PR diff includes both removed and added names during a rename", () => {
  const root = mkdtempSync(join(tmpdir(), "np-impact-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    git("init", "-q"); git("config", "user.email", "ci@example.invalid"); git("config", "user.name", "CI fixture");
    writeFileSync(join(root, "before.txt"), "test");
    git("add", "."); git("commit", "-qm", "base");
    const base = git("rev-parse", "HEAD");
    git("mv", "before.txt", "after.txt"); git("commit", "-qm", "rename");
    const head = git("rev-parse", "HEAD");
    assert.deepEqual(changedPaths(root, base, head).sort(), ["after.txt", "before.txt"]);
    assert.throws(() => changedPaths(root, "main", head));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
