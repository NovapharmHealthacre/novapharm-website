/**
 * Fail-closed gate for MANUAL PUBLIC_ONLY GitHub Pages recovery.
 * Source-only PR tests use evaluateManualPagesReleaseReadiness() without a
 * GitHub token. Production execution reads two branch metadata endpoints.
 * This does not replace GitHub admin branch rules, review, or a release audit.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const REPO = "NovapharmHealthacre/novapharm-website";
const SHA = /^[a-f0-9]{40}$/;

export function evaluateManualPagesReleaseReadiness({
  repository, eventName, ref, candidateSha, checkedOutSha, owner, main, pages
} = {}) {
  const issues = [];
  const reject = (condition, problem) => { if (!condition) issues.push(problem); };
  reject(repository === REPO, "Wrong repository; recovery is restricted to NovaPharm");
  reject(eventName === "workflow_dispatch", "Non-manual release event is forbidden");
  reject(ref === "refs/heads/main", "Manual public recovery must originate on main");
  reject(SHA.test(candidateSha ?? "") && SHA.test(checkedOutSha ?? "") &&
    candidateSha === checkedOutSha, "Checked-out source is not the exact requested candidate");
  reject(owner?.contract === "novapharm.intelligence.owner-constraints.v1" &&
    owner?.productionSignoff === "granted", "Owner production signoff not granted");
  reject(owner?.initialInfrastructureBudget?.monthlyCapGbp === 0 &&
    owner?.initialInfrastructureBudget?.newChargeableResourceProvisioning === false,
    "Zero-extra-spend publication boundary has changed; explicit review required");
  for (const [name, value] of [["main", main], ["gh-pages", pages]]) {
    reject(value && typeof value === "object" &&
      value.name === name && value.protected === true &&
      SHA.test(value.commit?.sha ?? ""), name + " branch is not demonstrably protected");
  }
  reject(main?.commit?.sha === candidateSha,
    "The candidate no longer matches the latest main source commit");
  // .protected=true is only the minimum technical signal. Reviewers must
  // inspect actual rules for independent reviews, force-push/delete denial,
  // required exact-head CI and restricted deployments before granting release.
  return {
    allowed: issues.length === 0,
    issues,
    authorizationScope: "manual-PUBLIC_ONLY-recovery-preflight",
    branchProtectionSignalIsNotAnAdminRulesetAudit: true,
    independentHigAcceptance: false
  };
}

async function getBranch(branch, token) {
  const url = "https://api.github.com/repos/" + REPO + "/branches/" + branch;
  const response = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "novapharm-pages-recovery-release-preflight"
    },
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, 200,
    "Release branch readback not authorized or unavailable: " + branch);
  return response.json();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    assert.ok(token, "Read-only GitHub release preflight token missing");
    const checkedOutSha = execFileSync("git", ["rev-parse", "--verify", "HEAD"],
      {encoding:"utf8", timeout:10000}).trim();
    const owner = JSON.parse(readFileSync("config/intelligence/owner-production-constraints.json", "utf8"));
    const [main, pages] = await Promise.all([
      getBranch("main", token), getBranch("gh-pages", token)
    ]);
    const result = evaluateManualPagesReleaseReadiness({
      repository: process.env.GITHUB_REPOSITORY,
      eventName: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      candidateSha: process.env.GITHUB_SHA,
      checkedOutSha, owner, main, pages
    });
    if (!result.allowed) {
      console.error("Manual public recovery refused: " + result.issues.join("; "));
      process.exitCode = 1;
    } else {
      console.log("Manual PUBLIC_ONLY candidate passed minimum read-only branch and owner preflight. " +
        "Independent ruleset review, contact-preservation, forward-only lineage, published byte parity, " +
        "and final owner approval remain mandatory.");
    }
  } catch (error) {
    console.error("Manual public recovery refused: read-only authorization proof unavailable.");
    process.exitCode = 1;
  }
}
