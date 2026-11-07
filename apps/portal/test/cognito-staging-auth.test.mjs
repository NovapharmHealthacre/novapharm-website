import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createStagingTransaction,
  exchangeStagingCode,
  readStagingTransaction,
  stagingCognitoSettings,
  verifyStagingIdentity
} from "../lib/cognito-staging-auth.mjs";

const environment = Object.freeze({
  COGNITO_STAGING_VERIFICATION_ENABLED: "true",
  COGNITO_DOMAIN: "https://novapharm-staging-250675045172.auth.eu-north-1.amazoncognito.com",
  COGNITO_CALLBACK_URL: "http://localhost:4303/auth/callback/",
  COGNITO_CLIENT_ID: "26al3v0so11731c1l1hglfa8d1",
  COGNITO_CLIENT_SECRET: "test-not-real-cognito-secret-aaa",
  COGNITO_TRANSACTION_KEY: "test-only-key-at-least-32-characters-with-entropy",
  NODE_ENV: "development"
});
const config = stagingCognitoSettings(environment);

test("disabled, unapproved hosts, missing secret and public HTTP callback fail closed", () => {
  assert.throws(() => stagingCognitoSettings({ ...environment, COGNITO_STAGING_VERIFICATION_ENABLED: "false" }), /disabled/i);
  assert.throws(() => stagingCognitoSettings({ ...environment, COGNITO_CLIENT_SECRET: "" }), /credentials/i);
  assert.throws(() => stagingCognitoSettings({ ...environment, NODE_ENV: "production" }), /transport/i);
  assert.throws(() => stagingCognitoSettings({ ...environment, COGNITO_DOMAIN: "https://evil.example" }), /domain/i);
  assert.throws(() => stagingCognitoSettings({ ...environment, COGNITO_CALLBACK_URL: "https://evil.example/steal" }), /callback/i);
});

test("authorisation request pins Entra, PKCE, state and nonce; tampering and expiry are rejected", () => {
  const tx = createStagingTransaction(config, 1000000);
  const url = new URL(tx.url);
  assert.equal(url.origin, config.domain);
  assert.equal(url.pathname, "/oauth2/authorize");
  assert.equal(url.searchParams.get("identity_provider"), "EntraP1");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), tx.state);
  assert.equal(url.searchParams.get("nonce"), tx.nonce);
  assert.deepEqual(readStagingTransaction(tx.cookieValue, tx.state, config, 1000123), { nonce: tx.nonce, verifier: tx.verifier });
  assert.equal(readStagingTransaction(tx.cookieValue, "invalid", config, 1000123), null);
  const [payload, signature] = tx.cookieValue.split(".");
  const changed = payload + "." + (signature.startsWith("A") ? "B" : "A") + signature.slice(1);
  assert.equal(readStagingTransaction(changed, tx.state, config, 1000123), null);
  assert.equal(readStagingTransaction(tx.cookieValue, tx.state, config, 1300001), null);
});

test("token exchange uses fixed Cognito endpoint with server-only client authentication", async () => {
  const result = await exchangeStagingCode(config, "allowed-auth-code", "test-verified-code-verifier", async (url, options) => {
    assert.equal(url, config.domain + "/oauth2/token");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Basic " + Buffer.from(config.clientId + ":" + config.clientSecret).toString("base64"));
    const params = new URLSearchParams(options.body);
    assert.equal(params.get("redirect_uri"), config.callback);
    assert.equal(params.get("grant_type"), "authorization_code");
    return { ok: true, text: async () => JSON.stringify({ token_type: "Bearer", id_token: "test-token" }) };
  });
  assert.equal(result, "test-token");
});

test("RSA signature, Entra federation, issuer, audience, nonce and expiry are all required", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = publicKey.export({ format: "jwk" });
  jwk.kid = "approved-test-key";
  jwk.use = "sig";
  const now = 1778000000;
  const nonce = "unique-test-nonce";
  const good = {
    iss: config.issuer, aud: config.clientId, token_use: "id", nonce,
    sub: "abcdef0123456789", iat: now - 30, exp: now + 300,
    identities: [{ providerName: "EntraP1", providerType: "OIDC" }]
  };
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
  function makeToken(claims, key = privateKey) {
    const data = encode({ alg: "RS256", kid: jwk.kid }) + "." + encode(claims);
    return data + "." + sign("RSA-SHA256", Buffer.from(data), key).toString("base64url");
  }
  const jwks = async (url) => {
    assert.equal(url, config.issuer + "/.well-known/jwks.json");
    return { ok: true, text: async () => JSON.stringify({ keys: [jwk] }) };
  };
  assert.equal((await verifyStagingIdentity(config, makeToken(good), nonce, jwks, now)).verified, true);
  for (const bad of [
    { ...good, aud: "wrong-client" },
    { ...good, iss: "https://evil.example" },
    { ...good, nonce: "wrong-nonce" },
    { ...good, exp: now - 1 },
    { ...good, token_use: "access" },
    { ...good, identities: [{ providerName: "COGNITO", providerType: "Cognito" }] }
  ]) await assert.rejects(verifyStagingIdentity(config, makeToken(bad), nonce, jwks, now));
  const forged = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  await assert.rejects(verifyStagingIdentity(config, makeToken(good, forged), nonce, jwks, now));
});

test("verification routes issue no NovaPharm session and do not trust Azure proxy headers", () => {
  const start = readFileSync(new URL("../app/auth/start/route.ts", import.meta.url), "utf8");
  const callback = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(start, /httpOnly:\s*true/);
  assert.match(start, /sameSite:\s*"lax"/);
  assert.match(callback, /verifyStagingIdentity/);
  assert.match(callback, /never issues an application session/);
  assert.doesNotMatch(start + callback, /np_session|x-ms-client-principal|auth\/federated/);
});
