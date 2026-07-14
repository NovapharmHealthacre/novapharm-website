import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "novapharm-secret-resolution-"));
process.env.DATABASE_PATH = join(root, "secrets.sqlite");

const { portalUsersFromEnvironment } = await import("../src/core/auth-service.mjs");
const { isResolvedSecret, isUnresolvedSecretReference } = await import("../src/core/secret-value.mjs");
const { emailIntegrationStatus } = await import("../src/integrations/email/client.mjs");
const { hasSharePointCredentials } = await import("../src/integrations/sharepoint/graph-client.mjs");
const { closeDatabase } = await import("../src/data/database.mjs");

const unresolved = "@Microsoft.KeyVault(VaultName=example;SecretName=missing)";
assert.equal(isUnresolvedSecretReference(unresolved), true);
assert.equal(isResolvedSecret(unresolved, { minimumBytes: 32 }), false);
assert.throws(() => portalUsersFromEnvironment({
  PORTAL_USERNAME: "Vishal",
  PORTAL_DISPLAY_NAME: "Vishal Chakravarty",
  BOOTSTRAP_ADMIN_PASSWORD: unresolved
}, { isProduction: true }), /unresolved secret reference/i);

const previousEmail = {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
  to: process.env.CONTACT_NOTIFICATION_TO
};
process.env.RESEND_API_KEY = unresolved;
process.env.EMAIL_FROM = "website@example.invalid";
process.env.CONTACT_NOTIFICATION_TO = "owner@example.invalid";
assert.equal(emailIntegrationStatus(), "credentials_required");

assert.equal(hasSharePointCredentials({
  authMode: "client-secret",
  tenantId: "tenant",
  clientId: "client",
  clientSecret: unresolved,
  hostname: "example.sharepoint.com",
  sitePath: "/sites/example"
}), false);

for (const [key, value] of Object.entries({
  RESEND_API_KEY: previousEmail.apiKey,
  EMAIL_FROM: previousEmail.from,
  CONTACT_NOTIFICATION_TO: previousEmail.to
})) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

console.log("Secret resolution tests passed: unresolved Key Vault references fail closed for sessions, bootstrap, email and Graph credentials.");
await closeDatabase();
delete process.env.DATABASE_PATH;
rmSync(root, { recursive: true, force: true });
