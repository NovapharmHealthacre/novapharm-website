IF OBJECT_ID(N'dbo.medicine_mart_build_runs', N'U') IS NULL
CREATE TABLE dbo.medicine_mart_build_runs (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  dataset_scope nvarchar(8) NOT NULL,
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  source_resource_id nvarchar(64) NOT NULL REFERENCES dbo.source_resources(id),
  source_ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  exact_source_sha char(64) NOT NULL,
  builder_version nvarchar(80) NOT NULL,
  status nvarchar(16) NOT NULL,
  started_at datetime2(3) NOT NULL,
  completed_at datetime2(3) NULL,
  result_json nvarchar(max) NULL,
  CONSTRAINT CK_medicine_mart_build_scope CHECK(dataset_scope IN (N'epd', N'pca')),
  CONSTRAINT CK_medicine_mart_build_status CHECK(status IN (N'running', N'succeeded', N'failed', N'blocked')),
  CONSTRAINT UQ_medicine_mart_build UNIQUE(dataset_scope, month_key, source_ingestion_run_id, builder_version)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_source_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_source_month (
  dataset_scope nvarchar(8) NOT NULL,
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL,
  nic decimal(19,4) NOT NULL,
  actual_cost decimal(19,4) NULL,
  source_cutoff_at datetime2(3) NOT NULL,
  source_ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  lineage_json nvarchar(max) NOT NULL,
  built_at datetime2(3) NOT NULL,
  CONSTRAINT PK_mart_medicine_source_month PRIMARY KEY(dataset_scope, month_key, medicine_id),
  CONSTRAINT CK_mart_medicine_source_month_scope CHECK(dataset_scope IN (N'epd', N'pca')),
  CONSTRAINT CK_mart_medicine_source_month_values CHECK(items >= 0 AND quantity >= 0 AND nic >= 0 AND (actual_cost IS NULL OR actual_cost >= 0)),
  CONSTRAINT CK_mart_medicine_source_month_cost CHECK(dataset_scope = N'epd' OR actual_cost IS NULL)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_source_geography_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_source_geography_month (
  dataset_scope nvarchar(8) NOT NULL,
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  geography_level nvarchar(80) NOT NULL,
  geography_key nvarchar(160) NOT NULL,
  geography_id nvarchar(64) NULL REFERENCES dbo.dim_geography(geography_id),
  geography_code nvarchar(80) NULL,
  geography_name nvarchar(600) NULL,
  items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL,
  nic decimal(19,4) NOT NULL,
  actual_cost decimal(19,4) NULL,
  registered_population int NULL,
  items_per_1000 decimal(19,6) NULL,
  quantity_per_1000 decimal(19,6) NULL,
  source_cutoff_at datetime2(3) NOT NULL,
  source_ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  lineage_json nvarchar(max) NOT NULL,
  built_at datetime2(3) NOT NULL,
  CONSTRAINT PK_mart_medicine_source_geography PRIMARY KEY(dataset_scope, month_key, medicine_id, geography_level, geography_key),
  CONSTRAINT CK_mart_medicine_source_geography_scope CHECK(dataset_scope IN (N'epd', N'pca')),
  CONSTRAINT CK_mart_medicine_source_geography_values CHECK(items >= 0 AND quantity >= 0 AND nic >= 0 AND (actual_cost IS NULL OR actual_cost >= 0) AND (registered_population IS NULL OR registered_population >= 0) AND (items_per_1000 IS NULL OR items_per_1000 >= 0) AND (quantity_per_1000 IS NULL OR quantity_per_1000 >= 0)),
  CONSTRAINT CK_mart_medicine_source_geography_cost CHECK(dataset_scope = N'epd' OR actual_cost IS NULL)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_source_practice_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_source_practice_month (
  dataset_scope nvarchar(8) NOT NULL,
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  practice_id nvarchar(64) NOT NULL REFERENCES dbo.dim_practices(practice_id),
  practice_code nvarchar(80) NOT NULL,
  practice_name nvarchar(600) NOT NULL,
  items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL,
  nic decimal(19,4) NOT NULL,
  actual_cost decimal(19,4) NOT NULL,
  registered_population int NULL,
  items_per_1000 decimal(19,6) NULL,
  quantity_per_1000 decimal(19,6) NULL,
  source_cutoff_at datetime2(3) NOT NULL,
  source_ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  lineage_json nvarchar(max) NOT NULL,
  built_at datetime2(3) NOT NULL,
  CONSTRAINT PK_mart_medicine_source_practice PRIMARY KEY(dataset_scope, month_key, medicine_id, practice_id),
  CONSTRAINT CK_mart_medicine_source_practice_scope CHECK(dataset_scope = N'epd'),
  CONSTRAINT CK_mart_medicine_source_practice_values CHECK(items >= 0 AND quantity >= 0 AND nic >= 0 AND actual_cost >= 0 AND (registered_population IS NULL OR registered_population >= 0) AND (items_per_1000 IS NULL OR items_per_1000 >= 0) AND (quantity_per_1000 IS NULL OR quantity_per_1000 >= 0))
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_source_presentation_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_source_presentation_month (
  dataset_scope nvarchar(8) NOT NULL,
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  presentation_key nvarchar(240) NOT NULL,
  presentation_code nvarchar(160) NULL,
  presentation_name nvarchar(600) NOT NULL,
  items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL,
  nic decimal(19,4) NOT NULL,
  actual_cost decimal(19,4) NULL,
  source_cutoff_at datetime2(3) NOT NULL,
  source_ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  lineage_json nvarchar(max) NOT NULL,
  built_at datetime2(3) NOT NULL,
  CONSTRAINT PK_mart_medicine_source_presentation PRIMARY KEY(dataset_scope, month_key, medicine_id, presentation_key),
  CONSTRAINT CK_mart_medicine_source_presentation_scope CHECK(dataset_scope IN (N'epd', N'pca')),
  CONSTRAINT CK_mart_medicine_source_presentation_values CHECK(items >= 0 AND quantity >= 0 AND nic >= 0 AND (actual_cost IS NULL OR actual_cost >= 0)),
  CONSTRAINT CK_mart_medicine_source_presentation_cost CHECK(dataset_scope = N'epd' OR actual_cost IS NULL)
);
GO

IF OBJECT_ID(N'dbo.mart_medicine_source_supplier_month', N'U') IS NULL
CREATE TABLE dbo.mart_medicine_source_supplier_month (
  dataset_scope nvarchar(8) NOT NULL,
  month_key char(7) NOT NULL REFERENCES dbo.dim_time(month_key),
  medicine_id nvarchar(64) NOT NULL REFERENCES dbo.dim_medicine(medicine_id),
  supplier_name nvarchar(300) NOT NULL,
  items decimal(19,4) NOT NULL,
  quantity decimal(19,4) NOT NULL,
  nic decimal(19,4) NOT NULL,
  source_cutoff_at datetime2(3) NOT NULL,
  source_ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  lineage_json nvarchar(max) NOT NULL,
  built_at datetime2(3) NOT NULL,
  CONSTRAINT PK_mart_medicine_source_supplier PRIMARY KEY(dataset_scope, month_key, medicine_id, supplier_name),
  CONSTRAINT CK_mart_medicine_source_supplier_scope CHECK(dataset_scope = N'pca'),
  CONSTRAINT CK_mart_medicine_source_supplier_values CHECK(items >= 0 AND quantity >= 0 AND nic >= 0)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_source_mart_medicine_month' AND object_id = OBJECT_ID(N'dbo.mart_medicine_source_month'))
CREATE INDEX IX_source_mart_medicine_month ON dbo.mart_medicine_source_month(medicine_id, dataset_scope, month_key);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_source_mart_geography_lookup' AND object_id = OBJECT_ID(N'dbo.mart_medicine_source_geography_month'))
CREATE INDEX IX_source_mart_geography_lookup ON dbo.mart_medicine_source_geography_month(medicine_id, dataset_scope, geography_level, month_key);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_source_mart_practice_lookup' AND object_id = OBJECT_ID(N'dbo.mart_medicine_source_practice_month'))
CREATE INDEX IX_source_mart_practice_lookup ON dbo.mart_medicine_source_practice_month(medicine_id, practice_id, month_key);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_source_mart_presentation_lookup' AND object_id = OBJECT_ID(N'dbo.mart_medicine_source_presentation_month'))
CREATE INDEX IX_source_mart_presentation_lookup ON dbo.mart_medicine_source_presentation_month(medicine_id, dataset_scope, month_key);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_source_mart_supplier_lookup' AND object_id = OBJECT_ID(N'dbo.mart_medicine_source_supplier_month'))
CREATE INDEX IX_source_mart_supplier_lookup ON dbo.mart_medicine_source_supplier_month(medicine_id, supplier_name, month_key);
GO

CREATE OR ALTER VIEW dbo.intelligence_epd_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id,
  CAST(NULL AS nvarchar(80)) AS regional_office_code, CAST(NULL AS nvarchar(600)) AS regional_office_name,
  CAST(NULL AS nvarchar(80)) AS icb_code, CAST(NULL AS nvarchar(600)) AS icb_name,
  CAST(NULL AS nvarchar(80)) AS pco_code, CAST(NULL AS nvarchar(600)) AS pco_name,
  practice.practice_code, practice.practice_name, postcode.postcode_normalised AS practice_postcode,
  CAST(NULL AS nvarchar(160)) AS bnf_chemical_substance_code, CAST(NULL AS nvarchar(600)) AS bnf_chemical_substance_name,
  CAST(NULL AS nvarchar(160)) AS bnf_presentation_code, CAST(NULL AS nvarchar(600)) AS bnf_presentation_name,
  medicine.snomed_code, fact.items, fact.quantity AS prescribed_quantity, fact.quantity, fact.quantity AS total_quantity,
  CAST(0 AS decimal(20,4)) AS adq_usage, fact.nic, fact.actual_cost, CAST(0 AS bit) AS unidentified,
  fact.ingestion_run_id
FROM dbo.fact_epd_prescribing fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
LEFT JOIN dbo.dim_practices practice ON practice.practice_id = fact.practice_id
LEFT JOIN dbo.dim_postcode postcode ON postcode.postcode_id = practice.postcode_id
LEFT JOIN dbo.dim_medicine medicine ON medicine.medicine_id = fact.medicine_id
WHERE run.status = N'succeeded'
UNION ALL
SELECT fact.id, fact.month_key, fact.medicine_id, fact.practice_id,
  fact.regional_office_code, fact.regional_office_name, fact.icb_code, fact.icb_name,
  fact.pco_code, fact.pco_name, fact.practice_code, fact.practice_name, fact.practice_postcode,
  fact.bnf_chemical_substance_code, fact.bnf_chemical_substance_name,
  fact.bnf_presentation_code, fact.bnf_presentation_name, fact.snomed_code,
  fact.items, fact.quantity AS prescribed_quantity, fact.total_quantity AS quantity, fact.total_quantity, fact.adq_usage, fact.nic, fact.actual_cost,
  fact.unidentified, fact.ingestion_run_id
FROM dbo.fact_epd_prescribing_observations fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = N'succeeded';
GO

CREATE OR ALTER VIEW dbo.intelligence_pca_facts AS
SELECT fact.id, fact.month_key, fact.medicine_id, fact.geography_id,
  CAST(NULL AS nvarchar(80)) AS region_code, CAST(NULL AS nvarchar(600)) AS region_name,
  geography.geography_code AS icb_code, geography.geography_name AS icb_name,
  CAST(NULL AS nvarchar(120)) AS dispenser_account_type,
  CAST(NULL AS nvarchar(160)) AS bnf_presentation_code, CAST(NULL AS nvarchar(600)) AS bnf_presentation_name,
  medicine.snomed_code, medicine.supplier_name, medicine.unit_of_measure,
  CAST(NULL AS nvarchar(160)) AS generic_bnf_equivalent_code, CAST(NULL AS nvarchar(600)) AS generic_bnf_equivalent_name,
  CAST(NULL AS nvarchar(160)) AS bnf_chemical_substance_code, CAST(NULL AS nvarchar(600)) AS bnf_chemical_substance_name,
  CAST(NULL AS nvarchar(80)) AS bnf_paragraph_code, CAST(NULL AS nvarchar(600)) AS bnf_paragraph_name,
  CAST(NULL AS nvarchar(80)) AS bnf_section_code, CAST(NULL AS nvarchar(600)) AS bnf_section_name,
  CAST(NULL AS nvarchar(80)) AS bnf_chapter_code, CAST(NULL AS nvarchar(600)) AS bnf_chapter_name,
  CAST(NULL AS nvarchar(120)) AS preparation_class, CAST(NULL AS nvarchar(120)) AS prescribed_preparation_class,
  fact.items, fact.quantity, fact.quantity AS total_quantity, fact.nic, fact.actual_cost,
  CAST(NULL AS nvarchar(300)) AS pharmacy_advanced_service, fact.ingestion_run_id
FROM dbo.fact_pca_community_dispensing fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
LEFT JOIN dbo.dim_geography geography ON geography.geography_id = fact.geography_id
LEFT JOIN dbo.dim_medicine medicine ON medicine.medicine_id = fact.medicine_id
WHERE run.status = N'succeeded'
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
  fact.items, fact.total_quantity AS quantity, fact.total_quantity, fact.nic, CAST(NULL AS decimal(20,4)) AS actual_cost,
  fact.pharmacy_advanced_service, fact.ingestion_run_id
FROM dbo.fact_pca_community_dispensing_observations fact
JOIN dbo.ingestion_runs run ON run.id = fact.ingestion_run_id
WHERE run.status = N'succeeded';
GO

CREATE OR ALTER VIEW dbo.intelligence_mart_medicine_source_month AS
SELECT mart.* FROM dbo.mart_medicine_source_month mart
JOIN dbo.ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = N'succeeded';
GO

CREATE OR ALTER VIEW dbo.intelligence_mart_medicine_source_geography_month AS
SELECT mart.* FROM dbo.mart_medicine_source_geography_month mart
JOIN dbo.ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = N'succeeded';
GO

CREATE OR ALTER VIEW dbo.intelligence_mart_medicine_source_practice_month AS
SELECT mart.* FROM dbo.mart_medicine_source_practice_month mart
JOIN dbo.ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = N'succeeded';
GO

CREATE OR ALTER VIEW dbo.intelligence_mart_medicine_source_presentation_month AS
SELECT mart.* FROM dbo.mart_medicine_source_presentation_month mart
JOIN dbo.ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = N'succeeded';
GO

CREATE OR ALTER VIEW dbo.intelligence_mart_medicine_source_supplier_month AS
SELECT mart.* FROM dbo.mart_medicine_source_supplier_month mart
JOIN dbo.ingestion_runs run ON run.id = mart.source_ingestion_run_id
WHERE run.status = N'succeeded';
GO
