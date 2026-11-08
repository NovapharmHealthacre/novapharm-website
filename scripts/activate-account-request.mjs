// Only executed on the already-verified, exact-SHA GitHub Pages release artifact.
// Public source remains a non-collecting information page until AWS receipt gates pass.
const approvedApi = /^https:\/\/[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/i;

export function activateAccountRequestHtml(html, origin) {
  if (!approvedApi.test(origin)) throw Error("Refusing unverified AWS intake for account requests");
  const opening = '<div class="npd-managed-control">';
  const ending = '</div></div></section></main>';
  const start = html.indexOf(opening);
  const end = html.indexOf(ending, start);
  if (start < 0 || end < 0 || !html.includes('No application data is collected here.') ||
      !html.includes('This public information release does not accept account applications or business documents')) {
    throw Error("Account request public source safety markers missing; refuse activation");
  }
  const live = `<div class="npd-managed-control npd-account-request-panel">
  <div class="npd-account-request-heading">
    <p class="npd-eyebrow">01 / Request access</p>
    <h2>Start with your business.</h2>
    <p>A simple first step. Tell us who you are, receive a reference and let our team review eligibility. No password, payment or licence upload is requested here.</p>
  </div>
  <form data-live-account-request-form data-api-origin="${origin}" autocomplete="on">
    <div class="npd-account-request-grid">
      <label>Full name<input name="name" type="text" autocomplete="name" minlength="2" maxlength="120" required></label>
      <label>Business email<input name="email" type="email" autocomplete="email" maxlength="160" required></label>
      <label>Legal business name<input name="company" type="text" autocomplete="organization" maxlength="160" required></label>
      <label>Your role<input name="role" type="text" autocomplete="organization-title" maxlength="120" required></label>
      <label>Type of business<select name="businessType" required>
        <option value="" selected disabled>Select your business type</option>
        <option value="Pharmacy">Pharmacy</option><option value="Hospital">Hospital</option>
        <option value="Wholesaler">Wholesaler</option><option value="Clinic">Clinic</option>
        <option value="Healthcare organisation">Other healthcare organisation</option>
      </select></label>
      <label>Country<input name="country" type="text" autocomplete="country-name" maxlength="80" required></label>
      <label>Business telephone <span>(optional)</span><input name="telephone" type="tel" autocomplete="tel" maxlength="40"></label>
      <label>Company number <span>(optional)</span><input name="companyNumber" type="text" maxlength="40" autocomplete="off"></label>
    </div>
    <div class="npd-account-request-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <label class="npd-account-request-consent"><input type="checkbox" name="privacyAcknowledgement" value="yes" required><span>I have read the <a href="/legal/privacy/#business-enquiries">business enquiry privacy notice</a>. I agree to being contacted about this account request, not marketing.</span></label>
    <label class="npd-account-request-consent"><input type="checkbox" name="safetyConfirmation" value="yes" required><span>I confirm I have not included patient information, an adverse-event report or other confidential documents.</span></label>
    <button class="npd-button npd-button-primary npd-account-request-submit" type="submit">Request a business account</button>
    <p class="npd-account-request-status" data-account-request-status role="status" aria-live="polite"></p>
  </form>
  <p class="npd-account-request-footnote">Submissions are stored in NovaPharm's encrypted AWS business enquiry inbox for up to 30 days. A request does not activate a trading account, establish credit terms, authorise regulated-medicine supply or permit ordering. Following review, eligible applicants will be invited to complete secure verification and account activation.</p>
  <p class="npd-account-request-footnote"><a href="/portal/">Already have an approved account? Secure Portal</a></p>
</div>`;
  const revised = html.slice(0, start) + live + html.slice(end + "</div>".length);
  const out = revised
    .replace("An account is approved through evidence, not created by a public form.", "Your NovaPharm account starts here.")
    .replace("NovaPharm separates business interest, qualification, private evidence, review, approval, identity provisioning and portal access.", "Request a business account in minutes. Our team reviews eligibility before regulated trading, access or ordering is enabled.")
    .replace("</head>", '<link rel="stylesheet" href="/assets/css/account-request.css"></head>')
    .replace("</body>", '<script src="/assets/js/account-request-production.js" defer></script></body>');
  if (!out.includes('data-live-account-request-form') ||
      !out.includes('name="privacyAcknowledgement"') ||
      !out.includes('name="safetyConfirmation"') ||
      !out.includes('data-api-origin="' + origin + '"') ||
      !out.includes('src="/assets/js/account-request-production.js"') ||
      out.includes("No application data is collected here.") ||
      out.includes('type="password"') || out.includes('type="file"')) {
    throw Error("Account request release transformation failed review");
  }
  return out;
}
