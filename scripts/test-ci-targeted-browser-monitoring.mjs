import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const repo = new URL("../", import.meta.url);
const source = file => readFileSync(new URL(file, repo), "utf8");

test("only explicitly documentation-only changes can omit the non-required full browser matrix", () => {
  const browser = source(".github/workflows/browser-acceptance.yml");
  assert.match(browser, /  pull_request:\n    paths-ignore:\n      - 'README\.md'\n      - 'CONTRIBUTING\.md'\n      - 'docs\/ci\/\*\*'\n      - '\.github\/ISSUE_TEMPLATE\/\*\*'/);
  assert.doesNotMatch(browser, /\n    paths:\n/);
  for (const job of ["public-applications", "secure-portal", "portal-lighthouse", "backend-workflows", "acceptance-gate"]) {
    assert.ok(browser.includes("  " + job + ":"), "Missing mandatory browser job: " + job);
  }
  assert.match(browser, /engine: \[chromium, webkit\]/);
  assert.match(browser, /test "\$\{\{ needs\.secure-portal\.result \}\}" = success/);
  const gate = source(".github/workflows/novapharm-unified-ci-gate.yml");
  assert.match(gate, /^  pull_request:\s*$/m);
  assert.doesNotMatch(gate, /paths-ignore:/);
  assert.doesNotMatch(gate, /pull_request:\s*\n\s+paths:/);
  for (const context of [
    "Policy coverage and invariant verification",
    "Cross-estate regulated, AI, Google, Apple and native contracts",
  ]) assert.ok(gate.includes("name: " + context), "Protected check removed: " + context);
});

test("weekly latency audit remains read-only, no PR-triggered audit storm", () => {
  const workflow = source(".github/workflows/ci-latency-audit.yml");
  assert.match(workflow, /schedule:\s*\n\s+- cron: '17 6 \* \* 1'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(workflow, /^  actions: read$/m);
  assert.match(workflow, /^  contents: read$/m);
  assert.doesNotMatch(workflow, /\b(?:actions|contents|deployments|pages|id-token): write\b/);
  const sampler = source("scripts/ci/ci-latency-audit.mjs");
  assert.match(sampler, /const byJob = /);
  assert.match(sampler, /failedOrTimedOut:/);
  assert.match(sampler, /Slowest individual jobs/);
});

test("portal retains full engine and viewport coverage with duration evidence", () => {
  const runner = source("apps/portal/test/browser-acceptance.ts");
  assert.match(runner, /const viewportStartedAt = performance\.now\(\)/);
  assert.match(runner, /const interactionStartedAt = performance\.now\(\)/);
  assert.match(runner, /runViewportBatches\(interactionOnly \? \[\] : viewports/);
  assert.match(runner, /for \(const area of areas\)/);
  assert.match(runner, /await verifyInteractions\(interactionBrowser, engine, states\)/);
  assert.match(runner, /Portal browser acceptance passed:/);
});
