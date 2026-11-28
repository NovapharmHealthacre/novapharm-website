import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const REQUIRED_APPS = Object.freeze(["founder", "technology", "corporate", "api", "portal", "status"]);
const root = fileURLToPath(new URL("../../", import.meta.url));

// Never silently scale beyond two large simultaneous Next.js builds.
export function workerCount(value = "2") {
  assert.ok(value === "1" || value === "2", "Application check workers must be 1 or 2");
  return Number(value);
}

// Execute *all* original checks, including on failure, and collect each result.
// No cache, no package-manager switching, and no reduced test suite.
export async function runApplicationChecks(apps, concurrency, run) {
  assert.deepEqual(apps, REQUIRED_APPS, "Every original application check is mandatory");
  assert.ok(concurrency === 1 || concurrency === 2, "Unsafe concurrent application checks");
  assert.equal(typeof run, "function");
  let next = 0;
  const failures = [];
  const completed = [];
  async function worker() {
    while (next < apps.length) {
      const index = next++;
      const app = apps[index];
      try {
        await run(app);
        completed.push(app);
      } catch (error) {
        failures.push({ app, error });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, apps.length) }, () => worker()));
  if (failures.length) {
    throw new AggregateError(failures.map(item => item.error),
      "Application checks failed: " + failures.map(item => item.app).join(", "));
  }
  assert.equal(completed.length, apps.length, "Not all application checks completed");
  return completed;
}

function runApp(app) {
  return new Promise((resolve, reject) => {
    console.log("[CI] Checking @novapharm/" + app + " (full workspace check)");
    const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", app + ":check"], { cwd: root, stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(app + " full check exited " + (signal ?? code)));
    });
  });
}

if (process.argv[1] && fileURLToPath(new URL(process.argv[1], "file:///")) === fileURLToPath(import.meta.url)) {
  try {
    await runApplicationChecks(REQUIRED_APPS, workerCount(process.env.NOVAPHARM_APP_CHECK_WORKERS ?? "2"), runApp);
    console.log("All six original application checks passed.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
