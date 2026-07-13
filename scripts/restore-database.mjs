import { DatabaseSync } from "node:sqlite";
import { chmodSync, copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const backupPath = resolve(process.argv[2] || process.env.BACKUP_DATABASE_PATH || "");
const targetPath = resolve(process.argv[3] || process.env.RESTORE_DATABASE_PATH || process.env.DATABASE_PATH || "");
if ((!process.argv[2] && !process.env.BACKUP_DATABASE_PATH) || !existsSync(backupPath)) throw new Error("Provide an existing backup database path.");
if ((!process.argv[3] && !process.env.RESTORE_DATABASE_PATH && !process.env.DATABASE_PATH) || backupPath === targetPath) throw new Error("Provide a distinct restore target path.");
if (existsSync(targetPath) && process.env.ALLOW_DATABASE_RESTORE_OVERWRITE !== "true") {
  throw new Error("Restore target already exists. Stop the service and set ALLOW_DATABASE_RESTORE_OVERWRITE=true only for an approved recovery.");
}

function verify(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    const integrity = database.prepare("PRAGMA integrity_check").get();
    if (integrity.integrity_check !== "ok") throw new Error("Database integrity verification failed.");
    const requiredTables = ["users", "auth_credentials", "auth_sessions", "leads", "documents", "audit_logs", "security_events"];
    const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
    for (const table of requiredTables) if (!tables.has(table)) throw new Error(`Restore source is missing required table ${table}.`);
  } finally {
    database.close();
  }
}

verify(backupPath);
mkdirSync(dirname(targetPath), { recursive: true, mode: 0o700 });
const temporaryPath = `${targetPath}.restore-${process.pid}`;
const previousPath = `${targetPath}.pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`;
rmSync(temporaryPath, { force: true });
copyFileSync(backupPath, temporaryPath);
chmodSync(temporaryPath, 0o600);
verify(temporaryPath);
if (existsSync(targetPath)) renameSync(targetPath, previousPath);
renameSync(temporaryPath, targetPath);
chmodSync(targetPath, 0o600);

console.log(JSON.stringify({ restored: true, targetPath, previousPath: existsSync(previousPath) ? previousPath : null }, null, 2));
