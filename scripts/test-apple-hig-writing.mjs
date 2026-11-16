import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Scope: first-pass contracts for high-risk, user-facing writing. These checks
// complement human linguistic review, source-claims audit and rendered a11y QA.
const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const source = {
  account: read("apps/corporate/app/account-application/page.tsx"),
  interest: read("apps/corporate/components/account-interest-workflow.tsx"),
  help: read("apps/portal/components/account-access-help.tsx"),
  signIn: read("apps/portal/components/login-panel.tsx"),
  browserAcceptance: read("apps/portal/test/browser-acceptance.ts"),
  lighthouseLogin: read("scripts/run-portal-lighthouse.mjs"),
  corporateError: read("apps/corporate/app/error.tsx"),
  portalError: read("apps/portal/app/error.tsx"),
  founderError: read("apps/founder/app/error.tsx"),
  statusError: read("apps/status/app/error.tsx"),
  publicAccount: read("account-application/index.html"),
  notFoundStatic: read("404.html"),
  errorStatic: read("500.html"),
  errorUnavailable: read("service-unavailable/index.html"),
  staticBuilder: read("scripts/build-public-pages.mjs"),
  homeFinishingPass: read("scripts/apply-pages-presentation-parity.mjs"),
  corporateFinishingPass: read("scripts/apply-corporate-product-discipline.mjs"),
  publicPortalBuilder: read("scripts/build-pages.mjs"),
  cookies: read("apps/corporate/components/cookie-controls.tsx"),
  legalPrivacy: read("legal/privacy/index.html"),
  legalCookies: read("legal/cookies/index.html"),
  legalTerms: read("legal/terms/index.html"),
  legalAccessibility: read("legal/accessibility/index.html"),
  standard: read("docs/design/novapharm-apple-hig-writing.md"),
};
function needs(key, text) {
  assert.ok(source[key].includes(text), `${key}: missing reviewed writing contract: ${text}`);
}
function avoids(key, text) {
  assert.ok(!source[key].includes(text), `${key}: misleading, inaccessible or obsolete wording: ${text}`);
}

// Public interest is not the same state as an approved account or application.
needs("account", 'title="Register interest in a business account."');
needs("account", 'Registering interest does not create an account or grant portal access.');
needs("account", "Eligible businesses may receive a private application invitation");
needs("interest", "Register business interest");
needs("interest", "No account or portal access has been created.");
needs("interest", "The request could not be confirmed. It may have been received.");
needs("interest", "Contact NovaPharm by email before submitting it again.");
avoids("interest", "We could not confirm");
needs("interest", 'aria-describedby="account-interest-boundary"');
needs("interest", 'name="privacyAcknowledgement" value="yes" required');
needs("interest", 'name="safetyConfirmation" value="yes" required');
needs("interest", 'name="email" type="email" autoComplete="email" placeholder="name@company.co.uk"');
needs("interest", 'name="country" autoComplete="country-name" placeholder="For example, United Kingdom"');
needs("interest", 'role="status" aria-live="polite"');
needs("help", "Register interest in a business account.");
needs("help", 'accessLabel: "Register business interest"');
avoids("help", 'accessLabel: "Apply for a business account"');
avoids("interest", "Register qualified account interest");

// The PUBLIC_ONLY fallback must not suggest that it accepts formal applications.
// This protects against a deployment silently restoring a misleading static CTA.
needs("publicAccount", "An account is approved through evidence, not created by a public form.");
needs("publicAccount", "This public information release does not accept account applications or business documents.");
needs("publicAccount", "No application data is collected here.");
needs("publicAccount", "The managed application is not active on this public page.");
needs("publicAccount", "Discuss account eligibility");
avoids("publicAccount", "Request a business account in minutes.");
avoids("publicAccount", "data-account-application");

// Plain labels, accessible feedback and role-specific guidance remain explicit.
needs("signIn", "Sign in to the right workspace");
needs("signIn", "<legend>Choose a workspace</legend>");
needs("signIn", 'aria-busy={busy}');
needs("signIn", 'role="status" aria-live="polite"');
needs("signIn", '{busy ? "Signing in…" : "Sign in"}');
needs("browserAcceptance", 'getByRole("button", { name: "Sign in", exact: true })');
needs("browserAcceptance", '"Sign in to the right workspace", "login"');
avoids("browserAcceptance", 'One governed entry point. Four precise access boundaries.');
needs("lighthouseLogin", 'page.getByRole("button", { name: "Sign in", exact: true }).click()');
avoids("lighthouseLogin", '"Sign in securely"');
avoids("browserAcceptance", '"Sign in securely"');
avoids("signIn", "One governed entry point. Four precise access boundaries.");

