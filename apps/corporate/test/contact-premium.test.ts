import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactExperience } from "../components/contact-experience";

test("public contact is visually guided and never renders an inactive submission form", () => {
  const markup = renderToStaticMarkup(createElement(ContactExperience, { managedEnabled: false }));
  assert.match(markup, /Let's start the right conversation/);
  assert.match(markup, /How can we help/);
  assert.equal((markup.match(/class="np-contact-topic"/g) ?? []).length, 8);
  assert.equal((markup.match(/href="mailto:/g) ?? []).length, 10);
  assert.doesNotMatch(markup, /<form\b/);
  assert.doesNotMatch(markup, /enquiry has been received/i);
  assert.match(markup, /secure online form is not active/i);
  assert.match(markup, /yellowcard\.mhra\.gov\.uk/);
});

test("managed contact retains a real controlled form and mapped route selectors", () => {
  const markup = renderToStaticMarkup(createElement(ContactExperience, { managedEnabled: true }));
  assert.match(markup, /<form\b/);
  assert.match(markup, /X-CSRF-Token|contact-form/);
  assert.match(markup, /enquiry=Product%20opportunity/);
  assert.match(markup, /name="safetyConfirmation"/);
  assert.match(markup, /name="privacyAcknowledgement"/);
  assert.equal((markup.match(/class="np-contact-topic"/g) ?? []).length, 8);
  assert.doesNotMatch(markup, /Our secure online form is not active/i);
});
