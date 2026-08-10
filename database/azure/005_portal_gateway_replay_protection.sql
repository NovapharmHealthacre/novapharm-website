IF OBJECT_ID(N'dbo.security_replay_tokens', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.security_replay_tokens (
    token_hash nchar(64) NOT NULL,
    purpose nvarchar(80) NOT NULL,
    expires_at datetime2(3) NOT NULL,
    consumed_at datetime2(3) NOT NULL,
    CONSTRAINT PK_security_replay_tokens PRIMARY KEY (token_hash)
  );
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_security_replay_tokens_expiry'
    AND object_id = OBJECT_ID(N'dbo.security_replay_tokens')
)
BEGIN
  CREATE INDEX IX_security_replay_tokens_expiry
    ON dbo.security_replay_tokens(expires_at);
END;
GO
