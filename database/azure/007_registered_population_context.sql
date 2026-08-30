IF OBJECT_ID(N'dbo.practice_population_history', N'U') IS NULL
CREATE TABLE dbo.practice_population_history (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  practice_id nvarchar(64) NULL REFERENCES dbo.dim_practices(practice_id),
  practice_code nvarchar(80) NOT NULL,
  month_key char(7) NOT NULL,
  extract_date date NOT NULL,
  registered_population int NOT NULL,
  practice_postcode nvarchar(16) NOT NULL,
  sub_icb_location_code nvarchar(80) NOT NULL,
  ons_sub_icb_location_code nvarchar(80) NOT NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  source_resource_id nvarchar(64) NOT NULL REFERENCES dbo.source_resources(id),
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  source_row_number int NOT NULL,
  created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_practice_population_count CHECK(registered_population >= 0),
  CONSTRAINT CK_practice_population_row CHECK(source_row_number > 1),
  CONSTRAINT UQ_practice_population_month UNIQUE(practice_code, month_key)
);
GO

IF OBJECT_ID(N'dbo.population_age_sex_history', N'U') IS NULL
CREATE TABLE dbo.population_age_sex_history (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  practice_id nvarchar(64) NULL REFERENCES dbo.dim_practices(practice_id),
  month_key char(7) NOT NULL,
  extract_date date NOT NULL,
  organisation_type nvarchar(40) NOT NULL,
  organisation_code nvarchar(80) NOT NULL,
  ons_code nvarchar(80) NULL,
  postcode nvarchar(16) NULL,
  sex nvarchar(10) NOT NULL,
  age_band nvarchar(10) NOT NULL,
  registered_population int NOT NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  source_resource_id nvarchar(64) NOT NULL REFERENCES dbo.source_resources(id),
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  source_row_number int NOT NULL,
  created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_population_age_sex_type CHECK(organisation_type IN (N'Comm Region', N'ICB', N'SUB_ICB_LOCATION_CODE', N'PCN', N'GP')),
  CONSTRAINT CK_population_age_sex_value CHECK(registered_population >= 0),
  CONSTRAINT CK_population_age_sex_sex CHECK(sex IN (N'ALL', N'FEMALE', N'MALE')),
  CONSTRAINT CK_population_age_sex_row CHECK(source_row_number > 1),
  CONSTRAINT UQ_population_age_sex_identity UNIQUE(month_key, organisation_type, organisation_code, sex, age_band)
);
GO

IF OBJECT_ID(N'dbo.practice_monthly_mapping', N'U') IS NULL
CREATE TABLE dbo.practice_monthly_mapping (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  practice_id nvarchar(64) NULL REFERENCES dbo.dim_practices(practice_id),
  practice_code nvarchar(80) NOT NULL,
  practice_name nvarchar(600) NOT NULL,
  practice_postcode nvarchar(16) NOT NULL,
  month_key char(7) NOT NULL,
  extract_date date NOT NULL,
  pcn_code nvarchar(80) NULL,
  pcn_name nvarchar(600) NULL,
  ons_sub_icb_location_code nvarchar(80) NOT NULL,
  sub_icb_location_code nvarchar(80) NOT NULL,
  sub_icb_location_name nvarchar(600) NOT NULL,
  ons_icb_code nvarchar(80) NOT NULL,
  icb_code nvarchar(80) NOT NULL,
  icb_name nvarchar(600) NOT NULL,
  ons_commissioning_region_code nvarchar(80) NOT NULL,
  commissioning_region_code nvarchar(80) NOT NULL,
  commissioning_region_name nvarchar(600) NOT NULL,
  gp_system_supplier nvarchar(300) NULL,
  source_id nvarchar(160) NOT NULL REFERENCES dbo.data_source_registry(source_id),
  source_resource_id nvarchar(64) NOT NULL REFERENCES dbo.source_resources(id),
  ingestion_run_id nvarchar(64) NOT NULL REFERENCES dbo.ingestion_runs(id),
  source_row_number int NOT NULL,
  created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_practice_monthly_mapping_row CHECK(source_row_number > 1),
  CONSTRAINT UQ_practice_monthly_mapping_identity UNIQUE(practice_code, month_key)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_practice_population_month' AND object_id = OBJECT_ID(N'dbo.practice_population_history'))
CREATE INDEX IX_practice_population_month ON dbo.practice_population_history(month_key, practice_code);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_population_age_sex_lookup' AND object_id = OBJECT_ID(N'dbo.population_age_sex_history'))
CREATE INDEX IX_population_age_sex_lookup ON dbo.population_age_sex_history(month_key, organisation_type, organisation_code, sex, age_band);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_practice_mapping_month' AND object_id = OBJECT_ID(N'dbo.practice_monthly_mapping'))
CREATE INDEX IX_practice_mapping_month ON dbo.practice_monthly_mapping(month_key, practice_code);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_practice_mapping_pcn' AND object_id = OBJECT_ID(N'dbo.practice_monthly_mapping'))
CREATE INDEX IX_practice_mapping_pcn ON dbo.practice_monthly_mapping(month_key, pcn_code);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_practice_mapping_icb' AND object_id = OBJECT_ID(N'dbo.practice_monthly_mapping'))
CREATE INDEX IX_practice_mapping_icb ON dbo.practice_monthly_mapping(month_key, icb_code);
GO
