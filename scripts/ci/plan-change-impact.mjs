import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REPO_ROOT, POLICY_FILE } from "./verify-unified-ci-contract.mjs";

const prefix = (file, scope) => file === scope || file.startsWith(scope + "/");
const shared = [".github", "config", "packages", "infra", "scripts", "package.json", "package-lock.json", "pnpm-lock.yaml", "server.mjs", "tsconfig.base.json", "assets/css", "assets/js"];
const safePath = path => typeof path === "string" && path.length > 0 &&
  !path.startsWith("/") && !path.includes("\\") && !path.split("/").some(part => !part || part === "." || part === "..") &&
  !/[\x00-\x1f\x7f]/.test(path);

// Advisory only. Registered paths are coverage evidence, not a proven
// transitive dependency graph. Nothing in this module can skip a test.
export function planImpact(paths, policy) {
  assert.equal(policy.schemaVersion, 1);
  const domains = Object.entries(policy.domains);
  assert.ok(domains.length >= 12);
  assert.ok(Array.isArray(policy.criticalWorkflows) && policy.criticalWorkflows.length > 0);
  const all = domains.map(([name]) => name).sort();
  const direct = new Set();
  const fallback = new Set();
  if (!Array.isArray(paths) || paths.length === 0) fallback.add("empty-or-unavailable-diff");
  for (const path of Array.isArray(paths) ? paths : []) {
    if (!safePath(path)) { fallback.add("invalid-path"); continue; }
    if (shared.some(scope => prefix(path, scope))) fallback.add("shared-or-governance-change");
    const matches = domains.filter(([, item]) => [...item.sources, ...item.tests].some(scope => prefix(path, scope)));
    if (!matches.length) fallback.add("unregistered-path");
    for (const [name] of matches) direct.add(name);
  }
  return {
    mode: "shadow-only",
    decision: fallback.size ? "full-estate" : "direct-impact-candidate",
    fallbackReasons: [...fallback].sort(),
    directDomains: [...direct].sort(),
    candidateDomains: fallback.size ? all : [...direct].sort(),
    actualRequiredDomains: all,
    actualRequiredWorkflows: [...policy.criticalWorkflows].sort(),
    testsSkipped: 0,
  };
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}
export function changedPaths(root, base, head) {
  for (const sha of [base, head]) assert.match(sha ?? "", /^[a-f0-9]{40}$/);
  assert.equal(git(root, ["rev-parse", "--verify", base + "^{commit}"]).trim(), base);
  assert.equal(git(root, ["rev-parse", "--verify", head + "^{commit}"]).trim(), head);
  // Three-dot PR scope, with both sides of renames represented as paths.
  const mergeBase = git(root, ["merge-base", base, head]).trim();
  assert.match(mergeBase, /^[a-f0-9]{40}$/);
  const raw = git(root, ["diff", "--no-renames", "--name-only", "-z", mergeBase, head, "--"]);
  return raw.split("\0").filter(Boolean);
}

const GITHUB_REPO = "NovapharmHealthacre/novapharm-website";
const apiRoot = "https://api.github.com/repos/" + GITHUB_REPO;
const apiHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "NovaPharm-ReadOnly-CI-Impact",
};

// GitHub's pull-request files list is scoped to the PR's complete head diff.
// This read-only public API requires no tokens or other CI credentials.
export async function fetchExactPRPaths(event, request = fetch) {
  assert.equal(event?.repository?.full_name, GITHUB_REPO, "Unexpected repository");
  const pr = event?.pull_request;
  assert.ok(pr && Number.isInteger(event.number) && event.number > 0, "Not a pull request event");
  assert.match(pr.head?.sha ?? "", /^[a-f0-9]{40}$/);
  assert.match(pr.base?.sha ?? "", /^[a-f0-9]{40}$/);
  assert.ok(Number.isInteger(pr.changed_files) && pr.changed_files > 0 && pr.changed_files <= 3000,
    "PR file count unavailable or exceeds verified API limit");

  async function get(url) {
    const result = await request(url, { headers: apiHeaders, signal: AbortSignal.timeout(5000) });
    assert.ok(result.ok, "GitHub change-impact request failed: " + result.status);
    return result.json();
  }
  async function assertHeadStable() {
    const snapshot = await get(apiRoot + "/pulls/" + event.number);
    assert.equal(snapshot.head?.sha, pr.head.sha, "PR head changed during impact retrieval");
    assert.equal(snapshot.base?.sha, pr.base.sha, "PR base changed during impact retrieval");
    assert.equal(snapshot.changed_files, pr.changed_files, "PR file count changed during impact retrieval");
  }

  await assertHeadStable();
  const fileCount = pr.changed_files;
  const names = [];
  let entries = 0;
  for (let page = 1; page <= Math.ceil(fileCount / 100); page += 1) {
    const items = await get(apiRoot + "/pulls/" + event.number + "/files?per_page=100&page=" + page);
    assert.ok(Array.isArray(items) && items.length > 0 && items.length <= 100, "Incomplete GitHub PR files response");
    entries += items.length;
    for (const entry of items) {
      assert.ok(safePath(entry.filename), "Unsafe PR path");
      names.push(entry.filename);
      if (entry.status === "renamed") {
        assert.ok(safePath(entry.previous_filename), "Rename previous path unavailable");
        names.push(entry.previous_filename);
      }
    }
  }
  await assertHeadStable();
  const paths = [...new Set(names)];
  // Renames produce two names, but one API entry; check total entries separately.
  // GitHub caps this endpoint at 3000 changed files. Exceeding the cap fails closed.
  assert.equal(entries, fileCount, "Changed-file count mismatch; do not infer impacted domains");
  return paths;
}

export async function planGitHubEvent(event, request = fetch) {
  const policy = JSON.parse(readFileSync(resolve(REPO_ROOT, POLICY_FILE), "utf8"));
  let paths = [];
  let source = "fallback-full-estate";
  let unavailable = false;
  try {
    paths = await fetchExactPRPaths(event, request);
    source = "github-pr-file-diff";
  } catch {
    unavailable = true;
  }
  const result = planImpact(paths, policy);
  return { ...result, source, changedPaths: paths.length,
    fallbackReasons: unavailable
      ? [...new Set([...result.fallbackReasons, "diff-unavailable-or-head-changed"])].sort()
      : result.fallbackReasons };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--github-event") {
    // No token is supplied, persisted, or printed. If public API access fails,
    // this report explicitly selects all domains and has no effect on CI.
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    console.log(JSON.stringify(await planGitHubEvent(event), null, 2));
  } else {
    const [base, head] = process.argv.slice(2);
    const policy = JSON.parse(readFileSync(resolve(REPO_ROOT, POLICY_FILE), "utf8"));
    let paths;
    try { paths = changedPaths(REPO_ROOT, base, head); }
    catch { paths = []; }
    console.log(JSON.stringify(planImpact(paths, policy), null, 2));
  }
}
