import test from "node:test";
import assert from "node:assert/strict";
import { activateContactHtml, activatePrivacyHtml } from "../scripts/activate-contact-intake.mjs";

const origin = "https://abc123.execute-api.eu-north-1.amazonaws.com";
const fixture = [
  '<!DOCTYPE html><html><head></head><body>',
  '<form class="np-contact-reference-form" data-email-enquiry-form action="mailto:vishal@novapharmhealthcare.com" method="post" enctype="text/plain">',
  '<label class="np-contact-reference-field"><span>Country / region</span><input name="country"></label>',
  '<div class="np-contact-reference-actions"><button type="submit" class="np-contact-reference-submit">Open email draft</button></div>',
  '</form>',
  '<p data-email-draft-status>This public information release does not collect or transmit enquiry details. Your email application handles sending.</p>',
  '<p>This website does not submit enquiries. Opening your email draft does not confirm delivery. Please do not include confidential dossiers or patient information.</p>',
  '<script src="/assets/js/contact-email-draft.js" defer></script>',
  '</body></html>'
].join("");

test("explicitly accepted endpoint creates real contact with declared privacy, consent and fallback", () => {
  const html = activateContactHtml(fixture, origin);
  assert.match(html, /data-live-b2b-enquiry-form/);
  assert.match(html, /data-api-origin="https:\/\/abc123\.execute-api\.eu-north-1\.amazonaws\.com"/);
  assert.match(html, /name="privacyAcknowledgement"/);
  assert.match(html, /name="safetyConfirmation"/);
  assert.match(html, /<div class="np-contact-reference-confirmations" role="group" aria-label="Enquiry confirmations"><label class="np-contact-reference-consent"><input name="safetyConfirmation"[\\s\\S]*?<\\/label><label class="np-contact-reference-consent"><input name="privacyAcknowledgement"[\\s\\S]*?<\\/label><\\/div><div class="np-contact-reference-actions">/);
  assert.equal((html.match(/class="np-contact-reference-consent"/g) || []).length, 2);
  assert.match(html, /name="role"/);
  assert.match(html, /name="telephone"/);
  assert.match(html, /src="\/assets\/js\/contact-production\.js"/);
  assert.match(html, /Submit enquiry/);
  assert.match(html, /data-live-contact-status/);
  assert.match(html, /30 days/);
  assert.match(html, /action="mailto:vishal@novapharmhealthcare\.com"/);
  assert.doesNotMatch(html, /This public information release does not collect or transmit enquiry details/);
});
test("refuses arbitrary, non-EU or insecure contact endpoints", () => {
  for (const unsafe of ["http://abc123.execute-api.eu-north-1.amazonaws.com", "https://evil.com", "https://abc123.execute-api.us-east-1.amazonaws.com", "", "https://abc123.execute-api.eu-north-1.amazonaws.com/path"]) {
    assert.throws(() => activateContactHtml(fixture, unsafe), /Refusing/);
  }
});
test("requires release source invariants instead of silently rendering a dead form", () => {
  assert.throws(() => activateContactHtml(fixture.replace("data-email-enquiry-form","data-nothing"), origin), /marker missing/);
  assert.throws(() => activateContactHtml(fixture.replace("contact-email-draft.js","unverified.js"), origin), /marker missing/);
});
test("updates the business-enquiry privacy text only when the expected section exists", () => {
  const source = '<section id="business-enquiries"><h2>3. Business enquiries</h2><p>Existing controller notice.</p></section>';
  const changed = activatePrivacyHtml(source);
  assert.match(changed, /AWS DynamoDB/);
  assert.match(changed, /30 days/);
  assert.match(changed, /EU North/);
  assert.match(changed, /reference-only/);
  assert.throws(() => activatePrivacyHtml("<p>Other notice</p>"), /missing/);
});
