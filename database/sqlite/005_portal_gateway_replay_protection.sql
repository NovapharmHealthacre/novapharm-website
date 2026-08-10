CREATE TABLE IF NOT EXISTS security_replay_tokens (
  token_hash TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_replay_tokens_expiry
  ON security_replay_tokens(expires_at);
