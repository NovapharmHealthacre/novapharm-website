import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signJwt } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { createCustomerLoginTransaction, intelligenceCustomerOidc, verifyCustomerLoginTransaction } from "../../../src/core/intelligence-customer-oidc.mjs";
import { createFounderMfaCookie, verifyFounderMfaCookie } from "../../../src/core/intelligence-founder-totp-enrolment.mjs";
import { GET as finishCustomerIdentity } from "../app/auth/callback/route";
import { GET as startCustomerIdentity } from "../app/auth/customer/start/route";
import { GET as openInternalPilotSetup } from "../app/auth/internal/mfa/setup/route";
import { GET as openMfaSetup, POST as verifyMfaSetup } from "../app/auth/mfa/setup/route";

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
    assert.equal(target.searchParams.get("scope"), "openid email profile aws.cognito.signin.user.admin");
    assert.equal(target.searchParams.get("acr_values"), "urn:cognito:loa:4 urn:cognito:loa:1");
    assert.equal(target.searchParams.get("code_challenge_method"), "S256");
    // After initial Cognito TOTP activation, never silently reuse the prior
    // password-only managed-login session.
    assert.equal(target.searchParams.get("prompt"), "login");
    assert.equal(target.searchParams.get("max_age"), "0");
    assert.equal(target.searchParams.get("redirect_uri"), "https://intelligence.novapharmhealthcare.com/auth/callback");
    const cookie = result.headers.get("set-cookie") ?? "";
    assert.match(cookie, /__Host-npi_oidc_tx=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /Max-Age=900/);
    assert.doesNotMatch(cookie, /np_session|id_token|access_token|refresh_token/);
    assert.equal(result.headers.get("cache-control"), "no-store");
  } finally {
    if (previous === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = previous;
  }
});

