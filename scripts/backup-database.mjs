import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { chmodSync, createReadStream, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";

const sourcePath = resolve(process.env.DATABASE_PATH || "");
if (!process.env.DATABASE_PATH || !existsSync(sourcePath)) throw new Error("DATABASE_PATH must identify an existing SQLite database.");

const backupRoot = resolve(process.env.DATABASE_BACKUP_ROOT || join(dirname(sourcePath), "backups"));
mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = join(backupRoot, `novapharm-${timestamp}.sqlite`);
const escapedBackupPath = backupPath.replaceAll("'", "''");

const database = new DatabaseSync(sourcePath);
database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
database.exec(`VACUUM INTO '${escapedBackupPath}'`);
database.close();
chmodSync(backupPath, 0o600);

const checksum = createHash("sha256");
for await (const chunk of createReadStream(backupPath)) checksum.update(chunk);
console.log(JSON.stringify({ backupPath, sha256: checksum.digest("hex"), createdAt: new Date().toISOString() }, null, 2));
