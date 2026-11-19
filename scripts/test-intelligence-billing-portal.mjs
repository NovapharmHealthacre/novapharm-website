import assert from "node:assert/strict";
import test from "node:test";
import { buildIntelligenceBillingPortalSession, createIntelligenceBillingPortalSession,
  INTELLIGENCE_BILLING_PORTAL_CONFIGURATION } from "../src/core/intelligence-billing-portal.mjs";

const principal = { verifiedServerSide: true, mfaVerified: true, identityProvider: "cognito-oidc",
  tenantId: "tenant-owner", subject: "principal-owner" };
const trustedOwner = { verifiedServerSide: true, tenantSeatApproved: true, stripeLiveMode: true,
  tenantId: principal.tenantId, subject: principal.subject, stripeCustomerId: "cus_0123456789", plan: "starter" };
const release = { verifiedServerSide: true, stripeAccountId: "acct_1UZUNv2U9Y3sX5I2",
  customerSessionRuntimeAccepted: true, tenantOwnerLedgerAccepted: true,
  billingPortalConfigurationAccepted: true, portalConfigurationId: INTELLIGENCE_BILLING_PORTAL_CONFIGURATION };
const origin = "https://intelligence.novapharmhealthcare.com/";
const valid = { principal, trustedOwner, release, origin };
function denied(overrides, code) {
  assert.throws(() => buildIntelligenceBillingPortalSession({ ...valid, ...overrides }), e => e.code === code);
}
test("billing portal references a fixed live configuration, owned customer, approved return URL", () => {
  const prepared = buildIntelligenceBillingPortalSession(valid);
  assert.equal(prepared.params.get("customer"), trustedOwner.stripeCustomerId);
  assert.equal(prepared.params.get("configuration"), INTELLIGENCE_BILLING_PORTAL_CONFIGURATION);
  assert.equal(prepared.params.get("return_url"), origin + "account/billing/");
  assert.equal(prepared.params.has("metadata[tenantId]"), false);
  assert.equal(Object.isFrozen(prepared), true);
});
test("portal access requires verified OIDC MFA and exact customer tenant/seat ownership", () => {
  denied({ principal: { ...principal, mfaVerified: false } }, "customer_identity_not_verified");
  denied({ principal: { ...principal, identityProvider: "browser" } }, "customer_identity_not_verified");
  denied({ trustedOwner: { ...trustedOwner, subject: "principal-attacker" } }, "customer_billing_ownership_unverified");
  denied({ trustedOwner: { ...trustedOwner, tenantId: "tenant-attacker" } }, "customer_billing_ownership_unverified");
  denied({ trustedOwner: { ...trustedOwner, tenantSeatApproved: false } }, "customer_billing_ownership_unverified");
  denied({ trustedOwner: { ...trustedOwner, stripeCustomerId: "cus_foreignTenant1", stripeLiveMode: false } }, "customer_billing_ownership_unverified");
  denied({ trustedOwner: { ...trustedOwner, plan: "__proto__" } }, "customer_billing_ownership_unverified");
});
test("billing portal cannot be redirected off the approved Intelligence host", () => {
  for (const bad of ["https://evil.example/", "http://intelligence.novapharmhealthcare.com/",
    "https://intelligence.novapharmhealthcare.com.attacker.example/",
    "https://intelligence.novapharmhealthcare.com:8443/",
    "https://intelligence.novapharmhealthcare.com/evil"]) {
    denied({ origin: bad }, "billing_origin_not_approved");
  }
});
test("configuration, customer session, account and owner ledger must be released", () => {
  for (const key of ["customerSessionRuntimeAccepted", "tenantOwnerLedgerAccepted",
    "billingPortalConfigurationAccepted"]) {
    denied({ release: { ...release, [key]: false } }, "billing_portal_not_released");
  }
  denied({ release: { ...release, stripeAccountId: "acct_foreign" } }, "billing_portal_not_released");
  denied({ release: { ...release, portalConfigurationId: "bpc_other" } }, "billing_portal_not_released");
});
test("enterprise self-service management requires an explicit independently signed term", () => {
  const ent = { ...trustedOwner, plan: "enterprise" };
  denied({ trustedOwner: ent }, "enterprise_billing_contract_required");
  denied({ trustedOwner: ent, signedEnterpriseContract: { verifiedServerSide: true,
    tenantId: principal.tenantId, stripeCustomerId: ent.stripeCustomerId,
    allowSelfServiceBilling: false } }, "enterprise_billing_contract_required");
  const allowed = buildIntelligenceBillingPortalSession({ ...valid, trustedOwner: ent,
    signedEnterpriseContract: { verifiedServerSide: true, tenantId: principal.tenantId,
      stripeCustomerId: ent.stripeCustomerId, allowSelfServiceBilling: true } });
  assert.equal(allowed.params.get("customer"), trustedOwner.stripeCustomerId);
});
test("no invalid credential reaches Stripe, and valid mock response cannot grant access", async () => {
  let calls = 0;
  await assert.rejects(createIntelligenceBillingPortalSession({ ...valid,
    stripeSecretKey: "pk_live_browser", fetchImpl: async () => { ++calls; return {}; } }));
  assert.equal(calls, 0);
  const outcome = await createIntelligenceBillingPortalSession({ ...valid,
    stripeSecretKey: "rk_live_0123456789abcdefghijkl",
    fetchImpl: async (url, request) => {
      ++calls;
      assert.equal(url, "https://api.stripe.com/v1/billing_portal/sessions");
      assert.equal(request.method, "POST");
      assert.equal(request.redirect, "error");
      assert.equal(new URLSearchParams(request.body).get("customer"), trustedOwner.stripeCustomerId);
      return { ok: true, json: async () => ({
        id: "bps_0123456789", livemode: true, customer: trustedOwner.stripeCustomerId,
        url: "https://billing.stripe.com/p/session/live_synthetic_only",
      }) };
    },
  });
  assert.equal(calls, 1);
  assert.equal(outcome.grantsCustomerAccess, false);
  assert.equal(outcome.requiresFreshAuthenticatedCustomerSession, true);
  assert.equal(outcome.redirectUrl, "https://billing.stripe.com/p/session/live_synthetic_only");
});
test("forged customer, test-mode session or offsite portal URL fails", async () => {
  for (const change of [
    { livemode: false }, { id: "bps_bad-a" },
    { customer: "cus_foreignTenant1" }, { url: "https://billing.stripe.com.attacker.example/s" },
  ]) {
    await assert.rejects(createIntelligenceBillingPortalSession({ ...valid,
      stripeSecretKey: "rk_live_0123456789abcdefghijkl",
      fetchImpl: async () => ({ ok: true, json: async () => ({
        id: "bps_0123456789", livemode: true, customer: trustedOwner.stripeCustomerId,
        url: "https://billing.stripe.com/p/session/synthetic", ...change,
      }) }),
    }));
  }
});
