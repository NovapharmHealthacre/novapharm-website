import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const POLICY_FILE = "config/ci/novapharm-unified-coverage.json";
const safePath = /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/;
const read = (root, file) => readFileSync(join(root, file), "utf8");
const listDirs = (root, folder) => readdirSync(join(root, folder), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
  .map(entry => entry.name).sort();

export function auditPolicy(root = REPO_ROOT, suppliedPolicy = null) {
  const policy = suppliedPolicy ?? JSON.parse(read(root, POLICY_FILE));
  assert.equal(policy.schemaVersion, 1, "Unknown CI policy schema");
  const domainNames = Object.keys(policy.domains ?? {});
  assert.ok(domainNames.length >= 12, "Missing cross-estate governance domains");
  const requiredProjects = ["apps", "packages", "native", "integrations"];
  for (const type of requiredProjects) {
    const expected = [...(policy.projects?.[type] ?? [])].sort();
    assert.ok(expected.length > 0, `Empty project register: ${type}`);
    assert.deepEqual(listDirs(root, type), expected, `Unregistered or removed ${type} project: register it with explicit CI tests`);
  }
  let coverage = 0;
  const allTests = new Set();
  for (const [name, record] of Object.entries(policy.domains)) {
    assert.ok(record.sources?.length && record.tests?.length, `Uncovered estate domain: ${name}`);
    for (const path of [...record.sources, ...record.tests]) {
      assert.ok(safePath.test(path) && !path.split("/").includes(".."), `Unsafe policy path: ${path}`);
      assert.ok(existsSync(join(root, path)), `Missing registered source or test in ${name}: ${path}`);
    }
    for (const file of record.tests) {
      assert.match(file, /^scripts\/test-[a-z0-9-]+\.mjs$/, `Only checked-in deterministic test files are allowed: ${file}`);
      allTests.add(file);
    }
    coverage += record.tests.length;
  }
  const trackedSourcePaths = Object.values(policy.domains).flatMap(record => record.sources);
  for (const type of requiredProjects) {
    for (const project of policy.projects[type]) {
      const path = type + "/" + project;
      assert.ok(trackedSourcePaths.some(source => source === path || source.startsWith(path + "/")),
        "Project is registered but no source+test domain actually covers it: " + path);
    }
  }
  assert.ok(allTests.size >= 40, "Cross-estate policy has fewer than 40 independent test entries");
  const workflowsRoot = join(root, ".github", "workflows");
  for (const name of policy.criticalWorkflows) {
    assert.match(name, /^[a-z0-9-]+\.yml$/);
    assert.ok(existsSync(join(workflowsRoot, name)), `Missing security/release workflow: ${name}`);
  }
  const core = read(root, ".github/workflows/ci.yml");
  const gate = read(root, ".github/workflows/novapharm-unified-ci-gate.yml");
  assert.match(core, /pull_request:/);
  assert.match(core, /branches:\s*\[main/);
  assert.match(core, /Enforce readiness result/);
  assert.match(gate, /pull_request:/, "The unified gate must run on all PRs without path exclusions");
  assert.match(gate, /push:\s*\n\s*branches:\s*\[main\]/);
  assert.doesNotMatch(gate, /pull_request:\s*\n\s*paths:/, "Never make unified PR gate path-optional");
  assert.match(gate, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(gate, /\b(?:pages|deployments|actions|id-token): write\b/, "Cross-estate CI may not publish or request write permissions");
  assert.match(read(root, ".github/CODEOWNERS"), /\* @NovapharmHealthacre/);
  const constraints = JSON.parse(read(root, "config/intelligence/owner-production-constraints.json"));
  assert.equal(constraints.productionSignoff, "not_granted", "CI cannot itself accept production signoff; stop for separate owner review");
  for (const [permission, approved] of Object.entries(constraints.productionPermissions ?? {})) {
    assert.equal(approved, false, `Production activation ${permission} requires an independent owner-controlled release`);
  }
  const publisher = read(root, ".github/workflows/pages-live-publish.yml");
  assert.match(publisher, /Prevent silent downgrade of a verified live contact service/);
  assert.match(publisher, /if: github.event_name != 'pull_request'/);
  const contact = read(root, ".github/workflows/publish-aws-contact-production.yml");
  assert.match(contact, /Enforce owner-approved contact-production permission/);
  assert.match(contact, /productionSignoff/);
  return { projects: requiredProjects.reduce((n, type) => n + policy.projects[type].length, 0), domains: domainNames.length, tests: allTests.size, references: coverage };
}

export function runRegisteredTests(root = REPO_ROOT, suppliedPolicy = null) {
  const policy = suppliedPolicy ?? JSON.parse(read(root, POLICY_FILE));
  auditPolicy(root, policy);
  let executed = 0;
  for (const [domain, record] of Object.entries(policy.domains)) {
    process.stdout.write(`\\n=== NovaPharm CI: ${domain} (${record.tests.length} contracts) ===\\n`);
    const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...record.tests], {
      cwd: root, stdio: "inherit", env: { ...process.env, NOVAPHARM_CI_NO_PRODUCTION_WRITES: "1" }, timeout: 900000
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Cross-estate test failure: ${domain}`);
    executed += record.tests.length;
  }
  return executed;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    const status = auditPolicy();
    process.stdout.write(JSON.stringify({ status: "policy-valid", ...status }) + "\\n");
    if (process.argv.includes("--run")) {
      const total = runRegisteredTests();
      process.stdout.write(`Executed ${total} registered domain test entries; source-only checks do not grant deployment or independent acceptance.\\n`);
    }
  } catch (error) {
    console.error("::error::NovaPharm unified CI failed closed:", error.message);
    process.exitCode = 1;
  }
}
