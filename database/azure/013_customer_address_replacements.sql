-- Customer-initiated updates are new reviewed versions, not in-place edits to a prior order ship-to.
IF COL_LENGTH(N'dbo.customer_account_addresses', N'replaces_address_id') IS NULL
ALTER TABLE dbo.customer_account_addresses
  ADD replaces_address_id nvarchar(64) NULL;
GO
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_customer_address_replaces'
    AND parent_object_id = OBJECT_ID(N'dbo.customer_account_addresses')
)
ALTER TABLE dbo.customer_account_addresses
  ADD CONSTRAINT FK_customer_address_replaces FOREIGN KEY (replaces_address_id)
  REFERENCES dbo.customer_account_addresses(id);
GO
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'idx_customer_address_replacements'
    AND object_id = OBJECT_ID(N'dbo.customer_account_addresses')
)
CREATE INDEX idx_customer_address_replacements
  ON dbo.customer_account_addresses(replaces_address_id, status);
GO
