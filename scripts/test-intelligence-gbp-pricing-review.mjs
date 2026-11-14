import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const m = JSON.parse(read("docs/intelligence/gbp-pricing-owner-review-20261112.json"));
test("review manifest is GBP-only and cannot activate Stripe or customer access", () => {
  assert.equal(m.status,"OWNER_PRICING_APPROVED_RELEASE_GATED");
  assert.equal(m.launchCurrency,"gbp");
  for (const key of ["ownerApproved","gbpStripePricesCreated","gbpPriceIdsApproved"]) assert.equal(m[key],true);
  for (const key of ["customerBillingEnabled","customerAccessEnabled"]) assert.equal(m[key],false);
  assert.equal(m.verifiedPriceStatus,"active");
  assert.equal(m.priceCatalogueActive,true);
  assert.deepEqual(m.approvedSaleCountries,["GB"]);
  assert.deepEqual(m.proposedSaleCountries,["GB"]);
  assert.equal(m.tax.stripeTaxAutomatic,true);
  assert.equal(m.tax.collectTaxIds,true);
  assert.equal(m.tax.priceTaxBehavior,"exclusive");
  assert.equal(m.tax.taxCodeRequiresAccountantApproval,true);
});
test("review-only prices are exact and cannot be mistaken for Stripe Price IDs", () => {
  const p=m.plans;
  assert.deepEqual([p.starter.monthly.amountMinor,p.starter.annual.amountMinor,p.professional.monthly.amountMinor,p.professional.annual.amountMinor,p.enterprise.indicativeMonthlyMinor],[19900,203000,69900,713000,279900]);
  assert.equal(p.enterprise.contractRequired,true);
  assert.equal(p.enterprise.annual,null);
  assert.equal(p.enterprise.approvedPriceId,"price_1UatiL2U9Y3sX5I2gktsrNl5");
  assert.deepEqual([p.starter.monthly.priceId,p.starter.annual.priceId,p.professional.monthly.priceId,p.professional.annual.priceId],["price_1Uati52U9Y3sX5I2RJuYixR9","price_1UatiF2U9Y3sX5I2mv1a22VN","price_1UatiH2U9Y3sX5I2Pyqz3SpW","price_1UatiJ2U9Y3sX5I2CfJFkUnC"]);
  for (const plan of [p.starter,p.professional]) {
    assert.ok(Math.abs(1-plan.annual.amountMinor/(12*plan.monthly.amountMinor)-0.15)<0.002);
    for (const price of [plan.monthly,plan.annual]) assert.match(price.priceId,/^price_[A-Za-z0-9]+$/);
  }
});
test("four-plan public marketing uses active GBP Stripe payment links, without activating customer entitlements", () => {
  for (const path of ["src/content/technology-intelligence.html","technology/index.html"]) {
    const s = read(path);
    assert.ok(s.includes('data-npi-plan="trial"'));
    assert.equal((s.match(/data-npi-plan="(?:trial|starter|professional|enterprise)"/g) || []).length,4);
    assert.ok(s.includes('data-monthly-gbp="199" data-annual-gbp="2030"'));
    assert.ok(s.includes('data-monthly-gbp="699" data-annual-gbp="7130"'));
    assert.ok(s.includes("£2,799") && s.includes("Approved monthly prices in GBP"));
    assert.ok(s.includes('data-npi-starter-trial="approved"') && s.includes("No automatic subscription or charges"));
    assert.ok(s.includes("Paid subscriptions are charged immediately at Checkout") && s.includes("Payment is not an automatic medicine-data entitlement"));
    assert.ok(s.includes("Create free account") && s.includes("Contact sales"));
    assert.ok(s.includes('href="https://billing.stripe.com/p/login/00waEQ1gQ1Lr2x87aIdby00">Manage subscription</a>'));
    assert.ok(s.includes('href="https://buy.stripe.com/00waEQ1gQ1Lr2x87aIdby00" data-npi-live-stripe="starter"'));
    assert.ok(s.includes('href="https://buy.stripe.com/6oUeV64t2bm16NobqYdby01" data-npi-live-stripe="professional"'));
    assert.ok(!s.includes('/contact/?enquiry=General%20enquiry&amp;intelligencePlan=starter'));
    assert.ok(!s.includes('href="https://intelligence.novapharmhealthcare.com/auth/customer/register?'));
    assert.doesNotMatch(s,/data-(monthly|annual)-inr|checkout[.]stripe[.]com/);
  }
  const js=read("assets/js/intelligence-pricing.js");
  assert.doesNotMatch(js,/fetch[(]|sendBeacon|localStorage|sessionStorage|document[.]cookie/);
  const catalog = read("src/core/intelligence-live-stripe-catalog.mjs");
  assert.ok(catalog.includes('currency: "gbp"'));
  assert.ok(catalog.includes('"verifiedCustomerIdentityAndMfa"'));
  assert.ok(catalog.includes('"stripeWebhookAndLedgerAccepted"'));
});
