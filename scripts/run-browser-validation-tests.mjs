import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { assertBrowserValidationRoot, defaultBrowserValidationRoot } from "./browser-validation-runtime.mjs";

const runtimeRoot = assertBrowserValidationRoot(process.argv[2] || defaultBrowserValidationRoot);
const credentialsPath = join(runtimeRoot, "credentials.json");
if (!existsSync(credentialsPath)) {
  throw new Error("Start the protected browser validation runtime before running browser acceptance.");
}
if ((statSync(credentialsPath).mode & 0o077) !== 0) throw new Error("Browser validation credentials must remain owner-only.");

const environment = {
  ...process.env,
  VISUAL_BASE_URL: "http://127.0.0.1:4178",
  VISUAL_CREDENTIALS_PATH: credentialsPath
};

for (const script of ["test-backend-browser-workflows.mjs", "run-browser-acceptance.mjs"]) {
  const result = spawnSync(process.execPath, [join(process.cwd(), "scripts", script)], {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("Synthetic Chromium and WebKit browser validation completed.");
