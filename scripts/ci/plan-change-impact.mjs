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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [base, head] = process.argv.slice(2);
  const policy = JSON.parse(readFileSync(resolve(REPO_ROOT, POLICY_FILE), "utf8"));
  let paths;
  try { paths = changedPaths(REPO_ROOT, base, head); }
  catch { paths = []; }
  const report = planImpact(paths, policy);
  console.log(JSON.stringify(report, null, 2));
}
