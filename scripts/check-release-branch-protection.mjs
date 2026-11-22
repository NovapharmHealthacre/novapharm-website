/**
 * Fail-closed minimum branch-protection readback immediately before public
 * Pages publication. The admin-only policy authoring, meaningful PR review,
 * required checks, force-push rejection and negative push test are separate
 * human governance gates. No GitHub mutation, AWS calls or site writes.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const COMMIT = /^[0-9a-f]{40}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const branchesRequiringProtection = Object.freeze(["main", "gh-pages"]);

export function evaluatePublishingBranchProtection(branchData) {
  assert.ok(branchData && typeof branchData === "object" && !Array.isArray(branchData),
    "GitHub branch evidence must be a record");
  const issues = [];
  const observed = [];
  for (const branchName of branchesRequiringProtection) {
    const branch = branchData[branchName];
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) {
      issues.push("Missing GitHub branch readback: " + branchName);
      observed.push({ branch:branchName, protected:null, sha:null });
      continue;
    }
    const sha = branch.commit?.sha;
    const hasValidSha = typeof sha === "string" && COMMIT.test(sha);
    if (branch.name !== branchName) issues.push("Branch name mismatch: " + branchName);
    if (!hasValidSha) issues.push("Missing exact branch SHA: " + branchName);
    if (branch.protected !== true) issues.push("GitHub reports unprotected publishing branch: " + branchName);
    observed.push({
      branch:branchName, protected:branch.protected === true,
      sha:hasValidSha ? sha : null
    });
  }
  return {
    schema:"novapharm.release-branch-protection-minimum-readback.v1",
    allowPublishing:issues.length===0,
    branches:observed,
    issues,
    disclaimer:"Protected=true is a minimum GitHub readback, not proof of two-person review, correct required checks, bypass controls, negative direct-push tests, or owner release signoff"
  };
}

function githubBranch(repository, name) {
  const output = execFileSync("gh", ["api", "repos/" + repository + "/branches/" + name],
    { encoding:"utf8", timeout:18000, maxBuffer:2_000_000,
      stdio:["ignore", "pipe", "pipe"] });
  return JSON.parse(output);
}

export function validateRepository(repository) {
  if (typeof repository !== "string" || !REPO.test(repository))
    throw new Error("Untrusted repository identifier for publishing branch check");
  // This workflow is intentionally not a reusable release token for arbitrary repositories.
  if (repository !== "NovapharmHealthacre/novapharm-website")
    throw new Error("Publishing branch check targets the wrong repository");
  return repository;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const repo = validateRepository(process.env.GITHUB_REPOSITORY);
    if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN)
      throw new Error("Read-only GitHub branch-token access unavailable");
    const data = Object.fromEntries(
      branchesRequiringProtection.map(name => [name, githubBranch(repo,name)]));
    const result=evaluatePublishingBranchProtection(data);
    console.log(JSON.stringify(result));
    if (!result.allowPublishing) {
      console.error("Public Pages release blocked until repository admin configures and independently tests enforced main and gh-pages branch rules (issue #984).");
      process.exitCode=1;
    }
  } catch(error) {
    // No response body or auth headers logged on API failures.
    console.error("Cannot independently establish minimum GitHub branch protection; Pages release blocked.");
    process.exitCode=1;
  }
}
