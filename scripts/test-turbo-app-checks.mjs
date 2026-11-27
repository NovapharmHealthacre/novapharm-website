import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(new URL(path, "file://" + root), "utf8");

test("two-worker Turborepo app checks execute all six original workspace commands", () => {
  const pkg = JSON.parse(read("package.json"));
  const turbo = JSON.parse(read("turbo.json"));
  const expected = ["founder", "technology", "corporate", "api", "portal", "status"];
  const command = pkg.scripts["apps:check"];
  assert.equal(typeof command, "string");
  assert.match(command, /^turbo run check /);
  assert.match(command, / --concurrency=2$/);
  const filters = [...command.matchAll(/--filter=@novapharm\/([a-z0-9-]+)/g)].map(match => match[1]);
  assert.deepEqual(filters, expected, "No original application check may be removed or added without explicit coverage");
  for (const app of expected) {
    const workspace = JSON.parse(read(`apps/${app}/package.json`));
    assert.ok(workspace.scripts?.check, "Missing full check for " + app);
    assert.match(workspace.scripts.check, /npm run (?:lint|typecheck)|tsc/, "Full workspace validation missing: " + app);
    assert.ok(pkg.scripts[`${app}:check`], "Direct manual rollback path missing: " + app);
  }
  assert.equal(pkg.devDependencies.turbo, "2.10.7", "Require existing pinned Turbo rather than installing another tool");
  assert.deepEqual(turbo.tasks.check, { cache: false }, "Never cache full security/QA checks or their deployment artifacts");
  assert.match(pkg.scripts.check, /npm run apps:check/);
});

test("new workspace parallelism does not alter required unified gates or release-authorisation checks", () => {
  const gate = read(".github/workflows/novapharm-unified-ci-gate.yml");
  const production = read(".github/workflows/ci.yml");
  assert.match(gate, /name: Policy coverage and invariant verification/);
  assert.match(gate, /name: Cross-estate regulated, AI, Google, Apple and native contracts/);
  assert.match(gate, /node scripts\/ci\/verify-unified-ci-contract\.mjs --run/);
  assert.match(production, /Run production readiness suite/);
  assert.match(production, /Enforce readiness result/);
  assert.match(production, /Build and boot-test six isolated Azure artifacts/);
});
