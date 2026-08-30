import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SqliteProvider } from "../src/data/providers/sqlite.mjs";

const temporaryRoot = mkdtempSync(join(tmpdir(), "novapharm-enterprise-migration-"));
const databasePath = join(temporaryRoot, "migration.sqlite");
const migrationFiles = [
  "004_integrated_enterprise_portal.sql",
  "005_portal_gateway_replay_protection.sql",
];
const expectedMigrations = new Map(migrationFiles.map((file) => {
  const source = readFileSync(resolve("database", "sqlite", file), "utf8");
  return [file, createHash("sha256").update(source).digest("hex")];
}));
const requiredTables = [
  "catalogue_imports", "catalogue_import_items", "product_families", "product_variants", "product_media",
  "product_claims", "product_composition_items", "product_certifications", "supplier_contacts", "price_lists", "price_list_items", "inventory_locations", "inventory_balances",
  "inventory_reservations", "inventory_movements", "shipments", "customer_statements", "goods_receipts",
  "supplier_invoices", "credit_notes", "journal_entries", "journal_lines", "quality_complaints", "quality_deviations", "change_controls", "capa_records",
  "regulatory_cases", "crm_opportunities", "document_versions", "workflow_instances", "domain_events",
  "outbox_messages", "role_permissions", "security_replay_tokens"
];

async function validate(provider) {
  const applied = (await provider.all("SELECT version, checksum_sha256 FROM schema_migrations ORDER BY version", []))
    .map((row) => ({ version: row.version, checksum_sha256: row.checksum_sha256 }));
  assert.deepEqual(
    applied,
    [...expectedMigrations].map(([version, checksum_sha256]) => ({ version, checksum_sha256 })),
    "SQLite migrations must be applied exactly once, in order, with immutable checksums.",
  );
  const tables = new Set((await provider.all("SELECT name FROM sqlite_master WHERE type = 'table'", [])).map((row) => row.name));
  for (const table of requiredTables) assert.ok(tables.has(table), `SQLite migration is missing ${table}.`);
  assert.deepEqual(await provider.all("PRAGMA foreign_key_check", []), []);
  const balanceSql = (await provider.one("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'inventory_balances'", []))?.sql || "";
  assert.match(balanceSql, /reserved_quantity \+ available_quantity \+ quarantine_quantity <= on_hand_quantity/i);
  const journalSql = (await provider.one("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'journal_entries'", []))?.sql || "";
  assert.match(journalSql, /approved_by IS NULL OR approved_by <> prepared_by/i);
}

try {
  const first = new SqliteProvider({ DATABASE_PATH: databasePath });
  await first.initialize();
  await validate(first);
  await first.close();

  const second = new SqliteProvider({ DATABASE_PATH: databasePath });
  await second.initialize();
  await validate(second);
  assert.equal(Number((await second.one("SELECT COUNT(*) AS value FROM schema_migrations", []))?.value || 0), migrationFiles.length);
  await second.close();
  console.log(`Enterprise SQLite migrations validated twice: ${migrationFiles.length} ordered migrations, ${requiredTables.length} domain tables, checksum lock, constraints and foreign keys.`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
