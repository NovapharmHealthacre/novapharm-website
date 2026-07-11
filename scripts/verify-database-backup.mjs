import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const backupPath = resolve(process.argv[2] || process.env.BACKUP_DATABASE_PATH || "");
if ((!process.argv[2] && !process.env.BACKUP_DATABASE_PATH) || !existsSync(backupPath)) throw new Error("Provide an existing backup path as the first argument or BACKUP_DATABASE_PATH.");

const database = new DatabaseSync(backupPath, { readOnly: true });
const integrity = database.prepare("PRAGMA integrity_check").get();
if (integrity.integrity_check !== "ok") throw new Error(`SQLite integrity check failed: ${integrity.integrity_check}`);
const requiredTables = ["users", "auth_sessions", "leads", "documents", "audit_logs"];
const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
for (const table of requiredTables) {
  if (!tables.has(table)) throw new Error(`Backup is missing required table ${table}.`);
}
database.close();
console.log(`Backup verification passed for ${backupPath}.`);
