CREATE TABLE IF NOT EXISTS fact_epd_prescribing_observations (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  practice_id TEXT REFERENCES dim_practices(practice_id),
  regional_office_code TEXT,
  regional_office_name TEXT,
  icb_code TEXT,
  icb_name TEXT,
  pco_code TEXT,
  pco_name TEXT,
  practice_code TEXT,
  practice_name TEXT,
  practice_postcode TEXT,
  bnf_chemical_substance_code TEXT,
  bnf_chemical_substance_name TEXT,
  bnf_presentation_code TEXT,
  bnf_presentation_name TEXT,
  snomed_code TEXT,
  items REAL NOT NULL CHECK(items >= 0),
  quantity REAL NOT NULL CHECK(quantity >= 0),
  total_quantity REAL NOT NULL CHECK(total_quantity >= 0),
  adq_usage REAL NOT NULL CHECK(adq_usage >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  actual_cost REAL NOT NULL CHECK(actual_cost >= 0),
  unidentified INTEGER NOT NULL CHECK(unidentified IN (0, 1)),
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  source_row_number INTEGER NOT NULL CHECK(source_row_number > 1),
  source_row_digest TEXT NOT NULL,
  CHECK(unidentified = 1 OR practice_id IS NOT NULL),
  UNIQUE(ingestion_run_id, source_row_digest)
);

CREATE TABLE IF NOT EXISTS fact_pca_community_dispensing_observations (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL REFERENCES dim_time(month_key),
  medicine_id TEXT NOT NULL REFERENCES dim_medicine(medicine_id),
  geography_id TEXT REFERENCES dim_geography(geography_id),
  region_code TEXT,
  region_name TEXT,
  icb_code TEXT,
  icb_name TEXT,
  dispenser_account_type TEXT,
  bnf_presentation_code TEXT,
  bnf_presentation_name TEXT,
  snomed_code TEXT,
  supplier_name TEXT,
  unit_of_measure TEXT,
  generic_bnf_equivalent_code TEXT,
  generic_bnf_equivalent_name TEXT,
  bnf_chemical_substance_code TEXT,
  bnf_chemical_substance_name TEXT,
  bnf_paragraph_code TEXT,
  bnf_paragraph_name TEXT,
  bnf_section_code TEXT,
  bnf_section_name TEXT,
  bnf_chapter_code TEXT,
  bnf_chapter_name TEXT,
  preparation_class TEXT,
  prescribed_preparation_class TEXT,
  items REAL NOT NULL CHECK(items >= 0),
  total_quantity REAL NOT NULL CHECK(total_quantity >= 0),
  nic REAL NOT NULL CHECK(nic >= 0),
  pharmacy_advanced_service TEXT,
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  source_row_number INTEGER NOT NULL CHECK(source_row_number > 1),
  source_row_digest TEXT NOT NULL,
  UNIQUE(ingestion_run_id, source_row_digest)
);

CREATE INDEX IF NOT EXISTS idx_epd_observation_medicine_month ON fact_epd_prescribing_observations(medicine_id, month_key);
CREATE INDEX IF NOT EXISTS idx_epd_observation_practice_month ON fact_epd_prescribing_observations(practice_id, month_key);
CREATE INDEX IF NOT EXISTS idx_pca_observation_medicine_month ON fact_pca_community_dispensing_observations(medicine_id, month_key);
CREATE INDEX IF NOT EXISTS idx_pca_observation_geography_month ON fact_pca_community_dispensing_observations(geography_id, month_key);

DROP VIEW IF EXISTS intelligence_epd_facts;
CREATE VIEW intelligence_epd_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id, fact.items, fact.quantity, fact.nic, fact.actual_cost, fact.ingestion_run_id
FROM fact_epd_prescribing fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded'
UNION ALL
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id, fact.items, fact.total_quantity AS quantity, fact.nic, fact.actual_cost, fact.ingestion_run_id
FROM fact_epd_prescribing_observations fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded';

DROP VIEW IF EXISTS intelligence_pca_facts;
CREATE VIEW intelligence_pca_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.geography_id, fact.items, fact.quantity, fact.nic, fact.actual_cost, fact.ingestion_run_id
FROM fact_pca_community_dispensing fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded'
UNION ALL
SELECT fact.id, fact.month_key, fact.medicine_id, fact.geography_id, fact.items, fact.total_quantity AS quantity, fact.nic, NULL AS actual_cost, fact.ingestion_run_id
FROM fact_pca_community_dispensing_observations fact
JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded';
