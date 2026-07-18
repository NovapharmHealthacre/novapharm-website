import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SqliteProvider } from "../src/data/providers/sqlite.mjs";

const temporaryRoot = mkdtempSync(join(tmpdir(), "novapharm-enterprise-migration-"));
const databasePath = join(temporaryRoot, "migration.sqlite");
const migrationFile = "004_integrated_enterprise_portal.sql";
const migrationSource = readFileSync(resolve("database", "sqlite", migrationFile), "utf8");
const expectedChecksum = createHash("sha256").update(migrationSource).digest("hex");
const requiredTables = [
  "catalogue_imports", "catalogue_import_items", "product_families", "product_variants", "product_media",
  "product_claims", "product_composition_items", "product_certifications", "supplier_contacts", "price_lists", "price_list_items", "inventory_locations", "inventory_balances",
  "inventory_reservations", "inventory_movements", "shipments", "customer_statements", "goods_receipts",
  "supplier_invoices", "credit_notes", "journal_entries", "journal_lines", "quality_complaints", "quality_deviations", "change_controls", "capa_records",
  "regulatory_cases", "crm_opportunities", "document_versions", "workflow_instances", "domain_events",
  "outbox_messages", "role_permissions"
];

async function validate(provider) {
  const applied = await provider.one("SELECT version, checksum_sha256 FROM schema_migrations WHERE version = ?", [migrationFile]);
  assert.equal(applied?.version, migrationFile);
  assert.equal(applied?.checksum_sha256, expectedChecksum);
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
  assert.equal(Number((await second.one("SELECT COUNT(*) AS value FROM schema_migrations", []))?.value || 0), 1);
  await second.close();
  console.log(`Enterprise SQLite migration validated twice: ${requiredTables.length} domain tables, checksum lock, constraints and foreign keys.`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
