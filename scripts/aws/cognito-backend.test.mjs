import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const folder = mkdtempSync(join(tmpdir(), "novapharm-cognito-auth-"));
process.env.DATABASE_PATH = join(folder, "proof.db");
process.env.NODE_ENV = "test";

const { all, one, run, closeDatabase } = await import("../../src/data/database.mjs");
const { createPersistentSession, getPersistentSession, revokePersistentSession } = await import("../../src/core/auth-service.mjs");
const { createPortalGatewaySignature } = await import("../../src/core/portal-gateway-signature.mjs");
const { provisionApprovedCognitoWorkforceIdentity, verifyCognitoGatewayAssertion } = await import("../../src/core/cognito-portal-identity.mjs");
after(async () => { await closeDatabase(); rmSync(folder, { recursive: true, force: true }); });

const issuer = "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_dZRAEzkYa";
const subject = "01234567-89ab-cdef-0123-456789abcdef";
const email = "staff@novapharmhealthcare.com";
const identity = {
  issuer, subject, provider: "entra-workforce-cognito", providerSubject: "fedcba98-7654-4321-abcd-fedcba987654",
  email, displayName: "Staging Pilot"
};
const approval = { scope: "employee", expectedEmail: email };
const assertion = { identity, approval, accessType: "employee" };

test("only a matching signed and one-time Cognito gateway assertion is accepted", async () => {
  const nonce = randomUUID();
  const timestamp = String(Date.now());
  const secret = "test-gateway-secret-for-staging-proof-only-long";
  const identityNonce = "n".repeat(43);
  const token = "test-synthetic-id-token";
  const signature = createPortalGatewaySignature({
    secret, timestamp, nonce, method: "POST", pathname: "/api/auth/cognito",
    accessType: "employee", principal: token + ":" + identityNonce
  });
  const req = {
    method: "POST",
    headers: {
      "x-novapharm-gateway-timestamp": timestamp,
      "x-novapharm-gateway-nonce": nonce,
      "x-novapharm-gateway-access": "employee",
      "x-novapharm-gateway-signature": signature,
      "x-novapharm-cognito-identity-nonce": identityNonce,
      "x-novapharm-cognito-token": token
    }
  };
  const env = {
    COGNITO_WORKFORCE_BACKEND_ENABLED: "true",
    COGNITO_WORKFORCE_APPROVALS_JSON: JSON.stringify({ [subject]: { scope: "employee", expectedEmail: email } }),
    PORTAL_GATEWAY_SECRET: secret
  };
  const verified = await verifyCognitoGatewayAssertion(req, env, async () => identity);
  assert.equal(verified?.accessType, "employee");
  assert.equal(await verifyCognitoGatewayAssertion(req, env, async () => identity), null);
  assert.equal(await verifyCognitoGatewayAssertion({
    ...req, headers: { ...req.headers, "x-novapharm-gateway-access": "admin" }
  }, env, async () => identity), null);
  assert.equal(await verifyCognitoGatewayAssertion(req, { ...env, COGNITO_WORKFORCE_BACKEND_ENABLED: "false" }, async () => identity), null);
});

test("approved Cognito workforce identity receives only reviewed scopes and a revocable session", async () => {
  const created = await provisionApprovedCognitoWorkforceIdentity(assertion);
  assert.equal(created?.role, "employee");
  assert.deepEqual(created?.accessScopes, ["employee"]);
  const profile = await one("SELECT username, identity_issuer, external_subject, identity_provider, role FROM users WHERE username = ?", created.username);
  assert.equal(profile.identity_issuer, issuer);
  assert.equal(profile.external_subject, subject);
  assert.equal(profile.identity_provider, "entra-workforce-cognito");
  assert.equal(profile.role, "employee");
  assert.deepEqual((await all("SELECT scope FROM auth_user_scopes WHERE username = ?", created.username)).map(x => x.scope), ["employee"]);
  const { id } = await createPersistentSession(created, "employee", 60000);
  assert.equal((await getPersistentSession(id))?.accessType, "employee");
  await revokePersistentSession(id);
  assert.equal(await getPersistentSession(id), null);
  assert.equal(await provisionApprovedCognitoWorkforceIdentity({
    ...assertion, accessType: "admin", approval: { scope: "admin", expectedEmail: email }
  }), null);
  await run("UPDATE users SET status = 'suspended' WHERE username = ?", created.username);
  assert.equal(await provisionApprovedCognitoWorkforceIdentity(assertion), null);
});

test("no auto-provisioning from email or unapproved claims", async () => {
  assert.equal(await provisionApprovedCognitoWorkforceIdentity({ ...assertion, approval: null }), null);
  assert.equal(await provisionApprovedCognitoWorkforceIdentity({ ...assertion, accessType: "customer" }), null);
  const wrong = await provisionApprovedCognitoWorkforceIdentity({
    identity: { ...identity, subject: "other-approved-identity" },
    approval: { scope: "customer", expectedEmail: email },
    accessType: "customer"
  });
  assert.equal(wrong, null);
});
