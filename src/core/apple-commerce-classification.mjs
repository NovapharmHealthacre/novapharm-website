/**
 * Review-only classification of NovaPharm commerce surfaces.
 * Not a payment route, StoreKit client, entitlement grant, or live merchant approval.
 * Apple App Review 3.1.1, 3.1.3(c), 3.1.3(e). Region-specific alternatives
 * require explicit Apple entitlements and remain unimplemented.
 */
const SURFACES = new Set(["web", "ios", "android"]);
const CLASSES = new Set(["consumer-digital", "organization-only-enterprise", "physical-goods"]);
const APPLE_STOREFRONTS = new Set(["US", "BR", "EU", "JP", "OTHER"]);

function decision(classification, requiredChannel, reason, requires = []) {
  return Object.freeze({
    classification,
    requiredChannel,
    reason,
    requires: Object.freeze([...requires]),
    purchaseEnabled: false,
    customerEntitlementGranted: false,
    externalPurchaseLinkEnabled: false,
  });
}

/** Returns a fail-closed *review recommendation*. Never initiates a purchase. */
export function reviewCommerceChannel({ productClass, surface, storefront = "OTHER", organizationOnly = false } = {}) {
  if (!CLASSES.has(productClass) || !SURFACES.has(surface) ||
      (surface === "ios" && !APPLE_STOREFRONTS.has(storefront))) {
    return decision("unclassified", "none", "invalid-or-unassessed-commerce-scope");
  }

  if (productClass === "physical-goods") {
    return decision(productClass, "external-physical-goods-payment", "physical-goods-are-not-storekit-iap", [
      "approved-merchant-flow", "regulated-product-rights", "owner-production-acceptance",
    ]);
  }

  if (productClass === "organization-only-enterprise") {
    if (organizationOnly !== true) {
      return decision("consumer-digital", surface === "ios" ? "storekit-review" : "platform-billing-review",
        "organization-only-exception-unproven", ["verify-consumer-applicability", "owner-production-acceptance"]);
    }
    return decision(productClass, "existing-enterprise-contract-access", "no-in-app-purchase-or-steering-approved", [
      "organization-only-distribution-proof", "no-consumer-sales", "authenticated-tenant-rights", "owner-production-acceptance",
    ]);
  }

  if (surface === "ios") {
    const alternative = ["BR", "EU", "JP"].includes(storefront);
    return decision(productClass, "storekit-review", "apple-native-consumer-digital-purchase", [
      "verified-app-store-connect-products", "signed-storekit-tests", "verified-transaction-and-restoration",
      "subscription-terms-and-refunds", "approved-customer-entitlement-backend", "owner-production-acceptance",
      ...(alternative ? [`${storefront}-alternative-payment-entitlement-not-established`] : []),
    ]);
  }
  if (surface === "android") {
    return decision(productClass, "google-play-billing-review", "android-native-digital-policy-independent-of-apple", [
      "current-play-policy-review", "signed-device-tests", "owner-production-acceptance",
    ]);
  }
  return decision(productClass, "web-subscription-review", "web-billing-not-activated", [
    "merchant-approval", "tenant-and-source-rights", "owner-production-acceptance",
  ]);
}
