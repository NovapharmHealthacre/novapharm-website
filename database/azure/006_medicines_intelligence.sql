IF OBJECT_ID(N'dbo.data_source_registry', N'U') IS NULL
CREATE TABLE dbo.data_source_registry (
  source_id nvarchar(160) NOT NULL PRIMARY KEY,
  publisher nvarchar(300) NOT NULL, dataset_name nvarchar(400) NOT NULL, dataset_identifier nvarchar(300) NOT NULL,
  jurisdiction nvarchar(80) NOT NULL, coverage nvarchar(1200) NOT NULL, purpose nvarchar(1200) NOT NULL,
  access_method nvarchar(80) NOT NULL, discovery_endpoint nvarchar(1200) NOT NULL, licence nvarchar(600) NOT NULL,
  publication_frequency nvarchar(160) NOT NULL, typical_reporting_lag nvarchar(300) NOT NULL,
  authority_rank int NOT NULL, status nvarchar(80) NOT NULL,
  known_caveats_json nvarchar(max) NOT NULL CONSTRAINT DF_data_source_registry_caveats DEFAULT N'[]',
  provenance_notes nvarchar(max) NOT NULL, first_seen_at datetime2(3) NOT NULL, last_checked_at datetime2(3) NULL,
  last_successfully_ingested_at datetime2(3) NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_data_source_registry_rank CHECK(authority_rank BETWEEN 1 AND 3)
);
GO

IF OBJECT_ID(N'dbo.source_resources', N'U') IS NULL
CREATE TABLE dbo.source_resources (
  id nvarchar(64) NOT NULL PRIMARY KEY, source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  external_resource_id nvarchar(200) NOT NULL, reporting_period nvarchar(32) NULL, resource_name nvarchar(600) NOT NULL,
  resource_url nvarchar(1600) NOT NULL, format nvarchar(40) NOT NULL, byte_size bigint NULL, resource_hash nvarchar(160) NULL,
  resource_fingerprint char(64) NOT NULL, schema_fingerprint char(64) NULL,
  datastore_state nvarchar(80) NOT NULL CONSTRAINT DF_source_resources_datastore DEFAULT N'not_advertised',
  first_seen_at datetime2(3) NOT NULL, last_seen_at datetime2(3) NOT NULL, revised_at datetime2(3) NULL,
  supersedes_resource_id nvarchar(64) NULL REFERENCES dbo.source_resources(id),
  CONSTRAINT CK_source_resources_size CHECK(byte_size IS NULL OR byte_size >= 0),
  CONSTRAINT UQ_source_resources_revision UNIQUE(source_id, external_resource_id, resource_fingerprint)
);
GO

IF OBJECT_ID(N'dbo.source_schema_versions', N'U') IS NULL
CREATE TABLE dbo.source_schema_versions (
  id nvarchar(64) NOT NULL PRIMARY KEY, source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  variant_name nvarchar(160) NOT NULL, schema_fingerprint char(64) NOT NULL, columns_json nvarchar(max) NOT NULL,
  compatibility_status nvarchar(64) NOT NULL, effective_from date NULL, effective_to date NULL,
  first_seen_at datetime2(3) NOT NULL, reviewed_at datetime2(3) NULL, reviewed_by nvarchar(200) NULL,
  CONSTRAINT CK_source_schema_compatibility CHECK(compatibility_status IN (N'exact', N'compatible', N'schema_review_required')),
  CONSTRAINT UQ_source_schema_fingerprint UNIQUE(source_id, schema_fingerprint)
);
GO

IF OBJECT_ID(N'dbo.ingestion_runs', N'U') IS NULL
CREATE TABLE dbo.ingestion_runs (
  id nvarchar(64) NOT NULL PRIMARY KEY, source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  source_resource_id nvarchar(64) NULL REFERENCES dbo.source_resources(id), run_kind nvarchar(80) NOT NULL,
  status nvarchar(32) NOT NULL, started_at datetime2(3) NOT NULL, completed_at datetime2(3) NULL,
  source_cutoff_at datetime2(3) NULL, input_rows bigint NULL, accepted_rows bigint NULL, rejected_rows bigint NULL,
  duplicate_rows bigint NULL, checkpoint_json nvarchar(max) NULL, result_json nvarchar(max) NULL,
  exact_source_sha char(40) NULL, initiated_by nvarchar(200) NOT NULL,
  CONSTRAINT CK_ingestion_runs_status CHECK(status IN (N'discovered', N'running', N'succeeded', N'partial', N'failed', N'blocked')),
  CONSTRAINT CK_ingestion_runs_counts CHECK((input_rows IS NULL OR input_rows >= 0) AND (accepted_rows IS NULL OR accepted_rows >= 0) AND (rejected_rows IS NULL OR rejected_rows >= 0) AND (duplicate_rows IS NULL OR duplicate_rows >= 0))
);
GO

