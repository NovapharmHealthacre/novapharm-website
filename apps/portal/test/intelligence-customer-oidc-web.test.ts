import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET as startCustomerIdentity } from "../app/auth/customer/start/route";
import { GET as finishCustomerIdentity } from "../app/auth/callback/route";

const key = "internal-test-customer-oidc-signing-key-not-for-production-use-123456";
const source = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("customer start is fail-closed without server signing key", () => {
  const previous = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  try {
    const result = startCustomerIdentity();
    assert.equal(result.status, 503);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.equal(result.headers.get("retry-after"), "30");
    assert.equal(result.headers.get("location"), null);
    assert.equal(result.headers.get("set-cookie"), null);
  } finally {
    if (previous !== undefined) process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = previous;
  }
});

test("customer start uses the pinned Cognito public PKCE client and a signed HTTP-only transaction", () => {
  const previous = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  try {
    const result = startCustomerIdentity();
    assert.equal(result.status, 302);
    const target = new URL(result.headers.get("location") ?? "");
    assert.equal(target.origin, "https://novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com");
    assert.equal(target.pathname, "/oauth2/authorize");
    assert.equal(target.searchParams.get("response_type"), "code");
    assert.equal(target.searchParams.get("code_challenge_method"), "S256");
    assert.equal(target.searchParams.get("redirect_uri"), "https://intelligence.novapharmhealthcare.com/auth/callback");
    const cookie = result.headers.get("set-cookie") ?? "";
    assert.match(cookie, /__Host-npi_oidc_tx=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /Max-Age=300/);
    assert.doesNotMatch(cookie, /np_session|id_token|access_token|refresh_token/);
    assert.equal(result.headers.get("cache-control"), "no-store");
  } finally {
    if (previous === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = previous;
  }
});

test("callback refuses unsolicited or forged OAuth codes and clears transient cookies", async () => {
  const previous = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  try {
    const request = new NextRequest("https://intelligence.novapharmhealthcare.com/auth/callback?code=untrusted123456&state=untrusted123456");
    const response = await finishCustomerIdentity(request);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(response.headers.get("set-cookie") ?? "", /__Host-npi_oidc_tx=/);
    assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
    const body = await response.text();
    assert.match(body, /Sign-in could not be completed/);
    assert.doesNotMatch(body, /untrusted123456|verifiedCognitoSubject|id_token/);
  } finally {
    if (previous === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = previous;
  }
});

test("identity verification never creates an application session or subscription", () => {
  const callback = source("app/auth/callback/route.ts");
  const start = source("app/auth/customer/start/route.ts");
  const proxy = source("proxy.ts");
  const portal = source("app/[[...slug]]/page.tsx");
  assert.match(start, /createCustomerLoginTransaction/);
  assert.match(callback, /verifyCustomerLoginTransaction/);
  assert.match(callback, /verifyIntelligenceCustomerIdToken/);
  assert.match(callback, /identity\.grantsTenantAccess !== false/);
  assert.doesNotMatch(callback + start, /set\(\{\s*name:\s*"np_session"|setSession|createTenant|activateSubscription|grantMedicineScope/);
  assert.match(callback, /cookies\.set/);
  assert.match(proxy, /"\/auth\/customer\/start\/"/);
  assert.match(proxy, /"\/auth\/callback\/"/);
  assert.match(portal, /verifiedPortalSession/);
  assert.match(source("components/portal-client.tsx"), /intelligencePortal \? <IntelligenceSignIn/);
});
