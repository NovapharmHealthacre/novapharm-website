-- NovaPharm payment-attempt ledger proposal, default OFF.
-- Not an applied production migration. An authenticated server-side commerce
-- service must apply this under reviewed deployment control after #135.
-- Customer identifiers only; NO card or payout-bank details are stored here.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe' CHECK(provider = 'stripe'),
  order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  quote_version TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0 AND amount_minor <= 99999999),
  currency TEXT NOT NULL CHECK(currency = 'GBP'),
  destination_country TEXT NOT NULL CHECK(destination_country = 'GB'),
  livemode INTEGER NOT NULL CHECK(livemode IN (0,1)),
  state TEXT NOT NULL DEFAULT 'created'
    CHECK(state IN ('created','checkout_pending','paid','failed','expired','refund_pending','refunded','disputed')),
  stripe_session_id TEXT UNIQUE,
  reserved_stock_reference TEXT NOT NULL,
  quote_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  settled_at TEXT,
  UNIQUE (id, order_id, customer_id)
);

-- Ensure an order cannot simultaneously have more than one collectable attempt
-- or silently acquire a second paid record. Failed/expired attempts can retry.
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_one_collectable_per_order
  ON payment_attempts(order_id)
  WHERE state IN ('created','checkout_pending','paid','refund_pending','refunded','disputed');

CREATE INDEX IF NOT EXISTS payment_attempts_customer_order
  ON payment_attempts(customer_id,order_id);

CREATE TABLE IF NOT EXISTS payment_provider_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider = 'stripe'),
  attempt_id TEXT NOT NULL REFERENCES payment_attempts(id),
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL,
  state_before TEXT NOT NULL,
  state_after TEXT NOT NULL,
  processing_status TEXT NOT NULL CHECK(processing_status IN ('applied','ignored','review_required')),
  event_created_at TEXT,
  -- Stripe payloads can include personal data and are not stored in this table.
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256) = 64)
);

CREATE INDEX IF NOT EXISTS payment_events_attempt ON payment_provider_events(attempt_id,received_at);

-- Required application transaction:
-- BEGIN IMMEDIATE;
-- 1. INSERT event_id; if unique violation -> ACK already handled, no side effects.
-- 2. Load payment_attempt, compare session ID, amount, currency, environment,
--    order, customer and quote version.
-- 3. Enforce monotonic transitions: never downgrade paid to expired/failed.
-- 4. Update payment_attempt with compare-and-swap current state.
-- 5. Queue stock/fulfilment/invoice actions to a transactional outbox.
-- COMMIT;
-- No order is fulfilled from a browser success URL; only a verified paid event
-- whose amount, tenant and approved stock remain valid may progress an order.