IF OBJECT_ID(N'dbo.ingestion_errors', N'U') IS NULL
CREATE TABLE dbo.ingestion_errors (
  id nvarchar(64) NOT NULL PRIMARY KEY, ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  source_row_reference nvarchar(300) NULL, error_code nvarchar(120) NOT NULL, safe_message nvarchar(1200) NOT NULL,
  field_name nvarchar(200) NULL, source_value_digest char(64) NULL, occurred_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.analytical_dataset_manifests', N'U') IS NULL
CREATE TABLE dbo.analytical_dataset_manifests (
  id nvarchar(64) NOT NULL PRIMARY KEY, dataset_name nvarchar(240) NOT NULL, storage_zone nvarchar(40) NOT NULL,
  source_id nvarchar(160) NULL REFERENCES dbo.data_source_registry(source_id), reporting_period nvarchar(32) NULL,
  partition_key nvarchar(300) NOT NULL, storage_uri nvarchar(1600) NOT NULL, format nvarchar(20) NOT NULL,
  content_sha256 char(64) NOT NULL, row_count bigint NULL, byte_size bigint NULL, schema_fingerprint char(64) NULL,
  ingestion_run_id nvarchar(64) NULL REFERENCES dbo.ingestion_runs(id),
  immutability_status nvarchar(40) NOT NULL CONSTRAINT DF_analytical_manifests_immutable DEFAULT N'immutable',
  created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_analytical_manifests_zone CHECK(storage_zone IN (N'raw_immutable', N'curated', N'mart')),
  CONSTRAINT CK_analytical_manifests_format CHECK(format IN (N'csv', N'zip', N'xlsx', N'parquet', N'jsonl')),
  CONSTRAINT CK_analytical_manifests_counts CHECK((row_count IS NULL OR row_count >= 0) AND (byte_size IS NULL OR byte_size >= 0)),
  CONSTRAINT UQ_analytical_manifests_identity UNIQUE(dataset_name, storage_zone, partition_key, content_sha256)
);
GO

IF OBJECT_ID(N'dbo.dim_time', N'U') IS NULL
CREATE TABLE dbo.dim_time (
  month_key char(7) NOT NULL PRIMARY KEY, calendar_year int NOT NULL, calendar_month int NOT NULL,
  financial_year nvarchar(9) NOT NULL, financial_quarter int NOT NULL, month_start date NOT NULL, month_end date NOT NULL,
  is_complete bit NOT NULL CONSTRAINT DF_dim_time_complete DEFAULT 0,
  CONSTRAINT CK_dim_time_month CHECK(calendar_month BETWEEN 1 AND 12),
  CONSTRAINT CK_dim_time_quarter CHECK(financial_quarter BETWEEN 1 AND 4)
);
GO

IF OBJECT_ID(N'dbo.dim_medicine', N'U') IS NULL
CREATE TABLE dbo.dim_medicine (
  medicine_id nvarchar(64) NOT NULL PRIMARY KEY, canonical_name nvarchar(600) NOT NULL, medicine_level nvarchar(32) NOT NULL,
  snomed_code nvarchar(40) NULL, dm_d_status nvarchar(64) NOT NULL CONSTRAINT DF_dim_medicine_status DEFAULT N'unverified',
  supplier_name nvarchar(300) NULL, formulation nvarchar(300) NULL, route nvarchar(200) NULL, strength nvarchar(160) NULL,
  unit_of_measure nvarchar(160) NULL, valid_from date NULL, valid_to date NULL,
  source_id nvarchar(160) NULL REFERENCES dbo.data_source_registry(source_id), source_last_seen_at datetime2(3) NULL,
  CONSTRAINT CK_dim_medicine_level CHECK(medicine_level IN (N'VTM', N'VMP', N'AMP', N'VMPP', N'AMPP', N'BNF_PRESENTATION', N'UNRESOLVED')),
  CONSTRAINT UQ_dim_medicine_snomed UNIQUE(medicine_level, snomed_code)
);
GO

IF OBJECT_ID(N'dbo.medicine_aliases', N'U') IS NULL
CREATE TABLE dbo.medicine_aliases (
  id nvarchar(64) NOT NULL PRIMARY KEY, medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  alias_text nvarchar(600) NOT NULL, alias_type nvarchar(80) NOT NULL, normalised_alias nvarchar(600) NOT NULL,
  source_id nvarchar(160) NULL REFERENCES dbo.data_source_registry(source_id), valid_from date NULL, valid_to date NULL
);
GO

IF OBJECT_ID(N'dbo.medicine_code_history', N'U') IS NULL
CREATE TABLE dbo.medicine_code_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  code_system nvarchar(80) NOT NULL, code_value nvarchar(80) NOT NULL, code_level nvarchar(80) NOT NULL,
  valid_from date NOT NULL, valid_to date NULL, change_reason nvarchar(600) NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  CONSTRAINT UQ_medicine_code_history UNIQUE(code_system, code_value, valid_from)
);
GO

IF OBJECT_ID(N'dbo.dim_bnf', N'U') IS NULL
CREATE TABLE dbo.dim_bnf (
  bnf_id nvarchar(64) NOT NULL PRIMARY KEY, bnf_code nvarchar(40) NOT NULL, bnf_name nvarchar(600) NOT NULL,
  bnf_level int NOT NULL, parent_bnf_id nvarchar(64) NULL REFERENCES dbo.dim_bnf(bnf_id), valid_from date NOT NULL,
  valid_to date NULL, source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  CONSTRAINT CK_dim_bnf_level CHECK(bnf_level BETWEEN 1 AND 15), CONSTRAINT UQ_dim_bnf_version UNIQUE(bnf_code, valid_from)
);
GO

IF OBJECT_ID(N'dbo.bnf_hierarchy_history', N'U') IS NULL
CREATE TABLE dbo.bnf_hierarchy_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, child_bnf_id nvarchar(64) NOT NULL REFERENCES dbo.dim_bnf(bnf_id),
  parent_bnf_id nvarchar(64) NULL REFERENCES dbo.dim_bnf(bnf_id), valid_from date NOT NULL, valid_to date NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  CONSTRAINT UQ_bnf_hierarchy_history UNIQUE(child_bnf_id, valid_from)
);
GO

IF OBJECT_ID(N'dbo.dim_geography', N'U') IS NULL
CREATE TABLE dbo.dim_geography (
  geography_id nvarchar(64) NOT NULL PRIMARY KEY, geography_type nvarchar(80) NOT NULL,
  geography_code nvarchar(80) NOT NULL, geography_name nvarchar(400) NOT NULL,
  name_status nvarchar(40) NOT NULL CONSTRAINT DF_dim_geography_name_status DEFAULT N'authoritative_name', nation nvarchar(80) NOT NULL,
  parent_geography_id nvarchar(64) NULL REFERENCES dbo.dim_geography(geography_id), valid_from date NULL, valid_to date NULL,
  source_id nvarchar(160) NULL REFERENCES dbo.data_source_registry(source_id)
);
GO

