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

test("only the secure Portal browser matrix reuses its same-job checked build", () => {
  const workflow = readFileSync(new URL("../.github/workflows/browser-acceptance.yml", import.meta.url), "utf8");
  const portal = workflow.split("\n  secure-portal:")[1].split("\n  portal-lighthouse:")[0];
  const lighthouse = workflow.split("\n  portal-lighthouse:")[1].split("\n  backend-workflows:")[0];
  const check = portal.indexOf("npm run api:check && npm run portal:check");
  const record = portal.indexOf("node scripts/portal-ci-build-reuse.mjs record");
  const browser = portal.indexOf("npm run portal:test:browser -- --reuse-checked-ci-build");
  assert.ok(check >= 0 && check < record && record < browser);
  assert.ok(!portal.includes("portal:test:lighthouse"), "Lighthouse must not serialize the browser matrix");
  assert.ok(lighthouse.includes("run: npm run portal:test:lighthouse"));
  assert.ok(lighthouse.includes("run: npm ci --ignore-scripts --prefer-offline"));
  assert.ok(lighthouse.includes("run: node --test scripts/test-lighthouse-transient-navigation.mjs"));
  assert.ok(!lighthouse.includes("--reuse-checked-ci-build") && !lighthouse.includes("portal-ci-build-reuse.mjs record"));
  const source = readFileSync(new URL("./run-portal-browser-acceptance.mjs", import.meta.url), "utf8");
  assert.match(source, /if \(process\.argv\.includes\(reuseFlag\)\) requireCheckedBuild\(repositoryRoot\);/);
  assert.match(source, /else run\("npm", \["run", "build", "--workspace=@novapharm\/portal"\]/);
  const benchmark = readFileSync(new URL("./run-portal-lighthouse.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(benchmark, /reuseFlag|requireCheckedBuild/);
  assert.match(benchmark, /run\("npm", \["run", "build", "--workspace=@novapharm\/portal"\]/);
});

test("independent Lighthouse stays mandatory and protected artifacts stay private", () => {
  const workflow = readFileSync(new URL("../.github/workflows/browser-acceptance.yml", import.meta.url), "utf8");
  const portal = workflow.split("\n  secure-portal:")[1].split("\n  portal-lighthouse:")[0];
  const lighthouse = workflow.split("\n  portal-lighthouse:")[1].split("\n  backend-workflows:")[0];
  const gate = workflow.split("\n  acceptance-gate:")[1];
  assert.ok(portal.includes("npm run api:check && npm run portal:check"));
  assert.ok(portal.includes("npm run portal:test:browser -- --reuse-checked-ci-build"));
  assert.ok(portal.includes("always() && github.event.repository.private"));
  assert.ok(lighthouse.includes("name: Independent Portal Lighthouse acceptance"));
  assert.ok(lighthouse.includes("name: Run portal Lighthouse acceptance"));
  assert.ok(lighthouse.includes("artifacts/portal-lighthouse"));
  assert.ok(lighthouse.includes("always() && github.event.repository.private"));
  assert.ok(lighthouse.includes("always() && !github.event.repository.private"));
  assert.ok(gate.includes("- secure-portal"));
  assert.ok(gate.includes("- portal-lighthouse"));
  assert.ok(gate.includes("needs.secure-portal.result"));
  assert.ok(gate.includes("needs.portal-lighthouse.result"));
  assert.ok(gate.includes("= success"));
});
