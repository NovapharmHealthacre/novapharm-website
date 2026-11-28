import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureBuildIdentity, assertSameBuild, requireCheckedBuild } from "./portal-ci-build-reuse.mjs";

test("same-job build receipt rejects changed server, lock, build ID, and run identity", () => {
  const root = mkdtempSync(join(tmpdir(), "novapharm-portal-build-test-"));
  try {
    const next = join(root, "apps", "portal", ".next");
    const standalone = join(next, "standalone", "apps", "portal");
    mkdirSync(join(standalone, ".next", "static"), { recursive: true });
    const id = join(next, "BUILD_ID"), standaloneId = join(standalone, ".next", "BUILD_ID");
    const server = join(standalone, "server.js"), lock = join(root, "package-lock.json");
    writeFileSync(id, "build-one");
    writeFileSync(standaloneId, "build-one");
    writeFileSync(join(standalone, ".next", "static", "example.js"), "asset");
    writeFileSync(server, "server-one");
    writeFileSync(lock, "locked");
    const identity = { sha: "a".repeat(40), runId: "1", attempt: "1" };
    const receipt = captureBuildIdentity(root, identity);
    assert.doesNotThrow(() => assertSameBuild(receipt, captureBuildIdentity(root, identity)));
    assert.throws(() => assertSameBuild(receipt, captureBuildIdentity(root, { ...identity, attempt: "2" })), /identity changed/);
    assert.throws(() => assertSameBuild(receipt, captureBuildIdentity(root, { ...identity, sha: "b".repeat(40) })), /identity changed/);
    writeFileSync(server, "server-two");
    assert.throws(() => assertSameBuild(receipt, captureBuildIdentity(root, identity)), /identity changed/);
    writeFileSync(server, "server-one");
    writeFileSync(lock, "changed");
    assert.throws(() => assertSameBuild(receipt, captureBuildIdentity(root, identity)), /identity changed/);
    writeFileSync(standaloneId, "build-two");
    assert.throws(() => captureBuildIdentity(root, identity), /build ID differs/);
    assert.throws(() => requireCheckedBuild(root, {}), /Actions-only/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("only the secure Portal Actions job reuses its checked build; both complete suites remain mandatory", () => {
  const workflow = readFileSync(new URL("../.github/workflows/browser-acceptance.yml", import.meta.url), "utf8");
  const portal = workflow.split("\n  secure-portal:")[1].split("\n  backend-workflows:")[0];
  const check = portal.indexOf("npm run api:check && npm run portal:check");
  const record = portal.indexOf("node scripts/portal-ci-build-reuse.mjs record");
  const browser = portal.indexOf("npm run portal:test:browser -- --reuse-checked-ci-build");
  const lighthouse = workflow.split("\\n  portal-lighthouse:")[1].split("\\n  backend-workflows:")[0];
  assert.ok(check >= 0 && check < record && record < browser);
  assert.doesNotMatch(portal, /portal:test:lighthouse/);
  assert.doesNotMatch(lighthouse, /--reuse-checked-ci-build|portal-ci-build-reuse\\.mjs record/);
  assert.match(lighthouse, /run: npm run portal:test:lighthouse/);
  assert.match(lighthouse, /run: npm ci --ignore-scripts --prefer-offline/);
  assert.match(lighthouse, /run: node --test scripts\\/test-lighthouse-transient-navigation\\.mjs/);
  assert.match(lighthouse, /if: \\$\\{\\{ always\\(\\) && github\\.event\\.repository\\.private \\}\\}/);
  const gate = workflow.split("\\n  acceptance-gate:")[1];
  assert.match(gate, /- portal-lighthouse/);
  assert.match(gate, /needs\\.portal-lighthouse\\.result/);
  const source = readFileSync(new URL("./run-portal-browser-acceptance.mjs", import.meta.url), "utf8");
  assert.match(source, /if \(process\.argv\.includes\(reuseFlag\)\) requireCheckedBuild\(repositoryRoot\);/);
  assert.match(source, /else run\("npm", \["run", "build", "--workspace=@novapharm\/portal"\]/);
  const benchmark = readFileSync(new URL("./run-portal-lighthouse.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(benchmark, /reuseFlag|requireCheckedBuild/);
  assert.match(benchmark, /run\("npm", \["run", "build", "--workspace=@novapharm\/portal"\]/);
});


test("Lighthouse is independent, complete and blocks the unified acceptance gate on failure", () => {
  const workflow = readFileSync(new URL("../.github/workflows/browser-acceptance.yml", import.meta.url), "utf8");
  const portal = workflow.split("\\n  secure-portal:")[1].split("\\n  portal-lighthouse:")[0];
  const lighthouse = workflow.split("\\n  portal-lighthouse:")[1].split("\\n  backend-workflows:")[0];
  const gate = workflow.split("\\n  acceptance-gate:")[1];
  assert.match(portal, /run: npm run api:check && npm run portal:check/);
  assert.match(portal, /run: npm run portal:test:browser -- --reuse-checked-ci-build/);
  assert.match(portal, /if: \\$\\{\\{ always\\(\\) && github\\.event\\.repository\\.private \\}\\}/);
  assert.match(lighthouse, /name: Independent Portal Lighthouse acceptance/);
  assert.match(lighthouse, /Run portal Lighthouse acceptance/);
  assert.match(lighthouse, /artifacts\\/portal-lighthouse/);
  assert.match(lighthouse, /!github\\.event\\.repository\\.private/);
  assert.match(gate, /- secure-portal/);
  assert.match(gate, /- portal-lighthouse/);
  assert.match(gate, /test "\\$\\{\\{ needs\\.secure-portal\\.result \\}\\}" = success/);
  assert.match(gate, /test "\\$\\{\\{ needs\\.portal-lighthouse\\.result \\}\\}" = success/);
});