IF OBJECT_ID(N'dbo.dim_postcode', N'U') IS NULL
CREATE TABLE dbo.dim_postcode (
  postcode_id nvarchar(64) NOT NULL PRIMARY KEY, postcode_raw nvarchar(16) NOT NULL, postcode_normalised nvarchar(16) NOT NULL,
  postcode_sector nvarchar(12) NOT NULL, postcode_district nvarchar(8) NOT NULL, latitude decimal(9,6) NULL,
  longitude decimal(9,6) NULL, location geography NULL, introduced_at date NULL, terminated_at date NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id), source_last_seen_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.postcode_geography_history', N'U') IS NULL
CREATE TABLE dbo.postcode_geography_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, postcode_id nvarchar(64) NOT NULL REFERENCES dbo.dim_postcode(postcode_id),
  geography_id nvarchar(64) NOT NULL REFERENCES dbo.dim_geography(geography_id), geography_type nvarchar(80) NOT NULL,
  valid_from date NOT NULL, valid_to date NULL, source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  CONSTRAINT UQ_postcode_geography_history UNIQUE(postcode_id, geography_type, valid_from)
);
GO

IF OBJECT_ID(N'dbo.dim_nhs_organisations', N'U') IS NULL
CREATE TABLE dbo.dim_nhs_organisations (
  organisation_id nvarchar(64) NOT NULL PRIMARY KEY, organisation_code nvarchar(80) NOT NULL,
  organisation_name nvarchar(600) NOT NULL, organisation_type nvarchar(120) NOT NULL, status nvarchar(80) NOT NULL,
  postcode_id nvarchar(64) NULL REFERENCES dbo.dim_postcode(postcode_id), nation nvarchar(80) NOT NULL,
  valid_from date NULL, valid_to date NULL, source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id)
);
GO

IF OBJECT_ID(N'dbo.organisation_relationship_history', N'U') IS NULL
CREATE TABLE dbo.organisation_relationship_history (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  child_organisation_id nvarchar(64) NOT NULL REFERENCES dbo.dim_nhs_organisations(organisation_id),
  parent_organisation_id nvarchar(64) NOT NULL REFERENCES dbo.dim_nhs_organisations(organisation_id),
  relationship_type nvarchar(120) NOT NULL, valid_from date NOT NULL, valid_to date NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  CONSTRAINT UQ_organisation_relationship_history UNIQUE(child_organisation_id, parent_organisation_id, relationship_type, valid_from)
);
GO

IF OBJECT_ID(N'dbo.dim_practices', N'U') IS NULL
CREATE TABLE dbo.dim_practices (
  practice_id nvarchar(64) NOT NULL PRIMARY KEY, organisation_id nvarchar(64) NOT NULL REFERENCES dbo.dim_nhs_organisations(organisation_id),
  practice_code nvarchar(80) NOT NULL, practice_name nvarchar(600) NOT NULL, practice_type nvarchar(120) NULL,
  address_json nvarchar(max) NOT NULL CONSTRAINT DF_dim_practices_address DEFAULT N'[]',
  postcode_id nvarchar(64) NULL REFERENCES dbo.dim_postcode(postcode_id), latitude decimal(9,6) NULL, longitude decimal(9,6) NULL,
  status nvarchar(80) NOT NULL, open_date date NULL, close_date date NULL, registered_population int NULL,
  population_period nvarchar(32) NULL, source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  valid_from date NULL, valid_to date NULL,
  CONSTRAINT CK_dim_practices_coordinates CHECK((latitude IS NULL OR latitude BETWEEN -90 AND 90) AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)),
  CONSTRAINT CK_dim_practices_population CHECK(registered_population IS NULL OR registered_population >= 0)
);
GO

IF OBJECT_ID(N'dbo.practice_relationship_history', N'U') IS NULL
CREATE TABLE dbo.practice_relationship_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, practice_id nvarchar(64) NOT NULL REFERENCES dbo.dim_practices(practice_id),
  organisation_id nvarchar(64) NOT NULL REFERENCES dbo.dim_nhs_organisations(organisation_id),
  relationship_type nvarchar(120) NOT NULL, valid_from date NOT NULL, valid_to date NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  CONSTRAINT UQ_practice_relationship_history UNIQUE(practice_id, organisation_id, relationship_type, valid_from)
);
GO

IF OBJECT_ID(N'dbo.practice_contact_evidence', N'U') IS NULL
CREATE TABLE dbo.practice_contact_evidence (
  id nvarchar(64) NOT NULL PRIMARY KEY, practice_id nvarchar(64) NOT NULL REFERENCES dbo.dim_practices(practice_id),
  contact_type nvarchar(40) NOT NULL, contact_value nvarchar(600) NOT NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id), source_url nvarchar(1600) NULL,
  observed_at datetime2(3) NOT NULL, checked_at datetime2(3) NULL, status nvarchar(40) NOT NULL,
  confidence nvarchar(80) NULL, reviewer nvarchar(200) NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_practice_contact_type CHECK(contact_type IN (N'public_business_email', N'nhs_shared_email', N'telephone', N'website')),
  CONSTRAINT CK_practice_contact_status CHECK(status IN (N'verified', N'candidate', N'rejected', N'withdrawn', N'unknown')),
  CONSTRAINT UQ_practice_contact_identity UNIQUE(practice_id, contact_type, contact_value, source_id, observed_at)
);
GO

