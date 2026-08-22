import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const releaseRoot = path.join(root, "artifacts", "azure-release");
const manifest = JSON.parse(await fs.readFile(path.join(releaseRoot, "release-manifest.json"), "utf8"));
const expected = ["corporate", "technology", "founder", "portal", "status", "api"];
assert.deepEqual(manifest.applications.map((entry) => entry.application).sort(), expected.sort(), "The release manifest must contain all six applications.");

for (const entry of manifest.applications) {
  assert.match(entry.digest, /^[a-f0-9]{64}$/, `${entry.application} needs a deterministic SHA-256 digest.`);
  assert.ok(entry.fileCount > 0 && entry.totalBytes > 0, `${entry.application} artifact is empty.`);
}

for (const application of ["corporate", "technology", "founder", "portal", "status"]) {
  await fs.access(path.join(releaseRoot, application, "apps", application, "server.js"));
  await fs.access(path.join(releaseRoot, application, "apps", application, ".next", "static"));
}
await fs.access(path.join(releaseRoot, "api", "apps", "api", "dist", "server.js"));
await fs.access(path.join(releaseRoot, "api", "server.mjs"));
await fs.access(path.join(releaseRoot, "api", "database", "azure", "005_portal_gateway_replay_protection.sql"));
await fs.access(path.join(releaseRoot, "api", "node_modules", "@azure", "identity", "package.json"));
await fs.access(path.join(releaseRoot, "api", "node_modules", "@azure", "abort-controller", "package.json"));

async function runNodeCheck(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(output || `${file} failed node --check`)));
  });
}

for (const application of ["corporate", "technology", "founder", "portal", "status"]) {
  await runNodeCheck(path.join(releaseRoot, application, "apps", application, "server.js"));
}
await runNodeCheck(path.join(releaseRoot, "api", "apps", "api", "dist", "server.js"));
await runNodeCheck(path.join(releaseRoot, "api", "server.mjs"));

const runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "novapharm-release-api-"));
const apiRoot = path.join(releaseRoot, "api");
const apiProcess = spawn(process.execPath, ["apps/api/dist/server.js"], {
  cwd: apiRoot,
  env: {
    ...process.env,
    NODE_ENV: "development",
    BROWSER_VALIDATION_MODE: "true",
    HOST: "127.0.0.1",
    PORT: "4178",
    PUBLIC_ORIGIN: "http://127.0.0.1:4178",
    PUBLIC_API_ORIGIN: "http://127.0.0.1:4178",
    PORTAL_ORIGIN: "http://127.0.0.1:4303",
    DATABASE_PROVIDER: "sqlite",
    DATABASE_PATH: path.join(runtimeRoot, "database.sqlite"),
    DOCUMENT_STORAGE_PROVIDER: "local-validation",
    DOCUMENT_STORAGE_ROOT: path.join(runtimeRoot, "documents"),
    EMAIL_PROVIDER: "local-capture",
    EMAIL_CAPTURE_ROOT: path.join(runtimeRoot, "email"),
    SESSION_SECRET: Buffer.alloc(48, 7).toString("base64"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let apiOutput = "";
apiProcess.stdout.on("data", (chunk) => { apiOutput += chunk; });
apiProcess.stderr.on("data", (chunk) => { apiOutput += chunk; });

try {
  let response;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      response = await fetch("http://127.0.0.1:4178/api/health/live", { signal: AbortSignal.timeout(1_000) });
      if (response.status === 200) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.equal(response?.status, 200, `Packaged API did not become live.\n${apiOutput}`);
  const payload = await response.json();
  assert.deepEqual({ status: payload.status, service: payload.service }, { status: "live", service: "novapharm-api" }, "Packaged API health contract is invalid.");
} finally {
  apiProcess.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => apiProcess.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (apiProcess.exitCode === null) apiProcess.kill("SIGKILL");
  await fs.rm(runtimeRoot, { recursive: true, force: true });
}

console.log("Unified release artifacts validated: six entries, standalone assets, API migrations, runtime dependencies and packaged API startup passed.");
