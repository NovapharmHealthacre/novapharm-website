CREATE TABLE IF NOT EXISTS practice_population_history (
  id TEXT PRIMARY KEY,
  practice_id TEXT REFERENCES dim_practices(practice_id),
  practice_code TEXT NOT NULL,
  month_key TEXT NOT NULL,
  extract_date TEXT NOT NULL,
  registered_population INTEGER NOT NULL CHECK(registered_population >= 0),
  practice_postcode TEXT NOT NULL,
  sub_icb_location_code TEXT NOT NULL,
  ons_sub_icb_location_code TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  source_resource_id TEXT NOT NULL REFERENCES source_resources(id),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  source_row_number INTEGER NOT NULL CHECK(source_row_number > 1),
  created_at TEXT NOT NULL,
  UNIQUE(practice_code, month_key)
);

CREATE TABLE IF NOT EXISTS population_age_sex_history (
  id TEXT PRIMARY KEY,
  practice_id TEXT REFERENCES dim_practices(practice_id),
  month_key TEXT NOT NULL,
  extract_date TEXT NOT NULL,
  organisation_type TEXT NOT NULL CHECK(organisation_type IN ('Comm Region', 'ICB', 'SUB_ICB_LOCATION_CODE', 'PCN', 'GP')),
  organisation_code TEXT NOT NULL,
  ons_code TEXT,
  postcode TEXT,
  sex TEXT NOT NULL CHECK(sex IN ('ALL', 'FEMALE', 'MALE')),
  age_band TEXT NOT NULL,
  registered_population INTEGER NOT NULL CHECK(registered_population >= 0),
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  source_resource_id TEXT NOT NULL REFERENCES source_resources(id),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  source_row_number INTEGER NOT NULL CHECK(source_row_number > 1),
  created_at TEXT NOT NULL,
  UNIQUE(month_key, organisation_type, organisation_code, sex, age_band)
);

CREATE TABLE IF NOT EXISTS practice_monthly_mapping (
  id TEXT PRIMARY KEY,
  practice_id TEXT REFERENCES dim_practices(practice_id),
  practice_code TEXT NOT NULL,
  practice_name TEXT NOT NULL,
  practice_postcode TEXT NOT NULL,
  month_key TEXT NOT NULL,
  extract_date TEXT NOT NULL,
  pcn_code TEXT,
  pcn_name TEXT,
  ons_sub_icb_location_code TEXT NOT NULL,
  sub_icb_location_code TEXT NOT NULL,
  sub_icb_location_name TEXT NOT NULL,
  ons_icb_code TEXT NOT NULL,
  icb_code TEXT NOT NULL,
  icb_name TEXT NOT NULL,
  ons_commissioning_region_code TEXT NOT NULL,
  commissioning_region_code TEXT NOT NULL,
  commissioning_region_name TEXT NOT NULL,
  gp_system_supplier TEXT,
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  source_resource_id TEXT NOT NULL REFERENCES source_resources(id),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  source_row_number INTEGER NOT NULL CHECK(source_row_number > 1),
  created_at TEXT NOT NULL,
  UNIQUE(practice_code, month_key)
);

CREATE INDEX IF NOT EXISTS idx_practice_population_month ON practice_population_history(month_key, practice_code);
CREATE INDEX IF NOT EXISTS idx_population_age_sex_lookup ON population_age_sex_history(month_key, organisation_type, organisation_code, sex, age_band);
CREATE INDEX IF NOT EXISTS idx_practice_mapping_month ON practice_monthly_mapping(month_key, practice_code);
CREATE INDEX IF NOT EXISTS idx_practice_mapping_pcn ON practice_monthly_mapping(month_key, pcn_code);
CREATE INDEX IF NOT EXISTS idx_practice_mapping_icb ON practice_monthly_mapping(month_key, icb_code);