test("password reset uses Cognito /forgotPassword and a fresh signed PKCE transaction", () => {
  const previous = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  try {
    const request = new NextRequest("https://intelligence.novapharmhealthcare.com/auth/customer/start?mode=reset");
    const result = startCustomerIdentity(request);
    assert.equal(result.status, 302);
    const target = new URL(result.headers.get("location") ?? "");
    assert.equal(target.origin, intelligenceCustomerOidc.domain);
    assert.equal(target.pathname, "/forgotPassword");
    assert.equal(target.searchParams.get("client_id"), intelligenceCustomerOidc.clientId);
    assert.equal(target.searchParams.get("redirect_uri"), intelligenceCustomerOidc.callback);
    assert.equal(target.searchParams.get("response_type"), "code");
    assert.equal(target.searchParams.get("code_challenge_method"), "S256");
    assert.equal(target.searchParams.get("max_age"), "0");
    assert.equal(target.searchParams.get("prompt"), "login");
    assert.match(target.searchParams.get("state") ?? "", /^[A-Za-z0-9_-]{40,128}$/);
    const cookie = result.headers.get("set-cookie") ?? "";
    assert.match(cookie, /__Host-npi_oidc_tx=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Max-Age=900/);
    assert.doesNotMatch(cookie, /Domain=/);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(result.headers.get("location") ?? "", /password=|username=|email=|confirmation_code=/i);
    // Unknown modes cannot inject paths or redirect the browser.
    const ignored = startCustomerIdentity(new NextRequest(
      "https://intelligence.novapharmhealthcare.com/auth/customer/start?mode=https://evil.example/",
    ));
    assert.equal(new URL(ignored.headers.get("location") ?? "").pathname, "/oauth2/authorize");
  } finally {
    if (previous === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = previous;
  }
});

test("password recovery fails closed if the server-side transaction key is unavailable", () => {
  const previous = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  try {
    const result = startCustomerIdentity(new NextRequest(
      "https://intelligence.novapharmhealthcare.com/auth/customer/start?mode=reset",
    ));
    assert.equal(result.status, 503);
    assert.equal(result.headers.get("location"), null);
    assert.equal(result.headers.get("set-cookie"), null);
  } finally {
    if (previous !== undefined) process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = previous;
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
    assert.match(body, /Start a new secure sign-in/);
    assert.doesNotMatch(body, /callback_denied|identity_email_unverified|identity_mfa_level_insufficient/);
    assert.doesNotMatch(body, /untrusted123456|verifiedCognitoSubject|id_token/);
  } finally {
    if (previous === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = previous;
  }
});

test("MFA registration route rejects anonymous and cross-origin requests", async () => {
  const invalid = new NextRequest("https://intelligence.novapharmhealthcare.com/auth/mfa/setup");
  const page = await openMfaSetup(invalid);
  assert.equal(page.status, 403);
  assert.doesNotMatch(await page.text(), /Setup key/);
  assert.equal(page.headers.get("cache-control"), "no-store, max-age=0");
  const evil = new NextRequest("https://intelligence.novapharmhealthcare.com/auth/mfa/setup", {
    method: "POST",
    headers: { origin:"https://evil.invalid", "content-type":"application/x-www-form-urlencoded" },
    body: "csrf=abc&code=123456",
  });
  const rejected = await verifyMfaSetup(evil);
  assert.equal(rejected.status, 403);
  assert.doesNotMatch(await rejected.text(), /Authenticator activated/);
});

test("signed founder-only bootstrap shows self-service TOTP key and verifies Cognito, with no customer cookie", async () => {
  const old = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  const priorFetch = globalThis.fetch;
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  const subject = "12345678-1234-4123-8123-123456789abc";
  const accessToken = "a".repeat(220);
  const sealed = createFounderMfaCookie({ accessToken, subject, signingKey:key });
  const unsealed = verifyFounderMfaCookie({ cookieValue: sealed.cookieValue, signingKey:key });
  const calls:string[] = [];
  globalThis.fetch = (async (_url: URL | RequestInfo, init?:RequestInit) => {
    assert.equal(String(_url), "https://cognito-idp.eu-north-1.amazonaws.com/");
    const command = new Headers(init?.headers).get("X-Amz-Target")?.split(".").at(-1) ?? "";
    const data = JSON.parse(String(init?.body));
    assert.equal(data.AccessToken, accessToken);
    calls.push(command);
    const result = command === "GetUser"
      ? { UserAttributes:[
          {Name:"sub",Value:subject},
          {Name:"email",Value:"vishal@novapharmhealthcare.com"},
          {Name:"email_verified",Value:"true"}],
          UserMFASettingList:[] }
      : command === "AssociateSoftwareToken"
        ? {SecretCode:"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"}
        : command === "VerifySoftwareToken"
          ? {Status:"SUCCESS"}
          : {};
    return new Response(JSON.stringify(result),{status:200});
  }) as typeof fetch;
  try {
    const req = new NextRequest("http://localhost:4303/auth/mfa/setup",{
      headers:{cookie:`__Host-npi_mfa_enrol=${sealed.cookieValue}`},
    });
    const page = await openMfaSetup(req);
    assert.equal(page.status,200);
    const html = await page.text();
    assert.match(html,/ABCDEFGHIJKLMNOPQRSTUVWXYZ234567/);
    assert.match(html,/Verify and activate MFA/);
    assert.doesNotMatch(html,/__Host-npi_session|access_token|refresh_token/);
    assert.doesNotMatch(html,new RegExp(accessToken));
    assert.deepEqual(calls,["GetUser","AssociateSoftwareToken"]);
    const form = new URLSearchParams({csrf:unsealed.csrf,code:"123456"});
    const verifyReq = new NextRequest("http://localhost:4303/auth/mfa/setup",{
      method:"POST",
      headers:{
        cookie:`__Host-npi_mfa_enrol=${sealed.cookieValue}`,
        origin:"https://intelligence.novapharmhealthcare.com",
        "content-type":"application/x-www-form-urlencoded",
      },body:form.toString(),
    });
    const confirmed = await verifyMfaSetup(verifyReq);
    assert.equal(confirmed.status,200);
    assert.match(await confirmed.text(),/Authenticator activated/);
    assert.match(confirmed.headers.get("set-cookie") ?? "",/__Host-npi_mfa_enrol=/);
    assert.doesNotMatch(confirmed.headers.get("set-cookie") ?? "",/__Host-npi_session=/);
    assert.deepEqual(calls,["GetUser","AssociateSoftwareToken","VerifySoftwareToken","SetUserMFAPreference"]);
  } finally {
    globalThis.fetch=priorFetch;
    if(old===undefined)delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"]=old;
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
  // The founder-only recovery path must never demand a paid customer seat.
  const signIn = source("components/intelligence-sign-in.tsx");
  assert.match(signIn, /founder-unavailable/);
  assert.match(signIn, /independent secure session/);
  assert.match(signIn, /not a request to purchase a customer subscription/);
  assert.ok(source("components/intelligence-sign-in.tsx").includes('href="/auth/customer/start?mode=reset"'));
  assert.match(portal, /verifiedPortalSession/);
  assert.match(source("components/portal-client.tsx"), /intelligencePortal \? <IntelligenceSignIn/);
});


function prepareCustomerProof(options: { firstLogin?: boolean; internalOrigin?: boolean; noMfaClaims?: boolean; pilotEmail?: string } = {}) {
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
    email: options.pilotEmail ?? "vishal@novapharmhealthcare.com",
    acr: options.firstLogin ? "urn:cognito:loa:1" : "urn:cognito:loa:4",
    amr: options.firstLogin ? ["pwd"] : ["pwd", "otp", "mfa"],
    auth_time: now - 30,
    iat: now - 30,
    exp: now + 300,
  };
  if (options.noMfaClaims) {
    delete (claims as {acr?: string}).acr;
    delete (claims as {amr?: string[]}).amr;
  }
  const part1 = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url");
  const part2 = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signJwt("RSA-SHA256", Buffer.from(part1 + "." + part2), keys.privateKey).toString("base64url");
  const token = part1 + "." + part2 + "." + signature;
  const request = new NextRequest(
    new URL("/auth/callback?code=valid_test_authorization_code&state=" + encodeURIComponent(state),
      options.internalOrigin ? "http://localhost:4303" : "https://intelligence.novapharmhealthcare.com"),
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
      return new Response(JSON.stringify({ token_type: "Bearer", id_token: proof.token, access_token: "a".repeat(220) }), {
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
    throw new Error(`Unexpected network destination: ${url}`);
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

test("Cognito signed founder and enrolled TOTP without rollout claims receives identity-only acknowledgement", async () => {
  const oldKey = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  const oldFlag = process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
  const oldFetch = globalThis.fetch;
  const proof = prepareCustomerProof({ noMfaClaims:true, internalOrigin:true });
  const access = "a".repeat(220);
  let getUser = 0;
  let attemptedCustomerSession = 0;
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  // Deliberately turn on a future flag: this fallback MUST NEVER call it.
  process.env["NPI_CUSTOMER_SESSION_API_ENABLED"] = "true";
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === intelligenceCustomerOidc.domain + "/oauth2/token") {
      return new Response(JSON.stringify({
        token_type:"Bearer",id_token:proof.token,access_token:access,
      }),{status:200});
    }
    if (url === intelligenceCustomerOidc.issuer + "/.well-known/jwks.json") {
      return new Response(JSON.stringify({ keys:[proof.jwk] }),{status:200});
    }
    if (url === "https://cognito-idp.eu-north-1.amazonaws.com/") {
      assert.equal(new Headers(init?.headers).get("X-Amz-Target"),
        "AWSCognitoIdentityProviderService.GetUser");
      getUser++;
      return new Response(JSON.stringify({
        UserAttributes:[
          {Name:"sub",Value:"customer-verified-12345678"},
          {Name:"email",Value:"vishal@novapharmhealthcare.com"},
          {Name:"email_verified",Value:"true"},
        ],
        UserMFASettingList:["SOFTWARE_TOKEN_MFA"],
        PreferredMfaSetting:"SOFTWARE_TOKEN_MFA",
      }),{status:200});
    }
    if (url === "https://intelligence.novapharmhealthcare.com/customer/session") {
      attemptedCustomerSession++;
      throw Error("SECURITY REGRESSION: cannot activate identity-only session");
    }
    throw Error("Unexpected request in provider-managed MFA test");
  }) as typeof fetch;
  try {
    const result=await finishCustomerIdentity(proof.request);
    assert.equal(result.status,200);
    const html=await result.text();
    assert.match(html,/Cognito sign-in confirmed/);
    assert.match(html,/no NovaPharm customer session/);
    assert.match(html,/Return to the Intelligence overview/);
    assert.doesNotMatch(html,/Business account connected/);
    assert.doesNotMatch(html, /Setup key|Secure your account/);
    const cookies=responseCookies(result).join(",");
    assert.doesNotMatch(cookies,/__Host-npi_session=|__Host-npi_mfa_enrol=/);
    assert.equal(getUser,1);
    assert.equal(attemptedCustomerSession,0);
  }finally{
    globalThis.fetch=oldFetch;
    if(oldKey===undefined)delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"]=oldKey;
    if(oldFlag===undefined)delete process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
    else process.env["NPI_CUSTOMER_SESSION_API_ENABLED"]=oldFlag;
  }
});

test("enrolled founder with stale Cognito MFA claims gets safe fresh-sign-in response, never re-enrolment", async () => {
  const oldKey = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  const oldFetch = globalThis.fetch;
  const proof = prepareCustomerProof({ firstLogin: true, internalOrigin: true });
  const access = "a".repeat(220);
  const calls: string[] = [];
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === intelligenceCustomerOidc.domain + "/oauth2/token") {
      return new Response(JSON.stringify({
        token_type: "Bearer", id_token: proof.token, access_token: access,
      }), { status: 200 });
    }
    if (url === intelligenceCustomerOidc.issuer + "/.well-known/jwks.json") {
      return new Response(JSON.stringify({ keys: [proof.jwk] }), { status: 200 });
    }
    if (url === "https://cognito-idp.eu-north-1.amazonaws.com/") {
      assert.equal(new Headers(init?.headers).get("X-Amz-Target"),
        "AWSCognitoIdentityProviderService.GetUser");
      calls.push("GetUser");
      return new Response(JSON.stringify({
        UserAttributes: [
          { Name: "sub", Value: "customer-verified-12345678" },
          { Name: "email", Value: "vishal@novapharmhealthcare.com" },
          { Name: "email_verified", Value: "true" },
        ],
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      }), { status: 200 });
    }
    throw Error("Unexpected network request in registered-founder test");
  }) as typeof fetch;
  try {
    const response = await finishCustomerIdentity(proof.request);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Authenticator active/);
    assert.match(html, /Cognito has not yet provided proof/);
    assert.match(html, /\/auth\/customer\/start/);
    assert.doesNotMatch(html, /Secure your account|Setup key|__Host-npi_session/);
    const cookies = responseCookies(response).join(",");
    assert.doesNotMatch(cookies, /__Host-npi_session|__Host-npi_mfa_enrol/);
    assert.deepEqual(calls, ["GetUser", "GetUser"]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = oldKey;
  }
});

