-- Commercial drafts only. Never an inventory or checkout authority.
IF OBJECT_ID(N'dbo.wms_commerce_drafts', N'U') IS NULL
CREATE TABLE dbo.wms_commerce_drafts (
 sku nvarchar(64) NOT NULL PRIMARY KEY, revision int NOT NULL CHECK(revision > 0),
 draft_json nvarchar(max) NOT NULL, updated_by nvarchar(160) NOT NULL, updated_at datetime2(3) NOT NULL, gtin nvarchar(14) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_wms_commerce_drafts_gtin' AND object_id=OBJECT_ID(N'dbo.wms_commerce_drafts'))
CREATE UNIQUE INDEX IX_wms_commerce_drafts_gtin ON dbo.wms_commerce_drafts(gtin) WHERE gtin IS NOT NULL;
GO