// After a failed render, no transaction state can be assumed without a receipt.
for (const key of ["corporateError", "portalError", "founderError"]) {
  needs(key, "check");
  needs(key, "Try again");
}
needs("statusError", "The latest service status is unavailable.");
avoids("corporateError", "No information has been submitted.");
avoids("portalError", "No data has been changed.");
avoids("founderError", "No private information has been exposed.");
avoids("statusError", "No internal diagnostic or service data has been exposed.");

// Static fallback labels and metadata must agree in plain British English.
for (const key of ["notFoundStatic", "errorStatic", "errorUnavailable"]) {
  needs(key, '<html lang="en-GB"');
  needs(key, 'Go to home page');
  avoids(key, "Return to NovaPharm");
}
needs("errorStatic", "This page is temporarily unavailable. Try again later or go to the home page.");
needs("staticBuilder", 'const accountCtaLabel = platformCapabilities.accountApplication ? "Apply for a business account" : "Discuss account eligibility";');
needs("staticBuilder", 'Business Account Eligibility | NovaPharm Healthcare');
needs("staticBuilder", 'The public-only website cannot accept formal applications or private documents.');
avoids("staticBuilder", 'Open an account');
avoids("staticBuilder", '<strong>Open a business account</strong>');
for (const key of ["homeFinishingPass", "corporateFinishingPass"]) {
  needs(key, 'getPlatformCapabilities(resolvePlatformMode()).accountApplication');
  needs(key, '"Apply for a business account" : "Discuss account eligibility"');
  avoids(key, 'Open an account');
  avoids(key, 'Open a business account');
}
// Checked-in legal pages can contain the prior footer until the governed build
// replaces shared chrome. Ensure every legal footer variant can be replaced
// without modifying the independently reviewed legal article or metadata.
const legalFooterPattern = /<footer class="site-footer(?:\s+[^"]*)?"[^>]*>[\s\S]*?<\/footer>/;
needs("corporateFinishingPass", String.raw`html.replace(/<footer class="site-footer(?:\s+[^"]*)?"[^>]*>[\s\S]*?<\/footer>/, footer());`);
for (const key of ["legalPrivacy", "legalCookies", "legalTerms", "legalAccessibility"]) {
  const matches = source[key].match(new RegExp(legalFooterPattern.source, "g")) ?? [];
  assert.equal(matches.length, 1, `${key}: exactly one replaceable legal footer is required`);
  assert.match(matches[0], /Open a business account/, `${key}: old checked-in footer is the expected regression fixture`);
  const rendered = source[key].replace(
    legalFooterPattern,
    '<footer class="site-footer npd-footer"><a href="/account-application/">Discuss account eligibility</a></footer>'
  );
  assert.ok(rendered.includes("Discuss account eligibility"), `${key}: reviewed footer copy missing after replacement`);
  assert.ok(!rendered.includes("Open a business account"), `${key}: obsolete CTA survived replacement`);
}

needs("publicPortalBuilder", 'href="/account-application/">Discuss account eligibility</a>');
needs("publicPortalBuilder", 'Customers can discuss eligibility through the public business account information page;');
avoids("publicPortalBuilder", 'href="/account-application/">Request a business account</a>');
needs("staticBuilder", '<a class="btn btn-primary" href="/">Go to home page</a>');
needs("staticBuilder", 'write("500.html", errorPage("500", "Service unavailable", "This page is temporarily unavailable.');
avoids("interest", "No information was submitted.");

// Consent copy must accurately distinguish necessary storage, optional analytics,
// and disabled marketing tracking. Color alone must not announce form outcomes.
needs("cookies", "Optional analytics is off until you choose it.");
needs("cookies", "Marketing tracking is not active.");
needs("cookies", "Reject non-essential");
for (const term of ["Controlled terminology", "Accessibility and color", "Localization", "Remaining acceptance"]) {
  needs("standard", term);
}
console.log("Apple HIG Writing first-pass copy contracts verified across 24 reviewed source surfaces.");
