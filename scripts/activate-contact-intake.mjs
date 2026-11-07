import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const approvedApi = /^https:\/\/[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/i;
export function activateContactHtml(html, origin) {
  if (!approvedApi.test(origin)) throw Error("Refusing unverified or non-AWS HTTPS contact origin");
  const required = [
    'data-email-enquiry-form',
    'action="mailto:vishal@novapharmhealthcare.com"',
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

  let out = html
    .replace('data-email-enquiry-form', 'data-live-b2b-enquiry-form data-api-origin="' + origin + '"')
    .replace('<label class="np-contact-reference-field"><span>Country / region</span>', role + telephone + '<label class="np-contact-reference-field"><span>Country / region</span>')
    .replace('<div class="np-contact-reference-actions">', safety + privacy + '<div class="np-contact-reference-actions">')
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
      !out.includes('name="role"') ||
      !out.includes('src="/assets/js/contact-production.js"') ||
      out.includes('This public information release does not collect or transmit enquiry details')) {
    throw Error("Contact release transformation incomplete");
  }
  return out;
}
export function activatePrivacyHtml(html) {
  const anchor = '<section id="business-enquiries"><h2>3. Business enquiries</h2>';
  if (!html.includes(anchor)) throw Error("Privacy notice business-enquiries section missing");
  const disclosure = '<p><strong>Secure online enquiry storage.</strong> Business-enquiry submissions made through the NovaPharm contact page are processed by NovaPharm in an encrypted AWS DynamoDB inbox in the EU North (Stockholm) region, with automatic expiry scheduled for 30 days after receipt, subject to backup and legal retention limitations. A minimal reference-only internal notification is sent to the approved NovaPharm mailbox; the alert contains no sender name, email address or message. This contact route is for non-clinical business information only, and is not a patient, adverse-event or emergency reporting system.</p>';
  return html.replace(anchor, anchor + disclosure);
}

if (process.env.NOVAPHARM_CONTACT_RELEASE_ACCEPTED === "yes") {
  const origin = String(process.env.NOVAPHARM_CONTACT_API_ORIGIN || "").trim();
  const contactPath = resolve("contact/index.html");
  const privacyPath = resolve("legal/privacy/index.html");
  const contact = readFileSync(contactPath, "utf8");
  const notice = readFileSync(privacyPath, "utf8");
  const nextContact = activateContactHtml(contact, origin);
  const nextPrivacy = activatePrivacyHtml(notice);
  writeFileSync(contactPath, nextContact);
  writeFileSync(privacyPath, nextPrivacy);
  console.log("Published production B2B contact view after explicit, verified acceptance gate.");
} else {
  console.log("B2B contact activation gate not met: retaining email-only public source.");
}
