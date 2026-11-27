import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planImpact, changedPaths, fetchExactPRPaths, planGitHubEvent } from "./plan-change-impact.mjs";
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

const sha = character => character.repeat(40);
function event(count = 2) {
  return { number: 19, repository: { full_name: "NovapharmHealthacre/novapharm-website" },
    pull_request: { head: { sha: sha("a") }, base: { sha: sha("b") }, changed_files: count } };
}
function mockAPI(entries, { changedHead = false, status = 200 } = {}) {
  return async url => ({
    ok: status === 200, status,
    json: async () => url.includes("/files?")
      ? entries
      : { head: { sha: sha(changedHead ? "c" : "a") }, base: { sha: sha("b") }, changed_files: entries.length },
  });
}
test("all renamed paths are included, and no mandatory checks are skipped", async () => {
  const entries = [
    { filename: "apps/portal/components/wms-prototype-workspace-map.tsx", status: "modified" },
    { filename: "apps/corporate/new.svg", previous_filename: "apps/corporate/old.svg", status: "renamed" },
  ];
  const paths = await fetchExactPRPaths(event(), mockAPI(entries));
  assert.deepEqual(paths, [entries[0].filename, entries[1].filename, entries[1].previous_filename]);
  const result = await planGitHubEvent(event(), mockAPI(entries));
  assert.equal(result.decision, "direct-impact-candidate");
  assert.equal(result.testsSkipped, 0);
  assert.equal(result.actualRequiredDomains.length, Object.keys(policy.domains).length);
  assert.ok(result.workspaceImpact.declaredImpact.includes("apps/portal"));
  assert.equal(result.workspaceImpact.testsSkipped, 0);
  assert.equal(result.workspaceImpact.graphComplete, false);
});
test("API errors, unstable heads, unavailable count, unknown paths fail closed", async () => {
  const entries = [
    { filename: "apps/portal/index.tsx", status: "modified" },
    { filename: "apps/corporate/index.tsx", status: "modified" },
  ];
  for (const request of [mockAPI(entries, { status: 403 }), mockAPI(entries, { changedHead: true }),
    mockAPI([{ filename: "../escape", status: "modified" }, entries[1]])]) {
    const result = await planGitHubEvent(event(), request);
    assert.equal(result.decision, "full-estate");
    assert.equal(result.testsSkipped, 0);
    assert.ok(result.fallbackReasons.includes("diff-unavailable-or-head-changed"));
  }
  const invalid = event(3001);
  assert.equal((await planGitHubEvent(invalid, mockAPI(entries))).decision, "full-estate");
  assert.equal((await planGitHubEvent({ repository: { full_name: "other/repo" } }, mockAPI(entries))).decision, "full-estate");
});
