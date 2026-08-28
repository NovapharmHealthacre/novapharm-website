import assert from "node:assert/strict";
import { rmSync } from "node:fs";

const databasePath = `/tmp/novapharm-medicines-service-${process.pid}-${Date.now()}.sqlite`;
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_PATH = databasePath;

const database = await import("../src/data/database.mjs");

try {
  const sourceId = "nhsbsa.bnf-current";
  const medicineId = "medicine-0123456789abcdef0123456789abcdef";
  const importedAt = "2026-08-24T04:27:00.000Z";
  await database.run(`INSERT INTO data_source_registry(
    source_id, publisher, dataset_name, dataset_identifier, jurisdiction, coverage, purpose, access_method,
    discovery_endpoint, licence, publication_frequency, typical_reporting_lag, authority_rank, status,
    known_caveats_json, provenance_notes, first_seen_at, last_checked_at, last_successfully_ingested_at, updated_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  sourceId, "NHS Business Services Authority", "BNF Code Information - Current Year", "bnf-current", "United Kingdom",
  "Current identity catalogue", "Medicine identity", "CKAN", "https://opendata.nhsbsa.net/", "Open Government Licence",
  "periodic", "publisher controlled", 1, "available", "[]", "Repository test fixture", importedAt, importedAt, importedAt, importedAt);
  await database.run(`INSERT INTO source_resources(
    id, source_id, external_resource_id, reporting_period, resource_name, resource_url, format,
    resource_fingerprint, schema_fingerprint, datastore_state, first_seen_at, last_seen_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  "resource-bnf", sourceId, "resource-current", "2026-07", "BNF July 2026 Version 90", "https://opendata.nhsbsa.net/", "csv",
  "a".repeat(64), "b".repeat(64), "available", importedAt, importedAt);
  await database.run(`INSERT INTO source_schema_versions(
    id, source_id, variant_name, schema_fingerprint, columns_json, compatibility_status, effective_from, first_seen_at, reviewed_at, reviewed_by
  ) VALUES(?, ?, ?, ?, ?, 'exact', ?, ?, ?, ?)`, "schema-bnf", sourceId, "bnf-current-v90", "b".repeat(64), "[]", "2026-07", importedAt, importedAt, "repository-test");
  await database.run(`INSERT INTO ingestion_runs(
    id, source_id, source_resource_id, run_kind, status, started_at, completed_at, source_cutoff_at,
    input_rows, accepted_rows, rejected_rows, duplicate_rows, initiated_by
  ) VALUES(?, ?, ?, ?, 'succeeded', ?, ?, ?, 1, 1, 0, 0, ?)`,
  "run-bnf", sourceId, "resource-bnf", "bnf_current_snapshot", importedAt, importedAt, "2026-07-01", "repository-test");
  await database.run(`INSERT INTO dim_bnf(bnf_id, bnf_code, bnf_name, bnf_level, parent_bnf_id, valid_from, source_id)
    VALUES(?, ?, ?, ?, NULL, ?, ?)`, "bnf-root", "02", "Cardiovascular system", 2, "2026-07-01", sourceId);
  await database.run(`INSERT INTO dim_bnf(bnf_id, bnf_code, bnf_name, bnf_level, parent_bnf_id, valid_from, source_id)
    VALUES(?, ?, ?, ?, ?, ?, ?)`, "bnf-presentation", "0208020Z0AAACAC", "Apixaban 1mg/ml oral suspension sugar free", 7, "bnf-root", "2026-07-01", sourceId);
  await database.run(`INSERT INTO dim_medicine(
    medicine_id, canonical_name, medicine_level, snomed_code, dm_d_status, supplier_name, valid_from, source_id, source_last_seen_at
  ) VALUES(?, ?, 'BNF_PRESENTATION', ?, 'unverified', ?, ?, ?, ?)`, medicineId, "Apixaban 1mg/ml oral suspension sugar free",
  "123456789", "Evidence Pharma Ltd", "2026-07-01", sourceId, importedAt);
  for (const [id, text, type, normalised] of [
    ["alias-presentation", "Apixaban 1mg/ml oral suspension sugar free", "BNF_PRESENTATION_NAME", "apixaban 1mg ml oral suspension sugar free"],
    ["alias-code", "0208020Z0AAACAC", "BNF_PRESENTATION_CODE", "0208020z0aaacac"],
    ["alias-product", "Apixaban", "BNF_PRODUCT", "apixaban"],
    ["alias-product-code", "0208020Z0AA", "BNF_PRODUCT_CODE", "0208020z0aa"],
    ["alias-substance", "Apixaban", "BNF_CHEMICAL_SUBSTANCE", "apixaban"],
    ["alias-substance-code", "0208020Z0", "BNF_CHEMICAL_SUBSTANCE_CODE", "0208020z0"],
  ]) {
    await database.run(`INSERT INTO medicine_aliases(id, medicine_id, alias_text, alias_type, normalised_alias, source_id, valid_from)
      VALUES(?, ?, ?, ?, ?, ?, ?)`, id, medicineId, text, type, normalised, sourceId, "2026-07-01");
  }
  await database.run(`INSERT INTO medicine_code_history(
    id, medicine_id, code_system, code_value, code_level, valid_from, change_reason, source_id
  ) VALUES(?, ?, 'BNF', ?, 'BNF_PRESENTATION', ?, 'current_source_identity', ?)`,
  "code-history-apixaban", medicineId, "0208020Z0AAACAC", "2026-07-01", sourceId);
  const endedMedicineId = "medicine-fedcba9876543210fedcba9876543210";
  await database.run(`INSERT INTO dim_medicine(
    medicine_id, canonical_name, medicine_level, dm_d_status, valid_from, valid_to, source_id, source_last_seen_at
  ) VALUES(?, ?, 'BNF_PRESENTATION', 'unverified', ?, ?, ?, ?)`, endedMedicineId, "Retired governed presentation", "2025-12-01", "2026-01-31", sourceId, importedAt);
  await database.run(`INSERT INTO medicine_aliases(id, medicine_id, alias_text, alias_type, normalised_alias, source_id, valid_from, valid_to)
    VALUES(?, ?, ?, 'BNF_PRESENTATION_NAME', ?, ?, ?, ?)`, "alias-ended-presentation", endedMedicineId, "Retired governed presentation", "retired governed presentation", sourceId, "2025-12-01", "2026-01-31");
  await database.run(`INSERT INTO pharmacy_imports(
    import_id, source_file_name, source_sha256, source_size_bytes, imported_at, imported_by, source_row_count,
    inserted_count, verified_email_count, country_totals_json, reconciliation_json
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  "pharmacy-import-test", "owner-pharmacy-master.xlsx", "c".repeat(64), 1024, importedAt, "repository-test", 1, 1, 1, '{"England":1}', "{}");
  await database.run(`INSERT INTO pharmacies(
    pharmacy_id, country, trading_name, address, postcode_raw, postcode_normalised, latitude, longitude,
    public_business_email, email_status, marketing_eligible, opt_out, source_first_seen_at, source_last_seen_at, valid_from
  ) VALUES(?, 'England', ?, ?, ?, ?, ?, ?, ?, 'VERIFIED REAL EMAIL', 0, 0, ?, ?, ?)`,
  "pharmacy-test", "Evidence Pharmacy", "1 Evidence Street", "SW1A 2AA", "SW1A 2AA", 51.50354, -0.127695,
  "business@example.invalid", importedAt, importedAt, "2026-01-01");

  const populationSourceId = "nhse.registered-patients";
  await database.run(`INSERT INTO data_source_registry(
    source_id, publisher, dataset_name, dataset_identifier, jurisdiction, coverage, purpose, access_method,
    discovery_endpoint, licence, publication_frequency, typical_reporting_lag, authority_rank, status,
    known_caveats_json, provenance_notes, first_seen_at, last_checked_at, last_successfully_ingested_at,
    latest_expected_period, latest_discovered_period, period_state_evaluated_at, updated_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  populationSourceId, "NHS England", "Patients Registered at a GP Practice", "registered-patients", "England",
  "GP practices", "Aggregate monthly population denominator", "file_download", "https://digital.nhs.uk/", "Open Government Licence",
  "monthly", "publisher controlled", 1, "discovery_implemented", "[]", "Repository test fixture", importedAt,
  importedAt, importedAt, "2026-08", "2026-08", importedAt, importedAt);
  const postcodeSourceId = "ons.postcode-directory";
  await database.run(`INSERT INTO data_source_registry(
    source_id, publisher, dataset_name, dataset_identifier, jurisdiction, coverage, purpose, access_method,
    discovery_endpoint, licence, publication_frequency, typical_reporting_lag, authority_rank, status,
    known_caveats_json, provenance_notes, first_seen_at, last_checked_at, last_successfully_ingested_at, updated_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  postcodeSourceId, "Office for National Statistics", "ONS Postcode Directory", "onspd", "United Kingdom",
  "Postcode centroids", "Geographic lookup", "file_download", "https://geoportal.statistics.gov.uk/", "Open Government Licence",
  "quarterly", "publisher controlled", 1, "repository_validated", "[]", "Repository test fixture", importedAt, importedAt, importedAt, importedAt);
  await database.run(`INSERT INTO dim_postcode(
    postcode_id, postcode_raw, postcode_normalised, postcode_sector, postcode_district, latitude, longitude,
    introduced_at, terminated_at, source_id, source_last_seen_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  "postcode-sw1a2aa", "SW1A 2AA", "SW1A 2AA", "SW1A 2", "SW1A", 51.50354, -0.127695,
  "1980-01-01", postcodeSourceId, importedAt);
  await database.run(`INSERT INTO dim_time(
    month_key, calendar_year, calendar_month, financial_year, financial_quarter, month_start, month_end, is_complete
  ) VALUES('2026-06', 2026, 6, '2026/27', 1, '2026-06-01', '2026-06-30', 1)`);
  await database.run(`INSERT INTO source_resources(
    id, source_id, external_resource_id, reporting_period, resource_name, resource_url, format,
    resource_fingerprint, schema_fingerprint, datastore_state, first_seen_at, last_seen_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  "resource-population", populationSourceId, "population-2026-08", "2026-08", "Registered practice totals",
  "https://files.digital.nhs.uk/test.zip", "zip", "d".repeat(64), "e".repeat(64), "not_applicable", importedAt, importedAt);
  await database.run(`INSERT INTO source_schema_versions(
    id, source_id, variant_name, schema_fingerprint, columns_json, compatibility_status, effective_from, first_seen_at, reviewed_at, reviewed_by
  ) VALUES(?, ?, ?, ?, ?, 'exact', ?, ?, ?, ?)`, "schema-population", populationSourceId, "registered-practice-totals", "e".repeat(64), "[]", "2026-08", importedAt, importedAt, "repository-test");
  await database.run(`INSERT INTO ingestion_runs(
    id, source_id, source_resource_id, run_kind, status, started_at, completed_at, source_cutoff_at,
    input_rows, accepted_rows, rejected_rows, duplicate_rows, initiated_by
  ) VALUES(?, ?, ?, ?, 'succeeded', ?, ?, ?, 3, 3, 0, 0, ?)`,
  "run-population", populationSourceId, "resource-population", "registered_population_monthly_snapshot",
  importedAt, importedAt, "2026-08-01", "repository-test");
  await database.run(`INSERT INTO dim_nhs_organisations(
    organisation_id, organisation_code, organisation_name, organisation_type, status, postcode_id, nation, valid_from, source_id
  ) VALUES(?, ?, ?, 'PRACTICE', 'source_observed', ?, 'England', ?, ?)`,
  "organisation-practice", "A81001", "Evidence Practice", "postcode-sw1a2aa", "2026-08-01", populationSourceId);
  await database.run(`INSERT INTO dim_practices(
    practice_id, organisation_id, practice_code, practice_name, address_json, postcode_id, latitude, longitude,
    status, registered_population, population_period, source_id, valid_from
  ) VALUES(?, ?, ?, ?, '[]', ?, ?, ?, 'source_observed', 1000, '2026-08', ?, '2026-01-01')`,
  "practice-evidence", "organisation-practice", "A81001", "Evidence Practice", "postcode-sw1a2aa", 51.50354, -0.127695, populationSourceId);
  await database.run(`INSERT INTO practice_population_history(
    id, practice_id, practice_code, month_key, extract_date, registered_population, practice_postcode,
    sub_icb_location_code, ons_sub_icb_location_code, source_id, source_resource_id, ingestion_run_id,
    source_row_number, created_at
  ) VALUES(?, ?, ?, '2026-08', '2026-08-01', 1000, 'TS18 1HU', '16C', 'E38000247', ?, ?, ?, 2, ?)`,
  "population-evidence", "practice-evidence", "A81001", populationSourceId, "resource-population", "run-population", importedAt);
  await database.run(`INSERT INTO practice_population_history(
    id, practice_id, practice_code, month_key, extract_date, registered_population, practice_postcode,
    sub_icb_location_code, ons_sub_icb_location_code, source_id, source_resource_id, ingestion_run_id,
    source_row_number, created_at
  ) VALUES(?, ?, ?, '2026-06', '2026-06-01', 1200, 'SW1A 2AA', '16C', 'E38000247', ?, ?, ?, 3, ?)`,
  "population-evidence-2026-06", "practice-evidence", "A81001", populationSourceId, "resource-population", "run-population", importedAt);
  await database.run(`INSERT INTO population_age_sex_history(
    id, practice_id, month_key, extract_date, organisation_type, organisation_code, sex, age_band,
    registered_population, source_id, source_resource_id, ingestion_run_id, source_row_number, created_at
  ) VALUES(?, ?, '2026-08', '2026-08-01', 'GP', 'A81001', 'ALL', 'ALL', 1000, ?, ?, ?, 2, ?)`,
  "population-band-evidence", "practice-evidence", populationSourceId, "resource-population", "run-population", importedAt);
  await database.run(`INSERT INTO practice_monthly_mapping(
    id, practice_id, practice_code, practice_name, practice_postcode, month_key, extract_date,
    ons_sub_icb_location_code, sub_icb_location_code, sub_icb_location_name, ons_icb_code, icb_code, icb_name,
    ons_commissioning_region_code, commissioning_region_code, commissioning_region_name,
    source_id, source_resource_id, ingestion_run_id, source_row_number, created_at
  ) VALUES(?, ?, 'A81001', 'Evidence Practice', 'TS18 1HU', '2026-08', '2026-08-01',
    'E38000247', '16C', 'Evidence sub-ICB', 'E54000050', 'QHM', 'Evidence ICB', 'E40000012', 'Y63',
    'North East and Yorkshire', ?, ?, ?, 2, ?)`,
  "mapping-evidence", "practice-evidence", populationSourceId, "resource-population", "run-population", importedAt);
  await database.run(`INSERT INTO practice_monthly_mapping(
    id, practice_id, practice_code, practice_name, practice_postcode, month_key, extract_date,
    ons_sub_icb_location_code, sub_icb_location_code, sub_icb_location_name, ons_icb_code, icb_code, icb_name,
    ons_commissioning_region_code, commissioning_region_code, commissioning_region_name,
    source_id, source_resource_id, ingestion_run_id, source_row_number, created_at
  ) VALUES(?, ?, 'A81001', 'Evidence Practice', 'SW1A 2AA', '2026-06', '2026-06-01',
    'E38000247', '16C', 'Evidence sub-ICB', 'E54000050', 'QHM', 'Evidence ICB', 'E40000012', 'Y63',
    'North East and Yorkshire', ?, ?, ?, 3, ?)`,
  "mapping-evidence-2026-06", null, populationSourceId, "resource-population", "run-population", importedAt);

  const sampleSourceId = "nhsbsa.epd";
  await database.run(`INSERT INTO data_source_registry(
    source_id, publisher, dataset_name, dataset_identifier, jurisdiction, coverage, purpose, access_method,
    discovery_endpoint, licence, publication_frequency, typical_reporting_lag, authority_rank, status,
    known_caveats_json, provenance_notes, first_seen_at, last_checked_at, updated_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  sampleSourceId, "NHS Business Services Authority", "English Prescribing Dataset", "epd", "England", "England",
  "Practice prescribing facts", "ckan_action_api", "https://opendata.nhsbsa.net/", "Open Government Licence",
  "monthly", "publisher controlled", 1, "discovery_implemented", "[]", "Repository test fixture", importedAt, importedAt, importedAt);
  await database.run(`INSERT INTO source_resources(
    id, source_id, external_resource_id, reporting_period, resource_name, resource_url, format,
    resource_fingerprint, datastore_state, first_seen_at, last_seen_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  "resource-epd-sample", sampleSourceId, "epd-2026-06", "2026-06", "EPD June 2026",
  "https://opendata.nhsbsa.net/epd.csv", "csv", "f".repeat(64), "available", importedAt, importedAt);
  await database.run(`INSERT INTO ingestion_runs(
    id, source_id, source_resource_id, run_kind, status, started_at, completed_at, source_cutoff_at,
    input_rows, accepted_rows, rejected_rows, duplicate_rows, initiated_by
  ) VALUES(?, ?, ?, ?, 'succeeded', ?, ?, ?, 1000, 1000, 0, 0, ?)`,
  "run-epd-sample", sampleSourceId, "resource-epd-sample", "nhsbsa_epd_validation_sample",
  importedAt, importedAt, "2026-06-01", "repository-test");
  await database.run(`INSERT INTO ingestion_runs(
    id, source_id, source_resource_id, run_kind, status, started_at, completed_at, source_cutoff_at,
    input_rows, accepted_rows, rejected_rows, duplicate_rows, initiated_by
  ) VALUES(?, ?, ?, ?, 'succeeded', ?, ?, ?, 1, 1, 0, 0, ?)`,
  "run-epd-full", sampleSourceId, "resource-epd-sample", "nhsbsa_epd_monthly_snapshot",
  importedAt, importedAt, "2026-07-20", "repository-test");
  await database.run(`INSERT INTO fact_epd_prescribing(
    id, month_key, medicine_id, practice_id, items, quantity, nic, actual_cost, ingestion_run_id, source_row_digest
  ) VALUES(?, '2026-06', ?, ?, 12, 24, 36, 30, ?, ?)`,
  "epd-fact-accepted", medicineId, "practice-evidence", "run-epd-full", "accepted-row-digest");
  await database.run(`INSERT INTO fact_epd_prescribing(
    id, month_key, medicine_id, practice_id, items, quantity, nic, actual_cost, ingestion_run_id, source_row_digest
  ) VALUES(?, '2026-06', ?, ?, 999, 999, 999, 999, ?, ?)`,
  "epd-fact-sample", medicineId, "practice-evidence", "run-epd-sample", "sample-row-digest");

  const service = await import("../src/core/medicines-intelligence-service.mjs");
  const context = { accessScopes: ["board"] };
  const envelope = { module: { code: "executive.nhs-data", slug: "medicines-intelligence" }, environment: "test", dataState: "synthetic", dataFreshness: importedAt, readOnly: true, metrics: [], sections: [], notices: [], actions: [] };
  const snapshot = await service.medicinesIntelligenceModuleView(envelope);
  assert.equal(snapshot.dataState, "authoritative_non_production_validation");
  assert.deepEqual(Object.fromEntries(snapshot.metrics.map((entry) => [entry.key, entry.value])), {
    medicines: 1, pharmacies: 1, "population-linked-practices": 1, "governed-sources": 4,
  });
  const geography = snapshot.sections.find((entry) => entry.title === "Pharmacy geography");
  assert.equal(geography.rows[0].verified_business_emails, 1);
  const contactEvidence = snapshot.sections.find((entry) => entry.title === "Pharmacy contact evidence");
  assert.equal(contactEvidence.rows.find((row) => row.evidence_state === "Verified public non-NHS business email").records, 1);
  assert.equal(contactEvidence.rows.find((row) => row.evidence_state === "Marketing eligible").records, 0);
  const population = snapshot.sections.find((entry) => entry.title === "Practice population context");
  assert.deepEqual({ ...population.rows[0] }, { reporting_period: "2026-08", practices: 1, registered_population: 1000, matched_practices: 1, age_sex_rows: 1, mapping_rows: 1 });
  const sourceHealth = snapshot.sections.find((entry) => entry.title === "Data sources and quality");
  assert.equal(sourceHealth.columns.length, 12);
  assert.equal(sourceHealth.rows.find((row) => row.source_id === populationSourceId).latest_ingested_period, "2026-08");
  assert.equal(sourceHealth.rows.find((row) => row.source_id === populationSourceId).data_quality_status, "validated");
  assert.equal(sourceHealth.rows.find((row) => row.source_id === sourceId).schema_status, "exact");
  assert.equal(sourceHealth.rows.find((row) => row.source_id === sampleSourceId).latest_ingested_period, "2026-06");
  assert.equal(sourceHealth.rows.find((row) => row.source_id === sampleSourceId).status, "ingested");
  assert.equal(sourceHealth.rows.find((row) => row.source_id === sampleSourceId).data_quality_status, "validated");
  assert.match(snapshot.notices.join(" "), /not a production deployment claim/iu);

  const search = await service.searchMedicines("Apixaban", context, 10);
  assert.equal(search.results.length, 1);
  assert.equal(search.results[0].medicineId, medicineId);
  assert.equal(search.results[0].chemicalSubstance, "Apixaban");
  assert.equal(search.demandFactsIncluded, false);
  assert.equal(search.dataFreshness, importedAt);
  const containsSearch = await service.searchMedicines("oral suspension", context, 10);
  assert.equal(containsSearch.results[0].medicineId, medicineId);
  const endedSearch = await service.searchMedicines("Retired governed presentation", context, 10);
  assert.equal(endedSearch.results.length, 0);

  const detail = await service.medicineIdentityDetail(medicineId, context);
  assert.equal(detail.hierarchy.length, 2);
  assert.equal(detail.hierarchy[0].name, "Cardiovascular system");
  assert.deepEqual(detail.analyticalAvailability, { epd: true, pca: false, scmd: false, forecast: false });
  assert.match(detail.limitations.join(" "), /does not assert prescribing/iu);

  const analytics = await service.queryMedicineAnalytics({
    dataset: "epd",
    metric: "items",
    medicineId,
    chemicalSubstance: "Apixaban",
    chemicalSubstanceCode: "0208020Z0",
    presentationName: "Apixaban 1mg/ml oral suspension sugar free",
    presentationCode: "0208020Z0AAACAC",
    snomedCode: "123456789",
    bnfChapter: "02",
    supplier: "Evidence Pharma Ltd",
    region: "Y63",
    icb: "QHM",
    practiceCode: "A81001",
    postcode: "sw1a2aa",
    startMonth: "2026-06",
    endMonth: "2026-06",
    page: 1,
    pageSize: 25,
  }, context);
  assert.equal(analytics.dataState, "accepted_facts");
  assert.equal(analytics.rows.length, 1);
  assert.equal(analytics.rows[0].items, 12);
  assert.equal(analytics.rows[0].metric_value, 12);
  assert.equal(analytics.series.length, 1);
  assert.equal(analytics.series[0].metric_value, 12);
  assert.deepEqual(analytics.summary, {
    totalItems: 12,
    totalQuantity: 24,
    totalNic: 36,
    totalActualCost: 30,
    practiceCount: 1,
    geographyCount: 1,
    latestItemsPer1000: 10,
    firstMonth: "2026-06",
    latestMonth: "2026-06",
    sourceCutoffAt: "2026-07-20",
  });
  assert.equal(analytics.breakdowns.geographies[0].name, "Evidence ICB");
  assert.equal(analytics.breakdowns.geographies[0].selected_metric, 12);
  assert.equal(analytics.breakdowns.presentations[0].canonical_name, "Apixaban 1mg/ml oral suspension sugar free");
  assert.equal(analytics.breakdowns.practices[0].practice_name, "Evidence Practice");
  assert.deepEqual(analytics.sourcePeriods, ["2026-06"]);
  assert.deepEqual(analytics.pagination, { page: 1, pageSize: 25, totalRows: 1, totalPages: 1 });
  assert.deepEqual(analytics.reconciliation, { applicable: true, tableTotal: 12, seriesTotal: 12, reconciles: true, seriesTruncated: false });
  assert.equal(JSON.stringify(analytics).includes("999"), false);

  const secondMedicineId = "medicine-11111111111111111111111111111111";
  await database.run(`INSERT INTO dim_medicine(
    medicine_id, canonical_name, medicine_level, snomed_code, dm_d_status, supplier_name, valid_from, source_id, source_last_seen_at
  ) VALUES(?, ?, 'BNF_PRESENTATION', ?, 'unverified', ?, ?, ?, ?)`, secondMedicineId,
  "Apixaban 2.5mg tablets", "987654321", "Evidence Pharma Ltd", "2026-07-01", sourceId, importedAt);
  for (const [id, text, type, normalised] of [
    ["alias-second-presentation", "Apixaban 2.5mg tablets", "BNF_PRESENTATION_NAME", "apixaban 2 5mg tablets"],
    ["alias-second-code", "0208020Z0AAABAB", "BNF_PRESENTATION_CODE", "0208020z0aaabab"],
    ["alias-second-substance", "Apixaban", "BNF_CHEMICAL_SUBSTANCE", "apixaban"],
    ["alias-second-substance-code", "0208020Z0", "BNF_CHEMICAL_SUBSTANCE_CODE", "0208020z0"],
  ]) {
    await database.run(`INSERT INTO medicine_aliases(id, medicine_id, alias_text, alias_type, normalised_alias, source_id, valid_from)
      VALUES(?, ?, ?, ?, ?, ?, ?)`, id, secondMedicineId, text, type, normalised, sourceId, "2026-07-01");
  }
  await database.run("UPDATE ingestion_runs SET input_rows = 2, accepted_rows = 2 WHERE id = 'run-epd-full'");
  await database.run(`INSERT INTO fact_epd_prescribing(
    id, month_key, medicine_id, practice_id, items, quantity, nic, actual_cost, ingestion_run_id, source_row_digest
  ) VALUES(?, '2026-06', ?, ?, 18, 36, 54, 45, ?, ?)`,
  "epd-fact-second-presentation", secondMedicineId, "practice-evidence", "run-epd-full", "second-presentation-row-digest");

  const chemicalAnalytics = await service.queryMedicineAnalytics({
    dataset: "epd", metric: "items", chemicalSubstanceCode: "0208020Z0",
    startMonth: "2026-06", endMonth: "2026-06", page: 1, pageSize: 25,
  }, context);
  assert.equal(chemicalAnalytics.summary.totalItems, 30);
  assert.equal(chemicalAnalytics.summary.totalQuantity, 60);
  assert.equal(chemicalAnalytics.summary.latestItemsPer1000, 25, "A practice population must be counted once across multiple presentations.");
  assert.equal(chemicalAnalytics.series[0].metric_value, 30);
  assert.equal(chemicalAnalytics.breakdowns.presentations.length, 2);
  assert.deepEqual(chemicalAnalytics.reconciliation, { applicable: true, tableTotal: 30, seriesTotal: 30, reconciles: true, seriesTruncated: false });

  const chemicalRateAnalytics = await service.queryMedicineAnalytics({
    dataset: "epd", metric: "items_per_1000", chemicalSubstanceCode: "0208020Z0",
    startMonth: "2026-06", endMonth: "2026-06", page: 1, pageSize: 25,
  }, context);
  assert.equal(chemicalRateAnalytics.summary.latestItemsPer1000, 25);
  assert.equal(chemicalRateAnalytics.series[0].metric_value, 25);
  assert.equal(chemicalRateAnalytics.breakdowns.geographies[0].selected_metric, 25);
  assert.equal(chemicalRateAnalytics.breakdowns.practices[0].selected_metric, 25);
  assert.deepEqual(chemicalRateAnalytics.breakdowns.presentations.map((row) => row.selected_metric), [15, 10]);
  assert.deepEqual(chemicalRateAnalytics.reconciliation, { applicable: false, tableTotal: null, seriesTotal: null, reconciles: null, seriesTruncated: false });

  const noMatch = await service.queryMedicineAnalytics({ dataset: "epd", metric: "items", chemicalSubstance: "Rivaroxaban" }, context);
  assert.equal(noMatch.dataState, "no_matching_facts");
  assert.deepEqual(noMatch.rows, []);
  assert.deepEqual(noMatch.series, []);
  assert.deepEqual(noMatch.breakdowns, { geographies: [], presentations: [], practices: [] });
  assert.equal(noMatch.summary.totalItems, null);
  await assert.rejects(() => service.queryMedicineAnalytics({ dataset: "pca", medicineId, practiceCode: "A81001" }, context), (error) => error.statusCode === 400);

  const nearby = await service.nearbyHealthcareOrganisations({ postcode: "SW1A2AA", radiusKm: 1, period: "2026-06", limit: 25 }, context);
  assert.equal(nearby.origin.postcode, "SW1A 2AA");
  assert.equal(nearby.pharmacies.length, 1);
  assert.equal(nearby.practices.length, 1);
  assert.equal(nearby.pharmacies[0].verified_business_email, 1);
  assert.equal(Object.hasOwn(nearby.pharmacies[0], "public_business_email"), false);
  assert.equal(nearby.pharmacies[0].distance_km, 0);
  assert.equal(nearby.practices[0].distance_km, 0);
  const beforeOrganisationValidity = await service.nearbyHealthcareOrganisations({ postcode: "SW1A 2AA", radiusKm: 1, period: "2025-12", limit: 25 }, context);
  assert.equal(beforeOrganisationValidity.pharmacies.length, 0);
  assert.equal(beforeOrganisationValidity.practices.length, 0);
  await assert.rejects(() => service.nearbyHealthcareOrganisations({ postcode: "SW1A 2AA", radiusKm: 2 }, context), (error) => error.statusCode === 400);

  await assert.rejects(() => service.searchMedicines("Apixaban", { accessScopes: ["customer"] }, 10), (error) => error.statusCode === 403);
  await assert.rejects(() => service.queryMedicineAnalytics({ dataset: "epd", medicineId }, { accessScopes: ["customer"] }), (error) => error.statusCode === 403);
  await assert.rejects(() => service.nearbyHealthcareOrganisations({ postcode: "SW1A 2AA" }, { accessScopes: ["customer"] }), (error) => error.statusCode === 403);
  await assert.rejects(() => service.searchMedicines("%", context, 10), (error) => error.statusCode === 400);
  await assert.rejects(() => service.medicineIdentityDetail("medicine-invalid", context), (error) => error.statusCode === 400);

  console.log(JSON.stringify({
    medicines: 1,
    pharmacies: 1,
    sourceVerifiedBusinessEmails: 1,
    searchAndHierarchy: "passed",
    acceptedAnalyticsRows: analytics.rows.length,
    chemicalSubstancePresentations: chemicalAnalytics.breakdowns.presentations.length,
    deduplicatedPopulationRate: chemicalRateAnalytics.series[0].metric_value,
    validationSampleExcluded: true,
    nearbyOrganisations: nearby.pharmacies.length + nearby.practices.length,
    customerDenied: true,
  }, null, 2));
} finally {
  await database.closeDatabase();
  rmSync(databasePath, { force: true });
}
