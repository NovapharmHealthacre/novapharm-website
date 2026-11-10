/**
 * A SERVER-ONLY Stripe Billing subscription Checkout transport for the
 * Intelligence Medicines Terminal. No exported HTTP route is activated here.
 *
 * Critical: trustedIntent, principal, release, and ownerBinding must be
 * hydrated and verified independently from private database/identity state.
 * They may never originate from browser JSON or Stripe event metadata.
 *
 * The existing Nutraxin / ESCO physical checkout is deliberately untouched.
 */
import { randomBytes } from "node:crypto";
import {
  selectIntelligenceCheckoutPrice,
  INTELLIGENCE_LIVE_STRIPE_ACCOUNT,
} from "./intelligence-live-stripe-catalog.mjs";

const STRIPE_SESSIONS_API = "https://api.stripe.com/v1/checkout/sessions";
const CUSTOMER = /^cus_[A-Za-z0-9]{6,}$/u;
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9_-]{7,85}$/u;
const SESSION = /^cs_live_[A-Za-z0-9]+$/u;

function reject(code) {
  return Object.assign(new Error("Intelligence subscription checkout is unavailable."), { code });
}

function validatedOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw reject("approved_origin_missing"); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      url.hostname !== "intelligence.novapharmhealthcare.com") {
    throw reject("approved_origin_missing");
  }
  return url.origin;
}

function checkoutIntent({ trustedIntent, principal, price }) {
  if (trustedIntent?.verifiedServerSide !== true ||
      trustedIntent?.customerAcceptedTerms !== true ||
      trustedIntent?.trustedLedgerReservation !== true ||
      !IDENTIFIER.test(String(trustedIntent.id || "")) ||
      !CUSTOMER.test(String(trustedIntent.stripeCustomerId || "")) ||
      trustedIntent.tenantId !== principal.tenantId ||
      trustedIntent.subject !== principal.subject ||
      trustedIntent.stripePriceId !== price.stripePriceId ||
      trustedIntent.plan !== price.plan ||
      trustedIntent.cycle !== price.cycle ||
      trustedIntent.currency !== price.currency ||
      !Number.isSafeInteger(trustedIntent.expiresAtMs) ||
      trustedIntent.expiresAtMs <= Date.now()) {
    throw reject("trusted_checkout_intent_missing");
  }
  return trustedIntent;
}

export function buildIntelligenceSubscriptionCheckout({
  plan,
  cycle,
  principal,
  release,
  trustedIntent,
  signedEnterpriseContract,
  approvedOrigin,
} = {}) {
  const origin = validatedOrigin(approvedOrigin);
  const selection = selectIntelligenceCheckoutPrice({
    plan, cycle, principal, release, signedEnterpriseContract,
  });
  if (!selection.allowed) throw reject(selection.code);
  const price = { ...selection, plan, cycle };
  const intent = checkoutIntent({ trustedIntent, principal, price });

  if (release?.stripeAccountId !== INTELLIGENCE_LIVE_STRIPE_ACCOUNT ||
      release?.stripeTaxAutomaticCalculationAccepted !== true ||
      release?.dedicatedWebhookActiveAndVerified !== true) {
    throw reject("stripe_billing_runtime_not_released");
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("customer", intent.stripeCustomerId);
  params.set("client_reference_id", intent.id);
  params.set("line_items[0][price]", price.stripePriceId);
  params.set("line_items[0][quantity]", "1");
  params.set("automatic_tax[enabled]", "true");
  params.set("tax_id_collection[enabled]", "true");
  params.set("success_url", origin + "/account/billing/return?session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url", origin + "/plans/?checkout=cancelled");
  // Do not put tenant IDs, raw identities, contracts or private source data in
  // Stripe metadata. The ledger maps Customer/Session/Subscription atomically.
  return Object.freeze({ params, intentId: intent.id, customerId: intent.stripeCustomerId, priceId: price.stripePriceId });
}

function validLiveKey(key) {
  return typeof key === "string" &&
    (key.startsWith("rk_live_") || key.startsWith("sk_live_")) && key.length >= 20;
}

function integrationIdentifier() {
  // 8 random letters, with no customer or tenant material embedded.
  const b = randomBytes(8);
  return "novapharm_intelligence_" + [...b].map((v) => String.fromCharCode(97 + (v % 26))).join("");
}

/**
 * Requires an independently reconciled durable intent before invocation.
 * Network/mock injection is for tests and private server transports only.
 * The returned Checkout URL is NOT proof of payment or entitlement.
 */
export async function createIntelligenceSubscriptionCheckout({
  stripeSecretKey,
  fetchImpl = globalThis.fetch,
  ...input
} = {}) {
  const prepared = buildIntelligenceSubscriptionCheckout(input);
  if (!validLiveKey(stripeSecretKey) || typeof fetchImpl !== "function") {
    throw reject("restricted_live_stripe_credential_required");
  }

  const params = new URLSearchParams(prepared.params);
  params.set("integration_identifier", integrationIdentifier());
  const response = await fetchImpl(STRIPE_SESSIONS_API, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + stripeSecretKey,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": "npi-live-subscription-" + prepared.intentId,
    },
    body: params.toString(),
    signal: AbortSignal.timeout(12000),
    redirect: "error",
  });
  if (!response?.ok) throw reject("stripe_checkout_request_failed");
  const body = await response.json();
  if (!SESSION.test(String(body?.id || "")) ||
      body?.livemode !== true ||
      body?.mode !== "subscription" ||
      body?.customer !== prepared.customerId ||
      body?.currency !== "inr" ||
      typeof body?.url !== "string") {
    throw reject("stripe_checkout_response_invalid");
  }
  let returnedUrl;
  try { returnedUrl = new URL(body.url); } catch { throw reject("stripe_checkout_response_invalid"); }
  if (returnedUrl.protocol !== "https:" || returnedUrl.hostname !== "checkout.stripe.com" ||
      returnedUrl.username || returnedUrl.password) throw reject("stripe_checkout_response_invalid");
  return Object.freeze({
    checkoutSessionId: body.id,
    checkoutUrl: returnedUrl.toString(),
    intentId: prepared.intentId,
    priceId: prepared.priceId,
    paymentConfirmed: false,
    grantsAccess: false,
    requiresSignedWebhookAndLedgerReconciliation: true,
  });
}
