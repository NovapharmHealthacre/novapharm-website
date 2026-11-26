import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = name => readFileSync(join(ROOT, name), "utf8");
const parse = name => JSON.parse(read("config/ci/ruleset-proposals/" + name));
const main = parse("website-main.json");
const pages = parse("website-gh-pages-phase1.json");

test("main ruleset is importable proposal and cannot claim GitHub enforcement", () => {
  assert.equal(main.target, "branch");
  assert.equal(main.enforcement, "disabled");
  assert.deepEqual(main.bypass_actors, []);
  assert.deepEqual(main.conditions.ref_name, { include: ["refs/heads/main"], exclude: [] });
  assert.deepEqual(main.rules.map(rule => rule.type), [
    "deletion", "non_fast_forward", "pull_request", "required_status_checks"
  ]);
  const pr = main.rules.find(rule => rule.type === "pull_request").parameters;
  assert.equal(pr.required_approving_review_count, 0,
    "Do not demand an unavailable independent reviewer or claim an independent approval");
  assert.equal(pr.required_review_thread_resolution, true);
  const checks = main.rules.find(rule => rule.type === "required_status_checks").parameters;
  assert.equal(checks.strict_required_status_checks_policy, true);
  const expected = [
    "Policy coverage and invariant verification",
    "Cross-estate regulated, AI, Google, Apple and native contracts",
  ];
  assert.deepEqual(checks.required_status_checks.map(x => x.context), expected);
  const yaml = read(".github/workflows/novapharm-unified-ci-gate.yml");
  assert.match(yaml, /\non:\s*\n  pull_request:\s*\n  push:\s*\n    branches: \[main\]/,
    "Required CI must execute unconditionally for every PR");
  for (const check of expected) assert.ok(yaml.includes("name: " + check),
    "A required GitHub status context is not present in CI: " + check);
  assert.match(yaml, /permissions:\s*\n  contents: read/);
});

test("publishing branch phase-one rules remain non-destructive and not a full protection claim", () => {
  assert.equal(pages.target, "branch");
  assert.equal(pages.enforcement, "disabled");
  assert.deepEqual(pages.bypass_actors, []);
  assert.deepEqual(pages.conditions.ref_name, { include: ["refs/heads/gh-pages"], exclude: [] });
  assert.deepEqual(pages.rules, [{ type: "deletion" }, { type: "non_fast_forward" }]);
  assert.ok(!pages.rules.some(rule => ["pull_request", "required_status_checks"].includes(rule.type)),
    "Do not lock out the existing live Pages publisher before its actor is verified");
});

test("checked-in rulesets are a proposal; source tests cannot grant admin activation", () => {
  const docs = read("docs/release/github-ruleset-import-runbook.md");
  for (const phrase of [
    "not installed", "Settings", "authorized publisher", "negative push test",
    "NIT", "owner", "staged", "gh-pages"
  ]) assert.ok(docs.includes(phrase), "Missing administrative release safeguard: " + phrase);
});
