CREATE TABLE IF NOT EXISTS data_source_registry (
  source_id TEXT PRIMARY KEY,
  publisher TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  dataset_identifier TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  coverage TEXT NOT NULL,
  purpose TEXT NOT NULL,
  access_method TEXT NOT NULL,
  discovery_endpoint TEXT NOT NULL,
  licence TEXT NOT NULL,
  publication_frequency TEXT NOT NULL,
  typical_reporting_lag TEXT NOT NULL,
  authority_rank INTEGER NOT NULL CHECK(authority_rank BETWEEN 1 AND 3),
  status TEXT NOT NULL,
  known_caveats_json TEXT NOT NULL DEFAULT '[]',
  provenance_notes TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_checked_at TEXT,
  last_successfully_ingested_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_resources (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  external_resource_id TEXT NOT NULL,
  reporting_period TEXT,
  resource_name TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  format TEXT NOT NULL,
  byte_size INTEGER CHECK(byte_size IS NULL OR byte_size >= 0),
  resource_hash TEXT,
  resource_fingerprint TEXT NOT NULL,
  schema_fingerprint TEXT,
  datastore_state TEXT NOT NULL DEFAULT 'not_advertised',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revised_at TEXT,
  supersedes_resource_id TEXT REFERENCES source_resources(id),
  UNIQUE(source_id, external_resource_id, resource_fingerprint)
);

CREATE TABLE IF NOT EXISTS source_schema_versions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  variant_name TEXT NOT NULL,
  schema_fingerprint TEXT NOT NULL,
  columns_json TEXT NOT NULL,
  compatibility_status TEXT NOT NULL CHECK(compatibility_status IN ('exact', 'compatible', 'schema_review_required')),
  effective_from TEXT,
  effective_to TEXT,
  first_seen_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  UNIQUE(source_id, schema_fingerprint)
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  source_resource_id TEXT REFERENCES source_resources(id),
  run_kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('discovered', 'running', 'succeeded', 'partial', 'failed', 'blocked')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  source_cutoff_at TEXT,
  input_rows INTEGER CHECK(input_rows IS NULL OR input_rows >= 0),
  accepted_rows INTEGER CHECK(accepted_rows IS NULL OR accepted_rows >= 0),
  rejected_rows INTEGER CHECK(rejected_rows IS NULL OR rejected_rows >= 0),
  duplicate_rows INTEGER CHECK(duplicate_rows IS NULL OR duplicate_rows >= 0),
  checkpoint_json TEXT,
  result_json TEXT,
  exact_source_sha TEXT,
  initiated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingestion_errors (
  id TEXT PRIMARY KEY,
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  source_row_reference TEXT,
  error_code TEXT NOT NULL,
  safe_message TEXT NOT NULL,
  field_name TEXT,
  source_value_digest TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytical_dataset_manifests (
  id TEXT PRIMARY KEY,
  dataset_name TEXT NOT NULL,
  storage_zone TEXT NOT NULL CHECK(storage_zone IN ('raw_immutable', 'curated', 'mart')),
  source_id TEXT REFERENCES data_source_registry(source_id),
  reporting_period TEXT,
  partition_key TEXT NOT NULL,
  storage_uri TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('csv', 'zip', 'xlsx', 'parquet', 'jsonl')),
  content_sha256 TEXT NOT NULL,
  row_count INTEGER CHECK(row_count IS NULL OR row_count >= 0),
  byte_size INTEGER CHECK(byte_size IS NULL OR byte_size >= 0),
  schema_fingerprint TEXT,
  ingestion_run_id TEXT REFERENCES ingestion_runs(id),
  immutability_status TEXT NOT NULL DEFAULT 'immutable',
  created_at TEXT NOT NULL,
  UNIQUE(dataset_name, storage_zone, partition_key, content_sha256)
);

CREATE TABLE IF NOT EXISTS dim_time (
  month_key TEXT PRIMARY KEY,
  calendar_year INTEGER NOT NULL,
  calendar_month INTEGER NOT NULL CHECK(calendar_month BETWEEN 1 AND 12),
  financial_year TEXT NOT NULL,
  financial_quarter INTEGER NOT NULL CHECK(financial_quarter BETWEEN 1 AND 4),
  month_start TEXT NOT NULL,
  month_end TEXT NOT NULL,
  is_complete INTEGER NOT NULL DEFAULT 0 CHECK(is_complete IN (0, 1))
);

CREATE TABLE IF NOT EXISTS dim_medicine (
  medicine_id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  medicine_level TEXT NOT NULL CHECK(medicine_level IN ('VTM', 'VMP', 'AMP', 'VMPP', 'AMPP', 'BNF_PRESENTATION', 'UNRESOLVED')),
  snomed_code TEXT,
  dm_d_status TEXT NOT NULL DEFAULT 'unverified',
  supplier_name TEXT,
  formulation TEXT,
  route TEXT,
  strength TEXT,
  unit_of_measure TEXT,
  valid_from TEXT,
  valid_to TEXT,
  source_id TEXT REFERENCES data_source_registry(source_id),
  source_last_seen_at TEXT,
  UNIQUE(medicine_level, snomed_code)
);

CREATE TABLE IF NOT EXISTS medicine_aliases (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL,
  alias_type TEXT NOT NULL,
  normalised_alias TEXT NOT NULL,
  source_id TEXT REFERENCES data_source_registry(source_id),
  valid_from TEXT,
  valid_to TEXT,
  UNIQUE(medicine_id, alias_type, normalised_alias, valid_from)
);

CREATE TABLE IF NOT EXISTS medicine_code_history (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id) ON DELETE CASCADE,
  code_system TEXT NOT NULL,
  code_value TEXT NOT NULL,
  code_level TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  change_reason TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  UNIQUE(code_system, code_value, valid_from)
);