IF OBJECT_ID(N'dbo.pharmacy_imports', N'U') IS NULL
CREATE TABLE dbo.pharmacy_imports (
  import_id nvarchar(64) NOT NULL PRIMARY KEY, source_file_name nvarchar(600) NOT NULL, source_sha256 char(64) NOT NULL UNIQUE,
  source_size_bytes bigint NOT NULL, source_modified_at datetime2(3) NULL, imported_at datetime2(3) NOT NULL,
  imported_by nvarchar(200) NOT NULL, source_row_count int NOT NULL, inserted_count int NOT NULL CONSTRAINT DF_pharmacy_imports_inserted DEFAULT 0,
  matched_count int NOT NULL CONSTRAINT DF_pharmacy_imports_matched DEFAULT 0, updated_count int NOT NULL CONSTRAINT DF_pharmacy_imports_updated DEFAULT 0,
  unchanged_count int NOT NULL CONSTRAINT DF_pharmacy_imports_unchanged DEFAULT 0,
  duplicate_candidate_count int NOT NULL CONSTRAINT DF_pharmacy_imports_duplicates DEFAULT 0,
  conflict_count int NOT NULL CONSTRAINT DF_pharmacy_imports_conflicts DEFAULT 0,
  invalid_identifier_count int NOT NULL CONSTRAINT DF_pharmacy_imports_identifiers DEFAULT 0,
  invalid_postcode_count int NOT NULL CONSTRAINT DF_pharmacy_imports_postcodes DEFAULT 0,
  verified_email_count int NOT NULL CONSTRAINT DF_pharmacy_imports_verified DEFAULT 0,
  blank_actioned_email_count int NOT NULL CONSTRAINT DF_pharmacy_imports_blanks DEFAULT 0,
  country_totals_json nvarchar(max) NOT NULL CONSTRAINT DF_pharmacy_imports_countries DEFAULT N'{}',
  reconciliation_json nvarchar(max) NOT NULL CONSTRAINT DF_pharmacy_imports_reconciliation DEFAULT N'{}',
  CONSTRAINT CK_pharmacy_imports_size CHECK(source_size_bytes > 0),
  CONSTRAINT CK_pharmacy_imports_count CHECK(source_row_count >= 0)
);
GO

IF OBJECT_ID(N'dbo.pharmacy_source_rows', N'U') IS NULL
CREATE TABLE dbo.pharmacy_source_rows (
  id nvarchar(64) NOT NULL PRIMARY KEY, import_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacy_imports(import_id),
  source_sheet nvarchar(160) NOT NULL, source_row_number int NOT NULL, master_row int NULL, country nvarchar(80) NULL,
  pharmacy_name nvarchar(600) NULL, legal_entity nvarchar(600) NULL, ods_or_regulator_code nvarchar(120) NULL,
  gphc_or_psni_registration nvarchar(120) NULL, postcode nvarchar(24) NULL, phone nvarchar(120) NULL,
  public_business_email nvarchar(320) NULL, website nvarchar(1200) NULL, email_type nvarchar(120) NULL,
  email_confidence nvarchar(80) NULL, source_email nvarchar(1200) NULL, full_address nvarchar(1600) NULL,
  address_source nvarchar(1200) NULL, address_checked_date nvarchar(40) NULL, email_checked_date nvarchar(40) NULL,
  email_status nvarchar(120) NULL, email_research_note nvarchar(max) NULL, research_pass nvarchar(120) NULL,
  source_row_json nvarchar(max) NOT NULL, source_row_hash char(64) NOT NULL, imported_at datetime2(3) NOT NULL,
  CONSTRAINT CK_pharmacy_source_rows_number CHECK(source_row_number > 0),
  CONSTRAINT UQ_pharmacy_source_rows_position UNIQUE(import_id, source_sheet, source_row_number)
);
GO

IF OBJECT_ID(N'dbo.pharmacies', N'U') IS NULL
CREATE TABLE dbo.pharmacies (
  pharmacy_id nvarchar(64) NOT NULL PRIMARY KEY, country nvarchar(80) NOT NULL,
  status nvarchar(80) NOT NULL CONSTRAINT DF_pharmacies_status DEFAULT N'active', trading_name nvarchar(600) NOT NULL,
  legal_entity nvarchar(600) NULL, parent_organisation nvarchar(600) NULL, group_name nvarchar(600) NULL,
  address nvarchar(1600) NOT NULL, postcode_raw nvarchar(24) NOT NULL, postcode_normalised nvarchar(16) NOT NULL,
  postcode_id nvarchar(64) NULL REFERENCES dbo.dim_postcode(postcode_id), latitude decimal(9,6) NULL,
  longitude decimal(9,6) NULL, location geography NULL, geography_id nvarchar(64) NULL REFERENCES dbo.dim_geography(geography_id),
  telephone nvarchar(120) NULL, website nvarchar(1200) NULL, public_business_email nvarchar(320) NULL,
  email_type nvarchar(120) NULL, email_confidence nvarchar(80) NULL,
  email_status nvarchar(120) NOT NULL CONSTRAINT DF_pharmacies_email_status DEFAULT N'unknown',
  email_source nvarchar(1200) NULL, email_source_url nvarchar(1200) NULL, email_verified_at datetime2(3) NULL,
  customer_status nvarchar(80) NOT NULL CONSTRAINT DF_pharmacies_customer_status DEFAULT N'not_linked',
  customer_id nvarchar(64) NULL REFERENCES dbo.customers(id), sales_territory nvarchar(160) NULL,
  account_owner nvarchar(200) NULL, last_contacted_at datetime2(3) NULL, last_order_at datetime2(3) NULL,
  marketing_classification nvarchar(120) NOT NULL CONSTRAINT DF_pharmacies_marketing DEFAULT N'unclassified',
  marketing_eligible bit NOT NULL CONSTRAINT DF_pharmacies_marketing_eligible DEFAULT 0,
  opt_out bit NOT NULL CONSTRAINT DF_pharmacies_opt_out DEFAULT 0, suppressed_at datetime2(3) NULL,
  suppression_reason nvarchar(600) NULL, source_first_seen_at datetime2(3) NOT NULL,
  source_last_seen_at datetime2(3) NOT NULL, opened_at date NULL, closed_at date NULL,
  valid_from datetime2(3) NOT NULL, valid_to datetime2(3) NULL,
  version int NOT NULL CONSTRAINT DF_pharmacies_version DEFAULT 1,
  CONSTRAINT CK_pharmacies_version CHECK(version >= 1)
);
GO

