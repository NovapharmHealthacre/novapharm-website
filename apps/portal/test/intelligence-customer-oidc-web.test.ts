import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signJwt } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { createCustomerLoginTransaction, intelligenceCustomerOidc, verifyCustomerLoginTransaction } from "../../../src/core/intelligence-customer-oidc.mjs";
import { GET as finishCustomerIdentity } from "../app/auth/callback/route";
import { GET as startCustomerIdentity } from "../app/auth/customer/start/route";

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

test("customer session never self-provisions an account and requires the private accepted backend", () => {
  const callback = source("app/auth/callback/route.ts");
  const start = source("app/auth/customer/start/route.ts");
  const proxy = source("proxy.ts");
  const portal = source("app/[[...slug]]/page.tsx");
  assert.match(start, /createCustomerLoginTransaction/);
  assert.match(callback, /verifyCustomerLoginTransaction/);
  assert.match(callback, /verifyIntelligenceCustomerIdToken/);
  assert.match(callback, /identity\.grantsTenantAccess !== false/);
  assert.match(callback, /NPI_CUSTOMER_SESSION_API_ENABLED/);
  assert.match(callback, /__Host-npi_session/);
  assert.match(callback, /activateApprovedCustomerSession/);
  assert.match(callback, /response\.status !== 200/);
  assert.match(callback, /intelligence\.novapharmhealthcare\.com\/customer\/session/);
  assert.doesNotMatch(callback + start, /set\(\{\s*name:\s*"np_session"|setSession|createTenant|activateSubscription|grantMedicineScope/);
  assert.match(callback, /cookies\.set/);
  assert.match(proxy, /"\/auth\/customer\/start\/"/);
  assert.match(proxy, /"\/auth\/callback\/"/);
  assert.ok(source("components/intelligence-sign-in.tsx").includes('href="/auth/customer/start"'));
  assert.match(portal, /verifiedPortalSession/);
  assert.match(source("components/portal-client.tsx"), /intelligencePortal \? <IntelligenceSignIn/);
});


function prepareCustomerProof() {
  const now = Math.floor(Date.now() / 1000);
  const started = createCustomerLoginTransaction({ signingKey: key });
  const state = new URL(started.authorizeUrl).searchParams.get("state") ?? "";
  const decoded = verifyCustomerLoginTransaction({
    signingKey: key, state, cookieValue: started.transactionCookieValue,
  });
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...keys.publicKey.export({ format: "jwk" }), kid: "account-test-kid", alg: "RS256", use: "sig" };
  const claims = {
    iss: intelligenceCustomerOidc.issuer,
    aud: intelligenceCustomerOidc.clientId,
    nonce: decoded.nonce,
    token_use: "id",
    sub: "customer-verified-12345678",
    email_verified: true,
    acr: "urn:cognito:loa:4",
    amr: ["pwd", "otp", "mfa"],
    auth_time: now - 30,
    iat: now - 30,
    exp: now + 300,
  };
  const part1 = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url");
  const part2 = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signJwt("RSA-SHA256", Buffer.from(part1 + "." + part2), keys.privateKey).toString("base64url");
  const token = part1 + "." + part2 + "." + signature;
  const request = new NextRequest(
    new URL("/auth/callback?code=valid_test_authorization_code&state=" + encodeURIComponent(state),
      "https://intelligence.novapharmhealthcare.com"),
    { headers: { cookie: "__Host-npi_oidc_tx=" + started.transactionCookieValue } },
  );
  return { request, token, jwk };
}

function responseCookies(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
}

async function withCallbackMock(
  mode: "approved" | "not-approved" | "forged-cookie" | "flag-off",
  run: (response: Response, sessionApiCalls: number) => void | Promise<void>,
): Promise<void> {
  const oldKey = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  const oldFlag = process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
  const priorFetch = globalThis.fetch;
  const proof = prepareCustomerProof();
  let calls = 0;
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  if (mode !== "flag-off") process.env["NPI_CUSTOMER_SESSION_API_ENABLED"] = "true";
  else delete process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === intelligenceCustomerOidc.domain + "/oauth2/token") {
      return new Response(JSON.stringify({ token_type: "Bearer", id_token: proof.token }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    if (url === intelligenceCustomerOidc.issuer + "/.well-known/jwks.json") {
      return new Response(JSON.stringify({ keys: [proof.jwk] }), { status: 200 });
    }
    if (url === "https://intelligence.novapharmhealthcare.com/customer/session") {
      calls++;
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer " + proof.token);
      if (mode === "not-approved") return new Response("", { status: 403 });
      if (mode === "forged-cookie") {
        return new Response("{}", {
          status: 200,
          headers: { "set-cookie": "__Host-npi_session=" + "B".repeat(43) + "; Domain=evil.example; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600" },
        });
      }
      return new Response("{}", {
        status: 200,
        headers: { "set-cookie": "__Host-npi_session=" + "A".repeat(43) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600" },
      });
    }
    throw new Error("Unexpected network destination: " + url);
  }) as typeof fetch;
  try {
    const response = await finishCustomerIdentity(proof.request);
    await run(response, calls);
  } finally {
    globalThis.fetch = priorFetch;
    if (oldKey === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = oldKey;
    if (oldFlag === undefined) delete process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
    else process.env["NPI_CUSTOMER_SESSION_API_ENABLED"] = oldFlag;
  }
}

test("signed Cognito identity alone never grants a customer session with feature gate off", async () => {
  await withCallbackMock("flag-off", (response, calls) => {
    assert.equal(response.status, 200);
    assert.equal(calls, 0);
    assert.doesNotMatch(responseCookies(response).join(","), /__Host-npi_session=/);
    assert.match(responseCookies(response).join(","), /__Host-npi_oidc_tx=/);
  });
});

test("valid MFA and signed backend session acknowledgement set only the host cookie", async () => {
  await withCallbackMock("approved", async (response, calls) => {
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    const cookies = responseCookies(response).join(",");
    assert.match(cookies, /__Host-npi_session=/);
    assert.match(cookies, /HttpOnly/);
    assert.match(cookies, /Secure/);
    assert.doesNotMatch(cookies, /Domain=/);
    assert.match(await response.text(), /Business account connected/);
  });
});

test("missing account approval never issues a session cookie", async () => {
  await withCallbackMock("not-approved", (response, calls) => {
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.doesNotMatch(responseCookies(response).join(","), /__Host-npi_session=/);
  });
});

test("untrusted session service cookie with Domain attribute is discarded", async () => {
  await withCallbackMock("forged-cookie", (response, calls) => {
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.doesNotMatch(responseCookies(response).join(","), /__Host-npi_session=/);
  });
});
