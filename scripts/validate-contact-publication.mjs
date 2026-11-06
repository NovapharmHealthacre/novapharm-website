import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPlatformCapabilities, resolvePlatformMode } from "../src/core/platform-mode.mjs";

const html = readFileSync(resolve("contact/index.html"), "utf8");
const publicForms = getPlatformCapabilities(resolvePlatformMode()).publicForms;
assert.match(html, /<main id="main" class="npd-main np-contact">/, "Contact template was not published");
assert.match(html, /Let's start the right conversation\./);
assert.equal((html.match(/class="np-contact-topic"/g) ?? []).length, 8, "All eight contact routes must remain available");
assert.match(html, /yellowcard\.mhra\.gov\.uk/, "Required pharmaceutical safety routing is missing");
assert.match(html, /legal\/privacy\//, "Privacy notice must remain linked");
if (publicForms) {
  assert.match(html, /<form class="form-grid contact-form/, "Managed build must retain the server-controlled form");
  assert.match(html, /name="privacyAcknowledgement"/);
  assert.match(html, /name="safetyConfirmation"/);
  assert.match(html, /enquiry=Product%20opportunity#contact-form/);
} else {
  assert.doesNotMatch(html, /<form\b[^>]*data-contact-form/i, "Public-only release must never collect data");
  assert.doesNotMatch(html, /<form class="form-grid contact-form/i, "Public-only release may not pretend to submit enquiries");
  assert.match(html, /href="mailto:vishal@novapharmhealthcare\.com/);
  assert.match(html, /secure online form is not active/i);
}
console.log(`Contact publication verified: eight routes; ${publicForms ? "managed form" : "public email-only"} mode.`);
