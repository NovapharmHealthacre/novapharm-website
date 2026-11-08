import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activateAccountRequestHtml } from "./activate-account-request.mjs";

const html = readFileSync("account-application/index.html", "utf8");
const js = readFileSync("assets/js/account-request-production.js", "utf8");
const valid = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";

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
    "A request does not activate a trading account"
  ]) assert.ok(out.includes(marker), "Missing required release control: " + marker);
  assert.doesNotMatch(out, /data-email-enquiry-form|No application data is collected here|type="file"|type="password"/);
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
    'controller.abort()'
  ]) assert.ok(js.includes(marker), "Missing JS contract: " + marker);
  assert.doesNotMatch(js, /localStorage|sessionStorage|\.password\b|type\s*=\s*["']password|FormData\([^)]*password/i);
});
