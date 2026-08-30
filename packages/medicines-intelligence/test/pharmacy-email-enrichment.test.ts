import assert from "node:assert/strict";
import test from "node:test";
import { assessDohsEmailEvidence, type DohsOrganisation } from "../src/index.ts";

const organisation: DohsOrganisation = Object.freeze({
  odsCode: "F1234",
  name: "Evidence Pharmacy",
  status: "Visible",
  organisationType: "Pharmacy",
  organisationSubtype: "Community",
  address: Object.freeze(["1 Evidence Street", "London"]),
  postcode: "SW1A 2AA",
  epsEnabled: "true",
  contacts: Object.freeze([
    Object.freeze({ type: "Primary", method: "Email", availability: "Office hours", value: "contact@evidence-pharmacy.example" }),
    Object.freeze({ type: "NHS", method: "Email", availability: "Office hours", value: "shared@nhs.net" }),
    Object.freeze({ type: "Telephone", method: "Telephone", availability: null, value: "020 7000 0000" }),
  ]),
});

test("DoHS enrichment creates candidate evidence only after exact ODS and postcode matching", () => {
  const result = assessDohsEmailEvidence(
    { pharmacyId: "pharmacy-evidence", odsCode: "f1234", postcode: "SW1A2AA", lastEvidenceCutoffAt: "2026-08-24T00:00:00.000Z" },
    [organisation],
    { checkedAt: "2026-08-25T00:00:00.000Z", sourceUrl: "https://api.service.nhs.uk/service-search-api/?api-version=3&search=F1234" },
  );
  assert.equal(result.decision, "candidate_evidence_found");
  assert.equal(result.matchedOrganisations, 1);
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map((candidate) => candidate.contactType), ["public_business_email", "nhs_shared_email"]);
  assert.equal(result.candidates.every((candidate) => candidate.status === "candidate"), true);
  assert.equal(result.candidates.every((candidate) => candidate.marketingEligible === false), true);
  assert.equal(result.marketingEligible, false);
});

test("DoHS enrichment rejects organisation and postcode mismatches without inferring contacts", () => {
  const wrongPostcode = assessDohsEmailEvidence(
    { pharmacyId: "pharmacy-evidence", odsCode: "F1234", postcode: "LS1 4DZ" },
    [organisation],
    { checkedAt: "2026-08-25T00:00:00.000Z", sourceUrl: "https://api.service.nhs.uk/service-search-api/?api-version=3&search=F1234" },
  );
  const wrongCode = assessDohsEmailEvidence(
    { pharmacyId: "pharmacy-evidence", odsCode: "F9999", postcode: "SW1A 2AA" },
    [organisation],
    { checkedAt: "2026-08-25T00:00:00.000Z", sourceUrl: "https://api.service.nhs.uk/service-search-api/?api-version=3&search=F9999" },
  );
  assert.equal(wrongPostcode.decision, "organisation_mismatch");
  assert.equal(wrongCode.decision, "organisation_mismatch");
  assert.deepEqual(wrongPostcode.candidates, []);
  assert.deepEqual(wrongCode.candidates, []);
});

test("DoHS enrichment preserves a reviewed cutoff and does not replay older observations", () => {
  const result = assessDohsEmailEvidence(
    { pharmacyId: "pharmacy-evidence", odsCode: "F1234", postcode: "SW1A 2AA", lastEvidenceCutoffAt: "2026-08-25T00:00:00.000Z" },
    [organisation],
    { checkedAt: "2026-08-24T23:59:59.000Z", sourceUrl: "https://api.service.nhs.uk/service-search-api/?api-version=3&search=F1234" },
  );
  assert.equal(result.decision, "cutoff_not_advanced");
  assert.deepEqual(result.candidates, []);
  assert.equal(result.marketingEligible, false);
});

test("DoHS enrichment records no evidence when an exact organisation has no valid email contact", () => {
  const result = assessDohsEmailEvidence(
    { pharmacyId: "pharmacy-evidence", odsCode: "F1234", postcode: "SW1A 2AA" },
    [{ ...organisation, contacts: [{ type: "Primary", method: "Email", availability: null, value: "not-an-email" }] }],
    { checkedAt: "2026-08-25T00:00:00.000Z", sourceUrl: "https://api.service.nhs.uk/service-search-api/?api-version=3&search=F1234" },
  );
  assert.equal(result.decision, "no_email_evidence");
  assert.equal(result.rejectedContacts, 1);
  assert.deepEqual(result.candidates, []);
});
