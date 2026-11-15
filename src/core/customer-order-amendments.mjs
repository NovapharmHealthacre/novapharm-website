import { randomUUID } from "node:crypto";
import { all, audit, nowIso, one, run, transaction } from "../data/database.mjs";
import { requireAddressCustomer } from "./customer-address-contract.mjs";
import { resolveCustomerShipTo } from "./customer-delivery-destination.mjs";

const idPattern = /^[A-Za-z0-9_-]{8,128}$/;
const kinds = new Set(["delivery_address", "delivery_date", "purchase_order_reference", "other"]);
function invalid(message, statusCode = 409) {
  return Object.assign(new Error(message), { statusCode });
}
function enabled() { return process.env.CUSTOMER_ORDER_AMENDMENTS_ENABLED === "true"; }
function assertEnabled() {
  if (!enabled()) throw invalid("Order amendments await secure production activation.", 503);
}
function safeText(input, max, required = true) {
  if (typeof input !== "string" || input.length > max || /[\u0000-\u001f\u007f]/.test(input)) {
    throw invalid("Order amendment details are invalid.", 400);
  }
  const text = input.trim();
  if (required && !text) throw invalid("Order amendment details are required.", 400);
  return text;
}
function safeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw invalid("Enter a valid requested delivery date.", 400);
  }
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    throw invalid("Enter a valid requested delivery date.", 400);
  }
  const today = new Date();
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (parsed < midnight || parsed > midnight + 366 * 86_400_000) {
    throw invalid("Requested delivery date must be within the next year.", 400);
  }
  return value;
}
async function activeAccount(context) {
  const customerId = requireAddressCustomer(context);
  const customer = await one("SELECT id, lifecycle_status FROM customers WHERE id = ?", customerId);
  if (!customer || customer.lifecycle_status !== "active") {
    throw invalid("Your business account is not active.", 403);
  }
  return customerId;
}

/** Customer-scoped order, line and shipment summaries; no global warehouse or payment claims. */
export async function customerOrderOverview(context) {
  const customerId = await activeAccount(context);
  const orders = await all(`SELECT id, order_number, status, customer_po_reference,
      requested_delivery_date, total_minor, currency, delivery_address_snapshot_json, created_at
    FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 40`, customerId);
  const safeOrders = await Promise.all(orders.map(async (order) => {
    let shipTo = null;
    try {
      const value = order.delivery_address_snapshot_json
        ? JSON.parse(order.delivery_address_snapshot_json) : null;
      if (value && typeof value.city === "string" && typeof value.postcode === "string") {
        shipTo = { city: value.city, postcode: value.postcode, countryCode: value.countryCode || "GB" };
      }
    } catch { /* A malformed historical snapshot is not forwarded to a customer. */ }
    const lines = await all(`SELECT p.sku, p.product_name, ol.quantity, ol.line_total_minor
      FROM order_lines ol JOIN products p ON p.id = ol.product_id
      WHERE ol.order_id = ? ORDER BY p.sku`, order.id);
    const shipments = await all(`SELECT shipment_number, status, carrier_name, tracking_reference,
      dispatched_at, delivered_at FROM shipments WHERE order_id = ? ORDER BY created_at DESC`, order.id);
    const { delivery_address_snapshot_json: _snapshot, ...visible } = order;
    return { ...visible, shipTo, lines, shipments };
  }));
  const amendments = enabled() ? await all(`SELECT r.id, o.order_number, r.request_kind,
      r.requested_value, r.status, r.created_at, r.reviewed_at
    FROM customer_order_amendment_requests r JOIN orders o ON o.id = r.order_id
    WHERE r.customer_id = ? ORDER BY r.created_at DESC LIMIT 50`, customerId) : [];
  return {
    orders: safeOrders,
    amendments,
    amendmentsEnabled: enabled(),
    notice: "Submitted orders and payment amounts cannot be silently changed. Amendment requests require independent review and warehouse confirmation.",
  };
}

async function requestedValue(kind, input, customerId) {
  if (kind === "delivery_address") {
    const shipTo = await resolveCustomerShipTo(customerId, input.deliveryAddressId);
    return shipTo.addressId;
  }
  if (kind === "delivery_date") return safeDate(input.value);
  if (kind === "purchase_order_reference") return safeText(input.value, 100);
  return safeText(input.value, 300);
}