IF OBJECT_ID(N'dbo.pharmacy_identifiers', N'U') IS NULL
CREATE TABLE dbo.pharmacy_identifiers (
  id nvarchar(64) NOT NULL PRIMARY KEY, pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id),
  identifier_type nvarchar(120) NOT NULL, identifier_value nvarchar(160) NOT NULL, nation nvarchar(80) NOT NULL,
  authority nvarchar(300) NOT NULL, valid_from datetime2(3) NOT NULL, valid_to datetime2(3) NULL,
  source_import_id nvarchar(64) NULL REFERENCES dbo.pharmacy_imports(import_id),
  verification_status nvarchar(80) NOT NULL CONSTRAINT DF_pharmacy_identifiers_status DEFAULT N'source_supplied',
  CONSTRAINT UQ_pharmacy_identifiers_identity UNIQUE(identifier_type, identifier_value, valid_from)
);
GO

IF OBJECT_ID(N'dbo.pharmacy_history', N'U') IS NULL
CREATE TABLE dbo.pharmacy_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id),
  change_type nvarchar(120) NOT NULL, changed_fields_json nvarchar(max) NOT NULL,
  previous_values_json nvarchar(max) NOT NULL, new_values_json nvarchar(max) NOT NULL,
  valid_from datetime2(3) NOT NULL, valid_to datetime2(3) NULL,
  source_import_id nvarchar(64) NULL REFERENCES dbo.pharmacy_imports(import_id), recorded_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.pharmacy_contact_evidence', N'U') IS NULL
CREATE TABLE dbo.pharmacy_contact_evidence (
  id nvarchar(64) NOT NULL PRIMARY KEY, pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id),
  contact_type nvarchar(80) NOT NULL, contact_value nvarchar(1200) NOT NULL, source_type nvarchar(120) NOT NULL,
  source_url nvarchar(1200) NULL, evidence_excerpt nvarchar(1200) NULL, evidence_sha256 char(64) NULL,
  checked_at datetime2(3) NULL, status nvarchar(40) NOT NULL, confidence nvarchar(80) NULL,
  reviewer nvarchar(200) NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_pharmacy_contact_type CHECK(contact_type IN (N'public_business_email', N'nhs_shared_email', N'telephone', N'website')),
  CONSTRAINT CK_pharmacy_contact_status CHECK(status IN (N'verified', N'candidate', N'rejected', N'withdrawn', N'unknown'))
);
GO

IF OBJECT_ID(N'dbo.pharmacy_enrichment_queue', N'U') IS NULL
CREATE TABLE dbo.pharmacy_enrichment_queue (
  id nvarchar(64) NOT NULL PRIMARY KEY, pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id),
  reason nvarchar(400) NOT NULL, priority int NOT NULL CONSTRAINT DF_pharmacy_enrichment_priority DEFAULT 100,
  status nvarchar(40) NOT NULL, last_evidence_cutoff_at datetime2(3) NULL, next_review_at datetime2(3) NULL,
  assigned_to nvarchar(200) NULL, created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_pharmacy_enrichment_status CHECK(status IN (N'open', N'in_review', N'resolved', N'blocked', N'no_new_evidence'))
);
GO

IF OBJECT_ID(N'dbo.fact_epd_prescribing', N'U') IS NULL
CREATE TABLE dbo.fact_epd_prescribing (
  id nvarchar(64) NOT NULL PRIMARY KEY, month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  practice_id nvarchar(64) NOT NULL REFERENCES dbo.dim_practices(practice_id), items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL, nic decimal(19,4) NOT NULL, actual_cost decimal(19,4) NOT NULL,
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id), source_row_digest char(64) NOT NULL,
  CONSTRAINT CK_fact_epd_nonnegative CHECK(items >= 0 AND quantity >= 0 AND nic >= 0 AND actual_cost >= 0),
  CONSTRAINT UQ_fact_epd_identity UNIQUE(month_key, medicine_id, practice_id, source_row_digest)
);
GO

IF OBJECT_ID(N'dbo.fact_pca_community_dispensing', N'U') IS NULL
CREATE TABLE dbo.fact_pca_community_dispensing (
  id nvarchar(64) NOT NULL PRIMARY KEY, month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id), geography_id nvarchar(64) NULL REFERENCES dbo.dim_geography(geography_id),
  items decimal(19,4) NOT NULL, quantity decimal(19,4) NOT NULL, nic decimal(19,4) NOT NULL, actual_cost decimal(19,4) NOT NULL,
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  CONSTRAINT CK_fact_pca_nonnegative CHECK(items >= 0 AND quantity >= 0 AND nic >= 0 AND actual_cost >= 0)
);
GO

IF OBJECT_ID(N'dbo.fact_scmd_secondary_care', N'U') IS NULL
CREATE TABLE dbo.fact_scmd_secondary_care (
  id nvarchar(64) NOT NULL PRIMARY KEY, month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  organisation_id nvarchar(64) NOT NULL REFERENCES dbo.dim_nhs_organisations(organisation_id),
  quantity decimal(19,4) NOT NULL, unit_of_measure nvarchar(160) NOT NULL, indicative_cost decimal(19,4) NOT NULL,
  finalisation_state nvarchar(20) NOT NULL, ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  CONSTRAINT CK_fact_scmd_nonnegative CHECK(quantity >= 0 AND indicative_cost >= 0),
  CONSTRAINT CK_fact_scmd_state CHECK(finalisation_state IN (N'provisional', N'final'))
);
GO

