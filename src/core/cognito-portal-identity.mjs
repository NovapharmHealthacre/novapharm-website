import { createHash, randomUUID } from "node:crypto";
import { all, audit, insertIgnore, nowIso, one, transaction } from "../data/database.mjs";
import { portalGatewaySignatureMatches, validPortalGatewaySecret } from "./portal-gateway-signature.mjs";
import { verifyCognitoWorkforceIdToken } from "./cognito-id-token.mjs";

const allowedScopes = new Set(["employee", "board", "admin"]);
const maxAgeMs = 60_000;

function header(request, name) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value ?? "");
}

export function reviewedCognitoWorkforceApproval(subject, email, environment = process.env) {
  if (environment.COGNITO_WORKFORCE_BACKEND_ENABLED !== "true") return null;
  if (typeof subject !== "string" || !/^[A-Za-z0-9_-]{6,128}$/.test(subject)) return null;
  let approvals;
  try { approvals = JSON.parse(environment.COGNITO_WORKFORCE_APPROVALS_JSON || ""); } catch { return null; }
  if (!approvals || Array.isArray(approvals) || typeof approvals !== "object") return null;
  const approved = Object.hasOwn(approvals, subject) ? approvals[subject] : null;
  if (!approved || typeof approved !== "object" || Array.isArray(approved) || !allowedScopes.has(approved.scope)) return null;
  if (typeof approved.expectedEmail !== "string" || approved.expectedEmail.toLowerCase() !== email ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email)) return null;
  return Object.freeze({ scope: approved.scope, expectedEmail: email });
}

export async function verifyCognitoGatewayAssertion(request, environment = process.env, verifyIdToken = verifyCognitoWorkforceIdToken) {
  if (environment.COGNITO_WORKFORCE_BACKEND_ENABLED !== "true") return null;
  const secret = String(environment.PORTAL_GATEWAY_SECRET || "");
  if (!validPortalGatewaySecret(secret)) return null;
  const timestamp = header(request, "x-novapharm-gateway-timestamp");
  const nonce = header(request, "x-novapharm-gateway-nonce");
  const accessType = header(request, "x-novapharm-gateway-access").toLowerCase();
  const token = header(request, "x-novapharm-cognito-token");
  const identityNonce = header(request, "x-novapharm-cognito-identity-nonce");
  const signature = header(request, "x-novapharm-gateway-signature");
  const age = Date.now() - Number(timestamp);
  if (!/^\d{13}$/.test(timestamp) || !Number.isFinite(age) || age < -5000 || age > maxAgeMs ||
      !allowedScopes.has(accessType) || !/^[A-Za-z0-9_-]{32,100}$/.test(identityNonce) ||
      token.length > 16000) return null;
  if (!portalGatewaySignatureMatches({
    secret, timestamp, nonce, accessType, method: request.method, pathname: "/api/auth/cognito",
    principal: token + ":" + identityNonce, signature
  })) return null;
  // Validate independently at the API boundary, never trust the portal's decoded claims.
  const identity = await verifyIdToken(token, { nonce: identityNonce });
  const approval = reviewedCognitoWorkforceApproval(identity.subject, identity.email, environment);
  if (!approval || approval.scope !== accessType) return null;
  const tokenHash = createHash("sha256").update(timestamp + ":" + nonce + ":" + signature).digest("hex");
  const acceptedAt = nowIso();
  const expiresAt = new Date(Number(timestamp) + maxAgeMs).toISOString();
  const inserted = await insertIgnore("security_replay_tokens", {
    token_hash: tokenHash, purpose: "cognito_workforce_exchange",
    expires_at: expiresAt, consumed_at: acceptedAt
  }, ["token_hash"]);
  if (!inserted.changes) return null;
  return Object.freeze({ identity, approval, accessType });
}

export async function provisionApprovedCognitoWorkforceIdentity(assertion) {
  if (!assertion?.identity || !assertion?.approval || assertion.accessType !== assertion.approval.scope) return null;
  const { identity, approval } = assertion;
  const issuer = identity.issuer;
  const subject = identity.subject;
  const username = "cognito-" + subject.toLowerCase();
  const role = approval.scope;
  if (!allowedScopes.has(role)) return null;
  const scopes = role === "admin" ? ["customer", "employee", "board", "admin"] : [role];
  return transaction(async () => {
    const current = await one("SELECT * FROM users WHERE identity_issuer = ? AND external_subject = ?", issuer, subject);
    const namedUser = await one("SELECT * FROM users WHERE username = ?", username);
    // No takeover by matching email, mutable username or an already-disabled identity.
    if (current && (current.username !== username || current.status !== "active" ||
      current.identity_provider !== "entra-workforce-cognito" || current.role !== role || current.customer_id)) return null;
    if (namedUser && (!current || namedUser.id !== current.id)) return null;
    if (!current) {
      const now = nowIso();
      const result = await insertIgnore("users", {
        id: randomUUID(),
        username,
        email: identity.email,
        display_name: identity.displayName || identity.email,
        role,
        status: "active",
        customer_id: null,
        identity_provider: "entra-workforce-cognito",
        identity_issuer: issuer,
        external_subject: subject,
        entra_object_id: /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(identity.providerSubject) ? identity.providerSubject : null,
        created_at: now,
        updated_at: now
      }, ["username"]);
      if (!result.changes) return null;
      for (const scope of scopes) await insertIgnore("auth_user_scopes", { username, scope, created_at: now }, ["username", "scope"]);
    }
    const persistedScopes = (await all("SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope", username)).map(row => row.scope);
    if (persistedScopes.length !== scopes.length || persistedScopes.some(scope => !scopes.includes(scope))) return null;
    await audit({ actor: username, action: "cognito_workforce.authentication", entityType: "user", entityId: subject, details: { role } });
    return Object.freeze({ username, displayName: identity.displayName || identity.email, role, accessScopes: scopes, credentialVersion: 1, mustChangePassword: false });
  });
}
