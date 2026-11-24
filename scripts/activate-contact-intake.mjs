import { activateAccountRequestHtml } from "./activate-account-request.mjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const approvedApi = /^https:\/\/[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/i;
const approvedContactBlobs = Object.freeze({
  "src/content/contact-managed-release.html": "14591f43ff0ec6674b026a7bec629495f18fa50f",
  "assets/js/contact-production.js": "d405d459e089c3a696bd0ed6b2fb84bf529787bc",
  "assets/css/novapharm-unified-20261107.css": "9631537b380551b5dd3f8dbee81d93c3098bab54"
});
export function requireReviewedContactBlob(filePath, expectedGitBlobSha) {
  const contents = readFileSync(filePath);
  const actual = createHash("sha1")
    .update("blob " + contents.length + "\0")
    .update(contents)
    .digest("hex");
  if (actual !== expectedGitBlobSha) throw Error("Reviewed managed Contact asset differs from approved release source: " + filePath);
  return contents;
}

export function activateContactHtml(html, origin) {
  if (!approvedApi.test(origin)) throw Error("Refusing unverified or non-AWS HTTPS contact origin");
  const required = [
    'data-email-enquiry-form',
    'action="mailto:bd@novapharmhealthcare.com"',
    'This public information release does not collect or transmit enquiry details',
    'src="/assets/js/contact-email-draft.js"',
    '<div class="np-contact-reference-actions">',
    'data-email-draft-status'
  ];
  for (const marker of required) if (!html.includes(marker)) throw Error("Contact release source marker missing: " + marker);

  const role = '<label class="np-contact-reference-field"><span>Role or job title</span><input name="role" autocomplete="organization-title" maxlength="120" required></label>';
  const telephone = '<label class="np-contact-reference-field"><span>Telephone (optional)</span><input name="telephone" type="tel" autocomplete="tel" maxlength="40"></label>';
  const safety = '<label class="np-contact-reference-consent"><input name="safetyConfirmation" type="checkbox" value="yes" required><span>I confirm this message contains no patient-identifiable information, adverse-event report or urgent medical details.</span></label>';
  const privacy = '<label class="np-contact-reference-consent"><input name="privacyAcknowledgement" type="checkbox" value="yes" required><span>I have read the <a href="/legal/privacy/#business-enquiries">business enquiry privacy notice</a>. These details will be used to assess and reply to this enquiry, not for marketing.</span></label>';
  // Both required confirmations share one accessible, two-column control layout.
  const confirmations = '<div class="np-contact-reference-confirmations" role="group" aria-label="Enquiry confirmations">' + safety + privacy + '</div>';

  let out = html
    .replace('data-email-enquiry-form', 'data-live-b2b-enquiry-form data-api-origin="' + origin + '"')
    .replace('<label class="np-contact-reference-field"><span>Country / region</span>', role + telephone + '<label class="np-contact-reference-field"><span>Country / region</span>')
    .replace('<div class="np-contact-reference-actions">', confirmations + '<div class="np-contact-reference-actions">')
    .replace('This website does not submit enquiries. Opening your email draft does not confirm delivery. Please do not include confidential dossiers or patient information.',
      'Business enquiries are securely stored in NovaPharm&#39;s AWS environment for up to 30 days. Do not include confidential dossiers, patient information or adverse-event reports.')
    .replace('This public information release does not collect or transmit enquiry details. Your email application handles sending.',
      'Secure online business enquiry. A receipt reference will be shown once your submission is recorded.')
    .replace('data-email-draft-status', 'data-live-contact-status')
    .replace('>Open email draft</button>', '>Submit enquiry</button>')
    .replace('src="/assets/js/contact-email-draft.js"', 'src="/assets/js/contact-production.js"');

  if (!out.includes('data-live-b2b-enquiry-form') ||
      !out.includes('name="privacyAcknowledgement"') ||
      !out.includes('name="safetyConfirmation"') ||
      !out.includes('class="np-contact-reference-confirmations"') ||
      !out.includes('name="role"') ||
      !out.includes('src="/assets/js/contact-production.js"') ||
      out.includes('This public information release does not collect or transmit enquiry details')) {
    throw Error("Contact release transformation incomplete");
  }
  return out;
}
// The managed Contact page is an explicit, reviewed release template.
// It is never selected for the public source build unless the owner-gated
// production workflow has already authorized the managed release.
export function activateManagedContactReleaseHtml(template, origin) {
  if (!approvedApi.test(origin)) throw Error("Refusing unverified or non-AWS HTTPS contact origin");
  const sourceOrigin = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
  // Pin managed submissions to the deployed, audited endpoint, not merely any
  // syntactically valid API Gateway hostname in the same AWS region.
  if (origin !== sourceOrigin) throw Error("Refusing unapproved managed Contact API origin");
  const sourceMarker = 'data-live-b2b-enquiry-form data-api-origin="' + sourceOrigin + '"';
  const required = [
    '<!doctype html>', sourceMarker,
    'href="/assets/css/novapharm-unified-20261107.css"',
    'src="/assets/js/contact-production.js"',
    '<noscript><style>.ref-form{display:none}</style>',
    'type="submit" disabled aria-describedby="contact-submission-status"',
    'id="contact-submission-status"',
    'name="privacyAcknowledgement" value="yes" required',
    'name="safetyConfirmation" value="yes" required',
    "form-action 'none'",
    '--ink:#0B0B0E', '--ref-ink:#0B0B0E', '#9D1B32',
    'href="/legal/privacy/#business-enquiries"'
  ];
  for (const marker of required) if (!template.includes(marker)) throw Error("Reviewed managed Contact template marker missing: " + marker);
  if (template.split(sourceMarker).length !== 2 ||
      (template.match(/data-api-origin=/g) || []).length !== 1 ||
      (template.match(/data-live-b2b-enquiry-form/g) || []).length !== 1 ||
      template.includes('data-email-enquiry-form') ||
      template.includes('novapharm-ga4-id')) {
    throw Error("Reviewed managed Contact template must contain exactly one isolated secure enquiry form");
  }
  if (template.indexOf('href="/assets/css/novapharm-unified-20261107.css"') >= template.indexOf('<style>')) {
    throw Error("Reviewed managed Contact CSS must load before scoped Contact styles");
  }
  const result = template.replace(sourceMarker, 'data-live-b2b-enquiry-form data-api-origin="' + origin + '"');
  if (result === template && origin !== sourceOrigin) throw Error("Reviewed managed Contact origin substitution failed");
  return result;
}

