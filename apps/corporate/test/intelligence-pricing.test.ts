import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  intelligencePaidPlans,
  intelligencePricingLaunchNotice,
  intelligenceTrialOffer,
} from "../data/intelligence-pricing";

const component = readFileSync(path.join(process.cwd(), "components/intelligence-pricing.tsx"), "utf8");
const renderer = readFileSync(path.join(process.cwd(), "components/page-renderer.tsx"), "utf8");

test("owner-approved Starter trial has one organisation, 30 days, 25 lifetime searches and no automatic billing", () => {
  assert.equal(intelligenceTrialOffer.durationDays, 30);
  assert.equal(intelligenceTrialOffer.totalSearches, 25);
  assert.equal(intelligenceTrialOffer.priceGBP, 0);
  assert.equal(intelligenceTrialOffer.onePerVerifiedOrganisation, true);
  assert.equal(intelligenceTrialOffer.paymentCardRequired, false);
  assert.equal(intelligenceTrialOffer.automaticPaidConversion, false);
  assert.equal(intelligenceTrialOffer.customerEnrollmentLive, false);
});

test("approved GBP monthly plans and Enterprise contract caveat remain unchanged", () => {
  assert.deepEqual(
    intelligencePaidPlans.map(({ code, monthlyPriceGBP }) => [code, monthlyPriceGBP]),
    [["starter", 199], ["professional", 699], ["enterprise", 2799]],
  );
  assert.equal(intelligencePaidPlans[2]?.startingAt, true);
  assert.match(intelligencePaidPlans[2]?.accessNote ?? "", /contract/);
});

test("public technology page renders the pricing section and never claims registration is live", () => {
  assert.match(renderer, /<IntelligencePricing \/>/);
  assert.match(component, /id="intelligence-pricing"/);
  assert.match(component, /No credit card required/);
  assert.match(component, /No automatic charges when the trial ends/);
  assert.match(component, /Trial enrolment opening after production approval/);
  assert.match(intelligencePricingLaunchNotice, /not yet open/i);
  assert.doesNotMatch(component, /start-trial|\/auth\/customer\/register|\/customer\/subscription\/checkout|stripe\.com\/checkout/);
});
