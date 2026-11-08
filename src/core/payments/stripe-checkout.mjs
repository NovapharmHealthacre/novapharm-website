/**
 * Stripe-hosted Checkout integration primitive. Deliberately NOT wired to a
 * public endpoint until an authoritative, durable order/payment ledger exists.
 * Browser prices, order approvals and redirect URLs must never be trusted.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_MINOR = 99_999_999;
const API = "https://api.stripe.com/v1/checkout/sessions";
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{5,99}$/u;

function blocked(message) {
  return Object.assign(new Error(message), { code: "payment_not_ready" });
}

function httpsOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw blocked("A valid HTTPS payment origin is required."); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw blocked("Payment origin must be HTTPS without a path, query or credentials.");
  }
  return url.origin;
}

export function validatePaymentActivation({ enabled = false, mode, liveApproved = false, secretKey, webhookSecret } = {}) {
  if (enabled !== true) throw blocked("Payments are disabled until production commerce approval.");
  if (mode !== "test" && mode !== "live") throw blocked("Payment mode must be explicitly test or live.");
  if (mode === "live" && liveApproved !== true) throw blocked("Live payments require a separate sign-off.");
  const keyPrefix = mode === "live" ? "sk_live_" : "sk_test_";
  if (typeof secretKey !== "string" || !secretKey.startsWith(keyPrefix) || secretKey.length < 16) {
    throw blocked("Correctly scoped server-side Stripe credentials are required.");
  }
  if (typeof webhookSecret !== "string" || !webhookSecret.startsWith("whsec_") || webhookSecret.length < 12) {
    throw blocked("Stripe webhook signing secret is required.");
  }
  return Object.freeze({ mode });
}

/**
 * The caller must load the quote from a trusted DB after customer/tenant
 * authentication and reserve the stock + unique payment attempt atomically.
 * Flags on a browser HTTP body MUST NEVER be passed as this object.
 */
