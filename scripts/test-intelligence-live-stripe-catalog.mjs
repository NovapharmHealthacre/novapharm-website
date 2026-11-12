import assert from "node:assert/strict";
import test from "node:test";
import {
  intelligenceLiveStripeCatalog as catalog,
  selectIntelligenceCheckoutPrice as choose,
} from "../src/core/intelligence-live-stripe-catalog.mjs";

const release = {
  verifiedServerSide: true,
  catalogProductsActivated: true,
  catalogPricesActivated: true,
  verifiedCustomerIdentityAndMfa: true,
  tenantIsolationAccepted: true,
  serverSideContractAccepted: true,
  stripeWebhookAndLedgerAccepted: true,
  taxCodeAndRegistrationsAccepted: true,
  sourceRightsApproved: true,
  productionRuntimeAccepted: true,
};
const principal = { verifiedServerSide: true, mfaVerified: true, tenantId: "t_acme", subject: "u_owner" };

test("GBP catalog has distinct plan products and exact owner-approved GBP prices created inactive in live Stripe", () => {
  assert.equal(new Set(Object.values(catalog).map((p) => p.productId)).size, 3);
  assert.deepEqual([
    catalog.starter.prices.monthly.amountMinor,
    catalog.starter.prices.annual.amountMinor,
    catalog.professional.prices.monthly.amountMinor,
    catalog.professional.prices.annual.amountMinor,
    catalog.enterprise.prices.monthly.amountMinor,
  ], [19900, 203000, 69900, 713000, 279900]);
  assert.equal(catalog.enterprise.prices.annual, undefined);
  assert.equal(catalog.enterprise.monthlySearchLimit, null);
  assert.equal(new Set(Object.values(catalog).flatMap((p) => Object.values(p.prices).map((v) => v.id))).size, 5);
});

test("catalog is blocked by default, including claimed browser identity and unsigned release", () => {
  assert.equal(choose({ plan: "starter", cycle: "monthly" }).allowed, false);
  assert.equal(choose({ plan: "starter", cycle: "monthly", release: { ...release, verifiedServerSide: false }, principal }).allowed, false);
  assert.equal(choose({ plan: "professional", cycle: "annual", release, principal: { ...principal, mfaVerified: false } }).allowed, false);
  assert.equal(choose({ plan: "starter", cycle: "monthly", release: { ...release, stripeWebhookAndLedgerAccepted: false }, principal }).allowed, false);
  assert.equal(choose({ plan: "starter", cycle: "monthly", release: { ...release, taxCodeAndRegistrationsAccepted: false }, principal }).allowed, false);
  assert.equal(choose({ plan: "starter", cycle: "monthly", release: { ...release, sourceRightsApproved: false }, principal }).allowed, false);
});

test("a separately verified server release may select but never charge or grant access", () => {
  const result = choose({ plan: "starter", cycle: "annual", release, principal });
  assert.equal(result.allowed, true);
  assert.equal(result.amountMinor, 203000);
  assert.equal(result.currency, "gbp");
  assert.equal(result.taxBehavior, "exclusive");
  assert.equal(result.interval, "year");
  assert.equal(result.grantsAccess, false);
});

test("enterprise and unknown billing terms fail closed", () => {
  assert.equal(choose({ plan: "enterprise", cycle: "annual", release, principal }).allowed, false);
  assert.equal(choose({ plan: "enterprise", cycle: "monthly", release, principal }).code, "enterprise_contract_required");
  assert.equal(choose({ plan: "starter", cycle: "weekly", release, principal }).allowed, false);
  assert.equal(choose({ plan: "__proto__", cycle: "monthly", release, principal }).allowed, false);
  const good = choose({
    plan: "enterprise", cycle: "monthly", release, principal,
    signedEnterpriseContract: { verifiedServerSide: true, tenantId: "t_acme", stripePriceId: catalog.enterprise.prices.monthly.id, monthlySearchLimit: 500 },
  });
  assert.equal(good.allowed, true);
  assert.equal(good.grantsAccess, false);
});
