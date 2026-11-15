-- Preserve prior approved locations until a replacement passes separate customer-ops review.
-- Existing order-time address snapshots must not change when a location is superseded.
ALTER TABLE customer_account_addresses
  ADD COLUMN replaces_address_id TEXT REFERENCES customer_account_addresses(id);
CREATE INDEX IF NOT EXISTS idx_customer_address_replacements
  ON customer_account_addresses(replaces_address_id, status);