// The reviewed intake template remains hash-pinned. Reuse the final staged
// corporate shell only after its independent form/endpoint checks pass.
export function composeManagedContactChrome(managedHtml, baselineHtml) {
  const headerPattern = /<header class="site-header npd-header"[^>]*>[\s\S]*?<\/header>/g;
  const footerPattern = /<footer class="site-footer npd-footer"[^>]*>[\s\S]*?<\/footer>/g;
  const one = (html, pattern, label) => {
    const matches = [...html.matchAll(pattern)];
    if (matches.length !== 1) throw Error("Expected exactly one " + label);
    return matches[0][0];
  };
  const header = one(baselineHtml, headerPattern, "staged corporate header");
  const footer = one(baselineHtml, footerPattern, "staged corporate footer");
  const css = one(baselineHtml, /<link\b[^>]*href="\/assets\/css\/novapharm\.bundle\.css(?:\?[^"]*)?"[^>]*>/g, "staged corporate CSS");
  const nav = one(baselineHtml, /<script\b[^>]*src="\/assets\/js\/novapharm\.js(?:\?[^"]*)?"[^>]*><\/script>/g, "staged navigation script");
  const cookie = one(baselineHtml, /<script\b[^>]*src="\/assets\/js\/cookie-consent\.js(?:\?[^"]*)?"[^>]*><\/script>/g, "staged cookie controls");
  const rtl = baselineHtml.match(/<script\b[^>]*src="\/assets\/js\/rtl-localization\.js(?:\?[^"]*)?"[^>]*><\/script>/)?.[0] || '<script src="/assets/js/rtl-localization.js"></script>';
  const oldHeader = one(managedHtml, /<header class="site-header"[^>]*>[\s\S]*?<\/header>/g, "legacy contact header");
  const oldFooter = one(managedHtml, /<footer class="ref-footer"[^>]*>[\s\S]*?<\/footer>/g, "legacy contact footer");
  const formPattern = /<form\b[^>]*>[\s\S]*?<\/form>/g;
  const originalForm = one(managedHtml, formPattern, "reviewed intake form");
  const result = managedHtml
    .replace(oldHeader, () => header)
    .replace(oldFooter, () => footer)
    // Retire legacy chrome selectors; do not alter the reviewed form styles.
    .replace(/<style>[\s\S]*?<\/style>/, (style) => style.replace(/\.site-header\b/g, ".contact-legacy-header"))
    .replace("<style>", () => rtl + css + "<style>")
    .replace("<body>", '<body data-page="contact" data-family="contact" data-route="/contact/">')
    .replace("</body>", () => nav + cookie + "</body>");
  if (one(result, formPattern, "composed intake form") !== originalForm ||
      !result.includes("form-action 'none'") ||
      !result.includes('src="/assets/js/contact-production.js"')) {
    throw Error("Managed Contact shell composition changed the reviewed intake");
  }
  return result;
}

