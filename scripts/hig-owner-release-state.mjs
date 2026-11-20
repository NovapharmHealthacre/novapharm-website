/**
 * Source-only HIG release-state validation.
 *
 * A real owner release may eventually be granted; a permanently frozen
 * "not_granted" source test must never obstruct genuine, independently
 * approved evidence. Equally, editing a Boolean or pasting a URL cannot
 * constitute independent review, signed distribution or production access.
 * Separate HIG release and reviewer-authenticity gates remain mandatory.
 */
import assert from "node:assert/strict";

const sha40 = /^[a-f0-9]{40}$/;
const isoDate = value => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
const evidenceUrl = value => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !/^(?:localhost|example\.(?:com|org|net)|invalid)$/i.test(url.hostname) &&
      !/(?:placeholder|fake-receipt|test-only)/i.test(url.href);
  } catch {
    return false;
  }
};

export function validateHigOwnerReleaseState(owner) {
  assert.ok(owner && typeof owner === "object", "Owner release contract missing");
  assert.ok(["not_granted", "granted"].includes(owner.productionSignoff),
    "Unexpected owner production signoff state");
  assert.equal(owner.initialInfrastructureBudget?.monthlyCapGbp, 0,
    "This source-only HIG validation cannot authorize added infrastructure spend");
  assert.equal(owner.initialInfrastructureBudget?.newChargeableResourceProvisioning, false,
    "No paid AWS provisioning may be auto-enabled");
  const granted = owner.productionSignoff === "granted";
  if (granted) {
    assert.ok(evidenceUrl(owner.productionSignoffEvidenceUrl),
      "A granted owner signoff requires an inspectable non-placeholder HTTPS evidence URL");
    assert.match(owner.productionSignoffApprovedSourceSha ?? "", sha40,
      "Owner signoff must identify the exact approved source revision");
    assert.ok(isoDate(owner.productionSignoffGrantedAt),
      "Owner signoff requires a real timestamp");
  }
  const permissions = owner.productionPermissions;
  assert.ok(permissions && typeof permissions === "object",
    "Owner production-permissions register missing");
  // A valid owner signoff alone is insufficient for customer or vendor actions.
  // Require a distinct, reviewable authorization receipt for each explicit
  // permission that a future controlled release may enable.
  const permissionReceipts = {
    activatePublicCustomerAccess: "customerAccessReleaseEvidenceUrl",
    enableCustomerSubscriptions: "subscriptionsAuthorizationEvidenceUrl",
    enableCustomerBilling: "customerBillingAuthorizationEvidenceUrl",
    sendExternalEmail: "externalEmailReleaseEvidenceUrl",
    cutOverPortalDnsOrApiMapping: "portalCutoverReleaseEvidenceUrl",
    purchaseVendorLicenses: "vendorLicenseAuthorizationEvidenceUrl",
    activateNativePalantir: "palantirIntegrationAuthorizationEvidenceUrl",
    activateNativePrisma: "prismaIntegrationAuthorizationEvidenceUrl",
    activateNativeBloomberg: "bloombergIntegrationAuthorizationEvidenceUrl"
  };
  const unsafeWhileZeroSpend = new Set([
    "provisionNewPaidInfrastructure", "purchaseVendorLicenses",
    "activateNativePalantir", "activateNativePrisma", "activateNativeBloomberg"
  ]);
  for (const [permission, enabled] of Object.entries(permissions)) {
    assert.equal(typeof enabled, "boolean",
      "Owner permission must remain an explicit Boolean: " + permission);
    if (!enabled) continue;
    assert.notEqual(permission, "admitUnapprovedMedicineData",
      "Unapproved medicine data must never be admitted as a shortcut to release");
    assert.ok(permission in permissionReceipts ||
      permission === "provisionNewPaidInfrastructure",
      "Unknown newly enabled production permission needs a reviewed schema: " + permission);
    assert.equal(granted, true,
      "Cannot activate " + permission + " without explicit owner signoff");
    assert.ok(!unsafeWhileZeroSpend.has(permission),
      permission + ": zero-spend/vendor-neutral scope cannot authorize paid infrastructure or native vendor accounts");
    const proofKey = permissionReceipts[permission];
    assert.ok(evidenceUrl(owner[proofKey]),
      "Cannot activate " + permission + " without its own release/authorization receipt");
  }
  return {granted, sourceOnly: true, productionAcceptedByThisValidation: false};
}
