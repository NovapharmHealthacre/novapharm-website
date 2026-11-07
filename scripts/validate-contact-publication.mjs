import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPlatformCapabilities, resolvePlatformMode } from "../src/core/platform-mode.mjs";

const html = readFileSync(resolve("contact/index.html"), "utf8");
const publicForms = getPlatformCapabilities(resolvePlatformMode()).publicForms;
assert.match(html, /<main id="main" class="npd-main np-contact np-contact-reference">/);
assert.match(html, /Let&#39;s talk\./);
assert.match(html, /How can we help\?/);
assert.match(html, /np-contact-reference-form/);
assert.match(html, /np-contact-reference-footer/);
assert.match(html, /yellowcard\.mhra\.gov\.uk/);
assert.match(html, /legal\/privacy\//);

if (publicForms) {
  assert.match(html, /<form class="form-grid contact-form np-contact-reference-form"/, "Managed build must retain the governed form");
  assert.match(html, /name="privacyAcknowledgement"/);
  assert.match(html, /name="safetyConfirmation"/);
  assert.doesNotMatch(html, /data-email-enquiry-form/, "Managed form cannot silently fall back to email-only mode");
} else {
  assert.match(html, /data-email-enquiry-form/, "Public-only page must have the email-draft interaction");
  assert.match(html, /action="mailto:vishal@novapharmhealthcare\.com"/);
  assert.match(html, /name="enquiryType"/);
  assert.match(html, /name="country"/);
  assert.match(html, /This public information release does not collect or transmit enquiry details/);
  assert.match(html, /src="\/assets\/js\/contact-email-draft\.js"/);
  assert.doesNotMatch(html, /data-contact-form|data-file-upload/);
  assert.doesNotMatch(html, /action="\/api\/|type="file"/);
}
console.log("Contact publication verified: compact reference design; " + (publicForms ? "managed API" : "email composition only") + " mode.");
