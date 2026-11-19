-- Pilot feedback records are NOT warehouse operational events or quality cases.
-- Only a trusted, scoped application service can write to this table.
CREATE TABLE IF NOT EXISTS wms_pilot_feedback (
  id TEXT PRIMARY KEY,
  tester_username TEXT NOT NULL,
  workspace_code TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('working','broken','needs_improvement')),
  feedback_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tester_username, workspace_code)
);
CREATE INDEX IF NOT EXISTS idx_wms_pilot_feedback_latest
  ON wms_pilot_feedback(updated_at, workspace_code);
