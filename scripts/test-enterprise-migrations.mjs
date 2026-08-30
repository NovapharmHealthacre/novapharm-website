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
  "006_medicines_intelligence.sql",
  "007_registered_population_context.sql",
  "008_source_period_governance.sql",
  "009_authoritative_bulk_observations.sql",
  "010_source_scoped_medicine_marts.sql",
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
  "outbox_messages", "role_permissions", "security_replay_tokens",
  "data_source_registry", "source_resources", "source_schema_versions", "ingestion_runs", "ingestion_errors",
  "analytical_dataset_manifests", "dim_time", "dim_medicine", "medicine_aliases", "medicine_code_history",
  "dim_bnf", "bnf_hierarchy_history", "dim_geography", "dim_postcode", "postcode_geography_history",
  "dim_nhs_organisations", "organisation_relationship_history", "dim_practices", "practice_relationship_history", "practice_contact_evidence",
  "pharmacy_imports", "pharmacy_source_rows", "pharmacies", "pharmacy_identifiers", "pharmacy_history",
  "pharmacy_contact_evidence", "pharmacy_enrichment_queue", "fact_epd_prescribing",
  "fact_pca_community_dispensing", "fact_epd_prescribing_observations", "fact_pca_community_dispensing_observations",
  "fact_scmd_secondary_care", "fact_hospital_community_dispensing",
  "fact_practice_dispensing_flow", "fact_pharmacy_activity", "fact_special_dispenser_drug_release",
  "mart_medicine_month", "mart_medicine_geography_month", "mart_medicine_practice_month",
  "mart_medicine_presentation_month", "mart_medicine_supplier_month", "mart_pharmacy_month",
  "forecast_models", "forecast_runs", "forecast_values", "forecast_evaluations", "forecast_feature_snapshots",
  "opportunity_model_versions", "mart_pharmacy_medicine_opportunity", "opportunity_score_components",
  "intelligence_campaigns", "intelligence_campaign_targets", "practice_population_history",
  "population_age_sex_history", "practice_monthly_mapping", "medicine_mart_build_runs",
  "mart_medicine_source_month", "mart_medicine_source_geography_month", "mart_medicine_source_practice_month",
  "mart_medicine_source_presentation_month", "mart_medicine_source_supplier_month",
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
  const campaignSql = (await provider.one("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'intelligence_campaign_targets'", []))?.sql || "";
  assert.match(campaignSql, /human_approved_by/i, "Campaign targets must retain explicit human approval evidence.");
  const forecastSql = (await provider.one("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'forecast_runs'", []))?.sql || "";
  assert.match(forecastSql, /training_cutoff/i, "Forecast runs must retain their temporal training cut-off.");
  assert.match(forecastSql, /feature_cutoff/i, "Forecast runs must retain their temporal feature cut-off.");
  const sourceColumns = new Set((await provider.all("PRAGMA table_info(data_source_registry)", [])).map((column) => column.name));
  assert.ok(sourceColumns.has("latest_expected_period"), "Source health must retain the latest expected period.");
  assert.ok(sourceColumns.has("latest_discovered_period"), "Source health must retain the latest discovered period.");
  const views = new Set((await provider.all("SELECT name FROM sqlite_master WHERE type = 'view'", [])).map((row) => row.name));
  assert.ok(views.has("intelligence_epd_facts"), "EPD queries must include governed authoritative observations.");
  assert.ok(views.has("intelligence_pca_facts"), "PCA queries must preserve absent actual-cost evidence as NULL.");
  for (const view of [
    "intelligence_mart_medicine_source_month",
    "intelligence_mart_medicine_source_geography_month",
    "intelligence_mart_medicine_source_practice_month",
    "intelligence_mart_medicine_source_presentation_month",
    "intelligence_mart_medicine_source_supplier_month",
  ]) assert.ok(views.has(view), `Source-scoped mart view is missing ${view}.`);
  const pcaCostBoundary = (await provider.one("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'mart_medicine_source_month'", []))?.sql || "";
  assert.match(pcaCostBoundary, /dataset_scope = 'epd' OR actual_cost IS NULL/i, "PCA marts must never invent actual-cost evidence.");
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
