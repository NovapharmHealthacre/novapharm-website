import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertBrowserValidationRoot } from "./browser-validation-runtime.mjs";

const repositoryRoot = resolve(process.cwd());
const runtimeRoot = assertBrowserValidationRoot(join(tmpdir(), "novapharm-unified-portal-browser-runtime"));
const credentialsPath = join(runtimeRoot, "credentials.json");

function run(command, argumentsList, label, environment = process.env, capture = false) {
  const result = spawnSync(command, argumentsList, {
    cwd: repositoryRoot,
    env: environment,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    const detail = capture ? String(result.stderr || result.stdout || "").trim() : "";
    throw new Error(`${label} failed.${detail ? ` ${detail}` : ""}`);
  }
}

function stopValidationRuntime() {
  run(process.execPath, [join(repositoryRoot, "scripts", "stop-browser-validation.mjs"), runtimeRoot], "Validation runtime shutdown", process.env, true);
}

stopValidationRuntime();
if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });

try {
  run("npm", ["run", "build", "--workspace=@novapharm/portal"], "Portal production build");
  run(
    process.execPath,
    [join(repositoryRoot, "scripts", "start-browser-validation.mjs"), runtimeRoot],
    "Synthetic API startup",
    { ...process.env, PORTAL_VALIDATION_ORIGIN: "http://127.0.0.1:4303" },
  );
  run(
    "npm",
    ["run", "test:browser", "--workspace=@novapharm/portal"],
    "Portal browser acceptance",
    {
      ...process.env,
      PORTAL_VISUAL_CREDENTIALS_PATH: credentialsPath,
      PORTAL_API_BASE_URL: "http://127.0.0.1:4178",
    },
  );
} finally {
  stopValidationRuntime();
  if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
}

console.log("Portal browser acceptance completed and its protected synthetic runtime was removed.");