CREATE TABLE IF NOT EXISTS dim_bnf (
  bnf_id TEXT PRIMARY KEY,
  bnf_code TEXT NOT NULL,
  bnf_name TEXT NOT NULL,
  bnf_level INTEGER NOT NULL CHECK(bnf_level BETWEEN 1 AND 15),
  parent_bnf_id TEXT REFERENCES dim_bnf(bnf_id),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  UNIQUE(bnf_code, valid_from)
);

CREATE TABLE IF NOT EXISTS bnf_hierarchy_history (
  id TEXT PRIMARY KEY,
  child_bnf_id TEXT NOT NULL REFERENCES dim_bnf(bnf_id),
  parent_bnf_id TEXT REFERENCES dim_bnf(bnf_id),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  UNIQUE(child_bnf_id, valid_from)
);

CREATE TABLE IF NOT EXISTS dim_geography (
  geography_id TEXT PRIMARY KEY,
  geography_type TEXT NOT NULL,
  geography_code TEXT NOT NULL,
  geography_name TEXT NOT NULL,
  name_status TEXT NOT NULL DEFAULT 'authoritative_name',
  nation TEXT NOT NULL,
  parent_geography_id TEXT REFERENCES dim_geography(geography_id),
  valid_from TEXT,
  valid_to TEXT,
  source_id TEXT REFERENCES data_source_registry(source_id),
  UNIQUE(geography_type, geography_code, valid_from)
);

CREATE TABLE IF NOT EXISTS dim_postcode (
  postcode_id TEXT PRIMARY KEY,
  postcode_raw TEXT NOT NULL,
  postcode_normalised TEXT NOT NULL,
  postcode_sector TEXT NOT NULL,
  postcode_district TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  introduced_at TEXT,
  terminated_at TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  source_last_seen_at TEXT NOT NULL,
  UNIQUE(postcode_normalised, introduced_at)
);

CREATE TABLE IF NOT EXISTS postcode_geography_history (
  id TEXT PRIMARY KEY,
  postcode_id TEXT NOT NULL REFERENCES dim_postcode(postcode_id),
  geography_id TEXT NOT NULL REFERENCES dim_geography(geography_id),
  geography_type TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  UNIQUE(postcode_id, geography_type, valid_from)
);

CREATE TABLE IF NOT EXISTS dim_nhs_organisations (
  organisation_id TEXT PRIMARY KEY,
  organisation_code TEXT NOT NULL,
  organisation_name TEXT NOT NULL,
  organisation_type TEXT NOT NULL,
  status TEXT NOT NULL,
  postcode_id TEXT REFERENCES dim_postcode(postcode_id),
  nation TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  UNIQUE(organisation_code, valid_from)
);

CREATE TABLE IF NOT EXISTS organisation_relationship_history (
  id TEXT PRIMARY KEY,
  child_organisation_id TEXT NOT NULL REFERENCES dim_nhs_organisations(organisation_id),
  parent_organisation_id TEXT NOT NULL REFERENCES dim_nhs_organisations(organisation_id),
  relationship_type TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  UNIQUE(child_organisation_id, parent_organisation_id, relationship_type, valid_from)
);

