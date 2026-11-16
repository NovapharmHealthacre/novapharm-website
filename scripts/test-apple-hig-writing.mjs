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
  corporateError: read("apps/corporate/app/error.tsx"),
  portalError: read("apps/portal/app/error.tsx"),
  founderError: read("apps/founder/app/error.tsx"),
  statusError: read("apps/status/app/error.tsx"),
  notFoundStatic: read("404.html"),
  errorStatic: read("500.html"),
  errorUnavailable: read("service-unavailable/index.html"),
  staticBuilder: read("scripts/build-public-pages.mjs"),
  cookies: read("apps/corporate/components/cookie-controls.tsx"),
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

// Plain labels, accessible feedback and role-specific guidance remain explicit.
needs("signIn", "Sign in to the right workspace");
needs("signIn", "<legend>Choose a workspace</legend>");
needs("signIn", 'aria-busy={busy}');
needs("signIn", 'role="status" aria-live="polite"');
needs("signIn", '{busy ? "Signing in…" : "Sign in"}');
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
console.log("Apple HIG Writing first-pass copy contracts verified across 14 reviewed source surfaces.");
