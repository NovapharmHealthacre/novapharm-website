import { randomUUID } from "node:crypto";
import { all, audit, insertIgnore, nowIso, one, run, transaction, upsert } from "../data/database.mjs";

const supportedScopes = ["customer", "employee", "board", "admin"];

function headerValue(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function decodePrincipal(value) {
  try {
    const decoded = Buffer.from(String(value || ""), "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    if (!principal || !Array.isArray(principal.claims)) return null;
    return principal;
  } catch {
    return null;
  }
}

function claimValues(principal, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return principal.claims
    .filter((claim) => wanted.has(String(claim.typ || "").toLowerCase()))
    .map((claim) => String(claim.val || "").trim())
    .filter(Boolean);
}

function firstClaim(principal, names) {
  return claimValues(principal, names)[0] || "";
}

function configuredGroups(environment) {
  return {
    admin: String(environment.ENTRA_ADMIN_GROUP_ID || "").toLowerCase(),
    board: String(environment.ENTRA_BOARD_GROUP_ID || "").toLowerCase(),
    employee: String(environment.ENTRA_EMPLOYEE_GROUP_ID || "").toLowerCase(),
    customer: String(environment.ENTRA_CUSTOMER_GROUP_ID || "").toLowerCase()
  };
}

function configuredRoles(environment) {
  return {
    admin: String(environment.ENTRA_ADMIN_APP_ROLE || "NovaPharm.Admin").toLowerCase(),
    board: String(environment.ENTRA_BOARD_APP_ROLE || "NovaPharm.Board").toLowerCase(),
    employee: String(environment.ENTRA_EMPLOYEE_APP_ROLE || "NovaPharm.Employee").toLowerCase(),
    customer: String(environment.ENTRA_CUSTOMER_APP_ROLE || "NovaPharm.Customer").toLowerCase()
  };
}

function mappedScopes(principal, environment) {
  const roles = new Set(claimValues(principal, [
    "roles",
    "role",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
  ]).flatMap((role) => role.split(",")).map((role) => role.trim().toLowerCase()));
  const groups = new Set(claimValues(principal, ["groups", "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"]).map((group) => group.toLowerCase()));
  const roleConfig = configuredRoles(environment);
  const groupConfig = configuredGroups(environment);
  const scopes = supportedScopes.filter((scope) => roles.has(roleConfig[scope]) || (groupConfig[scope] && groups.has(groupConfig[scope])));
  return scopes.includes("admin") ? supportedScopes : scopes;
}

function roleForScopes(scopes) {
  if (scopes.includes("admin")) return "admin";
  if (scopes.includes("board")) return "board";
  if (scopes.includes("employee")) return "employee";
  return "client";
}

function trustedAppServiceRuntime(environment) {
  if (environment.WEBSITE_INSTANCE_ID || environment.WEBSITE_SITE_NAME) return true;
  return environment.NODE_ENV !== "production" && environment.ENTRA_TRUST_PROXY_HEADERS === "true";
}

export function appServicePrincipalFromHeaders(headers, environment = process.env) {
  if (environment.ENTRA_AUTH_ENABLED !== "true" || !trustedAppServiceRuntime(environment)) return null;
  const principal = decodePrincipal(headerValue(headers, "x-ms-client-principal"));
  if (!principal) return null;

  const claimedIssuer = firstClaim(principal, ["iss", "http://schemas.microsoft.com/identity/claims/identityprovider"]);
  const subject = firstClaim(principal, ["oid", "sub", "http://schemas.microsoft.com/identity/claims/objectidentifier"]) || String(principal.user_id || "").trim();
  const tenantId = firstClaim(principal, ["tid", "http://schemas.microsoft.com/identity/claims/tenantid"]);
  const issuer = claimedIssuer || (tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : "");
  const email = (firstClaim(principal, ["preferred_username", "email", "emails", "upn", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]) || String(principal.user_details || "")).toLowerCase();
  const displayName = firstClaim(principal, ["name", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]) || email;
  const externalTenantId = String(environment.ENTRA_EXTERNAL_TENANT_ID || "").toLowerCase();
  const provider = externalTenantId && tenantId.toLowerCase() === externalTenantId ? "entra-external" : "entra-workforce";

  if (!issuer || !subject || !displayName) return null;
  return {
    issuer,
    subject,
    tenantId,
    provider,
    email,
    displayName,
    proposedScopes: mappedScopes(principal, environment)
  };
}

async function recordFederatedEvent({ eventType, identity, outcome, details = {} }) {
  await run(`INSERT INTO security_events(id, event_type, username, network_fingerprint, outcome, details_json, occurred_at)
    VALUES(?, ?, ?, NULL, ?, ?, ?)`, randomUUID(), eventType, identity?.email || identity?.subject || null, outcome, JSON.stringify(details), nowIso());
}

export async function provisionFederatedIdentity(identity, environment = process.env) {
  if (!identity) return null;
  const existingBySubject = await one("SELECT * FROM users WHERE identity_issuer = ? AND external_subject = ?", identity.issuer, identity.subject);
  const existingByEmail = identity.email
    ? await one("SELECT * FROM users WHERE lower(COALESCE(email, username)) = lower(?)", identity.email)
    : null;
  const existing = existingBySubject || existingByEmail;

  if (identity.provider === "entra-external" && (!existing?.customer_id || !["active", "invited"].includes(existing.status))) {
    await recordFederatedEvent({ eventType: "federated_identity.denied", identity, outcome: "denied", details: { reason: "customer_not_approved" } });
    return null;
  }

  let scopes = identity.proposedScopes;
  if (identity.provider === "entra-external") scopes = ["customer"];
  if (!scopes.length) {
    await recordFederatedEvent({ eventType: "federated_identity.denied", identity, outcome: "denied", details: { reason: "role_mapping_missing" } });
    return null;
  }

  const role = roleForScopes(scopes);
  const username = existing?.username || identity.email || `entra-${identity.subject}`;
  const now = nowIso();
  const entraObjectId = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(identity.subject) ? identity.subject : null;

  await transaction(async () => {
    await upsert("users", {
      id: existing?.id || randomUUID(),
      entra_object_id: entraObjectId,
      identity_provider: identity.provider,
      identity_issuer: identity.issuer,
      external_subject: identity.subject,
      email: identity.email || existing?.email || null,
      username,
      display_name: identity.displayName,
      role,
      customer_id: existing?.customer_id || null,
      status: "active",
      created_at: existing?.created_at || now,
      updated_at: now
    }, ["username"], ["entra_object_id", "identity_provider", "identity_issuer", "external_subject", "email", "display_name", "role", "customer_id", "status", "updated_at"]);
    await run("DELETE FROM auth_user_scopes WHERE username = ?", username);
    for (const scope of scopes) {
      await insertIgnore("auth_user_scopes", { username, scope, created_at: now }, ["username", "scope"]);
    }
    await audit({
      actor: username,
      action: "federated_identity.provisioned",
      entityType: "user",
      entityId: existing?.id || identity.subject,
      details: { provider: identity.provider, scopes }
    });
    await recordFederatedEvent({ eventType: "federated_identity.succeeded", identity: { ...identity, email: username }, outcome: "allowed", details: { provider: identity.provider, scopes } });
  });

  return {
    username,
    displayName: identity.displayName,
    role,
    customerId: existing?.customer_id || null,
    accessScopes: scopes,
    mustChangePassword: false,
    credentialVersion: 1,
    identityProvider: identity.provider
  };
}

export async function federatedRoleInventory() {
  return all(`SELECT u.username, u.display_name, u.identity_provider, u.status, s.scope
    FROM users u JOIN auth_user_scopes s ON s.username = u.username
    WHERE u.identity_provider IN ('entra-workforce', 'entra-external')
    ORDER BY u.username, s.scope`);
}
