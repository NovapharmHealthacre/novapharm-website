import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

const generator = fileURLToPath(new URL("./materialize-leadership-media.mjs", import.meta.url));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("readiness job reuse verifies bytes and never crosses job attempts or production", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "leadership-reuse-test-"));
  try {
    const runnerTemp = path.join(cwd, "runner");
    await mkdir(runnerTemp);
    await mkdir(path.join(cwd, "config"));
    const master = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#123456" }
    }).png().toBuffer();
    await writeFile(path.join(cwd, "master.png"), master);
    await writeFile(path.join(cwd, "config/leadership-media.json"), JSON.stringify({
      deliveryCeilingBytes: 307200,
      portraits: [{
        master: "master.png", masterSha256: digest(master), outputBase: "generated/portrait",
        widths: [8, 16, 32], width: 32, height: 32
      }]
    }));
    const env = {
      ...process.env,
      GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "pull_request",
      GITHUB_WORKFLOW: "Production readiness", RUNNER_ENVIRONMENT: "github-hosted",
      GITHUB_JOB: "verify", RUNNER_TEMP: runnerTemp,
      GITHUB_RUN_ID: "fixture", GITHUB_RUN_ATTEMPT: "1"
    };
    function run(overrides = {}) {
      return spawnSync(process.execPath, [generator], {
        cwd, env: { ...env, ...overrides }, encoding: "utf8", timeout: 60000
      });
    }
    function expectCounts(encoded, reused, overrides) {
      const result = run(overrides);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, new RegExp(`Leadership derivatives: ${encoded} encoded, ${reused} reused`));
    }
    expectCounts(9, 0);
    const output = path.join(cwd, "generated/portrait-8.jpg");
    const original = await readFile(output);
    expectCounts(0, 9);
    assert.deepEqual(await readFile(output), original);
    // A valid, same-sized but different image must be regenerated, not trusted.
    await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ff0000" } }).jpeg().toFile(output);
    expectCounts(1, 8);
    assert.deepEqual(await readFile(output), original);
    await rm(output);
    expectCounts(1, 8);
    assert.deepEqual(await readFile(output), original);
    expectCounts(9, 0, { GITHUB_RUN_ATTEMPT: "2" });
    expectCounts(9, 0, { GITHUB_EVENT_NAME: "push" });
    expectCounts(9, 0, { GITHUB_WORKFLOW: "Other workflow" });
    expectCounts(9, 0, { RUNNER_ENVIRONMENT: "self-hosted" });
    await writeFile(path.join(cwd, "master.png"), Buffer.from("invalid master"));
    const rejected = run();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Approved leadership master checksum changed/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
