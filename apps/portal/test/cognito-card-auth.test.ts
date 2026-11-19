import assert from "node:assert/strict";
import test from "node:test";
import { beginCognitoCardSignIn, completeCognitoCardSignIn } from "../lib/cognito-card-auth";

const session = "S".repeat(90);
const token = ["A".repeat(120), "B".repeat(130), "C".repeat(130)].join(".");
const accessToken = ["D".repeat(120), "E".repeat(130), "F".repeat(130)].join(".");

function mockCognito(replies: Array<Record<string, unknown>>) {
  const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ url: String(url), init: init ?? {}, body });
    const reply = replies.shift();
    if (!reply) throw Error("Unexpected provider call");
    return new Response(JSON.stringify(reply), {
      status: 200, headers: { "content-type": "application/x-amz-json-1.1" },
    });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

test("real password form calls only the exact Cognito pool and requires TOTP", async () => {
  const h = mockCognito([{ ChallengeName: "SOFTWARE_TOKEN_MFA", Session: session }]);
  const result = await beginCognitoCardSignIn("  FOUNDER@example.com  ", "not-a-real-secret", h.fetchImpl);
  assert.equal(result.kind, "mfa");
  if (result.kind !== "mfa") return;
  assert.equal(result.challenge.email, "founder@example.com");
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0]?.url, "https://cognito-idp.eu-north-1.amazonaws.com/");
  assert.equal(h.calls[0]?.init.credentials, "omit");
  assert.equal(h.calls[0]?.init.cache, "no-store");
  assert.equal(h.calls[0]?.body["ClientId"], "7c76122stt76k4d8cjvd7tf6ck");
  assert.equal(h.calls[0]?.body["AuthFlow"], "USER_AUTH");
  assert.deepEqual(h.calls[0]?.body["AuthParameters"], {
    USERNAME: "founder@example.com",
    PREFERRED_CHALLENGE: "PASSWORD",
    PASSWORD: "not-a-real-secret",
    TARGET_ACR_VALUES: "urn:cognito:loa:4",
    MAX_AGE: "0",
  });
});

test("unexpected token after password only cannot be accepted", async () => {
  const h = mockCognito([{ AuthenticationResult: { IdToken: token } }]);
  const result = await beginCognitoCardSignIn("founder@example.com", "password", h.fetchImpl);
  assert.deepEqual(result, { kind: "provider-required" });
});

test("TOTP is sent only to Cognito and a successful challenge returns identity token", async () => {
  const h = mockCognito([{ AuthenticationResult: { IdToken: token, AccessToken: accessToken } }]);
  const result = await completeCognitoCardSignIn(
    { email: "founder@example.com", session }, "123456", h.fetchImpl,
  );
  assert.equal(result.kind, "verified");
  if (result.kind === "verified") {
    assert.equal(result.idToken, token);
    assert.equal(result.accessToken, accessToken);
  }
  assert.equal(h.calls[0]?.body["ChallengeName"], "SOFTWARE_TOKEN_MFA");
  assert.deepEqual(h.calls[0]?.body["ChallengeResponses"], {
    USERNAME: "founder@example.com", SOFTWARE_TOKEN_MFA_CODE: "123456",
  });
});

test("password choice is handled exactly once and MFA is still mandatory", async () => {
  const h = mockCognito([
    { ChallengeName: "SELECT_CHALLENGE", Session: session },
    { ChallengeName: "SOFTWARE_TOKEN_MFA", Session: session },
  ]);
  const result = await beginCognitoCardSignIn("founder@example.com", "password", h.fetchImpl);
  assert.equal(result.kind, "mfa");
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1]?.body["ChallengeName"], "SELECT_CHALLENGE");
});

test("invalid input is rejected before provider calls", async () => {
  const h = mockCognito([]);
  await assert.rejects(
    beginCognitoCardSignIn("not-an-email", "password", h.fetchImpl),
    /Sign-in could not be completed/u,
  );
  await assert.rejects(
    completeCognitoCardSignIn({ email: "founder@example.com", session }, "12345", h.fetchImpl),
    /Sign-in could not be completed/u,
  );
  assert.equal(h.calls.length, 0);
});

test("account-reset and MFA setup challenges remain with managed Cognito login", async () => {
  const h = mockCognito([{ ChallengeName: "MFA_SETUP", Session: session }]);
  const result = await beginCognitoCardSignIn("founder@example.com", "password", h.fetchImpl);
  assert.deepEqual(result, { kind: "provider-required" });
});

test("TOTP success without both tokens cannot issue any founder or customer session", async () => {
  const h = mockCognito([{ AuthenticationResult: { IdToken: token } }]);
  const result = await completeCognitoCardSignIn(
    { email: "founder@example.com", session }, "123456", h.fetchImpl,
  );
  assert.deepEqual(result, { kind: "provider-required" });
});
