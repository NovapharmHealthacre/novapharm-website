-- Store original ship-to at order time without mutating approved customer addresses.
IF COL_LENGTH(N'dbo.orders', N'delivery_address_id') IS NULL
ALTER TABLE dbo.orders ADD delivery_address_id nvarchar(64) NULL;
GO
IF COL_LENGTH(N'dbo.orders', N'delivery_address_snapshot_json') IS NULL
ALTER TABLE dbo.orders ADD delivery_address_snapshot_json nvarchar(max) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_orders_customer_delivery' AND object_id = OBJECT_ID(N'dbo.orders'))
CREATE INDEX idx_orders_customer_delivery ON dbo.orders(customer_id, delivery_address_id, created_at);
GO