test("founder first-password callback on internal Lambda URL starts MFA, not a customer session", async () => {
  const oldKey = process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
  const oldFlag = process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
  const oldFetch = globalThis.fetch;
  const proof = prepareCustomerProof({ firstLogin: true, internalOrigin: true });
  const access = "a".repeat(220);
  const calls: string[] = [];
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  delete process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === intelligenceCustomerOidc.domain + "/oauth2/token") {
      return new Response(JSON.stringify({
        token_type: "Bearer", id_token: proof.token, access_token: access,
      }), { status: 200 });
    }
    if (url === intelligenceCustomerOidc.issuer + "/.well-known/jwks.json") {
      return new Response(JSON.stringify({ keys: [proof.jwk] }), { status: 200 });
    }
    if (url === "https://cognito-idp.eu-north-1.amazonaws.com/") {
      assert.equal(new Headers(init?.headers).get("X-Amz-Target"),
        "AWSCognitoIdentityProviderService.GetUser");
      calls.push("GetUser");
      return new Response(JSON.stringify({
        UserAttributes: [
          { Name: "sub", Value: "customer-verified-12345678" },
          { Name: "email", Value: "vishal@novapharmhealthcare.com" },
          { Name: "email_verified", Value: "true" },
        ],
        UserMFASettingList: [],
      }), { status: 200 });
    }
    throw Error("Unexpected network request in MFA bootstrap test");
  }) as typeof fetch;
  try {
    assert.equal(proof.request.nextUrl.origin, "http://localhost:4303");
    const response = await finishCustomerIdentity(proof.request);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"),
      "https://intelligence.novapharmhealthcare.com/auth/mfa/setup");
    const cookies = responseCookies(response).join(",");
    assert.match(cookies, /__Host-npi_mfa_enrol=/);
    assert.match(cookies, /HttpOnly/);
    assert.match(cookies, /Secure/);
    assert.doesNotMatch(cookies, /__Host-npi_session=/);
    assert.doesNotMatch(cookies, /access_token|id_token|refresh_token/);
    assert.doesNotMatch(cookies, new RegExp(access));
    assert.deepEqual(calls, ["GetUser"]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"];
    else process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = oldKey;
    if (oldFlag === undefined) delete process.env["NPI_CUSTOMER_SESSION_API_ENABLED"];
    else process.env["NPI_CUSTOMER_SESSION_API_ENABLED"] = oldFlag;
  }
});

