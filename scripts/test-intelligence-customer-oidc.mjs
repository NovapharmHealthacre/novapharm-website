import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign as signJwt } from "node:crypto";
import {
  intelligenceCustomerOidc,
  createCustomerLoginTransaction,
  verifyCustomerLoginTransaction,
  exchangeCustomerAuthCode,
  verifyIntelligenceCustomerIdToken,
} from "../src/core/intelligence-customer-oidc.mjs";

const signingKey = "a_private_server_signing_secret_minimum_32_characters_no_browser_data";
const second = 1_800_000_000;
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test_rsa_1", alg: "RS256", use: "sig" };
const token = (claims, changeSignature = false) => {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: jwk.kid })).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signJwt("RSA-SHA256", Buffer.from(header + "." + body), privateKey).toString("base64url");
  return header + "." + body + "." + (changeSignature ? (signature[0] === "x" ? "y" : "x") + signature.slice(1) : signature);
};
const nonce = "abcdefghijklmnopqrstuvwxyz0123456789abcdefgh";
const validClaims = {
  iss: intelligenceCustomerOidc.issuer,
  aud: intelligenceCustomerOidc.clientId,
  token_use: "id",
  nonce,
  sub: "41fb4ecc-e9c6-4f7e-a376-17b0eddb4a8a",
  email_verified: true,
  iat: second - 30,
  exp: second + 300,
};
const mockJwks = async (url, options) => {
  assert.equal(url, intelligenceCustomerOidc.issuer + "/.well-known/jwks.json");
  assert.equal(options.redirect, "error");
  return { ok: true, text: async () => JSON.stringify({ keys: [jwk] }) };
};

test("dedicated client uses code and PKCE with no access grant", () => {
  const started = createCustomerLoginTransaction({ signingKey, nowMs: second * 1000 });
  const url = new URL(started.authorizeUrl);
  assert.equal(url.origin, intelligenceCustomerOidc.domain);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("client_id"), intelligenceCustomerOidc.clientId);
  assert.equal(url.searchParams.get("redirect_uri"), intelligenceCustomerOidc.callback);
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  const transaction = verifyCustomerLoginTransaction({
    signingKey, cookieValue: started.transactionCookieValue,
    state: url.searchParams.get("state"), nowMs: second * 1000 + 30_000,
  });
  assert.ok(transaction.verifier);
  assert.ok(transaction.nonce);
  assert.equal(transaction.grantsTenantAccess, false);
  assert.equal(started.grantsTenantAccess, false);
  assert.equal(intelligenceCustomerOidc.permitsPublicSignup, false);
});

test("tampering, forged state, expired transaction and wrong key reject", () => {
  const now = second * 1000;
  const started = createCustomerLoginTransaction({ signingKey, nowMs: now });
  const state = new URL(started.authorizeUrl).searchParams.get("state");
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey, cookieValue: started.transactionCookieValue, state: "a".repeat(43), nowMs: now }));
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey, cookieValue: started.transactionCookieValue + "tampered", state, nowMs: now }));
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey: signingKey+"other", cookieValue: started.transactionCookieValue, state, nowMs: now }));
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey, cookieValue: started.transactionCookieValue, state, nowMs: now + 301000 }));
});

test("server code exchange includes public client PKCE, no arbitrary token origin", async () => {
  const id = "a".repeat(100);
  const result = await exchangeCustomerAuthCode({
    code: "auth_code_abcdefghij",
    verifier: "a".repeat(64),
    fetchImpl: async (url, request) => {
      assert.equal(url, intelligenceCustomerOidc.domain + "/oauth2/token");
      assert.equal(request.method, "POST");
      assert.equal(request.headers.Authorization, undefined);
      assert.equal(request.redirect, "error");
      const body = new URLSearchParams(request.body);
      assert.equal(body.get("grant_type"), "authorization_code");
      assert.equal(body.get("client_id"), intelligenceCustomerOidc.clientId);
      assert.equal(body.get("code_verifier"), "a".repeat(64));
      return { ok: true, text: async () => JSON.stringify({ token_type: "Bearer", id_token: id, access_token: "must_not_be_returned" }) };
    },
  });
  assert.equal(result, id);
  await assert.rejects(exchangeCustomerAuthCode({ code: "bad", verifier: "a".repeat(64), fetchImpl: async () => ({}) }));
});

test("signed ID JWT verifies exact issuer, audience, nonce and expiry but never grants access", async () => {
  const result = await verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims), expectedNonce: nonce,
    fetchImpl: mockJwks, nowSeconds: second,
  });
  assert.equal(result.identityVerified, true);
  assert.equal(result.verifiedCognitoSubject, validClaims.sub);
  assert.equal(result.tenantOwnershipVerified, false);
  assert.equal(result.subscriptionVerified, false);
  assert.equal(result.mfaSessionAttestationRequired, true);
  assert.equal(result.grantsTenantAccess, false);
});

test("forged JWT, wrong nonce, email, audience or expiry cannot pass", async () => {
  for (const [name,claims] of [
    ["wrong audience", { ...validClaims, aud: "unapproved-client" }],
    ["wrong issuer", { ...validClaims, iss: "https://untrusted.example" }],
    ["wrong nonce", { ...validClaims, nonce: "A".repeat(44) }],
    ["email unverified", { ...validClaims, email_verified: false }],
    ["expired", { ...validClaims, exp: second - 1 }],
    ["wrong type", { ...validClaims, token_use: "access" }],
  ]) {
    await assert.rejects(verifyIntelligenceCustomerIdToken({
      idToken: token(claims), expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second,
    }), name);
  }
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims, true), expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second,
  }));
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims), expectedNonce: nonce,
    fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ keys: [] }) }),
    nowSeconds: second,
  }));
});
