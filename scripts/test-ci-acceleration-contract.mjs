import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const file = path => readFileSync(new URL(path, "file://" + root), "utf8");

test("both independently required protected-main contexts remain unconditional", () => {
  const gate = file(".github/workflows/novapharm-unified-ci-gate.yml");
  assert.match(gate, /on:\s*\n  pull_request:\s*\n  push:\s*\n    branches: \[main\]/);
  assert.match(gate, /name: Policy coverage and invariant verification/);
  assert.match(gate, /name: Cross-estate regulated, AI, Google, Apple and native contracts/);
  assert.doesNotMatch(gate, /pull_request:\s*\n\s+paths(?:-ignore)?:/);
  assert.doesNotMatch(gate, /^\s+needs: policy\s*$/m);
  assert.match(gate, /node scripts\/ci\/verify-unified-ci-contract\.mjs --run/);
  assert.match(gate, /npm run build && npm run build:public-only/);
  assert.doesNotMatch(gate, /^\s+(?:id-token|deployments|pages|actions): write\s*$/m);
});

test("locked installs continue using npm ci and pinned existing dependencies", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/codeql.yml",
    ".github/workflows/browser-acceptance.yml",
    ".github/workflows/novapharm-unified-ci-gate.yml",
  ]) {
    const body = file(path);
    assert.match(body, /npm ci --ignore-scripts --prefer-offline/);
    assert.doesNotMatch(body, /npm install(?:\s|$)/);
  }
});

test("timing diagnostics do not trigger another wave on every PR", () => {
  const body = file(".github/workflows/ci-latency-audit.yml");
  assert.match(body, /workflow_dispatch:/);
  assert.doesNotMatch(body, /^\s+pull_request:/m);
  assert.match(body, /actions: read/);
  assert.doesNotMatch(body, /^\s+(?:id-token|pages|deployments|contents): write\s*$/m);
  assert.match(body, /node --test scripts\/test-ci-latency-audit\.mjs/);
});