test("signed-MFA managed founder callback issues only the independently validated founder cookie", async () => {
  const previous = {
    signing: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"],
    founderFlag: process.env["NPI_FOUNDER_SESSION_API_ENABLED"],
    founderBridge: process.env["NPI_FOUNDER_BRIDGE_KEY"],
    customerFlag: process.env["NPI_CUSTOMER_SESSION_API_ENABLED"],
  };
  const originalFetch = globalThis.fetch;
  const proof = prepareCustomerProof();
  const access = "a".repeat(220);
  const calls: string[] = [];
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  process.env["NPI_FOUNDER_SESSION_API_ENABLED"] = "true";
  process.env["NPI_FOUNDER_BRIDGE_KEY"] = "b".repeat(64);
  process.env["NPI_CUSTOMER_SESSION_API_ENABLED"] = "true";
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === intelligenceCustomerOidc.domain + "/oauth2/token") {
      return new Response(JSON.stringify({
        token_type: "Bearer", id_token: proof.token, access_token: access,
      }), { status: 200 });
    }
    if (url === intelligenceCustomerOidc.issuer + "/.well-known/jwks.json") {
      return new Response(JSON.stringify({ keys: [proof.jwk] }), { status: 200 });
    }
    if (url === "https://cognito-idp.eu-north-1.amazonaws.com/") {
      calls.push("live_founder_GetUser");
      assert.equal(new Headers(init?.headers).get("X-Amz-Target"),
        "AWSCognitoIdentityProviderService.GetUser");
      return new Response(JSON.stringify({
        UserAttributes: [
          { Name: "sub", Value: "customer-verified-12345678" },
          { Name: "email", Value: "vishal@novapharmhealthcare.com" },
          { Name: "email_verified", Value: "true" },
        ],
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      }), { status: 200 });
    }
    if (url === "https://intelligence.novapharmhealthcare.com/founder/session") {
      calls.push("private_founder_session");
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer " + proof.token);
      assert.equal(JSON.parse(String(init?.body)).accessToken, access);
      assert.match(new Headers(init?.headers).get("X-Npi-Founder-Proof") ?? "", /^[a-f0-9]{64}$/);
      return new Response(JSON.stringify({
        ok: true, code: "founder_session_active",
        role: "founder", scope: "founder-shell-read-only",
        customerAccess: false, medicinesDataAccess: false,
      }), { status: 200, headers: {
        "set-cookie": "__Host-npi_founder=" + "F".repeat(43) +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800",
      } });
    }
    throw new Error("Unexpected network destination, including forbidden customer activation: " + url);
  }) as typeof fetch;
  try {
    const response = await finishCustomerIdentity(proof.request);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /Founder workspace ready/);
    assert.ok(body.includes('href="/founder"'));
    assert.equal(body.includes(proof.token), false);
    const cookies = responseCookies(response).join(",");
    assert.match(cookies, /__Host-npi_founder=/);
    assert.doesNotMatch(cookies, /__Host-npi_session=/);
    assert.deepEqual(calls, ["live_founder_GetUser", "private_founder_session"]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, val] of [
      ["NPI_OIDC_TRANSACTION_SIGNING_KEY", previous.signing],
      ["NPI_FOUNDER_SESSION_API_ENABLED", previous.founderFlag],
      ["NPI_FOUNDER_BRIDGE_KEY", previous.founderBridge],
      ["NPI_CUSTOMER_SESSION_API_ENABLED", previous.customerFlag],
    ] as const) {
      if (val === undefined) delete process.env[name];
      else process.env[name] = val;
    }
  }
});

