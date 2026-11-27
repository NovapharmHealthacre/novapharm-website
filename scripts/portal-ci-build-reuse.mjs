import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const hash = value => createHash("sha256").update(value).digest("hex");
export const reuseFlag = "--reuse-checked-ci-build";

// Only a fresh build within the same Actions job may be reused. No cross-run
// artifact/cache lookup, credential persistence, or source checkout fallback.
export function captureBuildIdentity(root, identity) {
  const next = join(root, "apps", "portal", ".next");
  const standalone = join(next, "standalone", "apps", "portal");
  const buildId = readFileSync(join(next, "BUILD_ID"), "utf8").trim();
  assert.ok(buildId, "Missing Portal build identity");
  assert.equal(readFileSync(join(standalone, ".next", "BUILD_ID"), "utf8").trim(),
    buildId, "Standalone build ID differs from the checked build");
  assert.ok(readdirSync(join(standalone, ".next", "static")).length,
    "Standalone static assets missing");
  return { ...identity, buildId, serverSha256: hash(readFileSync(join(standalone, "server.js"))),
    lockSha256: hash(readFileSync(join(root, "package-lock.json"))) };
}

export function assertSameBuild(record, current) {
  assert.deepEqual(record, current, "Checked Portal build identity changed; rebuild required");
}

function context(root, env) {
  assert.equal(env.GITHUB_ACTIONS, "true", "Build reuse is Actions-only");
  assert.match(env.PORTAL_CI_EXPECTED_SHA ?? "", /^[0-9a-f]{40}$/);
  assert.match(env.GITHUB_RUN_ID ?? "", /^\d+$/);
  assert.match(env.GITHUB_RUN_ATTEMPT ?? "", /^\d+$/);
  assert.ok(env.RUNNER_TEMP && isAbsolute(env.RUNNER_TEMP), "Missing runner temp directory");
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(sha, env.PORTAL_CI_EXPECTED_SHA, "Portal build is not from the exact checked commit");
  return { receipt: join(env.RUNNER_TEMP, "novapharm-portal-checked-build.json"),
    identity: { sha, runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT } };
}

export function recordCheckedBuild(root = process.cwd(), env = process.env) {
  const { receipt, identity } = context(root, env);
  const current = captureBuildIdentity(root, identity);
  writeFileSync(receipt, JSON.stringify(current), { flag: "wx", mode: 0o600 });
  console.log("Recorded checked Portal build for same-job browser acceptance.");
}

export function requireCheckedBuild(root = process.cwd(), env = process.env) {
  const { receipt, identity } = context(root, env);
  assertSameBuild(JSON.parse(readFileSync(receipt, "utf8")), captureBuildIdentity(root, identity));
  console.log("Reusing exact-commit checked Portal build within this Actions job.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], "record", "Unsupported build receipt command");
  recordCheckedBuild();
}
