import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { REQUIRED_APPS, runApplicationChecks, workerCount } from "./ci/run-app-checks.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(new URL(path, "file://" + root), "utf8");

test("all original six full workspace checks remain mandatory, without pnpm or Turbo at runtime", () => {
  const pkg = JSON.parse(read("package.json"));
  const expected = ["founder", "technology", "corporate", "api", "portal", "status"];
  assert.deepEqual(REQUIRED_APPS, expected);
  assert.equal(pkg.scripts["apps:check"], "node scripts/ci/run-app-checks.mjs");
  assert.match(pkg.scripts.check, /npm run apps:check/);
  assert.equal(pkg.devDependencies.turbo, "2.10.7", "Existing Turbo dependency must remain available for other tasks");
  for (const app of expected) {
    const ws = JSON.parse(read("apps/" + app + "/package.json"));
    assert.equal(pkg.scripts[app + ":check"], "npm run check --workspace=@novapharm/" + app);
    assert.match(ws.scripts.check, /npm run lint && npm run typecheck/);
    assert.match(ws.scripts.check, /&& npm test && npm run build$/);
  }
  assert.match(read("scripts/ci/run-app-checks.mjs"), /spawn\(process.platform/);
  assert.doesNotMatch(read("scripts/ci/run-app-checks.mjs"), /spawn\("pnpm"/);
});

test("bounded execution checks every application once and never runs more than two together", async () => {
  let active = 0;
  let peak = 0;
  const seen = [];
  const completed = await runApplicationChecks(REQUIRED_APPS, 2, async app => {
    active++;
    peak = Math.max(peak, active);
    seen.push(app);
    await new Promise(resolve => setImmediate(resolve));
    active--;
  });
  assert.deepEqual(seen, REQUIRED_APPS);
  assert.equal(completed.length, REQUIRED_APPS.length);
  assert.equal(peak, 2);
  assert.equal(active, 0);
});

test("invalid worker counts or reduced application lists fail closed", async () => {
  assert.equal(workerCount("1"), 1);
  assert.equal(workerCount("2"), 2);
  for (const value of ["0", "3", "auto", "", 2]) assert.throws(() => workerCount(value));
  await assert.rejects(runApplicationChecks(REQUIRED_APPS.slice(1), 2, async () => {}), /mandatory/);
  await assert.rejects(runApplicationChecks(REQUIRED_APPS, 3, async () => {}), /Unsafe/);
});

test("individual failures do not hide other checks; aggregate status fails", async () => {
  const seen = [];
  await assert.rejects(runApplicationChecks(REQUIRED_APPS, 2, async app => {
    seen.push(app);
    if (app === "api") throw new Error("synthetic check failure");
    await new Promise(resolve => setImmediate(resolve));
  }), /Application checks failed: api/);
  assert.deepEqual(seen, REQUIRED_APPS);
});

test("protected release, security and full estate checks remain unconditional", () => {
  const gate = read(".github/workflows/novapharm-unified-ci-gate.yml");
  const prod = read(".github/workflows/ci.yml");
  assert.match(gate, /name: Policy coverage and invariant verification/);
  assert.match(gate, /name: Cross-estate regulated, AI, Google, Apple and native contracts/);
  assert.match(gate, /node scripts\/ci\/verify-unified-ci-contract\.mjs --run/);
  assert.match(prod, /Run production readiness suite/);
  assert.match(prod, /Enforce readiness result/);
  assert.match(prod, /Build and boot-test six isolated Azure artifacts/);
});
