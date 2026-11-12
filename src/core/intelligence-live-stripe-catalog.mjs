/**
 * NovaPharm Intelligence live Stripe Billing product and price registry.
 *
 * Catalog records exist and were CREATED and later ACTIVATED in the UK LIVE Stripe account
 * on 12 November 2026: all three products and five recurring GBP prices (active catalogue, but Checkout, payment and access remain gated).
 * Active Stripe Price objects are NOT paid customer checkout acceptance. This module
 * never creates a Checkout Session, charges money, validates customer identity
 * or grants entitlement.
 * IDs are not secrets. Credentials and webhook signing keys must never be
 * committed. Only a production server with independently accepted release
 * evidence may select a price. Browser prices are never authoritative.
 */
export const INTELLIGENCE_LIVE_STRIPE_ACCOUNT = "acct_1UZUNv2U9Y3sX5I2";

const plans = {
  starter: {
    productId: "prod_VbJzV0YaMnV4b5",
    description: "Up to 25 governed searches per month; subject to source rights.",
    monthlySearchLimit: 25,
    prices: {
      monthly: { id: "price_1Uati52U9Y3sX5I2RJuYixR9", amountMinor: 19900, interval: "month" },
      annual: { id: "price_1UatiF2U9Y3sX5I2mv1a22VN", amountMinor: 203000, interval: "year" },
    },
  },
  professional: {
    productId: "prod_VbJz6LwT66jBo7",
    description: "Up to 250 governed searches per month; source-limited premium views.",
    monthlySearchLimit: 250,
    prices: {
      monthly: { id: "price_1UatiH2U9Y3sX5I2Pyqz3SpW", amountMinor: 69900, interval: "month" },
      annual: { id: "price_1UatiJ2U9Y3sX5I2CfJFkUnC", amountMinor: 713000, interval: "year" },
    },
  },
  enterprise: {
    productId: "prod_VbJzxDHTBEdAnj",
    description: "Indicative from-price only; individually signed scope, quota and contract required.",
    monthlySearchLimit: null,
    prices: {
      monthly: { id: "price_1UatiL2U9Y3sX5I2gktsrNl5", amountMinor: 279900, interval: "month", contractOnly: true },
    },
  },
};

for (const plan of Object.values(plans)) {
  for (const price of Object.values(plan.prices)) Object.freeze(price);
  Object.freeze(plan.prices);
  Object.freeze(plan);
}
export const intelligenceLiveStripeCatalog = Object.freeze(plans);

const REQUIRED_RELEASE_GATES = Object.freeze([
  "catalogProductsActivated",
  "catalogPricesActivated",
  "verifiedCustomerIdentityAndMfa",
  "tenantIsolationAccepted",
  "serverSideContractAccepted",
  "stripeWebhookAndLedgerAccepted",
  "taxCodeAndRegistrationsAccepted",
  "sourceRightsApproved",
  "productionRuntimeAccepted",
]);

/**
 * This returns a Price ID only, NEVER a payment or access grant.
 * The caller must load release evidence and authenticated principal from its
 * own server-only, audited state, not a form, browser or Stripe metadata.
 */
export function selectIntelligenceCheckoutPrice({
  plan,
  cycle,
  release,
  principal,
  signedEnterpriseContract,
} = {}) {
  if (release?.verifiedServerSide !== true ||
      REQUIRED_RELEASE_GATES.some((gate) => release[gate] !== true)) {
    return Object.freeze({ allowed: false, code: "subscription_checkout_not_released" });
  }
  if (principal?.verifiedServerSide !== true ||
      principal.mfaVerified !== true ||
      typeof principal.tenantId !== "string" ||
      typeof principal.subject !== "string") {
    return Object.freeze({ allowed: false, code: "customer_identity_not_verified" });
  }
  if (!Object.hasOwn(plans, plan) || !Object.hasOwn(plans[plan].prices, cycle)) {
    return Object.freeze({ allowed: false, code: "plan_or_cycle_not_available" });
  }
  const entry = plans[plan].prices[cycle];
  if (entry.contractOnly &&
      (signedEnterpriseContract?.verifiedServerSide !== true ||
       signedEnterpriseContract?.tenantId !== principal.tenantId ||
       signedEnterpriseContract?.stripePriceId !== entry.id ||
       !Number.isSafeInteger(signedEnterpriseContract.monthlySearchLimit) ||
       signedEnterpriseContract.monthlySearchLimit <= 0)) {
    return Object.freeze({ allowed: false, code: "enterprise_contract_required" });
  }
  return Object.freeze({
    allowed: true,
    code: "catalog_price_selected",
    currency: "gbp",
    taxBehavior: "exclusive",
    interval: entry.interval,
    productId: plans[plan].productId,
    stripePriceId: entry.id,
    amountMinor: entry.amountMinor,
    grantsAccess: false,
  });
}
