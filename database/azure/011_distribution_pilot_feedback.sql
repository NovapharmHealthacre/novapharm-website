-- Non-operational user acceptance feedback; no physical stock or QMS disposition.
IF OBJECT_ID(N'dbo.wms_pilot_feedback', N'U') IS NULL
CREATE TABLE dbo.wms_pilot_feedback (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  tester_username nvarchar(160) NOT NULL,
  workspace_code nvarchar(64) NOT NULL,
  result nvarchar(32) NOT NULL,
  feedback_note nvarchar(600) NOT NULL DEFAULT N'',
  created_at datetime2(3) NOT NULL,
  updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_wms_pilot_feedback_result CHECK(result IN (N'working', N'broken', N'needs_improvement')),
  CONSTRAINT UQ_wms_pilot_feedback_user_workspace UNIQUE(tester_username, workspace_code)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_wms_pilot_feedback_latest' AND object_id = OBJECT_ID(N'dbo.wms_pilot_feedback'))
CREATE INDEX IX_wms_pilot_feedback_latest ON dbo.wms_pilot_feedback(updated_at, workspace_code);
GO
