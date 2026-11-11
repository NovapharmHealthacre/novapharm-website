/**
 * NovaPharm Intelligence: server-only, tenant-owned Stripe Billing Portal.
 *
 * Not a public route. Call only after independently verified OIDC MFA,
 * customer-seat and Stripe-customer ownership ledgers have been loaded from
 * trusted server state. Never accept a Stripe Customer ID or return URL from
 * browser JSON. No customer information or Stripe credentials in logs.
 *
 * IMPORTANT: Users must be able to manage existing billing even when data
 * source-rights features are suspended. Do NOT gate billing access on medicine
 * licence acceptance. This still requires a verified customer session.
 */
import { INTELLIGENCE_LIVE_STRIPE_ACCOUNT, intelligenceLiveStripeCatalog } from "./intelligence-live-stripe-catalog.mjs";

export const INTELLIGENCE_BILLING_PORTAL_CONFIGURATION = "bpc_1Ua7Qm2U9Y3sX5I2ceofArkT";
const API = "https://api.stripe.com/v1/billing_portal/sessions";
const CUSTOMER = /^cus_[A-Za-z0-9]{6,}$/u;
const PORTAL_SESSION = /^bps_[A-Za-z0-9]+$/u;
function reject(code) {
  return Object.assign(new Error("Customer billing management is unavailable."), { code });
}
function approvedOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw reject("billing_origin_not_approved"); }
  if (url.protocol !== "https:" || url.hostname !== "intelligence.novapharmhealthcare.com" ||
      url.pathname !== "/" || url.search || url.hash || url.username || url.password ||
      url.port) throw reject("billing_origin_not_approved");
  return url.origin;
}
function validKey(key) {
  return typeof key === "string" && (key.startsWith("rk_live_") || key.startsWith("sk_live_")) && key.length >= 20;
}
/**
 * This is separate from the checkout release gate: existing customers must
 * retain cancellation, payment-method and invoice access after feature outage.
 */
export function buildIntelligenceBillingPortalSession({
  principal, trustedOwner, release, signedEnterpriseContract, origin,
} = {}) {
  const root = approvedOrigin(origin);
  if (principal?.verifiedServerSide !== true || principal.mfaVerified !== true ||
      !["cognito-oidc", "entra-oidc"].includes(principal.identityProvider) ||
      typeof principal.tenantId !== "string" || typeof principal.subject !== "string") {
    throw reject("customer_identity_not_verified");
  }
  if (trustedOwner?.verifiedServerSide !== true ||
      trustedOwner.tenantSeatApproved !== true ||
      trustedOwner.stripeLiveMode !== true ||
      trustedOwner.tenantId !== principal.tenantId ||
      trustedOwner.subject !== principal.subject ||
      !CUSTOMER.test(String(trustedOwner.stripeCustomerId ?? "")) ||
      typeof trustedOwner.plan !== "string" ||
      !Object.hasOwn(intelligenceLiveStripeCatalog, trustedOwner.plan)) {
    throw reject("customer_billing_ownership_unverified");
  }
  if (trustedOwner.plan === "enterprise" &&
      (signedEnterpriseContract?.verifiedServerSide !== true ||
       signedEnterpriseContract.tenantId !== principal.tenantId ||
       signedEnterpriseContract.stripeCustomerId !== trustedOwner.stripeCustomerId ||
       signedEnterpriseContract.allowSelfServiceBilling !== true)) {
    throw reject("enterprise_billing_contract_required");
  }
  if (release?.verifiedServerSide !== true ||
      release.stripeAccountId !== INTELLIGENCE_LIVE_STRIPE_ACCOUNT ||
      release.customerSessionRuntimeAccepted !== true ||
      release.tenantOwnerLedgerAccepted !== true ||
      release.billingPortalConfigurationAccepted !== true ||
      release.portalConfigurationId !== INTELLIGENCE_BILLING_PORTAL_CONFIGURATION) {
    throw reject("billing_portal_not_released");
  }
  const params = new URLSearchParams();
  params.set("customer", trustedOwner.stripeCustomerId);
  params.set("configuration", INTELLIGENCE_BILLING_PORTAL_CONFIGURATION);
  params.set("return_url", root + "/account/billing/");
  return Object.freeze({ params, stripeCustomerId: trustedOwner.stripeCustomerId });
}
/**
 * Creates a Stripe-hosted portal session only for independently verified
 * customers. This does not authorize a payment, entitlement or cancellation
 * on its own. Stripe's approved portal configuration controls permitted actions.
 */
export async function createIntelligenceBillingPortalSession({
  stripeSecretKey, fetchImpl = globalThis.fetch, ...input
} = {}) {
  const prepared = buildIntelligenceBillingPortalSession(input);
  if (!validKey(stripeSecretKey) || typeof fetchImpl !== "function") {
    throw reject("restricted_live_stripe_credential_required");
  }
  const response = await fetchImpl(API, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + stripeSecretKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: prepared.params.toString(),
    signal: AbortSignal.timeout(12000),
    redirect: "error",
  });
  if (!response?.ok) throw reject("stripe_billing_portal_request_failed");
  const body = await response.json();
  if (!PORTAL_SESSION.test(String(body?.id ?? "")) ||
      body?.livemode !== true || body?.customer !== prepared.stripeCustomerId ||
      typeof body?.url !== "string") {
    throw reject("stripe_billing_portal_response_invalid");
  }
  let url;
  try { url = new URL(body.url); } catch { throw reject("stripe_billing_portal_response_invalid"); }
  if (url.protocol !== "https:" || url.hostname !== "billing.stripe.com" ||
      url.username || url.password) throw reject("stripe_billing_portal_response_invalid");
  return Object.freeze({
    portalSessionId: body.id,
    redirectUrl: url.toString(),
    grantsCustomerAccess: false,
    requiresFreshAuthenticatedCustomerSession: true,
  });
}
