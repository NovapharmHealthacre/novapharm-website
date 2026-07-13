import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";

const databasePath = resolve(process.env.DATABASE_PATH || join(process.cwd(), "data", "novapharm.sqlite"));
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec(readFileSync(resolve(process.cwd(), "database", "schema.sql"), "utf8"));

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Additive migrations keep existing persistent Render disks compatible.
ensureColumn("auth_credentials", "must_change_password", "INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0, 1))");
ensureColumn("auth_credentials", "credential_version", "INTEGER NOT NULL DEFAULT 1 CHECK(credential_version >= 1)");
ensureColumn("auth_credentials", "credential_source", "TEXT NOT NULL DEFAULT 'environment'");
ensureColumn("auth_sessions", "credential_version", "INTEGER NOT NULL DEFAULT 1");

function migrateSessionAccessConstraint() {
  const definition = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'auth_sessions'").get()?.sql || "";
  if (/access_type[\s\S]*'admin'/i.test(definition)) return;
  db.exec(`
    BEGIN IMMEDIATE;
    ALTER TABLE auth_sessions RENAME TO auth_sessions_legacy;
    CREATE TABLE auth_sessions (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      access_type TEXT NOT NULL CHECK(access_type IN ('customer', 'employee', 'board', 'admin')),
      credential_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      revoked_at TEXT
    );
    INSERT INTO auth_sessions(id, username, access_type, credential_version, created_at, expires_at, last_seen_at, revoked_at)
      SELECT id, username, access_type, credential_version, created_at, expires_at, last_seen_at, revoked_at
      FROM auth_sessions_legacy;
    DROP TABLE auth_sessions_legacy;
    COMMIT;
  `);
}

migrateSessionAccessConstraint();
ensureColumn("leads", "submission_fingerprint", "TEXT");
ensureColumn("lead_details", "privacy_notice_version", "TEXT NOT NULL DEFAULT '2026-07-11-v1.0'");
ensureColumn("lead_details", "safety_confirmation_at", "TEXT");
ensureColumn("account_applications", "privacy_notice_version", "TEXT NOT NULL DEFAULT '2026-07-11-v1.0'");
ensureColumn("account_applications", "applicant_declaration_at", "TEXT");
db.exec("CREATE INDEX IF NOT EXISTS idx_leads_fingerprint ON leads(submission_fingerprint, created_at)");

export function nowIso() {
  return new Date().toISOString();
}

export function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function allocateNumber(counterKey, prefix, width = 6) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = db.prepare("SELECT value FROM counters WHERE counter_key = ?").get(counterKey);
    const next = Number(current?.value || 0) + 1;
    db.prepare(`
      INSERT INTO counters(counter_key, value) VALUES(?, ?)
      ON CONFLICT(counter_key) DO UPDATE SET value = excluded.value
    `).run(counterKey, next);
    db.exec("COMMIT");
    return `${prefix}${String(next).padStart(width, "0")}`;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function audit({ actor, action, entityType, entityId, correlationId = randomUUID(), before = null, after = null, details = {} }) {
  db.prepare(`
    INSERT INTO audit_logs(id, actor, action, entity_type, entity_id, correlation_id, before_hash, after_hash, details_json, occurred_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(), actor, action, entityType, entityId, correlationId,
    before ? stableHash(before) : null,
    after ? stableHash(after) : null,
    JSON.stringify(details), nowIso()
  );
  return correlationId;
}

export function enqueue({ eventType, aggregateType, aggregateId, destinationSystem, payload, idempotencyKey }) {
  const id = randomUUID();
  const result = db.prepare(`
    INSERT OR IGNORE INTO integration_events(
      id, event_type, aggregate_type, aggregate_id, destination_system,
      idempotency_key, payload_json, status, next_attempt_at, created_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, eventType, aggregateType, aggregateId, destinationSystem, idempotencyKey, JSON.stringify(payload), nowIso(), nowIso());
  return result.changes ? id : null;
}

export function transaction(work) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}

export function one(sql, ...params) {
  return db.prepare(sql).get(...params) || null;
}

export function run(sql, ...params) {
  return db.prepare(sql).run(...params);
}

export function databaseReady() {
  return existsSync(databasePath) && one("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'").count > 0;
}
