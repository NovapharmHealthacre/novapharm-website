import assert from "node:assert/strict";
import test from "node:test";
import { validateContactSubmission } from "../src/index.ts";

const validInput = {
  name: "Test Contact",
  email: "contact@example.test",
  company: "TEST Pharmaceutical Company",
  role: "Procurement Lead",
  country: "United Kingdom",
  enquiryType: "Distribution partnership",
  message: "This is a synthetic non-confidential business enquiry for validation only.",
  safetyConfirmation: true,
  privacyAcknowledgement: true,
  source: { page: "/partner-with-us/", utmSource: "validation" }
};

test("valid B2B contact input is normalised", () => {
  const result = validateContactSubmission(validInput);
  assert.equal(result.ok, true);
  assert.equal(result.value?.email, "contact@example.test");
  assert.equal(result.value?.source?.page, "/partner-with-us/");
});

test("privacy and safety acknowledgements are independent and required", () => {
  const result = validateContactSubmission({ ...validInput, safetyConfirmation: false, privacyAcknowledgement: false });
  assert.equal(result.ok, false);
  assert.ok(result.errors["safetyConfirmation"]);
  assert.ok(result.errors["privacyAcknowledgement"]);
});

test("honeypot submissions fail without entering ordinary validation flow", () => {
  const result = validateContactSubmission({ ...validInput, website: "https://bot.invalid" });
  assert.equal(result.ok, false);
  assert.equal(result.botDetected, true);
});
