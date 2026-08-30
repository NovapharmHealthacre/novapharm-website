IF OBJECT_ID(N'dbo.fact_epd_prescribing_observations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.fact_epd_prescribing_observations (
    id nvarchar(64) NOT NULL PRIMARY KEY,
    month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
    medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
    practice_id nvarchar(64) NULL REFERENCES dbo.dim_practices(practice_id),
    regional_office_code nvarchar(64) NULL,
    regional_office_name nvarchar(256) NULL,
    icb_code nvarchar(64) NULL,
    icb_name nvarchar(256) NULL,
    pco_code nvarchar(64) NULL,
    pco_name nvarchar(256) NULL,
    practice_code nvarchar(64) NULL,
    practice_name nvarchar(256) NULL,
    practice_postcode nvarchar(16) NULL,
    bnf_chemical_substance_code nvarchar(64) NULL,
    bnf_chemical_substance_name nvarchar(512) NULL,
    bnf_presentation_code nvarchar(64) NULL,
    bnf_presentation_name nvarchar(512) NULL,
    snomed_code nvarchar(64) NULL,
    items decimal(20,4) NOT NULL CHECK(items >= 0),
    quantity decimal(20,4) NOT NULL CHECK(quantity >= 0),
    total_quantity decimal(20,4) NOT NULL CHECK(total_quantity >= 0),
    adq_usage decimal(20,4) NOT NULL CHECK(adq_usage >= 0),
    nic decimal(20,4) NOT NULL CHECK(nic >= 0),
    actual_cost decimal(20,4) NOT NULL CHECK(actual_cost >= 0),
    unidentified bit NOT NULL,
    ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
    source_row_number bigint NOT NULL CHECK(source_row_number > 1),
    source_row_digest char(64) NOT NULL,
    CONSTRAINT ck_epd_observation_practice CHECK(unidentified = 1 OR practice_id IS NOT NULL),
    CONSTRAINT uq_epd_observation_row UNIQUE(ingestion_run_id, source_row_digest)
  );
  CREATE INDEX idx_epd_observation_medicine_month ON dbo.fact_epd_prescribing_observations(medicine_id, month_key);
  CREATE INDEX idx_epd_observation_practice_month ON dbo.fact_epd_prescribing_observations(practice_id, month_key);
END;

IF OBJECT_ID(N'dbo.fact_pca_community_dispensing_observations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.fact_pca_community_dispensing_observations (
    id nvarchar(64) NOT NULL PRIMARY KEY,
    month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
    medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
    geography_id nvarchar(64) NULL REFERENCES dbo.dim_geography(geography_id),
    region_code nvarchar(64) NULL,
    region_name nvarchar(256) NULL,
    icb_code nvarchar(64) NULL,
    icb_name nvarchar(256) NULL,
    dispenser_account_type nvarchar(128) NULL,
    bnf_presentation_code nvarchar(64) NULL,
    bnf_presentation_name nvarchar(512) NULL,
    snomed_code nvarchar(64) NULL,
    supplier_name nvarchar(256) NULL,
    unit_of_measure nvarchar(128) NULL,
    generic_bnf_equivalent_code nvarchar(64) NULL,
    generic_bnf_equivalent_name nvarchar(512) NULL,
    bnf_chemical_substance_code nvarchar(64) NULL,
    bnf_chemical_substance_name nvarchar(512) NULL,
    bnf_paragraph_code nvarchar(64) NULL,
    bnf_paragraph_name nvarchar(512) NULL,
    bnf_section_code nvarchar(64) NULL,
    bnf_section_name nvarchar(512) NULL,
    bnf_chapter_code nvarchar(64) NULL,
    bnf_chapter_name nvarchar(512) NULL,
    preparation_class nvarchar(128) NULL,
    prescribed_preparation_class nvarchar(128) NULL,
    items decimal(20,4) NOT NULL CHECK(items >= 0),
    total_quantity decimal(20,4) NOT NULL CHECK(total_quantity >= 0),
    nic decimal(20,4) NOT NULL CHECK(nic >= 0),
    pharmacy_advanced_service nvarchar(256) NULL,
    ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
    source_row_number bigint NOT NULL CHECK(source_row_number > 1),
    source_row_digest char(64) NOT NULL,
    CONSTRAINT uq_pca_observation_row UNIQUE(ingestion_run_id, source_row_digest)
  );
  CREATE INDEX idx_pca_observation_medicine_month ON dbo.fact_pca_community_dispensing_observations(medicine_id, month_key);
  CREATE INDEX idx_pca_observation_geography_month ON dbo.fact_pca_community_dispensing_observations(geography_id, month_key);
END;

CREATE OR ALTER VIEW dbo.intelligence_epd_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id, fact.items, fact.quantity, fact.nic, fact.actual_cost, fact.ingestion_run_id
FROM dbo.fact_epd_prescribing fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded'
UNION ALL
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id, fact.items, fact.total_quantity AS quantity, fact.nic, fact.actual_cost, fact.ingestion_run_id
FROM dbo.fact_epd_prescribing_observations fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded';

CREATE OR ALTER VIEW dbo.intelligence_pca_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.geography_id, fact.items, fact.quantity, fact.nic, fact.actual_cost, fact.ingestion_run_id
FROM dbo.fact_pca_community_dispensing fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded'
UNION ALL
SELECT fact.id, fact.month_key, fact.medicine_id, fact.geography_id, fact.items, fact.total_quantity AS quantity, fact.nic, CAST(NULL AS decimal(20,4)) AS actual_cost, fact.ingestion_run_id
FROM dbo.fact_pca_community_dispensing_observations fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = 'succeeded';
