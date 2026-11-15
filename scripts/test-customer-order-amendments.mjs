import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("customer order history and amendments are tenant-scoped and never silently modify orders", async () => {
  const root = mkdtempSync(join(tmpdir(), "novapharm-order-changes-"));
  const original = {
    DATABASE_PATH: process.env.DATABASE_PATH,
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    CUSTOMER_ORDER_AMENDMENTS_ENABLED: process.env.CUSTOMER_ORDER_AMENDMENTS_ENABLED,
    NODE_ENV: process.env.NODE_ENV
  };
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_PATH = join(root, "orders.sqlite");
  process.env.CUSTOMER_ORDER_AMENDMENTS_ENABLED = "true";
  process.env.NODE_ENV = "test";
  let close;
  try {
    const db = await import("../src/data/database.mjs");
    const amendments = await import("../src/core/customer-order-amendments.mjs");
    close = db.closeDatabase;
    const createdAt = db.nowIso();
    for (const [id, name] of [["org-one", "First UK Customer"], ["org-two", "Second UK Customer"]]) {
      await db.run(`INSERT INTO organizations(id, legal_name, country_code, created_at, created_by, updated_at, updated_by)
        VALUES(?, ?, 'GB', ?, 'fixture', ?, 'fixture')`, id, name, createdAt, createdAt);
    }
    const c1 = "customer-one-000001", c2 = "customer-two-000002", orderId = "order-one-000000001";
    for (const [id, org, number] of [[c1, "org-one", "NP-C100"], [c2, "org-two", "NP-C200"]]) {
      await db.run(`INSERT INTO customers(id, organization_id, customer_number, customer_type, lifecycle_status,
        created_at, created_by, updated_at, updated_by)
        VALUES(?, ?, ?, 'business', 'active', ?, 'fixture', ?, 'fixture')`,
        id, org, number, createdAt, createdAt);
    }
    await db.run(`INSERT INTO orders(id, order_number, customer_id, status, subtotal_minor, total_minor,
      created_at, created_by, updated_at, updated_by)
      VALUES(?, 'SO-2026-000123', ?, 'submitted', 1125, 1125, ?, 'fixture', ?, 'fixture')`,
      orderId, c1, createdAt, createdAt);
    const owner = { username: "buyer-one@example.invalid", accessType: "customer",
      accessScopes: ["customer"], customerId: c1 };
    const foreign = { username: "buyer-two@example.invalid", accessType: "customer",
      accessScopes: ["customer"], customerId: c2 };
    const overview = await amendments.customerOrderOverview(owner);
    assert.equal(overview.orders.length, 1);
    assert.equal(overview.orders[0].order_number, "SO-2026-000123");
    assert.equal(overview.orders[0].total_minor, 1125);
    assert.equal(overview.orders[0].shipTo, null);
    assert.equal((await amendments.customerOrderOverview(foreign)).orders.length, 0);
    await assert.rejects(amendments.customerOrderOverview({ ...owner, accessType: "employee" }),
      /linked customer account/);
    const day = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const payload = { orderId, requestKind: "delivery_date", value: day, note: "Please confirm availability" };
    const request = await amendments.submitCustomerOrderAmendment(payload, owner);
    assert.equal(request.status, "pending_review");
    assert.equal(request.orderNumber, "SO-2026-000123");
    await assert.rejects(amendments.submitCustomerOrderAmendment(payload, owner), /already awaiting review/);
    await assert.rejects(amendments.submitCustomerOrderAmendment(payload, foreign), /not found for this account/);
    await assert.rejects(amendments.submitCustomerOrderAmendment({ ...payload, value: "2026-02-30" }, owner),
      /date/);
    assert.equal((await amendments.pendingCustomerOrderAmendments()).requests.length, 1);
    const accepted = await amendments.decideCustomerOrderAmendment(request.id, "accept", "owner");
    assert.equal(accepted.status, "accepted_pending_execution");
    assert.equal((await db.one("SELECT requested_delivery_date FROM orders WHERE id = ?", orderId)).requested_delivery_date,
      null, "Approving a request must not silently rewrite a confirmed order.");
    assert.equal((await amendments.pendingCustomerOrderAmendments()).requests.length, 0);
    const reference = await amendments.submitCustomerOrderAmendment({
      orderId, requestKind: "purchase_order_reference", value: "PO-CUSTOMER-248"
    }, owner);
    assert.equal((await amendments.decideCustomerOrderAmendment(reference.id, "reject", "owner")).status, "rejected");
    assert.equal((await amendments.customerOrderOverview(owner)).amendments.length, 2);
    assert.equal((await amendments.customerOrderOverview(foreign)).amendments.length, 0);
    await db.run(`INSERT INTO shipments(id, shipment_number, order_id, status, created_at, updated_at)
      VALUES('shipment-one', 'SHIP-000001', ?, 'planned', ?, ?)`, orderId, createdAt, createdAt);
    await assert.rejects(amendments.submitCustomerOrderAmendment({
      orderId, requestKind: "other", value: "Please change the buyer's receiving instructions"
    }, owner), /Warehouse fulfilment has started/);
    const history = await amendments.customerOrderOverview(owner);
    assert.equal(history.orders[0].shipments.length, 1);
    const audit = await db.all("SELECT action FROM audit_logs WHERE action LIKE 'customer.order.amendment_%'");
    assert.ok(audit.some(x => x.action === "customer.order.amendment_requested"));
    assert.ok(audit.some(x => x.action === "customer.order.amendment_reviewed"));
    process.env.CUSTOMER_ORDER_AMENDMENTS_ENABLED = "false";
    assert.equal((await amendments.customerOrderOverview(owner)).amendmentsEnabled, false);
    await assert.rejects(amendments.submitCustomerOrderAmendment(payload, owner), /await secure production activation/);
    assert.equal((await amendments.pendingCustomerOrderAmendments()).amendmentsEnabled, false);
  } finally {
    if (close) await close();
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
});
