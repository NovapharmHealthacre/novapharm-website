import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function identifier(value) {
  const candidate = String(value || "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(candidate)) throw new Error("Unsafe database identifier.");
  return candidate;
}

export class SqliteProvider {
  constructor(environment = process.env) {
    this.path = resolve(environment.DATABASE_PATH || join(process.cwd(), "data", "novapharm.sqlite"));
    this.raw = null;
    this.transactionQueue = Promise.resolve();
  }

  async initialize() {
    mkdirSync(dirname(this.path), { recursive: true });
    this.raw = new DatabaseSync(this.path);
    this.raw.exec(readFileSync(resolve(process.cwd(), "database", "schema.sql"), "utf8"));
    this.#runAdditiveMigrations();
  }

  #ensureColumn(table, column, definition) {
    const columns = this.raw.prepare(`PRAGMA table_info(${identifier(table)})`).all();
    if (!columns.some((entry) => entry.name === column)) {
      this.raw.exec(`ALTER TABLE ${identifier(table)} ADD COLUMN ${identifier(column)} ${definition}`);
    }
  }

  #runAdditiveMigrations() {
    this.#ensureColumn("auth_credentials", "must_change_password", "INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0, 1))");
    this.#ensureColumn("auth_credentials", "credential_version", "INTEGER NOT NULL DEFAULT 1 CHECK(credential_version >= 1)");
    this.#ensureColumn("auth_credentials", "credential_source", "TEXT NOT NULL DEFAULT 'environment'");
    this.#ensureColumn("auth_sessions", "credential_version", "INTEGER NOT NULL DEFAULT 1");
    this.#ensureColumn("users", "identity_provider", "TEXT NOT NULL DEFAULT 'local'");
    this.#ensureColumn("users", "identity_issuer", "TEXT");
    this.#ensureColumn("users", "external_subject", "TEXT");
    this.#ensureColumn("users", "email", "TEXT");

    const definition = this.raw.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'auth_sessions'").get()?.sql || "";
    if (!/access_type[\s\S]*'admin'/i.test(definition)) {
      this.raw.exec(`
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

    this.#ensureColumn("leads", "submission_fingerprint", "TEXT");
    this.#ensureColumn("lead_details", "privacy_notice_version", "TEXT NOT NULL DEFAULT '2026-07-11-v1.0'");
    this.#ensureColumn("lead_details", "safety_confirmation_at", "TEXT");
    this.#ensureColumn("account_applications", "privacy_notice_version", "TEXT NOT NULL DEFAULT '2026-07-11-v1.0'");
    this.#ensureColumn("account_applications", "applicant_declaration_at", "TEXT");
    this.#ensureColumn("documents", "security_status", "TEXT NOT NULL DEFAULT 'scan_not_configured'");
    this.#ensureColumn("documents", "malware_scan_result", "TEXT");
    this.#ensureColumn("documents", "malware_scanned_at", "TEXT");
    this.raw.exec("CREATE INDEX IF NOT EXISTS idx_leads_fingerprint ON leads(submission_fingerprint, created_at)");
    this.raw.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_federated_identity ON users(identity_issuer, external_subject) WHERE external_subject IS NOT NULL");
  }

  async all(sql, params = []) {
    return this.raw.prepare(sql).all(...params);
  }

  async one(sql, params = []) {
    return this.raw.prepare(sql).get(...params) || null;
  }

  async run(sql, params = []) {
    return this.raw.prepare(sql).run(...params);
  }

  async transaction(work) {
    const previous = this.transactionQueue;
    let release;
    this.transactionQueue = new Promise((resolveQueue) => { release = resolveQueue; });
    await previous;
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      const result = await work(this);
      this.raw.exec("COMMIT");
      return result;
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    } finally {
      release();
    }
  }

  async upsert(table, values, conflictColumns, updateColumns = []) {
    const columns = Object.keys(values).map(identifier);
    const conflicts = conflictColumns.map(identifier);
    const updates = updateColumns.map(identifier);
    const placeholders = columns.map(() => "?").join(", ");
    const conflictSql = updates.length
      ? `DO UPDATE SET ${updates.map((column) => `${column} = excluded.${column}`).join(", ")}`
      : "DO NOTHING";
    return this.run(
      `INSERT INTO ${identifier(table)}(${columns.join(", ")}) VALUES(${placeholders}) ON CONFLICT(${conflicts.join(", ")}) ${conflictSql}`,
      columns.map((column) => values[column])
    );
  }

  async insertIgnore(table, values, conflictColumns) {
    return this.upsert(table, values, conflictColumns, []);
  }

  async ready() {
    return existsSync(this.path) && Number((await this.one("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'"))?.count || 0) > 0;
  }

  async close() {
    this.raw?.close();
  }
}
