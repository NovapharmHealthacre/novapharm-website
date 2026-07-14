IF COL_LENGTH(N'dbo.notifications', N'attempt_count') IS NULL
BEGIN
  ALTER TABLE dbo.notifications ADD attempt_count int NOT NULL
    CONSTRAINT DF_notifications_attempts_v2 DEFAULT 0;
END
GO

IF COL_LENGTH(N'dbo.notifications', N'next_attempt_at') IS NULL
  ALTER TABLE dbo.notifications ADD next_attempt_at datetime2(3) NULL;
GO

IF COL_LENGTH(N'dbo.notifications', N'last_attempt_at') IS NULL
  ALTER TABLE dbo.notifications ADD last_attempt_at datetime2(3) NULL;
GO

IF COL_LENGTH(N'dbo.notifications', N'last_error_code') IS NULL
  ALTER TABLE dbo.notifications ADD last_error_code nvarchar(100) NULL;
GO

IF COL_LENGTH(N'dbo.notifications', N'provider_message_id') IS NULL
  ALTER TABLE dbo.notifications ADD provider_message_id nvarchar(128) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_notifications_delivery_queue' AND object_id = OBJECT_ID(N'dbo.notifications'))
  CREATE INDEX IX_notifications_delivery_queue ON dbo.notifications(channel, status, next_attempt_at, created_at);
GO
