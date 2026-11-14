/**
 * One NovaPharm Customer Workspace, multiple governed product collections.
 *
 * This is a pure SERVER-SIDE decision step, NOT an order/payment processor.
 * All identities and offers MUST be loaded from authenticated, tenant-scoped
 * server authorities. No field in the browser's basket can confer a price,
 * credit limit, regulatory licence, stock position or payment entitlement.
 */
export const UNIFIED_COLLECTIONS = Object.freeze({
  nutraxin: Object.freeze({ label: "Nutraxin", workspaceRoute: "/portal/products/?collection=nutraxin" }),
  esco: Object.freeze({ label: "ESCO Anand", workspaceRoute: "/portal/products/?collection=esco" }),
});

const validScopes = new Set(["customer"]);
const validChannels = new Set(["personal", "business"]);
const validClasses = new Set(["consumer", "medical-device", "medicine"]);
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function result(state, reason, extras = {}) {
  return Object.freeze({
    state,
    reason,
    bindingOrderCreated: false,
    invoiceCreated: false,
    paymentStarted: false,
    stockReserved: false,
    ...extras,
  });
}

function serverCustomer(customer) {
  return customer && typeof customer.customerId === "string" &&
    /^[a-zA-Z0-9_-]{8,128}$/.test(customer.customerId) &&
    customer.status === "active" && customer.emailVerified === true &&
    validChannels.has(customer.channel) &&
    Array.isArray(customer.accessScopes) &&
    customer.accessScopes.some((scope) => validScopes.has(scope));
}

function checkedLines(basket) {
  if (!basket || !Array.isArray(basket.lines) ||
      basket.lines.length < 1 || basket.lines.length > 50) return null;
  const seen = new Set();
  const clean = [];
  for (const item of basket.lines) {
    if (!item || typeof item.sku !== "string" ||
        !/^[A-Za-z0-9._-]{3,80}$/.test(item.sku) ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        item.quantity > 10000 || seen.has(item.sku)) return null;
    seen.add(item.sku);
    clean.push({ sku: item.sku, quantity: item.quantity });
  }
  return clean;
}

/**
 * Returns a trustworthy PRE-CHECKOUT plan, not a payment authorisation.
 * `offers` is the server's customer-scoped price/rights/ATP lookup.
 * `release` is owner-approved server configuration, never request JSON.
 *
 * All missing flags fail closed. Orders and invoices require a separate
 * transactional service with revalidation, atomic reservation, and
 * idempotent reconciliation after this decision.
 */