test("signed-MFA founder without an independent backend session sees no paid-customer prompt or cookie", async () => {
  const old = {
    signing: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"],
    founderFlag: process.env["NPI_FOUNDER_SESSION_API_ENABLED"],
    founderBridge: process.env["NPI_FOUNDER_BRIDGE_KEY"],
    customerFlag: process.env["NPI_CUSTOMER_SESSION_API_ENABLED"],
  };
  const priorFetch = globalThis.fetch;
  const proof = prepareCustomerProof();
  const access = "a".repeat(220);
  let attemptedFounder = 0;
  let attemptedCustomer = 0;
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  process.env["NPI_FOUNDER_SESSION_API_ENABLED"] = "true";
  process.env["NPI_FOUNDER_BRIDGE_KEY"] = "b".repeat(64);
  process.env["NPI_CUSTOMER_SESSION_API_ENABLED"] = "true";
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = String(input);
    if (url === intelligenceCustomerOidc.domain + "/oauth2/token")
      return new Response(JSON.stringify({
        token_type: "Bearer", id_token: proof.token, access_token: access,
      }), { status: 200 });
    if (url === intelligenceCustomerOidc.issuer + "/.well-known/jwks.json")
      return new Response(JSON.stringify({ keys: [proof.jwk] }), { status: 200 });
    if (url === "https://cognito-idp.eu-north-1.amazonaws.com/")
      return new Response(JSON.stringify({
        UserAttributes: [
          { Name: "sub", Value: "customer-verified-12345678" },
          { Name: "email", Value: "vishal@novapharmhealthcare.com" },
          { Name: "email_verified", Value: "true" },
        ],
        UserMFASettingList: ["SOFTWARE_TOKEN_MFA"],
        PreferredMfaSetting: "SOFTWARE_TOKEN_MFA",
      }), { status: 200 });
    if (url === "https://intelligence.novapharmhealthcare.com/founder/session") {
      attemptedFounder++;
      return new Response(JSON.stringify({ ok: false }), { status: 401 });
    }
    if (url === "https://intelligence.novapharmhealthcare.com/customer/session") {
      attemptedCustomer++;
      throw Error("Founder cannot auto-enrol into customer billing");
    }
    throw Error("Unexpected URL");
  }) as typeof fetch;
  try {
    const response = await finishCustomerIdentity(proof.request);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Cognito sign-in confirmed/);
    assert.doesNotMatch(html, /organisation, customer seat, and subscription/);
    assert.equal(attemptedFounder, 1);
    assert.equal(attemptedCustomer, 0);
    const cookies = responseCookies(response).join(",");
    assert.doesNotMatch(cookies, /__Host-npi_founder=|__Host-npi_session=/);
  } finally {
    globalThis.fetch = priorFetch;
    for (const [name, value] of [
      ["NPI_OIDC_TRANSACTION_SIGNING_KEY", old.signing],
      ["NPI_FOUNDER_SESSION_API_ENABLED", old.founderFlag],
      ["NPI_FOUNDER_BRIDGE_KEY", old.founderBridge],
      ["NPI_CUSTOMER_SESSION_API_ENABLED", old.customerFlag],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

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


test("pilot callback's one 303 cookie survives the next internal setup request", async () => {
  const previous = {
    key: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"],
    enabled: process.env["NPI_INTERNAL_PILOT_MFA_ENABLED"],
    email: process.env["NPI_INTERNAL_PILOT_MFA_EMAIL"],
  };
  const priorFetch = globalThis.fetch;
  const pilotEmail = "internal-cookie-handoff@example.org";
  const proof = prepareCustomerProof({ internalOrigin: true, pilotEmail });
  const accessToken = "a".repeat(220);
  const subject = "customer-verified-12345678";
  const calls: string[] = [];
  process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] = key;
  process.env["NPI_INTERNAL_PILOT_MFA_ENABLED"] = "true";
  process.env["NPI_INTERNAL_PILOT_MFA_EMAIL"] = pilotEmail;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === intelligenceCustomerOidc.domain + "/oauth2/token")
      return new Response(JSON.stringify({
        token_type: "Bearer", id_token: proof.token, access_token: accessToken,
      }), { status: 200 });
    if (url === intelligenceCustomerOidc.issuer + "/.well-known/jwks.json")
      return new Response(JSON.stringify({ keys: [proof.jwk] }), { status: 200 });
    if (url === "https://cognito-idp.eu-north-1.amazonaws.com/") {
      const command = new Headers(init?.headers).get("X-Amz-Target")?.split(".").at(-1);
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.AccessToken, accessToken);
      calls.push(String(command));
      if (command === "GetUser") {
        return new Response(JSON.stringify({
          UserAttributes: [
            { Name: "sub", Value: subject },
            { Name: "email", Value: pilotEmail },
            { Name: "email_verified", Value: "true" },
          ],
          UserMFASettingList: [],
        }), { status: 200 });
      }
      if (command === "AssociateSoftwareToken")
        return new Response(JSON.stringify({ SecretCode: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" }), { status: 200 });
    }
    throw new Error("Forbidden destination in pilot handoff test: " + url);
  }) as typeof fetch;
  try {
    const callback = await finishCustomerIdentity(proof.request);
    assert.equal(callback.status, 303);
    assert.equal(callback.headers.get("location"),
      "https://intelligence.novapharmhealthcare.com/auth/internal/mfa/setup");
    const setCookies = responseCookies(callback);
    assert.equal(setCookies.length, 1, "Pilot 303 must issue exactly one browser cookie");
    const pilotCookie = setCookies[0];
    assert.ok(pilotCookie, "Signed enrollment cookie must be present");
    assert.match(pilotCookie, /^__Host-npi_internal_mfa=/u);
    assert.doesNotMatch(pilotCookie, /__Host-npi_oidc_tx|__Host-npi_session|__Host-npi_founder/u);
    assert.match(pilotCookie, /HttpOnly/u);
    assert.match(pilotCookie, /Secure/u);
    assert.match(pilotCookie, /SameSite=Lax/iu);
    const followup = new NextRequest("http://localhost:4303/auth/internal/mfa/setup", {
      headers: { cookie: pilotCookie.split(";")[0] ?? "" },
    });
    const setup = await openInternalPilotSetup(followup);
    assert.equal(setup.status, 200);
    const html = await setup.text();
    assert.match(html, /Secure your test account/u);
    assert.match(html, /Setup key/u);
    assert.doesNotMatch(html, /__Host-npi_session|__Host-npi_founder/u);
    assert.deepEqual(calls, ["GetUser", "GetUser", "AssociateSoftwareToken"]);
  } finally {
    globalThis.fetch = priorFetch;
    for (const [name, value] of [
      ["NPI_OIDC_TRANSACTION_SIGNING_KEY", previous.key],
      ["NPI_INTERNAL_PILOT_MFA_ENABLED", previous.enabled],
      ["NPI_INTERNAL_PILOT_MFA_EMAIL", previous.email],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
