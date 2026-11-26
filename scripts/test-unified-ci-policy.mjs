import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auditPolicy, assertLegacyPublisherDisabled, REPO_ROOT, POLICY_FILE } from "./ci/verify-unified-ci-contract.mjs";
import "./test-ci-superseded-pr-concurrency.mjs";

const baseline = JSON.parse(readFileSync(join(REPO_ROOT, POLICY_FILE), "utf8"));
const copy = () => structuredClone(baseline);

test("all registered applications, provider research, and platform regression contracts exist", () => {
  const result = auditPolicy();
  assert.ok(result.projects >= 30);
  assert.ok(result.domains >= 12);
  assert.ok(result.tests >= 40);
});
test("new apps cannot silently miss the source-to-CI coverage register", () => {
  const modified = copy();
  modified.projects.apps = modified.projects.apps.filter(x => x !== "portal");
  assert.throws(() => auditPolicy(REPO_ROOT, modified), /Unregistered or removed apps project/);
});
test("missing provider or HIG tests block the CI contract", () => {
  const modified = copy();
  modified.domains["ai-agents-and-openai-provider-boundaries"].tests.push("scripts/test-nonexistent-provider-contract.mjs");
  assert.throws(() => auditPolicy(REPO_ROOT, modified), /Missing registered source or test/);
});
test("all mandatory security and publishing workflows retain a dedicated gate", () => {
  const modified = copy();
  modified.criticalWorkflows.push("missing-unsafe-publisher.yml");
  assert.throws(() => auditPolicy(REPO_ROOT, modified), /Missing security\/release workflow/);
});

test("both retired production jobs must remain disabled while PR validation remains", () => {
  const legacy = readFileSync(join(REPO_ROOT, ".github/workflows/pages-live-publish.yml"), "utf8");
  assert.doesNotThrow(() => assertLegacyPublisherDisabled(legacy));
  for (const job of ["build", "deploy"]) {
    const lines = legacy.split("\n");
    const start = lines.indexOf("  " + job + ":");
    const index = lines.findIndex((line, i) => i > start && /^    if:/.test(line));
    assert.ok(index > start);
    lines[index] = "    if: github.event_name != 'pull_request'";
    assert.throws(() => assertLegacyPublisherDisabled(lines.join("\n")), /Legacy publishing job must be disabled/);
  }
});
