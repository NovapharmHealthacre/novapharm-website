import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const sql = readFileSync(new URL("../src/core/payments/payment-ledger-reference.sql", import.meta.url), "utf8");
function database() { const db = new DatabaseSync(":memory:"); db.exec(sql); return db; }
function addAttempt(db, id, orderId, state = "created", gross = 2592, currency = "GBP") {
  db.prepare(`INSERT INTO payment_attempts (
    id, order_id, customer_id, quote_version, amount_minor, currency,
    destination_country, livemode, state, reserved_stock_reference,
    quote_expires_at, created_at, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, orderId, "cust_demo_123", "quote_v1", gross, currency, "GB", 0,
    state, "reserve_demo_123", "2026-12-01T00:00:00Z",
    "2026-11-08T12:00:00Z", "2026-11-08T12:00:00Z"
  );
}
test("one collectable checkout per order; failed/expired attempt permits retry", () => {
  const db = database();
  addAttempt(db, "attempt_1", "ord_1");
  assert.throws(() => addAttempt(db, "attempt_2", "ord_1"), /UNIQUE/);
  db.prepare("UPDATE payment_attempts SET state='expired' WHERE id='attempt_1'").run();
  addAttempt(db, "attempt_2", "ord_1");
  db.prepare("UPDATE payment_attempts SET state='paid' WHERE id='attempt_2'").run();
  assert.throws(() => addAttempt(db, "attempt_3", "ord_1"), /UNIQUE/);
  addAttempt(db, "attempt_3", "ord_2");
  db.close();
});
test("provider event ids are durable and unique, and require an existing attempt", () => {
  const db = database();
  addAttempt(db, "attempt_1", "ord_1");
  const record = (eventId, attemptId = "attempt_1") => db.prepare(`INSERT INTO payment_provider_events
    (event_id,provider,attempt_id,event_type,received_at,state_before,state_after,
     processing_status,payload_sha256) VALUES (?,?,?,?,?,?,?,?,?)`).run(
    eventId, "stripe", attemptId, "checkout.session.completed",
    "2026-11-08T12:00:00Z", "checkout_pending", "paid", "applied", "a".repeat(64)
  );
  record("evt_demo_1");
  assert.throws(() => record("evt_demo_1"), /UNIQUE/);
  assert.throws(() => record("evt_demo_2", "missing_attempt"), /FOREIGN KEY/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM payment_provider_events").get().n, 1);
  db.close();
});
test("wrong currency, zero amounts, invalid states and sensitive bank/card columns are excluded", () => {
  const db = database();
  assert.throws(() => addAttempt(db, "attempt_1", "ord_1", "created", 0), /CHECK/);
  assert.throws(() => addAttempt(db, "attempt_2", "ord_1", "created", 100, "EUR"), /CHECK/);
  assert.throws(() => addAttempt(db, "attempt_3", "ord_1", "confirmed", 100), /CHECK/);
  const fields = [
    ...db.prepare("PRAGMA table_info(payment_attempts)").all(),
    ...db.prepare("PRAGMA table_info(payment_provider_events)").all()
  ].map(x => String(x.name));
  assert.equal(fields.some(x => /(?:account_number|iban|card_number|sort_code|cvv|payout_bank)/i.test(x)), false);
  db.close();
});
