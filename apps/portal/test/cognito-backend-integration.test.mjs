import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { verifyCognitoWorkforceIdToken, COGNITO_STAGING_ISSUER, COGNITO_STAGING_CLIENT_ID } from "../../../src/core/cognito-id-token.mjs";
import { portalGatewaySignatureMatches } from "../../../src/core/portal-gateway-signature.mjs";
import { exchangeApprovedCognitoSession } from "../lib/cognito-session-exchange.mjs";

const env = {
  COGNITO_PORTAL_SESSION_ENABLED: "true",
  PORTAL_GATEWAY_SECRET: "a-review-only-test-gateway-secret-not-for-production",
  INTERNAL_API_ORIGIN: "http://localhost:4173",
  PORTAL_ORIGIN: "http://localhost:4303",
  PORTAL_VALIDATION_MODE: "true",
  NODE_ENV: "test"
};
const token = "a".repeat(400);
const identityNonce = "n".repeat(43);
const cookie = "np_session=" + "a".repeat(64) + "." + "b".repeat(64) + "; Path=/; HttpOnly; SameSite=Lax";

test("no session unless feature gate, trusted internal origin and matching workforce role", async () => {
  await assert.rejects(exchangeApprovedCognitoSession({
    token, identityNonce, accessType: "employee", environment: { ...env, COGNITO_PORTAL_SESSION_ENABLED: "false" }
  }), /disabled/i);
  await assert.rejects(exchangeApprovedCognitoSession({
    token, identityNonce, accessType: "customer", environment: env
  }), /disabled/i);
  await assert.rejects(exchangeApprovedCognitoSession({
    token, identityNonce, accessType: "employee", environment: { ...env, INTERNAL_API_ORIGIN: "https://evil.example/?code=1" }
  }), /origin/i);
});

test("server exchanges independently verified subject via signed private route", async () => {
  const result = await exchangeApprovedCognitoSession({
    token, identityNonce, accessType: "board", environment: env,
    request: async (url, init) => {
      assert.equal(url, "http://localhost:4173/api/auth/cognito");
      assert.equal(init.method, "POST");
      assert.equal(init.headers.Origin, "http://localhost:4303");
      assert.deepEqual(JSON.parse(init.body), { accessType: "board" });
      assert.equal(portalGatewaySignatureMatches({
        secret: env.PORTAL_GATEWAY_SECRET,
        timestamp: init.headers["x-novapharm-gateway-timestamp"],
        nonce: init.headers["x-novapharm-gateway-nonce"],
        accessType: "board",
        method: "POST",
        pathname: "/api/auth/cognito",
        principal: token + ":" + identityNonce,
        signature: init.headers["x-novapharm-gateway-signature"]
      }), true);
      return Response.json({ ok: true, accessType: "board" }, { headers: { "Set-Cookie": cookie } });
    }
  });
  assert.equal(result.accessType, "board");
  assert.equal(result.session, "a".repeat(64) + "." + "b".repeat(64));
});

test("backend role mismatch and forged or missing session cookies fail closed", async () => {
  for (const response of [
    Response.json({ ok: true, accessType: "admin" }, { headers: { "Set-Cookie": cookie } }),
    Response.json({ ok: true, accessType: "employee" }),
    Response.json({ ok: true, accessType: "employee" }, { headers: { "Set-Cookie": "np_session=forged; HttpOnly" } }),
    Response.json({ ok: true, accessType: "employee" }, { headers: { "Set-Cookie": "np_session=" + "x".repeat(129) } })
  ]) {
    await assert.rejects(exchangeApprovedCognitoSession({
      token, identityNonce, accessType: "employee", environment: env, request: async () => response
    }));
  }
});

test("backend JWT validation rejects wrong tenant, audience, forgery and provider", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", use: "sig" };
  const now = 1794000000;
  const valid = {
    iss: COGNITO_STAGING_ISSUER, aud: COGNITO_STAGING_CLIENT_ID,
    token_use: "id", nonce: identityNonce, sub: "01020304-0506-0708-0900-abcdef012345",
    identities: [{ providerName: "EntraP1", providerType: "OIDC", userId: "a0123456-7890-4567-8901-234567890abc" }],
    iat: now - 30, exp: now + 300, email: "team@novapharmhealthcare.com", name: "Authorised Tester"
  };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const jwt = (claims, key = privateKey) => {
    const base = encode({ alg: "RS256", kid: "test-key" }) + "." + encode(claims);
    return base + "." + sign("RSA-SHA256", Buffer.from(base), key).toString("base64url");
  };
  const remote = async () => Response.json({ keys: [jwk] });
  const result = await verifyCognitoWorkforceIdToken(jwt(valid), { nonce: identityNonce, now, fetchImplementation: remote });
  assert.equal(result.subject, valid.sub);
  assert.equal(result.provider, "entra-workforce-cognito");
  for (const claims of [
    { ...valid, aud: "wrong-client" },
    { ...valid, iss: "https://evil.example" },
    { ...valid, exp: now - 1 },
    { ...valid, nonce: "wrong-nonce" },
    { ...valid, identities: [{ providerName: "OtherProvider", providerType: "OIDC", userId: valid.identities[0].userId }] }
  ]) await assert.rejects(verifyCognitoWorkforceIdToken(jwt(claims), { nonce: identityNonce, now, fetchImplementation: remote }));
  const attacker = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  await assert.rejects(verifyCognitoWorkforceIdToken(jwt(valid, attacker), { nonce: identityNonce, now, fetchImplementation: remote }));
});