CREATE TABLE IF NOT EXISTS dim_practices (
  practice_id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL REFERENCES dim_nhs_organisations(organisation_id),
  practice_code TEXT NOT NULL,
  practice_name TEXT NOT NULL,
  practice_type TEXT,
  address_json TEXT NOT NULL DEFAULT '[]',
  postcode_id TEXT REFERENCES dim_postcode(postcode_id),
  latitude REAL CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude REAL CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL,
  open_date TEXT,
  close_date TEXT,
  registered_population INTEGER CHECK(registered_population IS NULL OR registered_population >= 0),
  population_period TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  valid_from TEXT,
  valid_to TEXT,
  UNIQUE(practice_code, valid_from)
);

CREATE TABLE IF NOT EXISTS practice_relationship_history (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES dim_practices(practice_id),
  organisation_id TEXT NOT NULL REFERENCES dim_nhs_organisations(organisation_id),
  relationship_type TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  UNIQUE(practice_id, organisation_id, relationship_type, valid_from)
);

CREATE TABLE IF NOT EXISTS practice_contact_evidence (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES dim_practices(practice_id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK(contact_type IN ('public_business_email', 'nhs_shared_email', 'telephone', 'website')),
  contact_value TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  source_url TEXT,
  observed_at TEXT NOT NULL,
  checked_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('verified', 'candidate', 'rejected', 'withdrawn', 'unknown')),
  confidence TEXT,
  reviewer TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(practice_id, contact_type, contact_value, source_id, observed_at)
);

CREATE TABLE IF NOT EXISTS pharmacy_imports (
  import_id TEXT PRIMARY KEY,
  source_file_name TEXT NOT NULL,
  source_sha256 TEXT NOT NULL UNIQUE,
  source_size_bytes INTEGER NOT NULL CHECK(source_size_bytes > 0),
  source_modified_at TEXT,
  imported_at TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  source_row_count INTEGER NOT NULL CHECK(source_row_count >= 0),
  inserted_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  duplicate_candidate_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  invalid_identifier_count INTEGER NOT NULL DEFAULT 0,
  invalid_postcode_count INTEGER NOT NULL DEFAULT 0,
  verified_email_count INTEGER NOT NULL DEFAULT 0,
  blank_actioned_email_count INTEGER NOT NULL DEFAULT 0,
  country_totals_json TEXT NOT NULL DEFAULT '{}',
  reconciliation_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS pharmacy_source_rows (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES pharmacy_imports(import_id) ON DELETE CASCADE,
  source_sheet TEXT NOT NULL,
  source_row_number INTEGER NOT NULL CHECK(source_row_number > 0),
  master_row INTEGER,
  country TEXT,
  pharmacy_name TEXT,
  legal_entity TEXT,
  ods_or_regulator_code TEXT,
  gphc_or_psni_registration TEXT,
  postcode TEXT,
  phone TEXT,
  public_business_email TEXT,
  website TEXT,
  email_type TEXT,
  email_confidence TEXT,
  source_email TEXT,
  full_address TEXT,
  address_source TEXT,
  address_checked_date TEXT,
  email_checked_date TEXT,
  email_status TEXT,
  email_research_note TEXT,
  research_pass TEXT,
  source_row_json TEXT NOT NULL,
  source_row_hash TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  UNIQUE(import_id, source_sheet, source_row_number)
);

CREATE TABLE IF NOT EXISTS pharmacies (
  pharmacy_id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  trading_name TEXT NOT NULL,
  legal_entity TEXT,
  parent_organisation TEXT,
  group_name TEXT,
  address TEXT NOT NULL,
  postcode_raw TEXT NOT NULL,
  postcode_normalised TEXT NOT NULL,
  postcode_id TEXT REFERENCES dim_postcode(postcode_id),
  latitude REAL,
  longitude REAL,
  geography_id TEXT REFERENCES dim_geography(geography_id),
  telephone TEXT,
  website TEXT,
  public_business_email TEXT,
  email_type TEXT,
  email_confidence TEXT,
  email_status TEXT NOT NULL DEFAULT 'unknown',
  email_source TEXT,
  email_source_url TEXT,
  email_verified_at TEXT,
  customer_status TEXT NOT NULL DEFAULT 'not_linked',
  customer_id TEXT REFERENCES customers(id),
  sales_territory TEXT,
  account_owner TEXT,
  last_contacted_at TEXT,
  last_order_at TEXT,
  marketing_classification TEXT NOT NULL DEFAULT 'unclassified',
  marketing_eligible INTEGER NOT NULL DEFAULT 0 CHECK(marketing_eligible IN (0, 1)),
  opt_out INTEGER NOT NULL DEFAULT 0 CHECK(opt_out IN (0, 1)),
  suppressed_at TEXT,
  suppression_reason TEXT,
  source_first_seen_at TEXT NOT NULL,
  source_last_seen_at TEXT NOT NULL,
  opened_at TEXT,
  closed_at TEXT,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1)
);

