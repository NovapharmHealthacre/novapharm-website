import assert from "node:assert/strict";
import test from "node:test";
import { inspectManagedContactMarkup, inspectPublicHigSignals, MANAGED_CONTACT_ORIGIN } from "./hig-public-route-signals.mjs";

const sha = "a".repeat(40);

test("inspects a public document's language, responsive viewport, heading, skip target and source SHA", () => {
  const html = '<!doctype html><html dir="ltr" lang="en-GB"><head>' +
    '<meta content="width=device-width,initial-scale=1" name="viewport">' +
    '<meta name="novapharm-source-sha" content="' + sha + '"></head><body>' +
    '<a href="#main-content" class="skip-link">Skip to main content</a>' +
    '<main id="main-content"><h1>NovaPharm</h1></main></body></html>';
  const result = inspectPublicHigSignals(html);
  assert.equal(result.language, "en-GB");
  assert.equal(result.responsiveViewport, true);
  assert.equal(result.h1Elements, 1);
  assert.equal(result.skipLinkWithTarget, true);
  assert.equal(result.deployedSourceSha, sha);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.evidenceLevel, "unauthenticated-ssr-markup-only");
});

test("no visual or production acceptance is inferred from markup alone", () => {
  const result = inspectPublicHigSignals('<html><head></head><body><h1>A</h1><h1>B</h1></body></html>');
  assert.equal(result.language, null);
  assert.equal(result.responsiveViewport, false);
  assert.equal(result.h1Elements, 2);
  assert.equal(result.skipLinkWithTarget, false);
  assert.equal(result.deployedSourceSha, null);
  assert.equal(result.warnings.length, 5);
  assert.equal("acceptedHigTopics" in result, false);
  assert.equal("wcagCertified" in result, false);
});

test("a visible bypass link without its target does not qualify", () => {
  const html = '<html lang="en"><head><meta name="viewport" content="width=device-width"></head>' +
    '<body><a class="portal-skip-link" href="#missing">Skip</a><main><h1>Portal</h1></main></body></html>';
  assert.equal(inspectPublicHigSignals(html).skipLinkWithTarget, false);
});

test("the parser never executes or follows links and accepts no non-string input", () => {
  assert.throws(() => inspectPublicHigSignals({ html: "<html>" }), TypeError);
  const html = '<html lang="en"><meta name="viewport" content="width=device-width">' +
    '<a class="skip-link" href="https://other.example/unsafe">Skip</a>' +
    '<main id="main"><h1>Home</h1></main></html>';
  assert.equal(inspectPublicHigSignals(html).skipLinkWithTarget, false);
});


test("a data-id attribute cannot impersonate a real skip-navigation target", () => {
  const html = '<html lang="en"><meta name="viewport" content="width=device-width">' +
    '<a class="skip-link" href="#main-content">Skip</a>' +
    '<main data-id="main-content"><h1>NovaPharm</h1></main></html>';
  assert.equal(inspectPublicHigSignals(html).skipLinkWithTarget, false);
});

test("inert content does not count as a server heading or a keyboard destination", () => {
  const html = '<html lang=en><body><a class=skip-link href="#main">Skip</a>' +
    '<template><main id="main"><h1>Template content</h1></main></template>' +
    '<!-- <h1>Comment</h1> --><main><h1>Visible heading</h1></main></body></html>';
  const result = inspectPublicHigSignals(html);
  assert.equal(result.language, "en");
  assert.equal(result.h1Elements, 1);
  assert.equal(result.skipLinkWithTarget, false);
});

const contact = '<form data-live-b2b-enquiry-form data-api-origin="' + MANAGED_CONTACT_ORIGIN + '">' +
  '<input name="privacyAcknowledgement" type="checkbox" required>' +
  '<input type="checkbox" required name="safetyConfirmation"></form>' +
  '<script defer src="/assets/js/contact-production.js"></script>';

test("managed Contact accepts the scoped form, receiver, confirmations and client", () => {
  assert.deepEqual(inspectManagedContactMarkup(contact), { emailDraftOnly: false, issues: [] });
});

test("reachable email-only Contact is a regression, not a passing page with a warning", () => {
  const report = inspectManagedContactMarkup('<h1>Contact</h1><form method="post" action="mailto:team@example.test"></form>');
  assert.equal(report.emailDraftOnly, true);
  assert.ok(report.issues.includes("Expected exactly one managed business enquiry form"));
  assert.ok(report.issues.includes("Email-draft form present on managed Contact"));
});

test("stale, changed or duplicate Contact markers do not pass", () => {
  for (const html of [
    contact + contact, contact.replace(MANAGED_CONTACT_ORIGIN, "https://other.example"),
    contact.replace('required name="safetyConfirmation"', 'name="safetyConfirmation"'),
    contact.replace("contact-production.js", "contact-email-draft.js"),
    "<!--" + contact + "-->", "<template>" + contact + "</template>",
    "<script type=\"application/json\">" + JSON.stringify(contact) + "</script>"
  ]) assert.ok(inspectManagedContactMarkup(html).issues.length > 0);
});
