import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";

const databasePath = `/tmp/novapharm-entra-${process.pid}-${Date.now()}.sqlite`;
process.env.DATABASE_PATH = databasePath;
process.env.DATABASE_PROVIDER = "sqlite";

const { appServicePrincipalFromHeaders, provisionFederatedIdentity } = await import("../src/core/entra-identity.mjs");
const { createPersistentSession, getPersistentSession } = await import("../src/core/auth-service.mjs");
const { closeDatabase, nowIso, one, run } = await import("../src/data/database.mjs");

function principalHeader({ tenantId, subject, email, name, roles }) {
  const principal = {
    auth_typ: "aad",
    user_id: subject,
    user_details: email,
    claims: [
      { typ: "tid", val: tenantId },
      { typ: "oid", val: subject },
      { typ: "preferred_username", val: email },
      { typ: "name", val: name },
      { typ: "iss", val: `https://login.microsoftonline.com/${tenantId}/v2.0` },
      ...roles.map((role) => ({ typ: "roles", val: role }))
    ]
  };
  return Buffer.from(JSON.stringify(principal)).toString("base64");
}

const workforceTenant = randomUUID();
const externalTenant = randomUUID();
const testEnvironment = {
  NODE_ENV: "test",
  ENTRA_AUTH_ENABLED: "true",
  ENTRA_TRUST_PROXY_HEADERS: "true",
  ENTRA_EXTERNAL_TENANT_ID: externalTenant
};

const adminIdentity = appServicePrincipalFromHeaders({
  "x-ms-client-principal": principalHeader({
    tenantId: workforceTenant,
    subject: randomUUID(),
    email: "approved-admin@example.invalid",
    name: "Approved Test Administrator",
    roles: ["NovaPharm.Admin"]
  })
}, testEnvironment);
assert.equal(adminIdentity.provider, "entra-workforce");
const admin = await provisionFederatedIdentity(adminIdentity, testEnvironment);
assert.deepEqual(admin.accessScopes, ["customer", "employee", "board", "admin"]);
assert.equal(admin.role, "admin");
assert.equal(await one("SELECT username FROM auth_credentials WHERE username = ?", admin.username), null, "Federated identities must not receive local credentials");
const persistentSession = await createPersistentSession(admin, "admin", 60_000);
assert.equal((await getPersistentSession(persistentSession.id)).identityProvider, "entra-workforce");

const untrusted = appServicePrincipalFromHeaders({ "x-ms-client-principal": "ignored" }, { NODE_ENV: "production", ENTRA_AUTH_ENABLED: "true" });
assert.equal(untrusted, null, "Proxy identity headers must not be trusted outside App Service in production");

const customerSubject = randomUUID();
const customerEmail = "approved-customer@example.invalid";
const customerIdentity = appServicePrincipalFromHeaders({
  "x-ms-client-principal": principalHeader({
    tenantId: externalTenant,
    subject: customerSubject,
    email: customerEmail,
    name: "Approved Test Customer",
    roles: ["NovaPharm.Customer"]
  })
}, testEnvironment);
assert.equal(await provisionFederatedIdentity(customerIdentity, testEnvironment), null, "External self-registration must be rejected before account approval");

const now = nowIso();
const organizationId = randomUUID();
const customerId = randomUUID();
await run(`INSERT INTO organizations(id, legal_name, created_at, created_by, updated_at, updated_by)
  VALUES(?, 'Approved Test Customer Ltd', ?, 'test', ?, 'test')`, organizationId, now, now);
await run(`INSERT INTO customers(id, organization_id, customer_number, customer_type, lifecycle_status, created_at, created_by, updated_at, updated_by)
  VALUES(?, ?, 'CUS-TEST-ENTRA', 'wholesaler', 'active', ?, 'test', ?, 'test')`, customerId, organizationId, now, now);
await run(`INSERT INTO users(id, username, display_name, role, customer_id, status, created_at, updated_at, email)
  VALUES(?, ?, 'Approved Test Customer', 'client', ?, 'invited', ?, ?, ?)`, randomUUID(), customerEmail, customerId, now, now, customerEmail);

const customer = await provisionFederatedIdentity(customerIdentity, testEnvironment);
assert.deepEqual(customer.accessScopes, ["customer"]);
assert.equal(customer.customerId, customerId);
assert.equal(customer.role, "client");

await closeDatabase();
rmSync(databasePath, { force: true });
console.log("Entra identity tests passed: trusted-header enforcement, app-role mapping, administrator scopes, credential-free sessions and approved-customer isolation.");