IF OBJECT_ID(N'dbo.fact_hospital_community_dispensing', N'U') IS NULL
CREATE TABLE dbo.fact_hospital_community_dispensing (
  id nvarchar(64) NOT NULL PRIMARY KEY, month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  organisation_id nvarchar(64) NOT NULL REFERENCES dbo.dim_nhs_organisations(organisation_id),
  items decimal(19,4) NOT NULL, quantity decimal(19,4) NOT NULL, actual_cost decimal(19,4) NOT NULL,
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  CONSTRAINT CK_fact_hospital_nonnegative CHECK(items >= 0 AND quantity >= 0 AND actual_cost >= 0)
);
GO

IF OBJECT_ID(N'dbo.fact_practice_dispensing_flow', N'U') IS NULL
CREATE TABLE dbo.fact_practice_dispensing_flow (
  id nvarchar(64) NOT NULL PRIMARY KEY, month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  practice_id nvarchar(64) NULL REFERENCES dbo.dim_practices(practice_id), pharmacy_id nvarchar(64) NULL REFERENCES dbo.pharmacies(pharmacy_id),
  items decimal(19,4) NOT NULL, evidence_scope nvarchar(200) NOT NULL,
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  CONSTRAINT CK_fact_practice_flow_nonnegative CHECK(items >= 0)
);
GO

IF OBJECT_ID(N'dbo.fact_pharmacy_activity', N'U') IS NULL
CREATE TABLE dbo.fact_pharmacy_activity (
  id nvarchar(64) NOT NULL PRIMARY KEY, month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id), activity_type nvarchar(160) NOT NULL,
  activity_value decimal(19,4) NOT NULL, source_scope nvarchar(300) NOT NULL,
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  CONSTRAINT CK_fact_pharmacy_activity_nonnegative CHECK(activity_value >= 0)
);
GO

IF OBJECT_ID(N'dbo.fact_special_dispenser_drug_release', N'U') IS NULL
CREATE TABLE dbo.fact_special_dispenser_drug_release (
  id nvarchar(64) NOT NULL PRIMARY KEY, month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id), dispenser_code nvarchar(120) NOT NULL,
  items decimal(19,4) NULL, quantity decimal(19,4) NULL, evidence_scope nvarchar(300) NOT NULL,
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  CONSTRAINT CK_fact_special_nonnegative CHECK((items IS NULL OR items >= 0) AND (quantity IS NULL OR quantity >= 0))
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_month (
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key), medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  items decimal(19,4) NOT NULL, quantity decimal(19,4) NOT NULL, nic decimal(19,4) NOT NULL, actual_cost decimal(19,4) NOT NULL,
  source_cutoff_at datetime2(3) NOT NULL, lineage_json nvarchar(max) NOT NULL,
  CONSTRAINT PK_mart_medicine_month PRIMARY KEY(month_key, medicine_id)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_geography_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_geography_month (
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key), medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  geography_id nvarchar(64) NOT NULL REFERENCES dbo.dim_geography(geography_id), items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL, registered_population int NULL, items_per_1000 decimal(19,6) NULL,
  source_cutoff_at datetime2(3) NOT NULL, lineage_json nvarchar(max) NOT NULL,
  CONSTRAINT PK_mart_medicine_geography PRIMARY KEY(month_key, medicine_id, geography_id)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_practice_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_practice_month (
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key), medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  practice_id nvarchar(64) NOT NULL REFERENCES dbo.dim_practices(practice_id), items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL, items_per_1000 decimal(19,6) NULL,
  source_cutoff_at datetime2(3) NOT NULL, lineage_json nvarchar(max) NOT NULL,
  CONSTRAINT PK_mart_medicine_practice PRIMARY KEY(month_key, medicine_id, practice_id)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_presentation_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_presentation_month (
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key), medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  presentation_key nvarchar(240) NOT NULL, items decimal(19,4) NOT NULL, quantity decimal(19,4) NOT NULL,
  source_cutoff_at datetime2(3) NOT NULL, lineage_json nvarchar(max) NOT NULL,
  CONSTRAINT PK_mart_medicine_presentation PRIMARY KEY(month_key, medicine_id, presentation_key)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_supplier_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_supplier_month (
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key), medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  supplier_name nvarchar(300) NOT NULL, items decimal(19,4) NOT NULL, quantity decimal(19,4) NOT NULL,
  source_cutoff_at datetime2(3) NOT NULL, lineage_json nvarchar(max) NOT NULL,
  CONSTRAINT PK_mart_medicine_supplier PRIMARY KEY(month_key, medicine_id, supplier_name)
);
GO

IF OBJECT_ID(N'dbo.mart_pharmacy_month', N'U') IS NULL
CREATE TABLE dbo.mart_pharmacy_month (
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key), pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id),
  total_items decimal(19,4) NULL, service_activity_json nvarchar(max) NOT NULL CONSTRAINT DF_mart_pharmacy_activity DEFAULT N'{}',
  source_scope nvarchar(300) NOT NULL, source_cutoff_at datetime2(3) NOT NULL, lineage_json nvarchar(max) NOT NULL,
  CONSTRAINT PK_mart_pharmacy_month PRIMARY KEY(month_key, pharmacy_id)
);
GO

IF OBJECT_ID(N'dbo.forecast_models', N'U') IS NULL
CREATE TABLE dbo.forecast_models (
  model_id nvarchar(64) NOT NULL PRIMARY KEY, model_name nvarchar(240) NOT NULL, model_version nvarchar(80) NOT NULL,
  forecast_type nvarchar(40) NOT NULL, algorithm nvarchar(160) NOT NULL, parameters_json nvarchar(max) NOT NULL,
  limitations_json nvarchar(max) NOT NULL, code_sha char(40) NOT NULL,
  approved_status nvarchar(40) NOT NULL CONSTRAINT DF_forecast_models_status DEFAULT N'validation', created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_forecast_models_type CHECK(forecast_type IN (N'nhs_demand', N'novapharm_sales')),
  CONSTRAINT UQ_forecast_models_version UNIQUE(model_name, model_version, forecast_type)
);
GO