// Preserve an immutable reviewed managed template while adding the exact
// staged public build's source provenance after explicit owner-gated activation.
export function stampManagedContactProvenance(managedHtml, baselineHtml, expectedSha) {
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
    throw Error("Managed Contact source SHA is invalid");
  }
  const tag = '<meta name="novapharm-source-sha" content="' + expectedSha + '">';
  const sourceTags = [...baselineHtml.matchAll(/<meta\b[^>]*\bname=["']novapharm-source-sha["'][^>]*>/gi)];
  if (sourceTags.length !== 1 || sourceTags[0][0] !== tag) {
    throw Error("Managed Contact baseline lacks exact reviewed Git source SHA");
  }
  if (!managedHtml.includes("</head>") ||
      /novapharm-source-sha/i.test(managedHtml)) {
    throw Error("Managed Contact template has duplicate or invalid release provenance");
  }
  const rendered = managedHtml.replace("</head>", '  ' + tag + '\n</head>');
  if (rendered.split(tag).length !== 2) {
    throw Error("Managed Contact source SHA must occur exactly once");
  }
  return rendered;
}

export function activatePrivacyHtml(html) {
  const anchor = '<section id="business-enquiries"><h2>3. Business enquiries</h2>';
  if (!html.includes(anchor)) throw Error("Privacy notice business-enquiries section missing");
  const disclosure = '<p><strong>Secure online enquiry storage.</strong> Business-enquiry and account-interest submissions made through the NovaPharm contact and business-account-request pages are processed by NovaPharm in an encrypted AWS DynamoDB inbox in the EU North (Stockholm) region, with automatic expiry scheduled for 30 days after receipt, subject to backup and legal retention limitations. A minimal reference-only internal notification is sent to the approved NovaPharm mailbox; the alert contains no sender name, email address or message. This contact route is for non-clinical business information only, and is not a patient, adverse-event or emergency reporting system.</p>';
  return html.replace(anchor, anchor + disclosure);
}

if (process.env.NOVAPHARM_CONTACT_RELEASE_ACCEPTED === "yes") {
  const origin = String(process.env.NOVAPHARM_CONTACT_API_ORIGIN || "").trim();
  const artifactRoot = process.env.NOVAPHARM_CONTACT_ARTIFACT_ROOT || ".";
  if (![".", "_site"].includes(artifactRoot)) throw Error("Contact release root must be project source or validated Pages artifact");
  const contactPath = resolve(artifactRoot, "contact/index.html");
  const privacyPath = resolve(artifactRoot, "legal/privacy/index.html");
  const accountPath = resolve(artifactRoot, "account-application/index.html");
  const contact = readFileSync(contactPath, "utf8");
  const notice = readFileSync(privacyPath, "utf8");
  const account = readFileSync(accountPath, "utf8");
  // Preserve the validated public-only baseline as a fail-closed input gate.
  // Never overwrite a pre-existing managed Contact artifact from another build.
  if (!contact.includes('data-email-enquiry-form') || contact.includes('data-live-b2b-enquiry-form')) {
    throw Error("Unexpected staged Contact baseline; refusing managed replacement");
  }
  // This CSS file was previously present only on gh-pages; never publish an
  // HTML template whose required shared design stylesheet is missing.
  const sharedStyle = resolve(artifactRoot, "assets/css/novapharm-unified-20261107.css");
  if (!existsSync(sharedStyle)) throw Error("Reviewed managed Contact stylesheet missing from Pages artifact");
  // Validate the exact reviewed source artifacts at release time, not solely
  // during CI. No modified frontend is allowed to reach the live Pages branch.
  requireReviewedContactBlob(sharedStyle, approvedContactBlobs["assets/css/novapharm-unified-20261107.css"]);
  requireReviewedContactBlob(resolve(artifactRoot, "assets/js/contact-production.js"), approvedContactBlobs["assets/js/contact-production.js"]);
  const reviewedTemplate = requireReviewedContactBlob(
    resolve("src/content/contact-managed-release.html"),
    approvedContactBlobs["src/content/contact-managed-release.html"]
  ).toString("utf8");
  const expectedSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const nextContact = stampManagedContactProvenance(
    composeManagedContactChrome(activateManagedContactReleaseHtml(reviewedTemplate, origin), contact), contact, expectedSha
  );
  const nextPrivacy = activatePrivacyHtml(notice);
  const nextAccount = activateAccountRequestHtml(account, origin);
  writeFileSync(contactPath, nextContact);
  writeFileSync(privacyPath, nextPrivacy);
  writeFileSync(accountPath, nextAccount);
  console.log("Published verified B2B contact and business account request views after explicit AWS acceptance gate.");
} else {
  console.log("B2B contact activation gate not met: retaining email-only public source.");
}
