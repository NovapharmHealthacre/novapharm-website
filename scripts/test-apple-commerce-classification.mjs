import assert from "node:assert/strict";
import test from "node:test";
import { reviewCommerceChannel } from "../src/core/apple-commerce-classification.mjs";

const cases = [
  ["ios physical Nutraxin", { surface: "ios", productClass: "physical-goods" }, "external-physical-goods-payment"],
  ["ios consumer Intelligence", { surface: "ios", productClass: "consumer-digital", storefront: "OTHER" }, "storekit-review"],
  ["ios EU consumer", { surface: "ios", productClass: "consumer-digital", storefront: "EU" }, "storekit-review"],
  ["ios BR consumer", { surface: "ios", productClass: "consumer-digital", storefront: "BR" }, "storekit-review"],
  ["ios JP consumer", { surface: "ios", productClass: "consumer-digital", storefront: "JP" }, "storekit-review"],
  ["ios organization only", { surface: "ios", productClass: "organization-only-enterprise", organizationOnly: true }, "existing-enterprise-contract-access"],
  ["ios fake enterprise", { surface: "ios", productClass: "organization-only-enterprise", organizationOnly: false }, "storekit-review"],
  ["android consumer", { surface: "android", productClass: "consumer-digital" }, "google-play-billing-review"],
  ["web digital", { surface: "web", productClass: "consumer-digital" }, "web-subscription-review"],
  ["unknown product", { surface: "ios", productClass: "mixed-goods" }, "none"],
  ["invalid storefront", { surface: "ios", productClass: "consumer-digital", storefront: "XX" }, "none"],
  ["invalid surface", { surface: "watchos", productClass: "consumer-digital" }, "none"],
];

for (const [name, input, requiredChannel] of cases) {
  test(name + ": never creates a purchase or entitlement", () => {
    const result = reviewCommerceChannel(input);
    assert.equal(result.requiredChannel, requiredChannel);
    assert.equal(result.purchaseEnabled, false);
    assert.equal(result.customerEntitlementGranted, false);
    assert.equal(result.externalPurchaseLinkEnabled, false);
    assert(Object.isFrozen(result));
  });
}

for (const storefront of ["BR", "EU", "JP"]) {
  test(`${storefront} cannot silently permit alternative payment`, () => {
    const review = reviewCommerceChannel({ surface: "ios", productClass: "consumer-digital", storefront });
    assert(review.requires.includes(`${storefront}-alternative-payment-entitlement-not-established`));
    assert.equal(review.externalPurchaseLinkEnabled, false);
  });
}
