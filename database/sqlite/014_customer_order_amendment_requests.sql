-- Customer order amendments require operational acceptance; requested changes never silently mutate a paid order.
CREATE TABLE IF NOT EXISTS customer_order_amendment_requests (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  request_kind TEXT NOT NULL CHECK(request_kind IN ('delivery_address','delivery_date','purchase_order_reference','other')),
  requested_value TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','accepted_pending_execution','rejected')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_order_amendment_owner
  ON customer_order_amendment_requests(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_order_amendment_queue
  ON customer_order_amendment_requests(status, created_at);
