import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationRoot = resolve(process.cwd(), "database", "azure");
const files = readdirSync(migrationRoot)
	.filter((file) => /^\d{3}_[a-z0-9_]+\.sql$/i.test(file))
	.sort();
assert.deepEqual(files, [
	"001_initial.sql",
	"002_notification_delivery_queue.sql",
	"003_backend_activation.sql",
	"004_integrated_enterprise_portal.sql",
	"005_portal_gateway_replay_protection.sql",
	"006_medicines_intelligence.sql",
	"007_registered_population_context.sql",
	"008_source_period_governance.sql",
	"009_authoritative_bulk_observations.sql",
	"010_source_scoped_medicine_marts.sql",
]);

const sources = Object.fromEntries(
	files.map((file) => [
		file,
		readFileSync(resolve(migrationRoot, file), "utf8"),
	]),
);
for (const [file, source] of Object.entries(sources)) {
	assert.ok(source.trim(), `${file} must not be empty.`);
	assert.doesNotMatch(
		source,
		/\b(PRAGMA|AUTOINCREMENT)\b|\bLIMIT\s+\d+/i,
		`${file} contains SQLite-only syntax.`,
	);
	assert.doesNotMatch(
		source,
		/\?/,
		`${file} contains an unbound positional parameter.`,
	);
	const batches = source
		.split(/^\s*GO\s*$/gim)
		.map((batch) => batch.trim())
		.filter(Boolean);
	assert.ok(
		batches.length > 0,
		`${file} does not contain an executable SQL batch.`,
	);
}

const activation = sources["003_backend_activation.sql"];
for (const table of [
	"application_status_history",
	"application_upload_grants",
	"customer_contacts",
]) {
	assert.match(
		activation,
		new RegExp(`dbo\\.${table}`, "i"),
		`Activation migration is missing ${table}.`,
	);
}
for (const view of [
	"reporting_current_leads",
	"reporting_application_pipeline",
	"reporting_notification_delivery",
	"reporting_daily_form_activity",
	"reporting_utm_attribution",
	"reporting_active_portal_users",
	"reporting_security_events",
	"reporting_document_quarantine",
	"reporting_account_activation",
]) {
	assert.match(
		activation,
		new RegExp(`CREATE OR ALTER VIEW dbo\\.${view}`, "i"),
		`Activation migration is missing ${view}.`,
	);
	assert.match(
		activation,
		new RegExp(
			`GRANT SELECT ON OBJECT::dbo\\.${view} TO novapharm_reporting_reader`,
			"i",
		),
		`Reporting role is missing access to ${view}.`,
	);
}
assert.match(activation, /TR_application_status_history_immutable/i);
assert.match(activation, /CREATE ROLE novapharm_reporting_reader/i);
assert.match(activation, /SYSUTCDATETIME\(\)/i);

const enterprise = sources["004_integrated_enterprise_portal.sql"];
for (const table of [
	"product_families",
	"product_variants",
	"product_media",
	"product_claims",
	"product_composition_items",
	"product_certifications",
	"supplier_contacts",
	"price_lists",
	"inventory_balances",
	"inventory_reservations",
	"shipments",
	"customer_statements",
	"goods_receipts",
	"supplier_invoices",
	"credit_notes",
	"journal_entries",
	"quality_complaints",
	"quality_deviations",
	"change_controls",
	"capa_records",
	"regulatory_cases",
	"crm_opportunities",
	"document_versions",
	"workflow_instances",
	"domain_events",
	"outbox_messages",
	"catalogue_imports",
	"catalogue_import_items",
	"role_permissions",
]) {
	assert.match(
		enterprise,
		new RegExp(`dbo\\.${table}`, "i"),
		`Enterprise migration is missing ${table}.`,
	);
}

const gatewayReplayProtection =
	sources["005_portal_gateway_replay_protection.sql"];
