import test from "node:test";
import assert from "node:assert/strict";
import { activateContactHtml, activatePrivacyHtml, activateManagedContactReleaseHtml, requireReviewedContactBlob, stampManagedContactProvenance } from "../scripts/activate-contact-intake.mjs";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const origin = "https://abc123.execute-api.eu-north-1.amazonaws.com";
const managedOrigin = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
const fixture = [
  '<!DOCTYPE html><html><head></head><body>',
  '<form class="np-contact-reference-form" data-email-enquiry-form action="mailto:bd@novapharmhealthcare.com" method="post" enctype="text/plain">',
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
  assert.match(html, /<div class="np-contact-reference-confirmations" role="group" aria-label="Enquiry confirmations"><label class="np-contact-reference-consent"><input name="safetyConfirmation".*?<\/label><label class="np-contact-reference-consent"><input name="privacyAcknowledgement".*?<\/label><\/div><div class="np-contact-reference-actions">/);
  assert.equal((html.match(/class="np-contact-reference-consent"/g) || []).length, 2);
  assert.match(html, /name="role"/);
  assert.match(html, /name="telephone"/);
  assert.match(html, /src="\/assets\/js\/contact-production\.js"/);
  assert.match(html, /Submit enquiry/);
  assert.match(html, /data-live-contact-status/);
  assert.match(html, /30 days/);
  assert.match(html, /action="mailto:bd@novapharmhealthcare\.com"/);
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


test("owner-gated managed template preserves approved design and secure submission contract", () => {
  const template = readFileSync("src/content/contact-managed-release.html", "utf8");
  const stylePath = "assets/css/novapharm-unified-20261107.css";
  assert.ok(existsSync(stylePath), "Reviewed shared stylesheet must be present in the main source and staged artifact");
  assert.ok(template.includes('href="/' + stylePath + '"'), "Managed Contact references a missing/wrong CSS asset");
  const sharedStyles = readFileSync(stylePath,"utf8");
  assert.ok(sharedStyles.includes(".site-header") || sharedStyles.includes(".site-nav") || sharedStyles.includes(".nav"), "Shared stylesheet lacks expected navigation rules");
  const rendered = activateManagedContactReleaseHtml(template, managedOrigin);
  assert.ok(rendered.includes('data-live-b2b-enquiry-form data-api-origin="' + managedOrigin + '"'));
  assert.equal((rendered.match(/data-api-origin=/g) || []).length, 1);
  assert.equal((rendered.match(/data-live-b2b-enquiry-form/g) || []).length, 1);
  for (const marker of [
    '--ink:#0B0B0E', '--ref-ink:#0B0B0E', '#9D1B32',
    'type="submit" disabled aria-describedby="contact-submission-status"',
    'name="privacyAcknowledgement" value="yes" required',
    'name="safetyConfirmation" value="yes" required',
    'src="/assets/js/contact-production.js"',
    '<noscript><style>.ref-form{display:none}</style>',
    "form-action 'none'"
  ]) assert.ok(rendered.includes(marker), "Lost reviewed managed marker: " + marker);
  assert.doesNotMatch(rendered, /data-email-enquiry-form|novapharm-ga4-id/);
  const source = template.replace('data-api-origin="https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com"', 'data-api-origin="https://unapproved.example"');
  assert.throws(() => activateManagedContactReleaseHtml(source, managedOrigin), /marker missing/);
  assert.throws(() => activateManagedContactReleaseHtml(template + '<div data-api-origin="duplicate"></div>', managedOrigin), /exactly one/);
  assert.throws(() => activateManagedContactReleaseHtml(template.replace('href="/assets/css/novapharm-unified-20261107.css"', 'href="/assets/css/nonexistent.css"'), managedOrigin), /marker missing/);
  const sharedLink = '<link rel="stylesheet" href="/assets/css/novapharm-unified-20261107.css" data-novapharm-design-system="2026-11-07">';
  const badOrder = template.replace(sharedLink, "").replace("<style>", "<style>" + sharedLink);
  assert.throws(() => activateManagedContactReleaseHtml(badOrder, managedOrigin), /CSS must load before/);

  assert.throws(() => activateManagedContactReleaseHtml(template, "https://unapproved.example"), /Refusing/);
  // A different EU-North AWS API Gateway hostname must not silently receive
  // regulated business enquiries, even though it matches the generic syntax.
  assert.throws(() => activateManagedContactReleaseHtml(template, "https://abcdefghij.execute-api.eu-north-1.amazonaws.com"), /Refusing unapproved managed Contact API origin/);
});

test("managed Contact retains exact reviewed source SHA after safe template activation", () => {
  const sha = "a".repeat(40);
  const tag = '<meta name="novapharm-source-sha" content="' + sha + '">';
  const baseline = '<!doctype html><html><head>' + tag + '</head><body>email-only</body></html>';
  const managed = activateManagedContactReleaseHtml(
    readFileSync("src/content/contact-managed-release.html", "utf8"), managedOrigin
  );
  const published = stampManagedContactProvenance(managed, baseline, sha);
  assert.equal(published.split(tag).length - 1, 1, "exactly one source SHA in managed Contact");
  assert.ok(published.includes('data-live-b2b-enquiry-form'));
  assert.ok(published.indexOf(tag) < published.indexOf("</head>"));
  assert.throws(() => stampManagedContactProvenance(managed, baseline.replace(tag, ""), sha), /baseline lacks exact/);
  assert.throws(() => stampManagedContactProvenance(managed, baseline + tag, sha), /baseline lacks exact/);
  assert.throws(() => stampManagedContactProvenance(managed, baseline, "b".repeat(40)), /baseline lacks exact/);
  assert.throws(() => stampManagedContactProvenance(managed, baseline, "invalid"), /source SHA is invalid/);
  assert.throws(() => stampManagedContactProvenance(published, baseline, sha), /duplicate or invalid release provenance/);
  assert.throws(() => stampManagedContactProvenance(managed.replace("</head>", ""), baseline, sha), /duplicate or invalid release provenance/);
});

test("owner-gated production activation remains disabled without explicit acceptance", () => {
  const activationSource = readFileSync("scripts/activate-contact-intake.mjs", "utf8");
  assert.ok(activationSource.includes('if (process.env.NOVAPHARM_CONTACT_RELEASE_ACCEPTED === "yes")'));
  assert.ok(
    activationSource.includes('const reviewedTemplate = requireReviewedContactBlob(') &&
    activationSource.includes('resolve("src/content/contact-managed-release.html")') &&
    activationSource.includes('approvedContactBlobs["src/content/contact-managed-release.html"]'),
    "Gated release must verify approved HTML blob before rendering"
  );
  assert.ok(activationSource.includes('refusing managed replacement'));
  assert.ok(activationSource.includes('Reviewed managed Contact stylesheet missing from Pages artifact'));
  assert.ok(activationSource.includes('requireReviewedContactBlob(sharedStyle'), "Gated activator must verify final staged CSS");
  assert.ok(activationSource.includes('requireReviewedContactBlob(resolve(artifactRoot, "assets/js/contact-production.js")'), "Gated activator must verify staged JS");

});


test("Reviewed Contact and CSS Git blob parity is exact across release sources", () => {
  // These reviewed bytes match PR #1016's Contact HTML/client and the existing
  // protected gh-pages shared CSS. Any change needs a fresh reviewed candidate.
  const assets = [
    ["src/content/contact-managed-release.html", "14591f43ff0ec6674b026a7bec629495f18fa50f"],
    ["assets/js/contact-production.js", "d405d459e089c3a696bd0ed6b2fb84bf529787bc"],
    ["assets/css/novapharm-unified-20261107.css", "9631537b380551b5dd3f8dbee81d93c3098bab54"]
  ];
  for (const [file, expectedGitBlobSha] of assets) {
    assert.ok(existsSync(file), "Reviewed release asset missing: " + file);
    const contents = requireReviewedContactBlob(file, expectedGitBlobSha);
    assert.equal(contents.toString("utf8"), readFileSync(file,"utf8"));
    const digest = createHash("sha1")
      .update("blob " + contents.length + "\0")
      .update(contents)
      .digest("hex");
    assert.equal(digest, expectedGitBlobSha, "Reviewed release asset drift: " + file);
    assert.throws(
      () => requireReviewedContactBlob(file, "0000000000000000000000000000000000000000"),
      /differs from approved release source/
    );
  }
  assert.throws(() => requireReviewedContactBlob("assets/js/nonexistent-contact-client.js", "0"), /ENOENT/);
});

test("official Contact palette, adaptive layout and business-development email are pinned", () => {
  const html=readFileSync("src/content/contact-managed-release.html","utf8");
  const client=readFileSync("assets/js/contact-production.js","utf8");
  const tokens=[
    '<meta name="theme-color" content="#FBFAEF">',
    '--royal-mineral-white:#FBFAEF',
    '--royal-porcelain-white:#F8F7F3',
    '--porcelain-stone:#DEDCD5',
    '--ref-ink:#0B0B0E',
    '--ref-blue:#9D1B32',
    '.ref-content{background:var(--royal-porcelain-white)}',
    '.ref-hero{background:var(--royal-mineral-white)',
    '.ref-form{background:var(--royal-mineral-white)',
    'inset-inline-end:0',
    'text-align:start',
    'dir="auto"',
    'dir="ltr"',
    'min-height:44px',
    '@media(max-width:560px)',
    '@media(max-width:1050px)'
  ];
  for(const t of tokens) assert.ok(html.includes(t), "Missing official Contact style/layout marker: "+t);
  assert.equal((html.match(/mailto:bd@novapharmhealthcare\.com/g)||[]).length,2);
  assert.equal((client.match(/bd@novapharmhealthcare\.com/g)||[]).length,2);
  assert.ok(!html.includes("vishal@novapharmhealthcare.com"),"Old business email still visible in Contact");
  assert.ok(!client.includes("vishal@novapharmhealthcare.com"),"Old business email still in recovery link");
  assert.ok(html.includes('name="privacyAcknowledgement" value="yes" required'));
  assert.ok(html.includes('name="safetyConfirmation" value="yes" required'));
  assert.ok(html.includes('<noscript><style>.ref-form{display:none}</style>'));
  assert.ok(client.includes('result?.persisted !== true'));
  assert.ok(client.includes('form.addEventListener("submit"'));
});
