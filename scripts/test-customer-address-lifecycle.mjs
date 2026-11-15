import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("address lifecycle: verified customer owns changes and approved ship-to is immutable", async () => {
  const root = mkdtempSync(join(tmpdir(), "novapharm-address-lifecycle-"));
  const original = {
    DATABASE_PATH: process.env.DATABASE_PATH,
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    CUSTOMER_ADDRESS_REQUESTS_ENABLED: process.env.CUSTOMER_ADDRESS_REQUESTS_ENABLED,
    NODE_ENV: process.env.NODE_ENV,
  };
  const set = (name, value) => { process.env[name] = value; };
  set("DATABASE_PROVIDER", "sqlite");
  set("DATABASE_PATH", join(root, "customer-addresses.sqlite"));
  set("CUSTOMER_ADDRESS_REQUESTS_ENABLED", "true");
  set("NODE_ENV", "test");
  let closeDatabase;
  try {
    const database = await import("../src/data/database.mjs");
    const address = await import("../src/core/customer-address-service.mjs");
    const { resolveCustomerShipTo } = await import("../src/core/customer-delivery-destination.mjs");
    closeDatabase = database.closeDatabase;
    const createdAt = "2026-11-15T00:00:00.000Z";
    for (const [id, name] of [["organisation-one", "Example Company One"], ["organisation-two", "Example Company Two"]]) {
      await database.run(`INSERT INTO organizations
        (id, legal_name, company_number, country_code, created_at, created_by, updated_at, updated_by)
        VALUES(?, ?, ?, 'GB', ?, 'fixture', ?, 'fixture')`,
        id, name, id + "-registered", createdAt, createdAt);
    }
    const customerOne = "customer-one-000001", customerTwo = "customer-two-000002";
    for (const [id, org, number] of [
      [customerOne, "organisation-one", "NP-CUST-101"],
      [customerTwo, "organisation-two", "NP-CUST-102"]
    ]) {
      await database.run(`INSERT INTO customers
        (id, organization_id, customer_number, customer_type, lifecycle_status,
         created_at, created_by, updated_at, updated_by)
        VALUES(?, ?, ?, 'business', 'active', ?, 'fixture', ?, 'fixture')`,
        id, org, number, createdAt, createdAt);
    }
    await database.run(`INSERT INTO customer_contacts
      (id, customer_id, name, role_title, email, is_primary, status, created_at, updated_at)
      VALUES('contact-one', ?, 'Warehouse Buyer', 'Procurement', 'buyer@example.invalid', 1, 'active', ?, ?)`,
      customerOne, createdAt, createdAt);
    const sessionOne = {
      username: "buyer-one@example.invalid", accessType: "customer",
      accessScopes: ["customer"], customerId: customerOne,
    };
    const sessionTwo = {
      username: "buyer-two@example.invalid", accessType: "customer",
      accessScopes: ["customer"], customerId: customerTwo,
    };
    const before = await address.customerAddressBook(sessionOne);
    assert.equal(before.account.legalName, "Example Company One");
    assert.equal(before.account.companyNumber, "organisation-one-registered");
    assert.equal(before.account.primaryContact.email, "buyer@example.invalid");
    assert.deepEqual(before.addressRequests, []);
    assert.equal(before.requestsEnabled, true);

    const payload = {
      addressKind: "delivery", label: "Main goods-in", recipientName: "Receiving",
      contactPhone: "+44 20 1234 5678", line1: "10 Business Park", line2: "Unit 2",
      city: "London", region: "Greater London", postcode: "SW1A 1AA",
      countryCode: "GB", deliveryInstructions: "Loading bay 2", isDefault: true,
    };
    const request = await address.submitCustomerAddress(payload, sessionOne);
    assert.equal(request.status, "pending_review");
    assert.equal((await address.customerAddressBook(sessionOne)).addressRequests.length, 1);
    assert.equal((await address.customerAddressBook(sessionTwo)).addressRequests.length, 0);
    await assert.rejects(resolveCustomerShipTo(customerOne, request.id), /not been approved/);
    await assert.rejects(resolveCustomerShipTo(customerTwo, request.id), /not been approved/);
    const queue = await address.pendingCustomerAddressReviews();
    assert.equal(queue.requests.length, 1);
    assert.equal(queue.requests[0].customer_id, customerOne);

    assert.equal((await address.decideCustomerAddress(request.id, "approve", "owner")).status, "approved");
    assert.equal((await address.pendingCustomerAddressReviews()).requests.length, 0);
    const approved = await resolveCustomerShipTo(customerOne, request.id);
    assert.equal(approved.postcode, "SW1A 1AA");
    assert.equal(approved.countryCode, "GB");
    assert.ok(Object.isFrozen(approved));
    await assert.rejects(resolveCustomerShipTo(customerTwo, request.id), /not been approved/);

    assert.equal((await address.disableCustomerAddress(request.id, sessionOne)).status, "disabled");
    await assert.rejects(resolveCustomerShipTo(customerOne, request.id), /not been approved/);
    assert.equal(approved.postcode, "SW1A 1AA", "Past order snapshot remains immutable after address removal.");
    await assert.rejects(address.disableCustomerAddress(request.id, sessionTwo), /Address not found/);

    const pending = await address.submitCustomerAddress({ ...payload, label: "Backup depot", isDefault: false }, sessionOne);
    assert.equal((await address.decideCustomerAddress(pending.id, "reject", "owner")).status, "rejected");
    await assert.rejects(resolveCustomerShipTo(customerOne, pending.id), /not been approved/);
    const audited = await database.all("SELECT action, actor FROM audit_logs WHERE action LIKE 'customer.address.%' ORDER BY occurred_at");
    assert.ok(audited.some(x => x.action === "customer.address.requested"));
    assert.ok(audited.some(x => x.action === "customer.address.reviewed"));
    assert.ok(audited.some(x => x.action === "customer.address.disabled"));
    process.env.CUSTOMER_ADDRESS_REQUESTS_ENABLED = "false";
    const inactive = await address.customerAddressBook(sessionOne);
    assert.equal(inactive.requestsEnabled, false);
    assert.deepEqual(inactive.addressRequests, []);
    await assert.rejects(address.submitCustomerAddress(payload, sessionOne), /awaiting secure customer-service activation/);
    assert.equal((await address.pendingCustomerAddressReviews()).requestsEnabled, false);
  } finally {
    if (closeDatabase) await closeDatabase();
    for (const [k, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[k];
      else process.env[k] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
});