assert.match(gatewayReplayProtection, /dbo\.security_replay_tokens/i);
assert.match(gatewayReplayProtection, /PRIMARY KEY/i);
assert.match(gatewayReplayProtection, /expires_at datetime2/i);
const medicinesIntelligence = sources["006_medicines_intelligence.sql"];
for (const table of [
	"data_source_registry",
	"source_resources",
	"source_schema_versions",
	"ingestion_runs",
	"analytical_dataset_manifests",
	"dim_medicine",
	"medicine_code_history",
	"dim_nhs_organisations",
	"organisation_relationship_history",
	"dim_practices",
	"practice_relationship_history",
	"practice_contact_evidence",
	"dim_postcode",
	"pharmacy_imports",
	"pharmacy_source_rows",
	"pharmacies",
	"pharmacy_identifiers",
	"pharmacy_history",
	"fact_epd_prescribing",
	"fact_pca_community_dispensing",
	"fact_scmd_secondary_care",
	"mart_medicine_month",
	"mart_pharmacy_medicine_opportunity",
	"forecast_models",
	"forecast_runs",
	"forecast_values",
	"forecast_evaluations",
	"opportunity_score_components",
	"intelligence_campaign_targets",
]) {
	assert.match(medicinesIntelligence, new RegExp(`dbo\\.${table}`, "i"), `Medicines intelligence migration is missing ${table}.`);
}
assert.match(medicinesIntelligence, /location geography NULL/i, "Azure parity must retain a native geospatial location type.");
assert.match(medicinesIntelligence, /training_cutoff date NOT NULL/i, "Forecast runs must retain their training cut-off.");
assert.match(medicinesIntelligence, /human_approved_by/i, "Campaign activation must retain explicit human approval evidence.");
const registeredPopulation = sources["007_registered_population_context.sql"];
for (const table of [
	"practice_population_history",
	"population_age_sex_history",
	"practice_monthly_mapping",
]) {
	assert.match(registeredPopulation, new RegExp(`dbo\\.${table}`, "i"), `Registered-population migration is missing ${table}.`);
}
assert.match(registeredPopulation, /source_resource_id/i, "Population evidence must retain its exact source resource.");
assert.match(registeredPopulation, /ingestion_run_id/i, "Population evidence must retain its ingestion run.");
const sourcePeriodGovernance = sources["008_source_period_governance.sql"];
assert.match(sourcePeriodGovernance, /latest_expected_period/i, "Source health must retain the evaluated expected period.");
assert.match(sourcePeriodGovernance, /latest_discovered_period/i, "Source health must retain the last discovered period.");
const authoritativeObservations = sources["009_authoritative_bulk_observations.sql"];
for (const table of ["fact_epd_prescribing_observations", "fact_pca_community_dispensing_observations"]) {
	assert.match(authoritativeObservations, new RegExp(`dbo\\.${table}`, "i"), `Authoritative bulk migration is missing ${table}.`);
}
assert.match(authoritativeObservations, /unidentified = 1 OR practice_id IS NOT NULL/i, "EPD unidentified rows must remain explicit.");
assert.match(authoritativeObservations, /CAST\(NULL AS decimal\(20,4\)\) AS actual_cost/i, "PCA must not fabricate an actual-cost measure.");
assert.match(authoritativeObservations, /CREATE OR ALTER VIEW dbo\.intelligence_epd_facts/i);
assert.match(authoritativeObservations, /CREATE OR ALTER VIEW dbo\.intelligence_pca_facts/i);
const sourceScopedMarts = sources["010_source_scoped_medicine_marts.sql"];
for (const table of [
	"medicine_mart_build_runs",
	"mart_medicine_source_month",
	"mart_medicine_source_geography_month",
	"mart_medicine_source_practice_month",
	"mart_medicine_source_presentation_month",
	"mart_medicine_source_supplier_month",
]) {
	assert.match(sourceScopedMarts, new RegExp(`dbo\\.${table}`, "i"), `Source-scoped mart migration is missing ${table}.`);
}
assert.match(sourceScopedMarts, /dataset_scope = N'epd' OR actual_cost IS NULL/i, "PCA marts must not invent actual-cost evidence.");
for (const view of [
	"intelligence_mart_medicine_source_month",
	"intelligence_mart_medicine_source_geography_month",
	"intelligence_mart_medicine_source_practice_month",
	"intelligence_mart_medicine_source_presentation_month",
	"intelligence_mart_medicine_source_supplier_month",
]) assert.match(sourceScopedMarts, new RegExp(`CREATE OR ALTER VIEW dbo\\.${view}`, "i"), `Source-scoped mart migration is missing ${view}.`);
for (const requiredControl of [
	/REFERENCES\s+dbo\./i,
	/UNIQUE/i,
	/CHECK\s*\(/i,
	/CREATE INDEX/i,
	/version int NOT NULL/i,
]) {
	assert.match(
		enterprise,
		requiredControl,
		`Enterprise migration is missing required control ${requiredControl}.`,
	);
}

console.log(
	`Azure SQL migration structure validated: ${files.length} ordered migrations, enterprise domain tables, activation controls, 9 reporting views and least-privilege reporting grants.`,
);
