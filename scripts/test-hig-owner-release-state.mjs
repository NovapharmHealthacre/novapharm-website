import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateHigOwnerReleaseState } from "./hig-owner-release-state.mjs";

const actual = JSON.parse(readFileSync("config/intelligence/owner-production-constraints.json","utf8"));
const copy = value => structuredClone(value);
const synthetic = value => {
  const candidate = copy(value);
  // Synthetic future-state tests must not inherit real release switches,
  // otherwise a legitimate later production approval could break unrelated
  // negative-case tests or hide which distinct receipt is being examined.
  for (const permission of Object.keys(candidate.productionPermissions))
    candidate.productionPermissions[permission] = false;
  candidate.initialInfrastructureBudget.newChargeableResourceProvisioning = false;
  return candidate;
};

test("current owner constraints are validated without hard-coding a permanent denial", () => {
  const checked = validateHigOwnerReleaseState(actual);
  assert.equal(checked.productionAcceptedByThisValidation, false);
  assert.equal(checked.sourceOnly, true);
  assert.equal(checked.granted, actual.productionSignoff === "granted",
    "The source-only tests must not freeze a future valid owner decision at denial");
});

test("source-only test permits a future documented release without self-certifying it", () => {
  const next = synthetic(actual);
  next.productionSignoff = "granted";
  next.productionSignoffEvidenceUrl =
    "https://github.com/NovapharmHealthacre/novapharm-website/pull/1000#pullrequestreview-12345";
  next.productionSignoffApprovedSourceSha = "a".repeat(40);
  next.productionSignoffGrantedAt = "2026-11-20T11:30:00Z";
  const checked = validateHigOwnerReleaseState(next);
  assert.equal(checked.granted, true);
  assert.equal(checked.productionAcceptedByThisValidation, false,
    "Syntactically valid owner metadata is not independent acceptance or public deployment");
  next.productionPermissions.activatePublicCustomerAccess = true;
  assert.throws(() => validateHigOwnerReleaseState(next),
    /customerAccessReleaseEvidenceUrl|authorization receipt|release\/authorization receipt/i);
  next.customerAccessReleaseEvidenceUrl =
    "https://github.com/NovapharmHealthacre/novapharm-website/pull/1000#pullrequestreview-12345";
  assert.equal(validateHigOwnerReleaseState(next).productionAcceptedByThisValidation, false);
});

test("reject a claimed signoff with missing, placeholder or non-specific receipts", () => {
  for (const missing of ["productionSignoffEvidenceUrl",
    "productionSignoffApprovedSourceSha","productionSignoffGrantedAt"]) {
    const x = synthetic(actual);
    x.productionSignoff = "granted";
    x.productionSignoffEvidenceUrl = "https://github.com/NovapharmHealthacre/novapharm-website/pull/1000";
    x.productionSignoffApprovedSourceSha = "a".repeat(40);
    x.productionSignoffGrantedAt = "2026-11-20T11:30:00Z";
    delete x[missing];
    assert.throws(() => validateHigOwnerReleaseState(x), undefined,
      "Missing owner receipt field must not pass: " + missing);
  }
  const x = synthetic(actual);
  x.productionSignoff = "granted";
  x.productionSignoffEvidenceUrl = "https://example.com/placeholder";
  x.productionSignoffApprovedSourceSha = "b".repeat(40);
  x.productionSignoffGrantedAt = "2026-11-20T11:30:00Z";
  assert.throws(() => validateHigOwnerReleaseState(x), /non-placeholder HTTPS/);
});

test("customer activation, billing and paid infrastructure remain explicitly gated", () => {
  const x = synthetic(actual);
  x.productionPermissions.activatePublicCustomerAccess = true;
  assert.throws(() => validateHigOwnerReleaseState(x), /explicit owner signoff/);
  x.productionPermissions.activatePublicCustomerAccess = false;
  x.productionPermissions.enableCustomerBilling = true;
  assert.throws(() => validateHigOwnerReleaseState(x), /explicit owner signoff/);
  x.productionPermissions.enableCustomerBilling = false;
  x.initialInfrastructureBudget.newChargeableResourceProvisioning = true;
  assert.throws(() => validateHigOwnerReleaseState(x), /No paid AWS provisioning/);
});

test("all production permission switches require independent authorization before activation", () => {
  for (const key of Object.keys(actual.productionPermissions)) {
    const attempt = synthetic(actual);
    attempt.productionSignoff = "not_granted";
    attempt.productionPermissions[key] = true;
    assert.throws(() => validateHigOwnerReleaseState(attempt), undefined,
      "A disabled production permission must not become active without its own authorization: " + key);
  }
});

test("signoff does not authorize unapproved medicine data, paid vendor tools or infrastructure", () => {
  const granted = synthetic(actual);
  granted.productionSignoff = "granted";
  granted.productionSignoffEvidenceUrl =
    "https://github.com/NovapharmHealthacre/novapharm-website/pull/1000#pullrequestreview-12345";
  granted.productionSignoffApprovedSourceSha = "a".repeat(40);
  granted.productionSignoffGrantedAt = "2026-11-20T11:30:00Z";
  for (const permission of [
    "admitUnapprovedMedicineData", "provisionNewPaidInfrastructure",
    "purchaseVendorLicenses", "activateNativePalantir",
    "activateNativePrisma", "activateNativeBloomberg"
  ]) {
    const attempt = copy(granted);
    attempt.productionPermissions[permission] = true;
    assert.throws(() => validateHigOwnerReleaseState(attempt), undefined,
      permission + " must remain forbidden under source-rights and zero-spend policies");
  }
});

test("additional customer-facing permissions require distinct approval receipts", () => {
  const granted = synthetic(actual);
  granted.productionSignoff = "granted";
  granted.productionSignoffEvidenceUrl =
    "https://github.com/NovapharmHealthacre/novapharm-website/pull/1000#pullrequestreview-12345";
  granted.productionSignoffApprovedSourceSha = "a".repeat(40);
  granted.productionSignoffGrantedAt = "2026-11-20T11:30:00Z";
  const evidenceKeys = {
    enableCustomerSubscriptions: "subscriptionsAuthorizationEvidenceUrl",
    sendExternalEmail: "externalEmailReleaseEvidenceUrl",
    cutOverPortalDnsOrApiMapping: "portalCutoverReleaseEvidenceUrl"
  };
  for (const [permission, evidenceKey] of Object.entries(evidenceKeys)) {
    const attempt = copy(granted);
    attempt.productionPermissions[permission] = true;
    delete attempt[evidenceKey];
    assert.throws(() => validateHigOwnerReleaseState(attempt),
      /release\/authorization receipt/,
      permission + ": future source state cannot bypass its own receipt");
    attempt[evidenceKey] =
      "https://github.com/NovapharmHealthacre/novapharm-website/pull/1000#pullrequestreview-12345";
    assert.equal(validateHigOwnerReleaseState(attempt).productionAcceptedByThisValidation,
      false, "A syntactically plausible URL does not mean authenticated review or deployment");
  }
});
