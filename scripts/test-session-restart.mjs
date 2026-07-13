import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const runId = `${process.pid}-${Date.now()}`;
const databasePath = `/tmp/novapharm-session-restart-${runId}.sqlite`;
const statePath = `/tmp/novapharm-session-restart-${runId}.state`;
const password = `Aa1!${randomBytes(24).toString("hex")}`;
const salt = randomBytes(16).toString("hex");
const environment = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_PATH: databasePath,
  PORTAL_USERNAME: "RestartTestAdmin",
  PORTAL_DISPLAY_NAME: "Restart Test Administrator",
  PORTAL_PASSWORD_SALT: salt,
  PORTAL_PASSWORD_HASH: pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex"),
  PORTAL_PASSWORD: "",
  PORTAL_USERS_JSON: "",
  BOOTSTRAP_ADMIN_PASSWORD: "",
  TEST_PORTAL_PASSWORD: password,
  SESSION_RESTART_STATE_PATH: statePath
};
const worker = resolve(root, "scripts", "session-restart-worker.mjs");
execFileSync(process.execPath, [worker, "create"], { cwd: root, env: environment, stdio: "ignore" });
execFileSync(process.execPath, [worker, "verify"], { cwd: root, env: environment, stdio: "ignore" });
rmSync(databasePath, { force: true });
rmSync(statePath, { force: true });
console.log("Session restart test passed: a role-scoped persistent session survived a separate Node process restart without exposing its ID or credentials.");
