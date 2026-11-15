-- Order-time delivery destination is immutable evidence separate from mutable customer address records.
-- Legacy synthetic orders remain nullable; production acceptance must require a vetted ship-to.
ALTER TABLE orders ADD COLUMN delivery_address_id TEXT;
ALTER TABLE orders ADD COLUMN delivery_address_snapshot_json TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_customer_delivery ON orders(customer_id, delivery_address_id, created_at);
