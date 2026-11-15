-- A self-declared delivery location is never an approved trading identity or shipping authority.
IF OBJECT_ID(N'dbo.customer_account_addresses', N'U') IS NULL
CREATE TABLE dbo.customer_account_addresses (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  customer_id nvarchar(64) NOT NULL REFERENCES dbo.customers(id) ON DELETE CASCADE,
  address_kind nvarchar(16) NOT NULL CHECK(address_kind IN (N'delivery', N'billing')),
  label nvarchar(80) NOT NULL,
  recipient_name nvarchar(160) NOT NULL,
  contact_phone nvarchar(40) NOT NULL,
  line_1 nvarchar(200) NOT NULL,
  line_2 nvarchar(200) NULL,
  city nvarchar(120) NOT NULL,
  region nvarchar(120) NULL,
  postcode nvarchar(32) NOT NULL,
  country_code nchar(2) NOT NULL,
  delivery_instructions nvarchar(400) NULL,
  is_default bit NOT NULL CONSTRAINT DF_customer_account_addresses_default DEFAULT 0,
  status nvarchar(20) NOT NULL CONSTRAINT DF_customer_account_addresses_status DEFAULT N'pending_review'
    CHECK(status IN (N'pending_review', N'approved', N'rejected', N'disabled')),
  created_by nvarchar(160) NOT NULL,
  created_at datetime2(3) NOT NULL,
  reviewed_by nvarchar(160) NULL,
  reviewed_at datetime2(3) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_customer_account_addresses_owner' AND object_id = OBJECT_ID(N'dbo.customer_account_addresses'))
CREATE INDEX idx_customer_account_addresses_owner ON dbo.customer_account_addresses(customer_id, address_kind, status, created_at);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_customer_account_addresses_review' AND object_id = OBJECT_ID(N'dbo.customer_account_addresses'))
CREATE INDEX idx_customer_account_addresses_review ON dbo.customer_account_addresses(status, created_at);
GO
