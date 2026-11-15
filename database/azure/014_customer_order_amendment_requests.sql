-- Requests are reviewable but do not change the source order or external 3PL instructions.
IF OBJECT_ID(N'dbo.customer_order_amendment_requests', N'U') IS NULL
CREATE TABLE dbo.customer_order_amendment_requests (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  customer_id nvarchar(64) NOT NULL REFERENCES dbo.customers(id),
  order_id nvarchar(64) NOT NULL REFERENCES dbo.orders(id),
  request_kind nvarchar(40) NOT NULL CHECK(request_kind IN (N'delivery_address',N'delivery_date',N'purchase_order_reference',N'other')),
  requested_value nvarchar(500) NOT NULL,
  note nvarchar(400) NULL,
  status nvarchar(40) NOT NULL DEFAULT N'pending_review'
    CHECK(status IN (N'pending_review',N'accepted_pending_execution',N'rejected')),
  created_by nvarchar(160) NOT NULL,
  created_at datetime2(3) NOT NULL,
  reviewed_by nvarchar(160) NULL,
  reviewed_at datetime2(3) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_customer_order_amendment_owner' AND object_id = OBJECT_ID(N'dbo.customer_order_amendment_requests'))
CREATE INDEX idx_customer_order_amendment_owner
  ON dbo.customer_order_amendment_requests(customer_id, created_at);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_customer_order_amendment_queue' AND object_id = OBJECT_ID(N'dbo.customer_order_amendment_requests'))
CREATE INDEX idx_customer_order_amendment_queue
  ON dbo.customer_order_amendment_requests(status, created_at);
GO
