import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readEnvironmentFile, repositoryRoot, runtimePaths } from "./runtime.mjs";

const environment = readEnvironmentFile();
if (!environment || environment.LOCAL_PORTAL_MODE !== "true") throw new Error("Start the local owner portal before testing backup and restoration.");
if (!existsSync(runtimePaths.database)) throw new Error("The local portal database does not exist.");

function run(script, args = [], additions = {}) {
  const result = spawnSync(process.execPath, [join(repositoryRoot, "scripts", script), ...args], {
    cwd: repositoryRoot,
    env: { ...process.env, ...environment, ...additions },
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout || `${script} failed.`).trim());
  return result.stdout.trim();
}

const backup = JSON.parse(run("backup-database.mjs"));
run("verify-database-backup.mjs", [backup.backupPath]);

const restoredPath = join(runtimePaths.backupRoot, `isolated-restore-validation-${Date.now()}.sqlite`);
const restore = JSON.parse(run("restore-database.mjs", [backup.backupPath, restoredPath]));
assert.equal(restore.restored, true);

const source = new DatabaseSync(runtimePaths.database, { readOnly: true });
const restored = new DatabaseSync(restoredPath, { readOnly: true });
try {
  for (const table of ["users", "customers", "products", "orders", "leads", "account_applications", "documents", "audit_logs", "security_events"]) {
    const sourceCount = Number(source.prepare(`SELECT COUNT(*) AS value FROM ${table}`).get().value);
    const restoredCount = Number(restored.prepare(`SELECT COUNT(*) AS value FROM ${table}`).get().value);
    assert.equal(restoredCount, sourceCount, `${table} record count changed during isolated restore`);
  }
  assert.equal(restored.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(restored.prepare("PRAGMA foreign_key_check").all().length, 0);
} finally {
  source.close();
  restored.close();
  rmSync(restoredPath, { force: true });
}

console.log(JSON.stringify({
  status: "passed",
  backupPath: backup.backupPath,
  backupSha256: backup.sha256,
  isolatedRestore: "verified_and_removed",
  sourceDatabaseUnchanged: true
}));