IF OBJECT_ID(N'dbo.forecast_runs', N'U') IS NULL
CREATE TABLE dbo.forecast_runs (
  run_id nvarchar(64) NOT NULL PRIMARY KEY, model_id nvarchar(64) NOT NULL REFERENCES dbo.forecast_models(model_id),
  training_cutoff date NOT NULL, feature_cutoff date NOT NULL, source_cutoff_at datetime2(3) NOT NULL,
  horizon_months int NOT NULL, status nvarchar(40) NOT NULL, assumptions_json nvarchar(max) NOT NULL,
  input_manifest_json nvarchar(max) NOT NULL, started_at datetime2(3) NOT NULL, completed_at datetime2(3) NULL,
  initiated_by nvarchar(200) NOT NULL,
  CONSTRAINT CK_forecast_runs_horizon CHECK(horizon_months IN (3, 6, 12, 24)),
  CONSTRAINT CK_forecast_runs_status CHECK(status IN (N'running', N'succeeded', N'failed', N'blocked'))
);
GO

IF OBJECT_ID(N'dbo.forecast_values', N'U') IS NULL
CREATE TABLE dbo.forecast_values (
  id nvarchar(64) NOT NULL PRIMARY KEY, run_id nvarchar(64) NOT NULL REFERENCES dbo.forecast_runs(run_id),
  entity_type nvarchar(80) NOT NULL, entity_id nvarchar(160) NOT NULL, target_month char(7) NOT NULL,
  horizon int NOT NULL, forecast_value decimal(19,6) NOT NULL, lower_value decimal(19,6) NOT NULL,
  upper_value decimal(19,6) NOT NULL, interval_level decimal(5,4) NOT NULL,
  CONSTRAINT CK_forecast_values_horizon CHECK(horizon > 0),
  CONSTRAINT CK_forecast_values_interval CHECK(interval_level > 0 AND interval_level < 1),
  CONSTRAINT UQ_forecast_values_identity UNIQUE(run_id, entity_type, entity_id, target_month)
);
GO

IF OBJECT_ID(N'dbo.forecast_evaluations', N'U') IS NULL
CREATE TABLE dbo.forecast_evaluations (
  id nvarchar(64) NOT NULL PRIMARY KEY, run_id nvarchar(64) NOT NULL REFERENCES dbo.forecast_runs(run_id),
  evaluation_cutoff date NOT NULL, horizon int NOT NULL, observations int NOT NULL, mae decimal(19,6) NOT NULL,
  wape decimal(19,6) NOT NULL, smape decimal(19,6) NOT NULL, bias decimal(19,6) NOT NULL,
  interval_coverage decimal(5,4) NOT NULL,
  CONSTRAINT CK_forecast_evaluations_values CHECK(horizon > 0 AND observations >= 0 AND mae >= 0 AND wape >= 0 AND smape >= 0 AND interval_coverage >= 0 AND interval_coverage <= 1),
  CONSTRAINT UQ_forecast_evaluations_identity UNIQUE(run_id, evaluation_cutoff, horizon)
);
GO

IF OBJECT_ID(N'dbo.forecast_feature_snapshots', N'U') IS NULL
CREATE TABLE dbo.forecast_feature_snapshots (
  id nvarchar(64) NOT NULL PRIMARY KEY, run_id nvarchar(64) NOT NULL REFERENCES dbo.forecast_runs(run_id),
  entity_type nvarchar(80) NOT NULL, entity_id nvarchar(160) NOT NULL, feature_name nvarchar(240) NOT NULL,
  feature_value decimal(19,6) NULL, feature_value_text nvarchar(600) NULL, available_at datetime2(3) NOT NULL,
  source_lineage_json nvarchar(max) NOT NULL,
  CONSTRAINT UQ_forecast_feature_snapshot UNIQUE(run_id, entity_type, entity_id, feature_name)
);
GO

IF OBJECT_ID(N'dbo.opportunity_model_versions', N'U') IS NULL
CREATE TABLE dbo.opportunity_model_versions (
  model_id nvarchar(64) NOT NULL PRIMARY KEY, model_name nvarchar(240) NOT NULL, model_version nvarchar(80) NOT NULL,
  weights_json nvarchar(max) NOT NULL, eligibility_rules_json nvarchar(max) NOT NULL, limitations_json nvarchar(max) NOT NULL,
  status nvarchar(40) NOT NULL CONSTRAINT DF_opportunity_models_status DEFAULT N'validation',
  approved_by nvarchar(200) NULL, approved_at datetime2(3) NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_opportunity_models_version UNIQUE(model_name, model_version)
);
GO

IF OBJECT_ID(N'dbo.mart_pharmacy_medicine_opportunity', N'U') IS NULL
CREATE TABLE dbo.mart_pharmacy_medicine_opportunity (
  opportunity_id nvarchar(64) NOT NULL PRIMARY KEY, pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  model_id nvarchar(64) NOT NULL REFERENCES dbo.opportunity_model_versions(model_id), as_of_month char(7) NOT NULL,
  score decimal(7,4) NOT NULL, rank int NULL, confidence nvarchar(40) NOT NULL, evidence_scope nvarchar(600) NOT NULL,
  nearby_practice_count int NULL, local_items decimal(19,4) NULL, forecast_growth_3m decimal(19,6) NULL,
  forecast_growth_12m decimal(19,6) NULL, interval_width decimal(19,6) NULL,
  blockers_json nvarchar(max) NOT NULL CONSTRAINT DF_opportunities_blockers DEFAULT N'[]',
  caveats_json nvarchar(max) NOT NULL CONSTRAINT DF_opportunities_caveats DEFAULT N'[]',
  source_cutoff_at datetime2(3) NOT NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_opportunity_score CHECK(score >= 0 AND score <= 100),
  CONSTRAINT UQ_opportunity_identity UNIQUE(pharmacy_id, medicine_id, model_id, as_of_month)
);
GO

