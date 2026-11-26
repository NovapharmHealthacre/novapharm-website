/**
 * Non-production Apple commerce and marketing source-policy tripwire.
 * NOT a StoreKit implementation, a runtime purchase authorization or a claim
 * that Apple's trademarks, payment entitlements or native distribution are approved.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (path) => JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));
const policy = readJson("config/apple-commerce-release.json");
const marketing = readJson("config/apple-marketing-release.json");
const owner = readJson("config/intelligence/owner-production-constraints.json");
const expo = readJson("native/novapharm-intelligence-mobile/app.json");

assert.equal(policy.schemaVersion, 1, "Explicit schema review required");
assert.match(policy.sourceArchive.sha256, /^[a-f\d]{64}$/u);
assert.equal(policy.sourceArchive.inspectedAssets, 888);
assert.equal(policy.sourceArchive.localizations, 48);
assert.equal(policy.sourceArchive.artworkCommittedToRepository, false,
  "Do not redistribute the proprietary artwork pack through this public repository");
assert.equal(policy.sourceArchive.artworkPublicationApproved, false,
  "Uploaded assets alone do not establish an authorized native checkout");

const commerce = policy.nativeDigitalCommerce;
assert.equal(commerce.status, "not-integrated", "Native StoreKit integration is not verified");
assert.deepEqual(commerce.appStoreConnectProducts, [], "No unverified Apple product identifiers");
assert.deepEqual(commerce.subscriptionGroupIds, [], "No unverified subscription groups");
for (const key of [
  "storeKitPurchaseFlowVerified", "transactionAndEntitlementVerificationAccepted",
  "restoreAndRefundFlowsAccepted", "appStoreServerNotificationsAccepted",
  "signedDeviceAcceptance", "enableConsumerPurchases",
]) {
  assert.equal(commerce[key], false, key + " requires independent native and backend acceptance");
}
for (const region of ["BR", "EU", "JP"]) {
  const options = policy.regionalAlternativePayments?.[region];
  assert(options && typeof options === "object", region + ": explicit regional decision required");
  for (const key of ["enabled", "entitlementVerified", "externalPurchaseApiVerified"]) {
    assert.equal(options[key], false, region + ": alternative payment entitlement/API unverified: " + key);
  }
}
for (const key of ["iapMarkInUse", "nativeStoreListingsApproved", "nativeAppPreviewsApproved"]) {
  assert.equal(policy.marketing[key], false, "Apple marketing publication is unverified: " + key);
}
assert.equal(policy.approval.ownerProductionSignoff, "not_granted");
assert.equal(policy.approval.independentQualitySecurityReview, "not_recorded");
assert.equal(policy.approval.appStoreReviewApproval, "not_established");

assert.equal(owner.productionSignoff, "not_granted");
assert.equal(owner.productionPermissions.enableCustomerSubscriptions, false);
assert.equal(owner.productionPermissions.enableCustomerBilling, false);
assert.equal(owner.productionPermissions.activatePublicCustomerAccess, false);
assert.equal(owner.initialInfrastructureBudget.monthlyCapGbp, 0);
assert.deepEqual(marketing.nativeAppListings, [], "Unverified native store listings must remain unpublished");
assert.deepEqual(marketing.appPreviews, [], "Unreviewed native preview footage must remain unpublished");
assert.equal(expo.expo.name, "NovaPharm Intelligence");

console.log("Apple brand, StoreKit and regional alternative-payment prelaunch hold: PASS (nothing activated)");
