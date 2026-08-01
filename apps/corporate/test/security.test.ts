import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildPublicSecurityPolicy } from "@novapharm/security";

test("public security policy blocks framing and unsafe object content", () => {
  const policy = buildPublicSecurityPolicy({ nonce: Buffer.alloc(24, 7).toString("base64"), secureTransport: true, indexable: true, connectSources: ["https://api.novapharmhealthcare.com"] });
  assert.match(policy.requestContentSecurityPolicy, /frame-ancestors 'none'/);
  assert.match(policy.requestContentSecurityPolicy, /object-src 'none'/);
  assert.match(policy.requestContentSecurityPolicy, /connect-src 'self' https:\/\/api\.novapharmhealthcare\.com/);
  assert.match(policy.responseHeaders["Strict-Transport-Security"] ?? "", /includeSubDomains/);
});

test("contact workflow exposes professional errors and no embedded credential", () => {
  const source = readFileSync(path.join(process.cwd(), "components/contact-workflow.tsx"), "utf8");
  assert.doesNotMatch(source, /string did not match the expected pattern/i);
  assert.doesNotMatch(source, /PORTAL_PASSWORD|BOOTSTRAP_ADMIN_PASSWORD|password\s*[:=]\s*["'][^"']+/i);
  assert.match(source, /No information was submitted/);
  assert.match(source, /X-CSRF-Token/);
  assert.match(source, /\/api\/platform/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_API_ORIGIN/);
});

test("corporate gateway is narrow, same-origin and does not trust identity headers", () => {
  const source = readFileSync(path.join(process.cwd(), "lib/platform-gateway.ts"), "utf8");
  assert.match(source, /security\/csrf/);
  assert.match(source, /account-applications/);
  assert.match(source, /maximumRequestBytes/);
  assert.match(source, /No information was submitted/);
  assert.doesNotMatch(source, /x-ms-client-principal|authorization/i);
});

test("cookie controls do not load analytics or marketing providers", () => {
  const source = readFileSync(path.join(process.cwd(), "components/cookie-controls.tsx"), "utf8");
  assert.doesNotMatch(source, /googletagmanager|google-analytics|linkedin\.com\/insight|facebook\.com\/tr/i);
  assert.match(source, /Reject non-essential/);
  assert.match(source, /Manage preferences/);
  assert.match(source, /analytics: false, marketing: false/);
});
