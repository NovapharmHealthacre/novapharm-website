import assert from "node:assert/strict";
import test from "node:test";
import {
  planUnifiedCustomerCommerce,
  UNIFIED_COLLECTIONS,
} from "../src/core/unified-customer-commerce.mjs";

const request = "17cce49f-f6b7-452f-8f69-ed448075add0";
const customer = Object.freeze({
  customerId: "CUS_TEST-0001",
  status: "active",
  channel: "business",
  emailVerified: true,
  businessApproved: true,
  accessScopes: ["customer"],
});
const release = Object.freeze({
  productionAccepted: true,
  quoteRequestsEnabled: true,
  bindingOrdersEnabled: true,
  regulatedSalesApproved: false,
  taxVerified: true,
  fulfilmentVerified: true,
  paymentsVerified: true,
  inventoryReservationVerified: true,
});
function offer(sku, collection = "nutraxin", extra = {}) {
  return {
    sku, collection, customerId: customer.customerId, productClass: "consumer",
    entitled: true, rightsVerified: true, saleStatus: "approved",
    allowedChannels: ["business", "personal"], market: "GB",
    minQuantity: 1, maxQuantity: 10, currency: "GBP",
    unitPriceMinor: 1250, priceApproved: true,
    availableToPromiseVerified: true, availableQuantity: 30,
    fulfilmentVerified: true, ...extra,
  };
}
const input = (overrides = {}) => ({
  customer,
  basket: { idempotencyKey: request, lines: [{ sku: "NUT-UK-VD3-T120", quantity: 2 }] },
  offers: [offer("NUT-UK-VD3-T120")],
  release,
  ...overrides,
});

test("both collections map into the same customer Products workspace, not independent checkout portals", () => {
  assert.deepEqual(Object.keys(UNIFIED_COLLECTIONS), ["nutraxin", "esco"]);
  for (const collection of Object.values(UNIFIED_COLLECTIONS)) {
    assert.match(collection.workspaceRoute, /^\/portal\/products\/\?collection=(?:nutraxin|esco)$/u);
  }
});

test("a verified tenant customer can only be planned for server revalidation, never charged", () => {
  const planned = planUnifiedCustomerCommerce(input());
  assert.equal(planned.state, "checkout_review");
  assert.equal(planned.indicativeSubtotalMinor, 2500);
  assert.equal(planned.groups[0].collection, "nutraxin");
  assert.equal(planned.paymentStarted, false);
  assert.equal(planned.bindingOrderCreated, false);
  assert.equal(planned.stockReserved, false);
  assert.equal(planned.invoiceCreated, false);
});

test("the same customer basket groups Nutraxin and ESCO without pretending atomic settlement", () => {
  const plan = planUnifiedCustomerCommerce(input({
    basket: {
      idempotencyKey: request,
      lines: [{ sku: "NUT-UK-VD3-T120", quantity: 2 }, { sku: "ESCO-DRESS-0001", quantity: 1 }],
    },
    offers: [offer("NUT-UK-VD3-T120"), offer("ESCO-DRESS-0001", "esco", { unitPriceMinor: 2000 })],
  }));
  assert.equal(plan.state, "split_review_required");
  assert.deepEqual(plan.groups.map(x => x.collection), ["nutraxin", "esco"]);
  assert.equal(plan.paymentStarted, false);
});

test("the basket's client-side price and permission fields cannot change authoritative pricing", () => {
  const plan = planUnifiedCustomerCommerce(input({
    basket: { idempotencyKey: request, lines: [{
      sku: "NUT-UK-VD3-T120", quantity: 2, unitPriceMinor: 1,
      allowed: true, stockAvailable: 1000000, merchantApproved: true,
    }] },
  }));
  assert.equal(plan.state, "checkout_review");
  assert.equal(plan.indicativeSubtotalMinor, 2500);
});

