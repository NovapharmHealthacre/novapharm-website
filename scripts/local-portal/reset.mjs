import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { repositoryRoot, runtimePaths, assertSafeRuntimePath } from "./runtime.mjs";

const confirmed = process.argv.includes("--yes") || process.env.NOVAPHARM_LOCAL_RESET_CONFIRMED === "true";
if (!confirmed) {
  console.error("This deletes only NovaPharm's synthetic local portal database, local uploads, local previews, backups and temporary credential handoff.");
  console.error("Run npm run portal:local:reset -- --yes to confirm.");
  process.exit(2);
}

const stop = spawnSync(process.execPath, [fileURLToPath(new URL("./stop.mjs", import.meta.url))], { cwd: repositoryRoot, stdio: "inherit" });
if (![0, null].includes(stop.status)) throw new Error("The local portal could not be stopped before reset.");

for (const path of [runtimePaths.root, runtimePaths.credentials, runtimePaths.credentialsLauncher]) {
  assertSafeRuntimePath(path);
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

const start = spawnSync(process.execPath, [fileURLToPath(new URL("./start.mjs", import.meta.url)), ...process.argv.filter((value) => value.startsWith("--no-"))], {
  cwd: repositoryRoot,
  stdio: "inherit",
  env: process.env
});
if (start.status !== 0) throw new Error("The fresh local portal could not be started after reset.");
