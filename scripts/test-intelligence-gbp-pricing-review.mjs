import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const m = JSON.parse(read("docs/intelligence/gbp-pricing-owner-review-20261112.json"));
test("review manifest is GBP-only and cannot activate Stripe or customer access", () => {
  assert.equal(m.status,"OWNER_REVIEW_ONLY");
  assert.equal(m.launchCurrency,"gbp");
  for (const key of ["ownerApproved","gbpStripePricesCreated","gbpPriceIdsApproved","customerBillingEnabled","customerAccessEnabled"]) assert.equal(m[key],false);
  assert.deepEqual(m.approvedSaleCountries,[]);
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
  assert.equal(p.enterprise.approvedPriceId,null);
  for (const plan of [p.starter,p.professional]) {
    assert.ok(Math.abs(1-plan.annual.amountMinor/(12*plan.monthly.amountMinor)-0.15)<0.002);
    for (const price of [plan.monthly,plan.annual]) assert.equal(price.priceId,null);
  }
});
test("public marketing candidates are GBP and never a payment flow", () => {
  for (const path of ["src/content/technology-intelligence.html","technology/index.html"]) {
    const s=read(path);
    assert.ok(s.includes('data-monthly-gbp="199" data-annual-gbp="2030"'));
    assert.ok(s.includes('data-monthly-gbp="699" data-annual-gbp="7130"'));
    assert.ok(s.includes("£2,799"));
    assert.ok(s.includes("Proposed prices in GBP"));
    assert.ok(s.includes("not live subscriptions"));
    assert.ok(s.includes("No payment will be collected here"));
    assert.doesNotMatch(s,/data-(monthly|annual)-inr|checkout[.]stripe[.]com/);
  }
  const js=read("assets/js/intelligence-pricing.js");
  assert.ok(js.includes('currency: "GBP"'));
  assert.doesNotMatch(js,/fetch\\(|sendBeacon|localStorage|sessionStorage|document[.]cookie/);
  // The server catalogue is still INR-only, and cannot be promoted to a GBP release.
  assert.ok(read("src/core/intelligence-live-stripe-catalog.mjs").includes('currency: "inr"'));
});
