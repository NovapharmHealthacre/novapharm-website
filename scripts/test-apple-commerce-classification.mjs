import assert from "node:assert/strict";
import test from "node:test";
import { reviewCommerceChannel } from "../src/core/apple-commerce-classification.mjs";

const cases = [
  ["ios physical Nutraxin", { surface: "ios", productClass: "physical-goods" }, "external-physical-goods-payment"],
  ["ios consumer Intelligence", { surface: "ios", productClass: "consumer-digital", storefront: "OTHER" }, "storekit-review"],
  ["ios German consumer", { surface: "ios", productClass: "consumer-digital", storefront: "DE" }, "storekit-review"],
  ["ios BR consumer", { surface: "ios", productClass: "consumer-digital", storefront: "BR" }, "storekit-review"],
  ["ios JP consumer", { surface: "ios", productClass: "consumer-digital", storefront: "JP" }, "storekit-review"],
  ["ios organization only", { surface: "ios", productClass: "organization-only-enterprise", organizationOnly: true }, "existing-enterprise-contract-access"],
  ["ios fake enterprise", { surface: "ios", productClass: "organization-only-enterprise", organizationOnly: false }, "storekit-review"],
  ["android consumer", { surface: "android", productClass: "consumer-digital" }, "google-play-billing-review"],
  ["web digital", { surface: "web", productClass: "consumer-digital" }, "web-subscription-review"],
  ["unknown product", { surface: "ios", productClass: "mixed-goods" }, "none"],
  ["invalid pseudo EU storefront", { surface: "ios", productClass: "consumer-digital", storefront: "EU" }, "none"],
  ["invalid unknown storefront", { surface: "ios", productClass: "consumer-digital", storefront: "XX" }, "none"],
  ["invalid lowercase storefront", { surface: "ios", productClass: "consumer-digital", storefront: "de" }, "none"],
  ["unreviewed Indian consumer", { surface: "ios", productClass: "consumer-digital", storefront: "IN" }, "storekit-review"],
  ["android fake enterprise", { surface: "android", productClass: "organization-only-enterprise", organizationOnly: false }, "google-play-billing-review"],
  ["web fake enterprise", { surface: "web", productClass: "organization-only-enterprise", organizationOnly: false }, "web-subscription-review"],
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

for (const storefront of ["BR", "DE", "JP"]) {
  test(`${storefront} cannot silently permit alternative payment`, () => {
    const review = reviewCommerceChannel({ surface: "ios", productClass: "consumer-digital", storefront });
    const region = storefront === "DE" ? "EU" : storefront;
    assert(review.requires.includes(`${region}-alternative-payment-entitlement-not-established`));
    assert.equal(review.externalPurchaseLinkEnabled, false);
  });
}

const euStorefronts = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
for (const storefront of euStorefronts) {
  test(`EU member storefront ${storefront} stays disabled and requires EU review`, () => {
    const review = reviewCommerceChannel({ surface: "ios", productClass: "consumer-digital", storefront });
    assert.equal(review.requiredChannel, "storekit-review");
    assert.equal(review.purchaseEnabled, false);
    assert.equal(review.externalPurchaseLinkEnabled, false);
    assert(review.requires.includes("EU-alternative-payment-entitlement-not-established"));
  });
}
