import assert from "node:assert/strict";
import test from "node:test";
import { assessPharmacyEmail, pharmacyIdentifierCandidates, pharmacySeedIdentity } from "../src/index.ts";

const workbookSha256 = "a".repeat(64);

test("authoritative identifiers, never shared email, determine pharmacy seed identity", () => {
  const first = pharmacySeedIdentity({ country: "England", registration: "1000001", contractorCode: "FA001", workbookSha256, masterRow: 2 });
  const second = pharmacySeedIdentity({ country: "England", registration: "1000002", contractorCode: "FA002", workbookSha256, masterRow: 3 });
  assert.notEqual(first, second);
  assert.equal(pharmacySeedIdentity({ country: "England", registration: "1000001", contractorCode: "CHANGED", workbookSha256, masterRow: 99 }), first);
  assert.deepEqual(pharmacyIdentifierCandidates("England", "1000001", "FA001").map(({ type, priority }) => ({ type, priority })), [
    { type: "GPHC_PREMISES", priority: 1 },
    { type: "NHS_CONTRACTOR_CODE", priority: 2 },
  ]);
});

test("rows without authoritative identifiers remain distinct pending review", () => {
  const first = pharmacySeedIdentity({ country: "Wales", registration: "", contractorCode: "", workbookSha256, masterRow: 2 });
  const second = pharmacySeedIdentity({ country: "Wales", registration: "", contractorCode: "", workbookSha256, masterRow: 3 });
  assert.notEqual(first, second);
});

test("email governance preserves unknown dates and never enables marketing", () => {
  assert.deepEqual(assessPharmacyEmail("hello@example.test", "VERIFIED REAL EMAIL", ""), {
    status: "verified", email: "hello@example.test", verifiedAt: null, marketingEligible: false,
    reason: "Evidence-backed public non-NHS business email supplied by the governed workbook.",
  });
  assert.equal(assessPharmacyEmail("", "ACTIONED - NO DEFENSIBLE PUBLIC NON-NHS EMAIL IN AVAILABLE EVIDENCE", "2026-08-24").status, "no_new_evidence");
  assert.equal(assessPharmacyEmail("branch@nhs.uk", "VERIFIED REAL EMAIL", "2026-08-24").status, "review_required");
});
