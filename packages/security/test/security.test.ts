import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicSecurityPolicy } from "../src/index.ts";

const nonce = "bWluaW11bS10d2VudHktYnl0ZXM=";

test("public security policy is restrictive and nonce bound", () => {
  const policy = buildPublicSecurityPolicy({ nonce, secureTransport: true, indexable: true });
  assert.match(policy.requestContentSecurityPolicy, new RegExp(`nonce-${nonce}`));
  assert.match(policy.requestContentSecurityPolicy, /frame-ancestors 'none'/);
  assert.match(policy.requestContentSecurityPolicy, /upgrade-insecure-requests/);
  assert.equal(policy.responseHeaders["X-Frame-Options"], "DENY");
  assert.match(policy.responseHeaders["Strict-Transport-Security"] ?? "", /includeSubDomains/);
  assert.equal(policy.responseHeaders["X-Robots-Tag"], undefined);
});

test("validation deployments fail closed to indexing", () => {
  const policy = buildPublicSecurityPolicy({ nonce, secureTransport: false, indexable: false });
  assert.equal(policy.responseHeaders["X-Robots-Tag"], "noindex, nofollow, noarchive");
  assert.doesNotMatch(policy.requestContentSecurityPolicy, /upgrade-insecure-requests/);
});

test("untrusted connect sources fail closed", () => {
  assert.throws(
    () => buildPublicSecurityPolicy({ nonce, secureTransport: true, indexable: true, connectSources: ["http://api.example.test"] }),
    /must use HTTPS/,
  );
});


test("MapKit JS third-party permissions are opt-in and preserve privacy defaults", () => {
  const standard = buildPublicSecurityPolicy({ nonce, secureTransport: true, indexable: false });
  const maps = buildPublicSecurityPolicy({ nonce, secureTransport: true, indexable: false, mapKitJs: true });
  assert.doesNotMatch(standard.requestContentSecurityPolicy, /apple-mapkit|wasm-unsafe-eval|frame-src/);
  assert.match(standard.requestContentSecurityPolicy, /worker-src 'self' blob:/);
  assert.ok(maps.requestContentSecurityPolicy.includes("connect-src 'self' https://*.apple-mapkit.com blob:"));
  assert.ok(maps.requestContentSecurityPolicy.includes("worker-src 'self' blob: https://*.apple-mapkit.com"));
  assert.ok(maps.requestContentSecurityPolicy.includes("frame-src https://*.apple-mapkit.com"));
  assert.ok(maps.requestContentSecurityPolicy.includes("'wasm-unsafe-eval'"));
  assert.ok(maps.requestContentSecurityPolicy.includes("frame-ancestors 'none'"));
  assert.equal(standard.responseHeaders["Permissions-Policy"], maps.responseHeaders["Permissions-Policy"]);
  assert.ok(maps.responseHeaders["Permissions-Policy"]?.includes("geolocation=()"));
});