CREATE TABLE IF NOT EXISTS pharmacy_identifiers (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  nation TEXT NOT NULL,
  authority TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_import_id TEXT REFERENCES pharmacy_imports(import_id),
  verification_status TEXT NOT NULL DEFAULT 'source_supplied',
  UNIQUE(identifier_type, identifier_value, valid_from)
);

CREATE TABLE IF NOT EXISTS pharmacy_history (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  changed_fields_json TEXT NOT NULL,
  previous_values_json TEXT NOT NULL,
  new_values_json TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_import_id TEXT REFERENCES pharmacy_imports(import_id),
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pharmacy_contact_evidence (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK(contact_type IN ('public_business_email', 'nhs_shared_email', 'telephone', 'website')),
  contact_value TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  evidence_excerpt TEXT,
  evidence_sha256 TEXT,
  checked_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('verified', 'candidate', 'rejected', 'withdrawn', 'unknown')),
  confidence TEXT,
  reviewer TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(pharmacy_id, contact_type, contact_value, source_type, source_url)
);

CREATE TABLE IF NOT EXISTS pharmacy_enrichment_queue (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL CHECK(status IN ('open', 'in_review', 'resolved', 'blocked', 'no_new_evidence')),
  last_evidence_cutoff_at TEXT,
  next_review_at TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(pharmacy_id, reason, status)
);

CREATE TABLE IF NOT EXISTS fact_epd_prescribing (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  practice_id TEXT NOT NULL REFERENCES dim_practices(practice_id),
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  actual_cost REAL NOT NULL CHECK(actual_cost >= 0),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  source_row_digest TEXT NOT NULL,
  UNIQUE(month_key, medicine_id, practice_id, source_row_digest)
);

