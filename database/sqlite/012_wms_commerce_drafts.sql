-- Commercial drafts only. Never an inventory or checkout authority.
CREATE TABLE IF NOT EXISTS wms_commerce_drafts (
 sku TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision > 0),
 draft_json TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL, gtin TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wms_commerce_drafts_gtin ON wms_commerce_drafts(gtin) WHERE gtin IS NOT NULL;
