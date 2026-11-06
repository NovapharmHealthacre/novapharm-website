import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function src(path) { return readFileSync(path, "utf8"); }

const page = src("apps/portal/app/[[...slug]]/page.tsx");
const portal = src("apps/portal/components/portal-client.tsx");
const login = src("apps/portal/components/login-panel.tsx");
const gateway = src("apps/portal/app/gateway/[...path]/route.ts");
const identity = src("src/core/entra-identity.mjs");

// Trust mode must be server-authored; a user-supplied URL, browser storage or
// form attribute must not be able to turn off the AWS identity boundary.
assert.match(page, /awsMode=\{process\.env\["NOVAPHARM_CLOUD_PLATFORM"\] === "aws"\}/);
assert.match(portal, /view\.kind === "login"\) return <LoginPanel awsMode=\{awsMode\}/);

const awsStart = login.indexOf("  if (awsMode) {");
const legacyFormStart = login.indexOf('<form className="login-form"');
assert.ok(awsStart > 0 && legacyFormStart > awsStart, "AWS guard must be evaluated before the legacy password-form JSX");
const awsEnd = login.indexOf("\n  }\n", awsStart);
assert.ok(awsEnd > awsStart && awsEnd < legacyFormStart, "AWS guard must return before legacy login form");
const renderedGuard = login.slice(awsStart, awsEnd);
assert.match(renderedGuard, /Secure sign-in is not yet available/);
assert.match(renderedGuard, /No credentials are requested/);
assert.doesNotMatch(renderedGuard, /<form|type="password"|\.auth\/login\/aad/, "AWS guard must not render legacy credentials or Azure App Service auth endpoint");

const allowed = gateway.indexOf("if (!isPermitted(path))");
const awsDeny = gateway.indexOf('process.env["NOVAPHARM_CLOUD_PLATFORM"] === "aws"');
const target = gateway.indexOf("const target = new URL");
assert.ok(allowed >= 0 && awsDeny > allowed && target > awsDeny, "AWS authentication deny must precede upstream forwarding");
const deny = gateway.slice(awsDeny, target);
assert.match(deny, /auth\\\/\(\?:login\|federated\|change-password\)/, "All legacy authentication entry paths must be blocked on AWS");
assert.match(deny, /status: 503/, "Fail closed with an explicit service-unavailable state");

assert.match(identity, /if \(environment\.NOVAPHARM_CLOUD_PLATFORM === "aws"\) return null;/, "AWS must never trust Azure App Service principal headers");

console.log("PASS: AWS portal login and gateway fail closed until signed, reviewed Microsoft Entra P1 OIDC integration.");