CREATE TABLE IF NOT EXISTS fact_pca_community_dispensing (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  geography_id TEXT REFERENCES dim_geography(geography_id),
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  actual_cost REAL NOT NULL CHECK(actual_cost >= 0),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  UNIQUE(month_key, medicine_id, geography_id, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS fact_scmd_secondary_care (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  organisation_id TEXT NOT NULL REFERENCES dim_nhs_organisations(organisation_id),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  unit_of_measure TEXT NOT NULL,
  indicative_cost REAL NOT NULL CHECK(indicative_cost >= 0),
  finalisation_state TEXT NOT NULL CHECK(finalisation_state IN ('provisional', 'final')),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  UNIQUE(month_key, medicine_id, organisation_id, unit_of_measure, finalisation_state, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS fact_hospital_community_dispensing (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  organisation_id TEXT NOT NULL REFERENCES dim_nhs_organisations(organisation_id),
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  actual_cost REAL NOT NULL CHECK(actual_cost >= 0),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  UNIQUE(month_key, medicine_id, organisation_id, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS fact_practice_dispensing_flow (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  practice_id TEXT REFERENCES dim_practices(practice_id),
  pharmacy_id TEXT REFERENCES pharmacies(pharmacy_id),
  items REAL NOT NULL CHECK(items >= 0),
  evidence_scope TEXT NOT NULL,
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  UNIQUE(month_key, practice_id, pharmacy_id, evidence_scope, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS fact_pharmacy_activity (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id),
  activity_type TEXT NOT NULL,
  activity_value REAL NOT NULL CHECK(activity_value >= 0),
  source_scope TEXT NOT NULL,
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  UNIQUE(month_key, pharmacy_id, activity_type, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS fact_special_dispenser_drug_release (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  dispenser_code TEXT NOT NULL,
  items REAL CHECK(items IS NULL OR items >= 0),
  quantity REAL CHECK(quantity IS NULL OR quantity >= 0),
  evidence_scope TEXT NOT NULL,
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  UNIQUE(month_key, medicine_id, dispenser_code, evidence_scope, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS mart_medicine_month (
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  items REAL NOT NULL,
  quantity REAL NOT NULL,
  nic REAL NOT NULL,
  actual_cost REAL NOT NULL,
  source_cutoff_at TEXT NOT NULL,
  lineage_json TEXT NOT NULL,
  PRIMARY KEY(month_key, medicine_id)
);

CREATE TABLE IF NOT EXISTS mart_medicine_geography_month (
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  geography_id TEXT NOT NULL REFERENCES dim_geography(geography_id),
  items REAL NOT NULL,
  quantity REAL NOT NULL,
  registered_population INTEGER,
  items_per_1000 REAL,
  source_cutoff_at TEXT NOT NULL,
  lineage_json TEXT NOT NULL,
  PRIMARY KEY(month_key, medicine_id, geography_id)
);

CREATE TABLE IF NOT EXISTS mart_medicine_practice_month (
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  practice_id TEXT NOT NULL REFERENCES dim_practices(practice_id),
  items REAL NOT NULL,
  quantity REAL NOT NULL,
  items_per_1000 REAL,
  source_cutoff_at TEXT NOT NULL,
  lineage_json TEXT NOT NULL,
  PRIMARY KEY(month_key, medicine_id, practice_id)
);

CREATE TABLE IF NOT EXISTS mart_medicine_presentation_month (
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  presentation_key TEXT NOT NULL,
  items REAL NOT NULL,
  quantity REAL NOT NULL,
  source_cutoff_at TEXT NOT NULL,
  lineage_json TEXT NOT NULL,
  PRIMARY KEY(month_key, medicine_id, presentation_key)
);

CREATE TABLE IF NOT EXISTS mart_medicine_supplier_month (
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  supplier_name TEXT NOT NULL,
  items REAL NOT NULL,
  quantity REAL NOT NULL,
  source_cutoff_at TEXT NOT NULL,
  lineage_json TEXT NOT NULL,
  PRIMARY KEY(month_key, medicine_id, supplier_name)
);

CREATE TABLE IF NOT EXISTS mart_pharmacy_month (
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id),
  total_items REAL,
  service_activity_json TEXT NOT NULL DEFAULT '{}',
  source_scope TEXT NOT NULL,
  source_cutoff_at TEXT NOT NULL,
  lineage_json TEXT NOT NULL,
  PRIMARY KEY(month_key, pharmacy_id)
);

CREATE TABLE IF NOT EXISTS forecast_models (
  model_id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  forecast_type TEXT NOT NULL CHECK(forecast_type IN ('nhs_demand', 'novapharm_sales')),
  algorithm TEXT NOT NULL,
  parameters_json TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  code_sha TEXT NOT NULL,
  approved_status TEXT NOT NULL DEFAULT 'validation',
  created_at TEXT NOT NULL,
  UNIQUE(model_name, model_version, forecast_type)
);

CREATE TABLE IF NOT EXISTS forecast_runs (
  run_id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES forecast_models(model_id),
  training_cutoff TEXT NOT NULL,
  feature_cutoff TEXT NOT NULL,
  source_cutoff_at TEXT NOT NULL,
  horizon_months INTEGER NOT NULL CHECK(horizon_months IN (3, 6, 12, 24)),
  status TEXT NOT NULL CHECK(status IN ('running', 'succeeded', 'failed', 'blocked')),
  assumptions_json TEXT NOT NULL,
  input_manifest_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  initiated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forecast_values (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES forecast_runs(run_id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  target_month TEXT NOT NULL,
  horizon INTEGER NOT NULL CHECK(horizon > 0),
  forecast_value REAL NOT NULL,
  lower_value REAL NOT NULL,
  upper_value REAL NOT NULL,
  interval_level REAL NOT NULL CHECK(interval_level > 0 AND interval_level < 1),
  UNIQUE(run_id, entity_type, entity_id, target_month)
);

CREATE TABLE IF NOT EXISTS forecast_evaluations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES forecast_runs(run_id) ON DELETE CASCADE,
  evaluation_cutoff TEXT NOT NULL,
  horizon INTEGER NOT NULL CHECK(horizon > 0),
  observations INTEGER NOT NULL CHECK(observations >= 0),
  mae REAL NOT NULL CHECK(mae >= 0),
  wape REAL NOT NULL CHECK(wape >= 0),
  smape REAL NOT NULL CHECK(smape >= 0),
  bias REAL NOT NULL,
  interval_coverage REAL NOT NULL CHECK(interval_coverage >= 0 AND interval_coverage <= 1),
  UNIQUE(run_id, evaluation_cutoff, horizon)
);

CREATE TABLE IF NOT EXISTS forecast_feature_snapshots (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES forecast_runs(run_id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_value REAL,
  feature_value_text TEXT,
  available_at TEXT NOT NULL,
  source_lineage_json TEXT NOT NULL,
  UNIQUE(run_id, entity_type, entity_id, feature_name)
);

CREATE TABLE IF NOT EXISTS opportunity_model_versions (
  model_id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  weights_json TEXT NOT NULL,
  eligibility_rules_json TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'validation',
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(model_name, model_version)
);

CREATE TABLE IF NOT EXISTS mart_pharmacy_medicine_opportunity (
  opportunity_id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  model_id TEXT NOT NULL REFERENCES opportunity_model_versions(model_id),
  as_of_month TEXT NOT NULL,
  score REAL NOT NULL CHECK(score >= 0 AND score <= 100),
  rank INTEGER,
  confidence TEXT NOT NULL,
  evidence_scope TEXT NOT NULL,
  nearby_practice_count INTEGER,
  local_items REAL,
  forecast_growth_3m REAL,
  forecast_growth_12m REAL,
  interval_width REAL,
  blockers_json TEXT NOT NULL DEFAULT '[]',
  caveats_json TEXT NOT NULL DEFAULT '[]',
  source_cutoff_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(pharmacy_id, medicine_id, model_id, as_of_month)
);

CREATE TABLE IF NOT EXISTS opportunity_score_components (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES mart_pharmacy_medicine_opportunity(opportunity_id) ON DELETE CASCADE,
  component_key TEXT NOT NULL,
  raw_value REAL,
  normalised_value REAL,
  weight REAL NOT NULL,
  contribution REAL,
  evidence_reference TEXT NOT NULL,
  caveat TEXT,
  UNIQUE(opportunity_id, component_key)
);

CREATE TABLE IF NOT EXISTS intelligence_campaigns (
  campaign_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'in_review', 'approved', 'active', 'paused', 'completed', 'cancelled')),
  selection_snapshot_json TEXT NOT NULL,
  content_version TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intelligence_campaign_targets (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES intelligence_campaigns(campaign_id) ON DELETE CASCADE,
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(pharmacy_id),
  opportunity_id TEXT REFERENCES mart_pharmacy_medicine_opportunity(opportunity_id),
  eligibility_status TEXT NOT NULL CHECK(eligibility_status IN ('eligible', 'suppressed', 'review_required', 'excluded')),
  eligibility_reason TEXT NOT NULL,
  contact_evidence_id TEXT REFERENCES pharmacy_contact_evidence(id),
  human_approved_by TEXT,
  human_approved_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'not_scheduled',
  created_at TEXT NOT NULL,
  UNIQUE(campaign_id, pharmacy_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_source_resources_period ON source_resources(source_id, reporting_period);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source_status ON ingestion_runs(source_id, status, started_at);
CREATE INDEX IF NOT EXISTS idx_medicine_alias_search ON medicine_aliases(normalised_alias);
CREATE INDEX IF NOT EXISTS idx_medicine_code_history_lookup ON medicine_code_history(code_system, code_value, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_postcode_normalised ON dim_postcode(postcode_normalised, terminated_at);
CREATE INDEX IF NOT EXISTS idx_nhs_org_code ON dim_nhs_organisations(organisation_code, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_practice_code ON dim_practices(practice_code, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_practice_contact_status ON practice_contact_evidence(contact_type, status, checked_at);
CREATE INDEX IF NOT EXISTS idx_pharmacy_source_master ON pharmacy_source_rows(master_row, import_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_source_hash ON pharmacy_source_rows(import_id, source_sheet, source_row_hash);
CREATE INDEX IF NOT EXISTS idx_pharmacy_postcode ON pharmacies(postcode_normalised, status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_coordinates ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pharmacy_identifier_lookup ON pharmacy_identifiers(identifier_type, identifier_value, valid_to);
CREATE INDEX IF NOT EXISTS idx_pharmacy_email_status ON pharmacies(email_status, country);
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status ON pharmacy_enrichment_queue(status, priority, next_review_at);
CREATE INDEX IF NOT EXISTS idx_fact_epd_medicine_month ON fact_epd_prescribing(medicine_id, month_key);
CREATE INDEX IF NOT EXISTS idx_mart_geography_medicine ON mart_medicine_geography_month(medicine_id, geography_id, month_key);
CREATE INDEX IF NOT EXISTS idx_forecast_entity ON forecast_values(entity_type, entity_id, target_month);
CREATE INDEX IF NOT EXISTS idx_opportunity_rank ON mart_pharmacy_medicine_opportunity(as_of_month, rank, score);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_status ON intelligence_campaign_targets(campaign_id, eligibility_status, delivery_status);