export function buildApprovedCheckoutParameters({ approvedOrder, publicOrigin } = {}) {
  const origin = httpsOrigin(publicOrigin);
  const order = approvedOrder;
  if (!order || order.approvedForPayment !== true || order.stockReserved !== true || order.taxAndShippingVerified !== true) {
    throw blocked("Price, taxes, shipping or stock are not approved.");
  }
  if (order.currency !== "GBP" || order.destinationCountry !== "GB") {
    throw blocked("Cross-border delivery or currency conversion needs separate tax and shipping approval.");
  }
  for (const value of [order.orderId, order.customerId, order.paymentAttemptId, order.quoteVersion]) {
    if (typeof value !== "string" || !ID.test(value)) throw blocked("Trusted order/attempt identifiers are required.");
  }
  if (!Number.isFinite(order.expiresAtMs) || order.expiresAtMs <= Date.now()) throw blocked("The approved quote expired.");
  if (!Array.isArray(order.lines) || order.lines.length < 1 || order.lines.length > 50) throw blocked("Approved lines are required.");
  const total = order.lines.reduce((sum, line) => {
    if (typeof line?.name !== "string" || line.name.trim().length < 2 || line.name.length > 120 || /[\u0000-\u001f\u007f]/u.test(line.name)) {
      throw blocked("Approved product name is invalid.");
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000 ||
        !Number.isSafeInteger(line.grossMinor) || line.grossMinor < 1 || line.grossMinor > MAX_MINOR) {
      throw blocked("Approved amounts must be integer GBP pence.");
    }
    return sum + line.grossMinor;
  }, 0);
  if (!Number.isSafeInteger(total) || total < 30 || total > MAX_MINOR || total !== order.totalGrossMinor) {
    throw blocked("Final total does not reconcile with the approved order.");
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("payment_method_types[0]", "card"); // eligible international cards and wallets
  params.set("client_reference_id", order.orderId);
  params.set("success_url", origin + "/portal/orders/?checkout=return&session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url", origin + "/portal/orders/?checkout=cancelled");
  params.set("billing_address_collection", "required");
  params.set("locale", "auto");
  // The approved quote is gross and tax-inclusive. Do NOT apply automatic
  // taxes again or assume all exports are subject to UK VAT at 20%.
  params.set("automatic_tax[enabled]", "false");
  params.set("metadata[order_id]", order.orderId);
  params.set("metadata[customer_id]", order.customerId);
  params.set("metadata[quote_version]", order.quoteVersion);
  params.set("metadata[payment_attempt_id]", order.paymentAttemptId);
  order.lines.forEach((line, index) => {
    const prefix = "line_items[" + index + "]";
    params.set(prefix + "[price_data][currency]", "gbp");
    params.set(prefix + "[price_data][unit_amount]", String(line.grossMinor));
    // Aggregated line avoids a discrepancy between per-unit and per-line VAT rounding.
    params.set(prefix + "[price_data][product_data][name]", line.name + " × " + line.quantity);
    params.set(prefix + "[quantity]", "1");
  });
  return params;
}

export async function createStripeHostedCheckout({ approvedOrder, publicOrigin, activation, fetchImpl = globalThis.fetch }) {
  validatePaymentActivation(activation);
  if (typeof fetchImpl !== "function") throw blocked("Payment transport unavailable.");
  const params = buildApprovedCheckoutParameters({ approvedOrder, publicOrigin });
  const key = "np-" + approvedOrder.paymentAttemptId + "-" + approvedOrder.quoteVersion;
  if (key.length > 255) throw blocked("Payment attempt idempotency key is invalid.");
  const response = await fetchImpl(API, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + activation.secretKey,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": key
    },
    body: params.toString(),
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw blocked("The provider could not start hosted checkout.");
  const session = await response.json();
  if (typeof session.id !== "string" || !/^cs_(?:test_|live_)[a-zA-Z0-9]+$/u.test(session.id) ||
      typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/") ||
      session.mode !== "payment") throw blocked("The payment provider returned an unexpected session.");
  if (session.livemode !== (activation.mode === "live")) throw blocked("Provider environment does not match payment mode.");
  return Object.freeze({ sessionId: session.id, checkoutUrl: session.url, paymentAttemptId: approvedOrder.paymentAttemptId });
}

/** Raw-body signature verification: do not JSON.parse before this step. */
export function verifyStripeWebhook({ rawBody, signatureHeader, webhookSecret, nowMs = Date.now(), toleranceSeconds = 300 }) {
  if (typeof webhookSecret !== "string" || !webhookSecret.startsWith("whsec_") ||
      typeof signatureHeader !== "string" || (typeof rawBody !== "string" && !Buffer.isBuffer(rawBody))) {
    throw blocked("Webhook signature could not be verified.");
  }
  const parts = signatureHeader.split(",").map(part => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key, value]) => key === "v1" && /^[0-9a-f]{64}$/iu.test(value ?? "")).map(([, value]) => value);
  if (!/^\d{9,12}$/u.test(timestamp ?? "") || signatures.length === 0 ||
      !Number.isFinite(nowMs) || toleranceSeconds < 1 || toleranceSeconds > 300) {
    throw blocked("Webhook signature or timestamp invalid.");
  }
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > toleranceSeconds) throw blocked("Webhook signature expired.");
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const expected = createHmac("sha256", webhookSecret).update(timestamp + ".").update(payload).digest();
  if (!signatures.some(hex => timingSafeEqual(expected, Buffer.from(hex, "hex")))) {
    throw blocked("Webhook signature could not be verified.");
  }
  const event = JSON.parse(payload.toString("utf8"));
  if (typeof event?.id !== "string" || !/^evt_[a-zA-Z0-9]+$/u.test(event.id) || typeof event.type !== "string") {
    throw blocked("Webhook event malformed.");
  }
  return event;
}

/** Caller MUST persist event.id under unique index before acting on action. */
export function reconcileStripeCheckoutEvent(event, storedAttempt) {
  const session = event?.data?.object;
  if (!storedAttempt || !session || !String(event.type).startsWith("checkout.session.")) return { action: "ignore" };
  if (session.id !== storedAttempt.sessionId || session.client_reference_id !== storedAttempt.orderId ||
      session.metadata?.payment_attempt_id !== storedAttempt.paymentAttemptId ||
      session.metadata?.quote_version !== storedAttempt.quoteVersion ||
      session.currency !== "gbp" || session.amount_total !== storedAttempt.totalGrossMinor ||
      session.livemode !== storedAttempt.liveMode) {
    throw blocked("Signed Stripe event does not match a durable payment attempt.");
  }
  if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
      session.payment_status === "paid") {
    return { action: "record_verified_payment", eventId: event.id, orderId: storedAttempt.orderId };
  }
  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    return { action: "record_unsuccessful_payment", eventId: event.id, orderId: storedAttempt.orderId };
  }
  return { action: "ignore" };
}
