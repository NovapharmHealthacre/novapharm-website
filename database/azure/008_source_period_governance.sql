IF COL_LENGTH(N'dbo.data_source_registry', N'latest_expected_period') IS NULL
ALTER TABLE dbo.data_source_registry ADD latest_expected_period nvarchar(32) NULL;
GO

IF COL_LENGTH(N'dbo.data_source_registry', N'latest_discovered_period') IS NULL
ALTER TABLE dbo.data_source_registry ADD latest_discovered_period nvarchar(32) NULL;
GO

IF COL_LENGTH(N'dbo.data_source_registry', N'period_state_evaluated_at') IS NULL
ALTER TABLE dbo.data_source_registry ADD period_state_evaluated_at datetime2(3) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_data_source_period_state' AND object_id = OBJECT_ID(N'dbo.data_source_registry'))
CREATE INDEX IX_data_source_period_state ON dbo.data_source_registry(latest_expected_period, latest_discovered_period, status);
GO