test("release, price, tax, fulfilment and inventory gates default to non-binding outcomes", () => {
  assert.equal(planUnifiedCustomerCommerce(input({ release: {} })).state, "browse_only");
  assert.equal(planUnifiedCustomerCommerce(input({
    release: { ...release, productionAccepted: false },
  })).state, "browse_only");
  assert.equal(planUnifiedCustomerCommerce(input({
    release: { ...release, paymentsVerified: false, quoteRequestsEnabled: false },
  })).state, "browse_only");
  assert.equal(planUnifiedCustomerCommerce(input({
    offers: [offer("NUT-UK-VD3-T120", "nutraxin", { availableQuantity: 0 })],
  })).state, "request_quote");
  assert.equal(planUnifiedCustomerCommerce(input({
    offers: [offer("NUT-UK-VD3-T120", "nutraxin", { priceApproved: false })],
  })).state, "request_quote");
});

test("unverified email, missing linked customer, disabled account, workforce identity are denied", () => {
  for (const changed of [
    { emailVerified: false }, { customerId: null }, { status: "pending" },
    { accessScopes: ["board"] }, { accessScopes: ["employee"] },
    { accessScopes: ["admin"] }, { accessScopes: [] }, { channel: "unknown" },
  ]) {
    assert.equal(planUnifiedCustomerCommerce(input({
      customer: { ...customer, ...changed },
    })).state, "access_denied");
  }
});

test("cross-tenant offers, unknown SKUs and forged quote lines are not disclosed", () => {
  for (const offers of [
    [], [offer("NUT-UK-VD3-T120", "nutraxin", { customerId: "CUS_OTHER-9999" })],
    [offer("NUT-UK-VD3-T120", "unknown")],
    [offer("NUT-UK-VD3-T120", "nutraxin", { entitled: false })],
    [offer("NUT-UK-VD3-T120", "nutraxin", { rightsVerified: false })],
  ]) {
    const denied = planUnifiedCustomerCommerce(input({ offers }));
    assert.equal(denied.state, "blocked");
    assert.equal(denied.reason, "unavailable_or_unauthorised_product");
  }
});

test("unknown, duplicate, fractional, zero and excessive basket quantities fail", () => {
  for (const lines of [
    [], [{ sku: "NUT-UK-VD3-T120", quantity: 0 }],
    [{ sku: "NUT-UK-VD3-T120", quantity: 1.5 }],
    [{ sku: "NUT-UK-VD3-T120", quantity: 10001 }],
    [{ sku: "../../admin", quantity: 2 }],
    [{ sku: "NUT-UK-VD3-T120", quantity: 2 }, { sku: "NUT-UK-VD3-T120", quantity: 1 }],
  ]) {
    assert.equal(planUnifiedCustomerCommerce(input({
      basket: { idempotencyKey: request, lines },
    })).state, "invalid_basket");
  }
});

test("regulated medicines never become orderable without verified regulated approval and trade qualification", () => {
  const medicinal = offer("MED-UK-000001", "esco", { productClass: "medicine" });
  assert.equal(planUnifiedCustomerCommerce(input({
    basket: { idempotencyKey: request, lines: [{ sku: "MED-UK-000001", quantity: 1 }] },
    offers: [medicinal],
  })).reason, "regulated_authorisation_not_released");
  assert.equal(planUnifiedCustomerCommerce(input({
    customer: { ...customer, channel: "personal", businessApproved: false },
    basket: { idempotencyKey: request, lines: [{ sku: "MED-UK-000001", quantity: 1 }] },
    offers: [medicinal],
    release: { ...release, regulatedSalesApproved: true },
  })).state, "blocked");
});

test("only a valid idempotency key may reach checkout review", () => {
  assert.equal(planUnifiedCustomerCommerce(input({
    basket: { idempotencyKey: "untrusted", lines: [{ sku: "NUT-UK-VD3-T120", quantity: 2 }] },
  })).reason, "idempotency_key_required");
  assert.equal(planUnifiedCustomerCommerce(input({
    release: { ...release, bindingOrdersEnabled: false },
  })).state, "request_quote");
});
