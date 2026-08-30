ALTER TABLE data_source_registry ADD COLUMN latest_expected_period TEXT;
ALTER TABLE data_source_registry ADD COLUMN latest_discovered_period TEXT;
ALTER TABLE data_source_registry ADD COLUMN period_state_evaluated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_data_source_period_state ON data_source_registry(latest_expected_period, latest_discovered_period, status);
