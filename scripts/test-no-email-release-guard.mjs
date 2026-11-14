import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const publish = readFileSync(".github/workflows/publish-aws-contact-production.yml", "utf8");
const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const begin = publish.indexOf("      - name: Verify production contact API without sending notifications");
const stop = publish.indexOf("      - name: Activate contact on staged Pages artifact only", begin);
const check = begin >= 0 && stop > begin ? publish.slice(begin, stop) : "";

test("production publisher has a mandatory no-email / no accepted enquiry gate", () => {
  assert.ok(check, "Publisher safety step must remain in place");
  assert.match(check, /node --test scripts\/test-no-email-release-guard\.mjs/);
  assert.match(ci, /node --test scripts\/test-no-email-release-guard\.mjs/);
  assert.match(check, /\/health/);
  assert.match(check, /-X POST "\$CONTACT_ORIGIN\/contact"/);
  assert.match(check, /-d '\{\}'/);
  assert.match(check, /test "\$rejected" = "403"/);
  assert.doesNotMatch(check, /notificationAccepted\s*==\s*true/);
  assert.doesNotMatch(check, /--data-binary|\b201\b|synthetic@example\.com|SYNTHETIC-NOVAPHARM-QA/);
  assert.doesNotMatch(check, /sns\.publish|send_email|SendEmailCommand|ses\.send/);
});

test("the publisher does not contain other positive production contact submissions", () => {
  assert.doesNotMatch(publish, /SYNTHETIC-NOVAPHARM-QA|novapharm-qa-input\.json|novapharm-qa-receipt\.json/);
  assert.doesNotMatch(publish, /notificationAccepted\s*==\s*true/);
  assert.doesNotMatch(publish, /synthetic@example\.com/);
});
