import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const temporaryRoot = mkdtempSync(join(tmpdir(), "novapharm-schema-migration-"));
const databasePath = join(temporaryRoot, "legacy.sqlite");
const legacy = new DatabaseSync(databasePath);

try {
  legacy.exec(readFileSync(join(process.cwd(), "database/schema.sql"), "utf8"));
  legacy.exec(`
    ALTER TABLE auth_sessions RENAME TO auth_sessions_current;
    CREATE TABLE auth_sessions (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      access_type TEXT NOT NULL CHECK(access_type IN ('customer', 'employee', 'board')),
      credential_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      revoked_at TEXT
    );
    DROP TABLE auth_sessions_current;
  `);
  legacy.prepare("INSERT INTO users(id, username, display_name, role, status, created_at, updated_at) VALUES(?, ?, ?, ?, 'active', ?, ?)")
    .run("legacy-user", "LegacyBoard", "Legacy Board User", "board", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
  legacy.prepare("INSERT INTO auth_sessions(id, username, access_type, credential_version, created_at, expires_at, last_seen_at) VALUES(?, ?, 'board', 1, ?, ?, ?)")
    .run("legacy-session", "LegacyBoard", "2026-01-01T00:00:00.000Z", "2099-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
  legacy.close();

  process.env.DATABASE_PATH = databasePath;
  const { db } = await import(`../src/data/database.mjs?migration-test=${Date.now()}`);
  const definition = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'auth_sessions'").get().sql;
  assert.match(definition, /'admin'/);
  assert.equal(db.prepare("SELECT access_type FROM auth_sessions WHERE id = ?").get("legacy-session").access_type, "board");
  db.prepare("UPDATE users SET role = 'admin' WHERE username = ?").run("LegacyBoard");
  db.prepare("INSERT INTO auth_sessions(id, username, access_type, credential_version, created_at, expires_at, last_seen_at) VALUES(?, ?, 'admin', 1, ?, ?, ?)")
    .run("admin-session", "LegacyBoard", "2026-01-01T00:00:00.000Z", "2099-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM auth_sessions").get().count, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM reporting_active_portal_users").get().count, 2);
  assert.ok(db.prepare("PRAGMA table_info(account_applications)").all().some((column) => column.name === "submission_key"));
  assert.ok(db.prepare("PRAGMA table_info(documents)").all().some((column) => column.name === "idempotency_key"));
  db.close();
  console.log("Database migration preserved legacy sessions and enabled administrator access sessions.");
} finally {
  delete process.env.DATABASE_PATH;
  rmSync(temporaryRoot, { recursive: true, force: true });
}