export function planUnifiedCustomerCommerce({ customer, basket, offers, release } = {}) {
  if (!serverCustomer(customer)) {
    return result("access_denied", "verified_customer_account_required");
  }
  const lines = checkedLines(basket);
  if (!lines) return result("invalid_basket", "valid_unique_sku_quantities_required");
  if (!Array.isArray(offers)) return result("blocked", "authoritative_offers_unavailable");

  const lookup = new Map();
  for (const offer of offers) {
    if (!offer || typeof offer.sku !== "string" || lookup.has(offer.sku)) {
      return result("blocked", "invalid_or_ambiguous_authoritative_offers");
    }
    lookup.set(offer.sku, offer);
  }
  const legs = new Map();
  let blocked = false;
  let amountsKnown = true;
  let totalMinor = 0;

  for (const line of lines) {
    const offer = lookup.get(line.sku);
    if (!offer || offer.customerId !== customer.customerId ||
        !Object.hasOwn(UNIFIED_COLLECTIONS, offer.collection) ||
        !validClasses.has(offer.productClass) ||
        offer.entitled !== true || offer.rightsVerified !== true ||
        !Array.isArray(offer.allowedChannels) ||
        !offer.allowedChannels.includes(customer.channel) ||
        (customer.channel === "personal" && offer.productClass !== "consumer") ||
        (offer.productClass !== "consumer" && customer.businessApproved !== true)) {
      // Do not distinguish a nonexistent SKU from another tenant's SKU.
      return result("blocked", "unavailable_or_unauthorised_product");
    }
    if (!Number.isSafeInteger(offer.minQuantity) || offer.minQuantity < 1 ||
        !Number.isSafeInteger(offer.maxQuantity) ||
        offer.maxQuantity < offer.minQuantity ||
        line.quantity < offer.minQuantity || line.quantity > offer.maxQuantity) {
      return result("blocked", "quantity_outside_approved_terms");
    }
    if (offer.saleStatus !== "approved") {
      return result("blocked", "unavailable_or_unauthorised_product");
    }
    if (offer.currency !== "GBP" || offer.market !== "GB") {
      return result("blocked", "market_or_currency_not_approved");
    }
    if (offer.productClass === "medicine" &&
        (release?.regulatedSalesApproved !== true || customer.businessApproved !== true)) {
      return result("blocked", "regulated_authorisation_not_released");
    }
    if (!/^[A-Z]{3}$/.test(offer.currency || "") || !Number.isSafeInteger(offer.unitPriceMinor) ||
        offer.unitPriceMinor < 0 || offer.priceApproved !== true) {
      amountsKnown = false;
    }
    const groupKey = offer.collection + ":" + offer.currency;
    const group = legs.get(groupKey) || { collection: offer.collection, currency: offer.currency, lines: [], subtotalMinor: 0 };
    if (group.lines.length >= 50) return result("invalid_basket", "too_many_lines");
    group.lines.push({ sku: line.sku, quantity: line.quantity });
    if (Number.isSafeInteger(offer.unitPriceMinor) && offer.unitPriceMinor >= 0 &&
        Number.isSafeInteger(line.quantity * offer.unitPriceMinor) &&
        Number.isSafeInteger(group.subtotalMinor + line.quantity * offer.unitPriceMinor)) {
      group.subtotalMinor += line.quantity * offer.unitPriceMinor;
    } else {
      amountsKnown = false;
    }
    if (offer.availableToPromiseVerified !== true ||
        !Number.isSafeInteger(offer.availableQuantity) ||
        offer.availableQuantity < line.quantity ||
        offer.fulfilmentVerified !== true) blocked = true;
    legs.set(groupKey, group);
  }

  // Browser-supplied prices, tax, supplier costs and entitlements are never read.
  const groups = [...legs.values()].map((leg) => Object.freeze({
    collection: leg.collection, currency: leg.currency,
    lines: Object.freeze(leg.lines),
    indicativeSubtotalMinor: amountsKnown ? leg.subtotalMinor : null,
  }));
  const safeGroups = Object.freeze(groups);
  if (release?.productionAccepted !== true) {
    return result("browse_only", "enterprise_commerce_not_production_accepted", { groups: safeGroups });
  }
  if (release?.quoteRequestsEnabled === true && customer.businessApproved === true &&
      (!release?.bindingOrdersEnabled || blocked || !amountsKnown ||
       !release?.taxVerified || !release?.fulfilmentVerified)) {
    return result("request_quote", "non_binding_business_request_only", { groups: safeGroups });
  }
  if (blocked || !amountsKnown || release?.bindingOrdersEnabled !== true ||
      release?.taxVerified !== true || release?.fulfilmentVerified !== true ||
      release?.paymentsVerified !== true || release?.inventoryReservationVerified !== true) {
    return result("browse_only", "commercial_or_fulfilment_gate_not_accepted", { groups: safeGroups });
  }
  if (!uuidV4.test(basket.idempotencyKey || "")) {
    return result("blocked", "idempotency_key_required", { groups: safeGroups });
  }
  if (groups.length > 1) {
    return result("split_review_required", "separate_collection_or_currency_settlement_required", {
      groups: safeGroups,
      // A single customer basket is preserved; each fulfilment/settlement leg
      // must still be revalidated and transacted independently by the server.
    });
  }
  totalMinor = groups[0]?.indicativeSubtotalMinor ?? 0;
  return result("checkout_review", "server_must_revalidate_before_binding_order", {
    groups: safeGroups, indicativeSubtotalMinor: totalMinor,
    // NEVER interpreted as authorisation to charge, reserve or invoice.
  });
}