IF OBJECT_ID(N'dbo.opportunity_score_components', N'U') IS NULL
CREATE TABLE dbo.opportunity_score_components (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  opportunity_id nvarchar(64) NOT NULL REFERENCES dbo.mart_pharmacy_medicine_opportunity(opportunity_id),
  component_key nvarchar(160) NOT NULL, raw_value decimal(19,6) NULL, normalised_value decimal(19,6) NULL,
  weight decimal(19,6) NOT NULL, contribution decimal(19,6) NULL, evidence_reference nvarchar(1200) NOT NULL,
  caveat nvarchar(1200) NULL, CONSTRAINT UQ_opportunity_components UNIQUE(opportunity_id, component_key)
);
GO

IF OBJECT_ID(N'dbo.intelligence_campaigns', N'U') IS NULL
CREATE TABLE dbo.intelligence_campaigns (
  campaign_id nvarchar(64) NOT NULL PRIMARY KEY, name nvarchar(300) NOT NULL, purpose nvarchar(1200) NOT NULL,
  status nvarchar(40) NOT NULL, selection_snapshot_json nvarchar(max) NOT NULL, content_version nvarchar(80) NULL,
  approved_by nvarchar(200) NULL, approved_at datetime2(3) NULL, created_by nvarchar(200) NOT NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_intelligence_campaigns_status CHECK(status IN (N'draft', N'in_review', N'approved', N'active', N'paused', N'completed', N'cancelled'))
);
GO

IF OBJECT_ID(N'dbo.intelligence_campaign_targets', N'U') IS NULL
CREATE TABLE dbo.intelligence_campaign_targets (
  id nvarchar(64) NOT NULL PRIMARY KEY, campaign_id nvarchar(64) NOT NULL REFERENCES dbo.intelligence_campaigns(campaign_id),
  pharmacy_id nvarchar(64) NOT NULL REFERENCES dbo.pharmacies(pharmacy_id),
  opportunity_id nvarchar(64) NULL REFERENCES dbo.mart_pharmacy_medicine_opportunity(opportunity_id),
  eligibility_status nvarchar(40) NOT NULL, eligibility_reason nvarchar(1200) NOT NULL,
  contact_evidence_id nvarchar(64) NULL REFERENCES dbo.pharmacy_contact_evidence(id), human_approved_by nvarchar(200) NULL,
  human_approved_at datetime2(3) NULL, delivery_status nvarchar(80) NOT NULL CONSTRAINT DF_campaign_targets_delivery DEFAULT N'not_scheduled',
  created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_campaign_targets_eligibility CHECK(eligibility_status IN (N'eligible', N'suppressed', N'review_required', N'excluded'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_source_resources_period' AND object_id = OBJECT_ID(N'dbo.source_resources'))
  CREATE INDEX IX_source_resources_period ON dbo.source_resources(source_id, reporting_period);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ingestion_runs_source_status' AND object_id = OBJECT_ID(N'dbo.ingestion_runs'))
  CREATE INDEX IX_ingestion_runs_source_status ON dbo.ingestion_runs(source_id, status, started_at);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_medicine_alias_search' AND object_id = OBJECT_ID(N'dbo.medicine_aliases'))
  CREATE INDEX IX_medicine_alias_search ON dbo.medicine_aliases(normalised_alias);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_medicine_code_lookup' AND object_id = OBJECT_ID(N'dbo.medicine_code_history'))
  CREATE INDEX IX_medicine_code_lookup ON dbo.medicine_code_history(code_system, code_value, valid_from, valid_to);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_postcode_normalised' AND object_id = OBJECT_ID(N'dbo.dim_postcode'))
  CREATE INDEX IX_postcode_normalised ON dbo.dim_postcode(postcode_normalised, terminated_at);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_practice_code' AND object_id = OBJECT_ID(N'dbo.dim_practices'))
  CREATE INDEX IX_practice_code ON dbo.dim_practices(practice_code, valid_from, valid_to);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_practice_contact_status' AND object_id = OBJECT_ID(N'dbo.practice_contact_evidence'))
  CREATE INDEX IX_practice_contact_status ON dbo.practice_contact_evidence(contact_type, status, checked_at);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_pharmacy_postcode' AND object_id = OBJECT_ID(N'dbo.pharmacies'))
  CREATE INDEX IX_pharmacy_postcode ON dbo.pharmacies(postcode_normalised, status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_pharmacy_source_hash' AND object_id = OBJECT_ID(N'dbo.pharmacy_source_rows'))
  CREATE INDEX IX_pharmacy_source_hash ON dbo.pharmacy_source_rows(import_id, source_sheet, source_row_hash);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_pharmacy_identifier_lookup' AND object_id = OBJECT_ID(N'dbo.pharmacy_identifiers'))
  CREATE INDEX IX_pharmacy_identifier_lookup ON dbo.pharmacy_identifiers(identifier_type, identifier_value, valid_to);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_forecast_entity' AND object_id = OBJECT_ID(N'dbo.forecast_values'))
  CREATE INDEX IX_forecast_entity ON dbo.forecast_values(entity_type, entity_id, target_month);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_opportunity_rank' AND object_id = OBJECT_ID(N'dbo.mart_pharmacy_medicine_opportunity'))
  CREATE INDEX IX_opportunity_rank ON dbo.mart_pharmacy_medicine_opportunity(as_of_month, rank, score);
GO
