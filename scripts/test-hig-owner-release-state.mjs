import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateHigOwnerReleaseState } from "./hig-owner-release-state.mjs";

const actual = JSON.parse(readFileSync("config/intelligence/owner-production-constraints.json","utf8"));
const copy = value => structuredClone(value);

test("current unapproved owner constraints remain zero-spend and non-releasing", () => {
  const checked = validateHigOwnerReleaseState(actual);
  assert.equal(checked.productionAcceptedByThisValidation, false);
  assert.equal(checked.sourceOnly, true);
  assert.equal(checked.granted, false);
});

test("source-only test permits a future documented release without self-certifying it", () => {
  const next = copy(actual);
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
    const x = copy(actual);
    x.productionSignoff = "granted";
    x.productionSignoffEvidenceUrl = "https://github.com/NovapharmHealthacre/novapharm-website/pull/1000";
    x.productionSignoffApprovedSourceSha = "a".repeat(40);
    x.productionSignoffGrantedAt = "2026-11-20T11:30:00Z";
    delete x[missing];
    assert.throws(() => validateHigOwnerReleaseState(x), undefined,
      "Missing owner receipt field must not pass: " + missing);
  }
  const x = copy(actual);
  x.productionSignoff = "granted";
  x.productionSignoffEvidenceUrl = "https://example.com/placeholder";
  x.productionSignoffApprovedSourceSha = "b".repeat(40);
  x.productionSignoffGrantedAt = "2026-11-20T11:30:00Z";
  assert.throws(() => validateHigOwnerReleaseState(x), /non-placeholder HTTPS/);
});

test("customer activation, billing and paid infrastructure remain explicitly gated", () => {
  const x = copy(actual);
  x.productionPermissions.activatePublicCustomerAccess = true;
  assert.throws(() => validateHigOwnerReleaseState(x), /explicit owner signoff/);
  x.productionPermissions.activatePublicCustomerAccess = false;
  x.productionPermissions.enableCustomerBilling = true;
  assert.throws(() => validateHigOwnerReleaseState(x), /explicit owner signoff/);
  x.productionPermissions.enableCustomerBilling = false;
  x.initialInfrastructureBudget.newChargeableResourceProvisioning = true;
  assert.throws(() => validateHigOwnerReleaseState(x), /No paid AWS provisioning/);
});