/** Submit a change request, never a direct edit to a paid or warehouse-controlled order. */
export async function submitCustomerOrderAmendment(input, context) {
  assertEnabled();
  const customerId = await activeAccount(context);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalid("Order amendment must be an object.", 400);
  }
  const orderId = input.orderId;
  if (typeof orderId !== "string" || !idPattern.test(orderId)) {
    throw invalid("Select an order from your account.", 400);
  }
  const kind = input.requestKind;
  if (!kinds.has(kind)) throw invalid("Select a supported order change.", 400);
  const value = await requestedValue(kind, input, customerId);
  const note = input.note ? safeText(input.note, 400, false) : null;
  return transaction(async () => {
    const order = await one(`SELECT id, order_number, status FROM orders
      WHERE id = ? AND customer_id = ?`, orderId, customerId);
    if (!order) throw invalid("Order not found for this account.", 404);
    if (order.status !== "submitted") {
      throw invalid("This order is no longer eligible for an online amendment. Contact customer support.");
    }
    const shipment = await one("SELECT id FROM shipments WHERE order_id = ?", orderId);
    if (shipment) throw invalid("Warehouse fulfilment has started. Request support for any change.");
    const duplicate = await one(`SELECT id FROM customer_order_amendment_requests
      WHERE order_id = ? AND customer_id = ? AND request_kind = ? AND status = 'pending_review'`,
      orderId, customerId, kind);
    if (duplicate) throw invalid("A request of this type is already awaiting review.");
    const id = randomUUID();
    const timestamp = nowIso();
    await run(`INSERT INTO customer_order_amendment_requests
      (id, customer_id, order_id, request_kind, requested_value, note, status, created_by, created_at)
      VALUES(?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)`,
      id, customerId, orderId, kind, value, note, context.username, timestamp);
    await audit({ actor: context.username, action: "customer.order.amendment_requested",
      entityType: "customer_order_amendment", entityId: id,
      details: { orderId, customerId, kind, status: "pending_review" } });
    return { id, orderNumber: order.order_number, status: "pending_review" };
  });
}

/** Administrator-only queue. Accepting a request does NOT mutate a paid order or create a 3PL instruction. */
export async function pendingCustomerOrderAmendments() {
  if (!enabled()) return { requests: [], amendmentsEnabled: false };
  const requests = await all(`SELECT r.id, r.customer_id, o.order_number, o.status AS order_status,
      r.request_kind, r.requested_value, r.note, r.status, r.created_at
    FROM customer_order_amendment_requests r JOIN orders o ON o.id = r.order_id
    WHERE r.status = 'pending_review' ORDER BY r.created_at LIMIT 100`);
  return { requests, amendmentsEnabled: true };
}

export async function decideCustomerOrderAmendment(id, decision, actor) {
  assertEnabled();
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw invalid("Order amendment not found.", 404);
  }
  if (!["accept", "reject"].includes(decision)) {
    throw invalid("Order amendment decision must be accept or reject.", 400);
  }
  return transaction(async () => {
    const item = await one(`SELECT r.id, r.customer_id, r.order_id, r.request_kind,
      r.status, o.status AS order_status FROM customer_order_amendment_requests r
      JOIN orders o ON o.id = r.order_id WHERE r.id = ?`, id);
    if (!item) throw invalid("Order amendment not found.", 404);
    if (item.status !== "pending_review") throw invalid("This request was already reviewed.");
    if (decision === "accept") {
      if (item.order_status !== "submitted" ||
          await one("SELECT id FROM shipments WHERE order_id = ?", item.order_id)) {
        throw invalid("Fulfilment state has changed. This request requires separate customer support.");
      }
    }
    const status = decision === "accept" ? "accepted_pending_execution" : "rejected";
    const at = nowIso();
    const changed = await run(`UPDATE customer_order_amendment_requests
      SET status = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'pending_review'`, status, actor, at, id);
    if (!changed.changes) throw invalid("The order amendment was changed during review.");
    await audit({ actor, action: "customer.order.amendment_reviewed",
      entityType: "customer_order_amendment", entityId: id,
      before: { status: "pending_review" }, after: { status },
      details: { orderId: item.order_id, customerId: item.customer_id,
        kind: item.request_kind, requiresWarehouseExecution: decision === "accept" } });
    return { id, status, reviewedAt: at };
  });
}
