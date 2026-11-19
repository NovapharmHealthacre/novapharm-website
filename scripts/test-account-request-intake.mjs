import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activateAccountRequestHtml } from "./activate-account-request.mjs";

const html = readFileSync("account-application/index.html", "utf8");
const js = readFileSync("assets/js/account-request-production.js", "utf8");
const valid = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
const publisher = readFileSync(".github/workflows/publish-aws-contact-production.yml", "utf8");

test("public source collects no account credentials or applications", () => {
  assert.match(html, /This public information release does not accept account applications or business documents/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /data-live-account-request-form|type="password"|type="file"/i);
});
test("release rejects unknown, non-TLS, or customer supplied API destinations", () => {
  for (const origin of [
    "http://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com",
    "https://fake.example.com",
    "https://abc.execute-api.us-east-1.amazonaws.com",
    "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com/other"
  ]) {
    assert.throws(() => activateAccountRequestHtml(html, origin), /Refusing unverified AWS intake/);
  }
});
test("after verified AWS origin, enable a single receipt-only business-interest form", () => {
  const out = activateAccountRequestHtml(html, valid);
  assert.equal((out.match(/<form\b/gi) || []).length, 1);
  assert.equal((out.match(/<\/form>/gi) || []).length, 1);
  for (const marker of [
    "data-live-account-request-form", 'data-api-origin="' + valid + '"',
    'name="businessType"', 'name="privacyAcknowledgement"',
    'name="safetyConfirmation"', 'data-account-request-status',
    'src="/assets/js/account-request-production.js"',
    'href="/legal/privacy/#business-enquiries"',
    "A request does not activate a trading account",
    "Register interest in a business account.",
    "Register business interest</button>",
    "Registering interest does not create an account or grant portal access."
  ]) assert.ok(out.includes(marker), "Missing required release control: " + marker);
  assert.doesNotMatch(out, /data-email-enquiry-form|No application data is collected here|type="file"|type="password"|Request a business account in minutes|Your NovaPharm account starts here/);
  assert.equal((out.match(/Register business interest<\/button>/g) || []).length, 1);
  assert.match(out, /<footer class="site-footer/);
  assert.match(out, /<\/section><\/main>/);
});
test("never collect passwords or documents and never invent an activated account", () => {
  for (const marker of [
    'enquiryType: "Pharmacy or wholesaler account"',
    'credentials: "omit"',
    'response.status !== 201',
    "receipt?.persisted !== true",
    'form.reset()',
    "account is not yet activated",
    "Business interest received. Reference:",
    "The request could not be confirmed. It may have been received.",
    'controller.abort()'
  ]) assert.ok(js.includes(marker), "Missing JS contract: " + marker);
  assert.doesNotMatch(js, /localStorage|sessionStorage|\.password\b|type\s*=\s*["']password|FormData\([^)]*password/i);
});

test("guarded publisher verifies the new business-interest wording on staged and live public releases", () => {
  for (const marker of [
    "grep -Fq 'Register interest in a business account.' _site/account-application/index.html",
    "grep -Fq 'Register business interest</button>' _site/account-application/index.html",
    "! grep -Fq 'Request a business account in minutes' _site/account-application/index.html",
    "grep -Fq 'Register interest in a business account.' /tmp/novapharm-live-account.html",
    "grep -Fq 'Register business interest</button>' /tmp/novapharm-live-account.html",
    "! grep -Fq 'Request a business account in minutes' /tmp/novapharm-live-account.html",
    "grep -Fq 'Business interest received. Reference:' /tmp/novapharm-live-account.js",
    "grep -Fq 'The request could not be confirmed. It may have been received.' /tmp/novapharm-live-account.js"
  ]) assert.ok(publisher.includes(marker), "Missing verified staged/live publication contract: " + marker);
});
