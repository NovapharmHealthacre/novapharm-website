CREATE TABLE IF NOT EXISTS medicine_mart_build_runs (
  id TEXT PRIMARY KEY,
  dataset_scope TEXT NOT NULL CHECK(dataset_scope IN ('epd', 'pca')),
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  source_id TEXT NOT NULL REFERENCES data_source_registry(source_id),
  source_resource_id TEXT NOT NULL REFERENCES source_resources(id),
  source_ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  exact_source_sha TEXT NOT NULL,
  builder_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running', 'succeeded', 'failed', 'blocked')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  result_json TEXT,
  UNIQUE(dataset_scope, month_key, source_ingestion_run_id, builder_version)
);

CREATE TABLE IF NOT EXISTS mart_medicine_source_month (
  dataset_scope TEXT NOT NULL CHECK(dataset_scope IN ('epd', 'pca')),
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  actual_cost REAL CHECK(actual_cost IS NULL OR actual_cost >= 0),
  source_cutoff_at TEXT NOT NULL,
  source_ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  lineage_json TEXT NOT NULL,
  built_at TEXT NOT NULL,
  CHECK(dataset_scope = 'epd' OR actual_cost IS NULL),
  PRIMARY KEY(dataset_scope, month_key, medicine_id)
);

CREATE TABLE IF NOT EXISTS mart_medicine_source_geography_month (
  dataset_scope TEXT NOT NULL CHECK(dataset_scope IN ('epd', 'pca')),
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  geography_level TEXT NOT NULL,
  geography_key TEXT NOT NULL,
  geography_id TEXT REFERENCES dim_geography(geography_id),
  geography_code TEXT,
  geography_name TEXT,
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  actual_cost REAL CHECK(actual_cost IS NULL OR actual_cost >= 0),
  registered_population INTEGER CHECK(registered_population IS NULL OR registered_population >= 0),
  items_per_1000 REAL CHECK(items_per_1000 IS NULL OR items_per_1000 >= 0),
  quantity_per_1000 REAL CHECK(quantity_per_1000 IS NULL OR quantity_per_1000 >= 0),
  source_cutoff_at TEXT NOT NULL,
  source_ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  lineage_json TEXT NOT NULL,
  built_at TEXT NOT NULL,
  CHECK(dataset_scope = 'epd' OR actual_cost IS NULL),
  PRIMARY KEY(dataset_scope, month_key, medicine_id, geography_level, geography_key)
);

CREATE TABLE IF NOT EXISTS mart_medicine_source_practice_month (
  dataset_scope TEXT NOT NULL CHECK(dataset_scope = 'epd'),
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  practice_id TEXT NOT NULL REFERENCES dim_practices(practice_id),
  practice_code TEXT NOT NULL,
  practice_name TEXT NOT NULL,
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  actual_cost REAL NOT NULL CHECK(actual_cost >= 0),
  registered_population INTEGER CHECK(registered_population IS NULL OR registered_population >= 0),
  items_per_1000 REAL CHECK(items_per_1000 IS NULL OR items_per_1000 >= 0),
  quantity_per_1000 REAL CHECK(quantity_per_1000 IS NULL OR quantity_per_1000 >= 0),
  source_cutoff_at TEXT NOT NULL,
  source_ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  lineage_json TEXT NOT NULL,
  built_at TEXT NOT NULL,
  PRIMARY KEY(dataset_scope, month_key, medicine_id, practice_id)
);

CREATE TABLE IF NOT EXISTS mart_medicine_source_presentation_month (
  dataset_scope TEXT NOT NULL CHECK(dataset_scope IN ('epd', 'pca')),
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  presentation_key TEXT NOT NULL,
  presentation_code TEXT,
  presentation_name TEXT NOT NULL,
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  actual_cost REAL CHECK(actual_cost IS NULL OR actual_cost >= 0),
  source_cutoff_at TEXT NOT NULL,
  source_ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  lineage_json TEXT NOT NULL,
  built_at TEXT NOT NULL,
  CHECK(dataset_scope = 'epd' OR actual_cost IS NULL),
  PRIMARY KEY(dataset_scope, month_key, medicine_id, presentation_key)
);

CREATE TABLE IF NOT EXISTS mart_medicine_source_supplier_month (
  dataset_scope TEXT NOT NULL CHECK(dataset_scope = 'pca'),
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  supplier_name TEXT NOT NULL,
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  source_cutoff_at TEXT NOT NULL,
  source_ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  lineage_json TEXT NOT NULL,
  built_at TEXT NOT NULL,
  PRIMARY KEY(dataset_scope, month_key, medicine_id, supplier_name)
);

CREATE INDEX IF NOT EXISTS idx_source_mart_medicine_month ON mart_medicine_source_month(medicine_id, dataset_scope, month_key);
CREATE INDEX IF NOT EXISTS idx_source_mart_geography_lookup ON mart_medicine_source_geography_month(medicine_id, dataset_scope, geography_level, month_key);
CREATE INDEX IF NOT EXISTS idx_source_mart_practice_lookup ON mart_medicine_source_practice_month(medicine_id, practice_id, month_key);
CREATE INDEX IF NOT EXISTS idx_source_mart_presentation_lookup ON mart_medicine_source_presentation_month(medicine_id, dataset_scope, month_key);
CREATE INDEX IF NOT EXISTS idx_source_mart_supplier_lookup ON mart_medicine_source_supplier_month(medicine_id, supplier_name, month_key);

