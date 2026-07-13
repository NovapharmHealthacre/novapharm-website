import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const testRoot = `/tmp/novapharm-backup-restore-${process.pid}-${Date.now()}`;
const sourcePath = join(testRoot, "source", "novapharm.sqlite");
const backupRoot = join(testRoot, "backups");
const restorePath = join(testRoot, "restored", "novapharm.sqlite");
mkdirSync(join(testRoot, "source"), { recursive: true, mode: 0o700 });

const marker = randomUUID();
const source = new DatabaseSync(sourcePath);
source.exec(readFileSync(join(root, "database", "schema.sql"), "utf8"));
source.prepare("INSERT INTO security_events(id, event_type, outcome, details_json, occurred_at) VALUES(?, 'recovery.test', 'allowed', '{}', ?)").run(marker, new Date().toISOString());
source.close();
chmodSync(sourcePath, 0o600);

const environment = { ...process.env, DATABASE_PATH: sourcePath, DATABASE_BACKUP_ROOT: backupRoot };
const backupResult = JSON.parse(execFileSync(process.execPath, [join(root, "scripts", "backup-database.mjs")], { cwd: root, env: environment, encoding: "utf8" }));
assert.equal(statSync(backupResult.backupPath).mode & 0o777, 0o600);
execFileSync(process.execPath, [join(root, "scripts", "verify-database-backup.mjs"), backupResult.backupPath], { cwd: root, env: environment, encoding: "utf8" });
const restoreResult = JSON.parse(execFileSync(process.execPath, [join(root, "scripts", "restore-database.mjs"), backupResult.backupPath, restorePath], { cwd: root, env: environment, encoding: "utf8" }));
assert.equal(restoreResult.restored, true);
assert.equal(statSync(restorePath).mode & 0o777, 0o600);

const restored = new DatabaseSync(restorePath, { readOnly: true });
assert.equal(restored.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
assert.equal(restored.prepare("SELECT id FROM security_events WHERE id = ?").get(marker).id, marker);
restored.close();

const reopened = new DatabaseSync(restorePath);
assert.equal(reopened.prepare("SELECT COUNT(*) AS value FROM security_events WHERE id = ?").get(marker).value, 1);
reopened.close();

rmSync(testRoot, { recursive: true, force: true });
console.log("Backup and restore tests passed: consistent backup, integrity verification, atomic isolated restore, restrictive file modes and reopen persistence.");
