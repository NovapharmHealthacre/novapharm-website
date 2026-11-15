-- Customer-entered addresses are not proof of business identity or permission to ship.
-- New entries remain non-fulfillable until an authorised administrator approves them.
CREATE TABLE IF NOT EXISTS customer_account_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_kind TEXT NOT NULL CHECK(address_kind IN ('delivery', 'billing')),
  label TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  line_1 TEXT NOT NULL,
  line_2 TEXT,
  city TEXT NOT NULL,
  region TEXT,
  postcode TEXT NOT NULL,
  country_code TEXT NOT NULL,
  delivery_instructions TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review', 'approved', 'rejected', 'disabled')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_account_addresses_owner ON customer_account_addresses(customer_id, address_kind, status, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_account_addresses_review ON customer_account_addresses(status, created_at);