DROP VIEW IF EXISTS intelligence_epd_facts;
CREATE VIEW intelligence_epd_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id,
  NULL AS regional_office_code, NULL AS regional_office_name, NULL AS icb_code, NULL AS icb_name,
  NULL AS pco_code, NULL AS pco_name, practice.practice_code, practice.practice_name,
  postcode.postcode_normalised AS practice_postcode,
  NULL AS bnf_chemical_substance_code, NULL AS bnf_chemical_substance_name,
  NULL AS bnf_presentation_code, NULL AS bnf_presentation_name, medicine.snomed_code,
  fact.items, fact.quantity AS prescribed_quantity, fact.quantity, fact.quantity AS total_quantity, 0.0 AS adq_usage,
  fact.nic, fact.actual_cost, 0 AS unidentified, fact.ingestion_run_id
FROM fact_epd_prescribing fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
LEFT JOIN dim_practices practice ON practice.practice_id = fact.practice_id
LEFT JOIN dim_postcode postcode ON postcode.postcode_id = practice.postcode_id
LEFT JOIN dim_medicine medicine ON medicine.medicine_id = fact.medicine_id
WHERE run.status = 'succeeded'
UNION ALL
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id,
  fact.regional_office_code, fact.regional_office_name, fact.icb_code, fact.icb_name,
  fact.pco_code, fact.pco_name, fact.practice_code, fact.practice_name, fact.practice_postcode,
  fact.bnf_chemical_substance_code, fact.bnf_chemical_substance_name,
  fact.bnf_presentation_code, fact.bnf_presentation_name, fact.snomed_code,
  fact.items, fact.quantity AS prescribed_quantity, fact.total_quantity AS quantity, fact.total_quantity, fact.adq_usage,
  fact.nic, fact.actual_cost, fact.unidentified, fact.ingestion_run_id
FROM fact_epd_prescribing_observations fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded';

DROP VIEW IF EXISTS intelligence_pca_facts;
CREATE VIEW intelligence_pca_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.geography_id,
  NULL AS region_code, NULL AS region_name, geography.geography_code AS icb_code,
  geography.geography_name AS icb_name, NULL AS dispenser_account_type,
  NULL AS bnf_presentation_code, NULL AS bnf_presentation_name, medicine.snomed_code,
  medicine.supplier_name, medicine.unit_of_measure,
  NULL AS generic_bnf_equivalent_code, NULL AS generic_bnf_equivalent_name,
  NULL AS bnf_chemical_substance_code, NULL AS bnf_chemical_substance_name,
  NULL AS bnf_paragraph_code, NULL AS bnf_paragraph_name,
  NULL AS bnf_section_code, NULL AS bnf_section_name,
  NULL AS bnf_chapter_code, NULL AS bnf_chapter_name,
  NULL AS preparation_class, NULL AS prescribed_preparation_class,
  fact.items, fact.quantity, fact.quantity AS total_quantity, fact.nic, fact.actual_cost,
  NULL AS pharmacy_advanced_service, fact.ingestion_run_id
FROM fact_pca_community_dispensing fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
LEFT JOIN dim_geography geography ON geography.geography_id = fact.geography_id
LEFT JOIN dim_medicine medicine ON medicine.medicine_id = fact.medicine_id
WHERE run.status = 'succeeded'
UNION ALL
SELECT fact.id, fact.month_key, fact.medicine_id, fact.geography_id,
  fact.region_code, fact.region_name, fact.icb_code, fact.icb_name, fact.dispenser_account_type,
  fact.bnf_presentation_code, fact.bnf_presentation_name, fact.snomed_code,
  fact.supplier_name, fact.unit_of_measure,
  fact.generic_bnf_equivalent_code, fact.generic_bnf_equivalent_name,
  fact.bnf_chemical_substance_code, fact.bnf_chemical_substance_name,
  fact.bnf_paragraph_code, fact.bnf_paragraph_name,
  fact.bnf_section_code, fact.bnf_section_name,
  fact.bnf_chapter_code, fact.bnf_chapter_name,
  fact.preparation_class, fact.prescribed_preparation_class,
  fact.items, fact.total_quantity AS quantity, fact.total_quantity, fact.nic, NULL AS actual_cost,
  fact.pharmacy_advanced_service, fact.ingestion_run_id
FROM fact_pca_community_dispensing_observations fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded';

DROP VIEW IF EXISTS intelligence_mart_medicine_source_month;
CREATE VIEW intelligence_mart_medicine_source_month AS
SELECT mart.* FROM mart_medicine_source_month mart
JOIN ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = 'succeeded';

DROP VIEW IF EXISTS intelligence_mart_medicine_source_geography_month;
CREATE VIEW intelligence_mart_medicine_source_geography_month AS
SELECT mart.* FROM mart_medicine_source_geography_month mart
JOIN ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = 'succeeded';

DROP VIEW IF EXISTS intelligence_mart_medicine_source_practice_month;
CREATE VIEW intelligence_mart_medicine_source_practice_month AS
SELECT mart.* FROM mart_medicine_source_practice_month mart
JOIN ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = 'succeeded';

DROP VIEW IF EXISTS intelligence_mart_medicine_source_presentation_month;
CREATE VIEW intelligence_mart_medicine_source_presentation_month AS
SELECT mart.* FROM mart_medicine_source_presentation_month mart
JOIN ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = 'succeeded';

DROP VIEW IF EXISTS intelligence_mart_medicine_source_supplier_month;
CREATE VIEW intelligence_mart_medicine_source_supplier_month AS
SELECT mart.* FROM mart_medicine_source_supplier_month mart
JOIN ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = 'succeeded';
