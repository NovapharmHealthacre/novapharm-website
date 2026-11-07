import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactExperience } from "../components/contact-experience";

test("public contact matches the approved compact reference but never submits to an API", () => {
  const markup = renderToStaticMarkup(createElement(ContactExperience, { managedEnabled: false }));
  assert.match(markup, /Let(?:&#x27;|&#39;|')s talk\./);
  assert.match(markup, /How can we help\?/);
  assert.match(markup, /np-contact-reference-hero/);
  assert.match(markup, /np-contact-reference-footer/);
  assert.match(markup, /data-email-enquiry-form/);
  assert.match(markup, /action="mailto:vishal@novapharmhealthcare\.com"/);
  assert.match(markup, /Open email draft/);
  assert.match(markup, /name="country"/);
  assert.match(markup, /name="enquiryType"/);
  assert.match(markup, /name="message"/);
  assert.doesNotMatch(markup, /data-contact-form|action="\/api\/|enquiry has been received/i);
  assert.match(markup, /does not collect or transmit enquiry details/i);
  assert.match(markup, /yellowcard\.mhra\.gov\.uk/);
});

test("managed contact follows the reference without dropping governed API-required controls", () => {
  const markup = renderToStaticMarkup(createElement(ContactExperience, { managedEnabled: true }));
  assert.match(markup, /Let(?:&#x27;|&#39;|')s talk\./);
  assert.match(markup, /<form\b[^>]*class="contact-form np-contact-reference-form"/);
  assert.match(markup, /name="name"/);
  assert.match(markup, /name="email"/);
  assert.match(markup, /name="company"/);
  assert.match(markup, /name="country"/);
  assert.match(markup, /name="role"/);
  assert.match(markup, /name="enquiryType"/);
  assert.match(markup, /name="message"/);
  assert.match(markup, /name="safetyConfirmation"/);
  assert.match(markup, /name="privacyAcknowledgement"/);
  assert.match(markup, /Send enquiry/);
  assert.doesNotMatch(markup, /data-email-enquiry-form|secure online form is not active/i);
});
