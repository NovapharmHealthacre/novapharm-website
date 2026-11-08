import assert from "node:assert/strict";
import test from "node:test";
import { calculateMarginQuote, TARGET_GROSS_MARGIN_BPS } from "../src/core/payments/commerce-margin-policy.mjs";

const nowMs = Date.parse("2026-11-08T14:00:00Z");
const good = () => ({
  nowMs,
  destinationCountry: "GB",
  approvedCostLines: [{
    sku: "NUT-UK-VD3-T120", name: "Nutraxin Vitamin D3",
    quantity: 2, landedUnitCostMinor: 1000,
    sourceApproved: true, costVersion: "rev_1",
    commerciallyEligible: true,
    fulfilmentMode: "ready_stock", availableToPromise: 12
  }],
  deliveryQuote: {
    reference: "polar-test-rated-001", currency: "GBP", destinationCountry: "GB",
    providerApproval: true, expiresAtMs: nowMs + 60000,
    costMinor: 300, packingMinor: 100
  },
  taxAssessment: {
    reference: "tax-review-001", currency: "GBP", destinationCountry: "GB",
    confirmed: true, expiresAtMs: nowMs + 60000,
    jurisdictionBasis: "UK domestic standard-rated validated tax class",
    netMinor: 3201, lineTaxMinor: [533, 107], totalTaxMinor: 640
  }
});

test("25% margin is calculated on complete landed cost including delivery and handling, before tax", () => {
  const quote = calculateMarginQuote(good());
  assert.equal(TARGET_GROSS_MARGIN_BPS, 2500);
  assert.equal(quote.netMinor, 3201);
  assert.equal(quote.taxMinor, 640);
  assert.equal(quote.grossMinor, 3841);
  assert.equal(quote.lines.length, 2);
  assert.equal(quote.lines[0].grossMinor, 3200);
  assert.equal(quote.lines[1].grossMinor, 641);
  assert.ok((quote.netMinor - 2400) / quote.netMinor >= 0.25);
  assert.equal(quote.status, "quote_candidate_not_payment_authorisation");
  assert.equal(JSON.stringify(quote).includes("landedUnitCostMinor"), false);
  assert.equal(JSON.stringify(quote).includes("availableToPromise"), false);
});
test("international tax cannot be inferred from selected country or zero-rating assumption", () => {
  const original = good();
  for (const destinationCountry of ["DE", "US", "IN", "FR", "IE"]) {
    assert.throws(() => calculateMarginQuote({...original, destinationCountry}), /quotation/);
    assert.throws(() => calculateMarginQuote({
      ...original, destinationCountry,
      deliveryQuote: {...original.deliveryQuote, destinationCountry},
      taxAssessment: {...original.taxAssessment, destinationCountry, confirmed:false}
    }), /tax decision/);
    const approved = calculateMarginQuote({
      ...original, destinationCountry,
      deliveryQuote: {...original.deliveryQuote, destinationCountry, reference:"freight-country-specific-001"},
      taxAssessment: {...original.taxAssessment, destinationCountry, reference:"country-tax-assessed-001", jurisdictionBasis:"reviewed registration and shipping legal basis for " + destinationCountry, lineTaxMinor:[0,0], totalTaxMinor:0}
    });
    assert.equal(approved.taxMinor,0); // Explicit assessed amount, not country heuristic.
    assert.equal(approved.destinationCountry,destinationCountry);
  }
});
test("manufacturing supply is not presumed to mean unlimited ready stock", () => {
  const b = good();
  assert.throws(() => calculateMarginQuote({...b, approvedCostLines:[{...b.approvedCostLines[0],quantity:999}]}), /stock/);
  assert.throws(() => calculateMarginQuote({...b, approvedCostLines:[{
    ...b.approvedCostLines[0],fulfilmentMode:"manufacture_to_order"
  }]}), /capacity/);
  const manufactured = {...b.approvedCostLines[0],fulfilmentMode:"manufacture_to_order",
    productionCapacityApproved:true,confirmedProductionDays:14,customerAcceptedLeadTime:true};
  assert.equal(calculateMarginQuote({...b,approvedCostLines:[manufactured]}).grossMinor,3841);
});
test("bad or expired shipping, product and tax authority fails closed", () => {
  const b=good();
  const bad=[
    {...b,approvedCostLines:[{...b.approvedCostLines[0],sourceApproved:false}]},
    {...b,approvedCostLines:[{...b.approvedCostLines[0],commerciallyEligible:false}]},
    {...b,approvedCostLines:[{...b.approvedCostLines[0],landedUnitCostMinor:-1}]},
    {...b,approvedCostLines:[b.approvedCostLines[0],b.approvedCostLines[0]]},
    {...b,deliveryQuote:{...b.deliveryQuote,expiresAtMs:nowMs-1}},
    {...b,deliveryQuote:{...b.deliveryQuote,providerApproval:false}},
    {...b,deliveryQuote:{...b.deliveryQuote,costMinor:undefined}},
    {...b,taxAssessment:{...b.taxAssessment,netMinor:2000}},
    {...b,taxAssessment:{...b.taxAssessment,lineTaxMinor:[533,108]}},
    {...b,taxAssessment:{...b.taxAssessment,expiresAtMs:nowMs-1}},
    {...b,taxAssessment:{...b.taxAssessment,totalTaxMinor:0}}
  ];
  for (const input of bad) assert.throws(()=>calculateMarginQuote(input));
});
