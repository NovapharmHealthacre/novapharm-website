import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { all, insertIgnore, nowIso, one, run, transaction, upsert } from "../data/database.mjs";
import { isResolvedSecret, isUnresolvedSecretReference } from "./secret-value.mjs";

export const roleScopes = Object.freeze({
  client: ["customer"],
  employee: ["employee"],
  board: ["board"],
  admin: ["customer", "employee", "board", "admin"]
});

const supportedScopes = new Set(roleScopes.admin);
const passwordIterations = 210000;
const lockoutThreshold = 8;
const lockoutMs = 15 * 60 * 1000;
const dummySalt = "d2762abec8f240cb5090e15ca8d75025";
const dummyHash = hashPassword("invalid-password", dummySalt);
const commonPasswordFragments = ["password", "passphrase", "qwerty", "letmein", "welcome", "administrator", "novapharm"];

export function hashPassword(password, salt, iterations = passwordIterations) {
  return pbkdf2Sync(String(password), String(salt), iterations, 32, "sha256").toString("hex");
}

function normaliseRole(value) {
  const role = String(value || "client").trim().toLowerCase();
  return role === "customer" ? "client" : role;
}

function scopesFor(role, requested = []) {
  const valid = Array.isArray(requested)
    ? [...new Set(requested.map((scope) => String(scope).trim().toLowerCase()).filter((scope) => supportedScopes.has(scope)))]
    : [];
  return role === "admin" ? roleScopes.admin : (valid.length ? valid : roleScopes[role]);
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return [true, 1, "1", "true", "yes"].includes(typeof value === "string" ? value.toLowerCase() : value);
}

function validateProvisionedUser(user, index) {
  if (!user.username) throw new Error(`Portal user ${index + 1} requires a username.`);
  if (!roleScopes[user.role]) throw new Error(`Portal user ${index + 1} has an unsupported role.`);
  if (user.role === "client" && !user.customerId) throw new Error(`Portal user ${index + 1} requires a customerId.`);
  if (!/^[a-f0-9]{64}$/i.test(user.passwordHash) || !/^[a-f0-9]{16,}$/i.test(user.passwordSalt)) {
    throw new Error(`Portal user ${index + 1} requires a PBKDF2 password hash and salt.`);
  }
  return user;
}

export function portalUsersFromEnvironment(environment = process.env, { isProduction = false } = {}) {
  const users = [];
  if (isUnresolvedSecretReference(environment.BOOTSTRAP_ADMIN_PASSWORD)) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD is an unresolved secret reference.");
  }
  const bootstrapConfigured = isResolvedSecret(environment.BOOTSTRAP_ADMIN_PASSWORD);
  if (environment.PORTAL_USERS_JSON) {
    let parsed;
    try {
      parsed = JSON.parse(environment.PORTAL_USERS_JSON);
    } catch {
      throw new Error("PORTAL_USERS_JSON must be valid JSON.");
    }
    if (!Array.isArray(parsed)) throw new Error("PORTAL_USERS_JSON must be a JSON array.");
    parsed.forEach((entry) => {
      const role = normaliseRole(entry?.role);
      users.push({
        username: String(entry?.username || "").trim(),
        displayName: String(entry?.displayName || entry?.username || "").trim(),
        role,
        passwordHash: String(entry?.passwordHash || "").trim(),
        passwordSalt: String(entry?.passwordSalt || "").trim(),
        accessScopes: scopesFor(role, entry?.accessScopes),
        customerId: entry?.customerId || null,
        mustChangePassword: booleanValue(entry?.mustChangePassword)
      });
    });
  }

  if (environment.PORTAL_USERNAME && !bootstrapConfigured) {
    let passwordHash = String(environment.PORTAL_PASSWORD_HASH || "").trim();
    let passwordSalt = String(environment.PORTAL_PASSWORD_SALT || "").trim();
    const localPassword = String(environment.PORTAL_PASSWORD || "");
    if (localPassword) {
      if (isProduction) throw new Error("PORTAL_PASSWORD is not permitted in production. Configure a PBKDF2 hash and salt.");
      passwordSalt = randomBytes(16).toString("hex");
      passwordHash = hashPassword(localPassword, passwordSalt);
    }
    users.unshift({
      username: String(environment.PORTAL_USERNAME).trim(),
      displayName: String(environment.PORTAL_DISPLAY_NAME || environment.PORTAL_USERNAME).trim(),
      role: "admin",
      passwordHash,
      passwordSalt,
      accessScopes: roleScopes.admin,
      customerId: null,
      mustChangePassword: booleanValue(environment.PORTAL_MUST_CHANGE_PASSWORD)
    });
  }

  const unique = new Map();
  users.forEach((user, index) => {
    const validated = validateProvisionedUser(user, index);
    const key = validated.username.toLowerCase();
    if (unique.has(key)) throw new Error(`Portal username ${validated.username} is configured more than once.`);
    unique.set(key, validated);
  });
  return [...unique.values()];
}

async function upsertUserProfile(user, now) {
  const existing = await one("SELECT id, username, customer_id FROM users WHERE lower(username) = lower(?)", user.username);
  const userId = existing?.id || randomUUID();
  const username = existing?.username || user.username;
  await upsert("users", {
    id: userId,
    username,
    display_name: user.displayName,
    role: user.role,
    customer_id: user.customerId || existing?.customer_id || null,
    status: "active",
    created_at: now,
    updated_at: now
  }, ["username"], ["display_name", "role", "customer_id", "status", "updated_at"]);
  await run("DELETE FROM auth_user_scopes WHERE username = ?", username);
  for (const scope of user.accessScopes) {
    await insertIgnore("auth_user_scopes", { username, scope, created_at: now }, ["username", "scope"]);
  }
  return username;
}

export async function provisionAuthUsers(users) {
  const now = nowIso();
  for (const user of users) {
    await transaction(async () => {
      const username = await upsertUserProfile(user, now);
      await insertIgnore("auth_credentials", {
        username,
        password_hash: user.passwordHash,
        password_salt: user.passwordSalt,
        password_algorithm: "pbkdf2-sha256",
        password_iterations: passwordIterations,
        failed_attempts: 0,
        locked_until: null,
        must_change_password: user.mustChangePassword ? 1 : 0,
        credential_version: 1,
        credential_source: "environment",
        password_changed_at: now,
        updated_at: now
      }, ["username"]);
    });
  }
  return users.length;
}

function basicPasswordPolicy(password, identity = {}) {
  const value = String(password || "");
  const lower = value.toLowerCase();
  const classes = [/[a-z]/.test(value), /[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
  const identityTerms = [identity.username, identity.displayName, "NovaPharm", "Healthcare"]
    .flatMap((term) => String(term || "").toLowerCase().split(/[^a-z0-9]+/))
    .filter((term) => term.length >= 4);
  if (value.length < 14) return "Use at least 14 characters.";
  if (classes < 3) return "Use at least three of uppercase, lowercase, numbers and symbols.";
  if (commonPasswordFragments.some((fragment) => lower.includes(fragment))) return "Choose a less predictable password.";
  if (identityTerms.some((term) => lower.includes(term))) return "Do not include your name, username or company name.";
  if (/(.)\1{3,}/.test(value) || /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer)/i.test(value)) return "Choose a less predictable password.";
  return null;
}

export async function isKnownCompromisedPassword(password, { fetchImplementation = globalThis.fetch, required = true } = {}) {
  if (typeof fetchImplementation !== "function") {
    if (required) throw Object.assign(new Error("Password safety verification is temporarily unavailable."), { statusCode: 503 });
    return false;
  }
  const digest = createHash("sha1").update(String(password), "utf8").digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetchImplementation(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "NovaPharm-Healthcare-Portal" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Password safety provider returned an error.");
    const matches = (await response.text()).split(/\r?\n/).some((line) => {
      const [candidate, count] = line.split(":");
      return candidate === suffix && Number(count) > 0;
    });
    return matches;
  } catch {
    if (required) throw Object.assign(new Error("Password safety verification is temporarily unavailable."), { statusCode: 503 });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function validateNewPassword(password, identity, options = {}) {
  const policyError = basicPasswordPolicy(password, identity);
  if (policyError) throw Object.assign(new Error(policyError), { statusCode: 400 });
  if (await isKnownCompromisedPassword(password, options)) {
    throw Object.assign(new Error("This password appears in known breach data. Choose a different password."), { statusCode: 400 });
  }
}

export async function provisionBootstrapAdmin(environment = process.env, { requireCompromiseCheck = false, fetchImplementation = null } = {}) {
  const bootstrapPassword = String(environment.BOOTSTRAP_ADMIN_PASSWORD || "");
  if (!bootstrapPassword) return { status: "not_configured" };
  if (!isResolvedSecret(bootstrapPassword)) throw new Error("BOOTSTRAP_ADMIN_PASSWORD is an unresolved secret reference.");
  if (environment.PORTAL_PASSWORD || environment.PORTAL_PASSWORD_HASH || environment.PORTAL_PASSWORD_SALT) {
    throw new Error("Bootstrap and static administrator credential settings cannot be enabled together.");
  }
  const username = String(environment.PORTAL_USERNAME || "").trim();
  const displayName = String(environment.PORTAL_DISPLAY_NAME || username).trim();
  if (!username || !displayName) throw new Error("PORTAL_USERNAME and PORTAL_DISPLAY_NAME are required for administrator bootstrap.");
  const existing = await one("SELECT username FROM auth_credentials WHERE lower(username) = lower(?)", username);
  if (existing) throw new Error("Administrator bootstrap has already been completed. Remove BOOTSTRAP_ADMIN_PASSWORD from the deployment environment.");
  await validateNewPassword(bootstrapPassword, { username, displayName }, { fetchImplementation, required: requireCompromiseCheck });
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(bootstrapPassword, passwordSalt);
  const now = nowIso();
  await transaction(async () => {
    const canonicalUsername = await upsertUserProfile({ username, displayName, role: "admin", customerId: null, accessScopes: roleScopes.admin }, now);
    await run(`INSERT INTO auth_credentials(
        username, password_hash, password_salt, password_algorithm, password_iterations,
        failed_attempts, locked_until, must_change_password, credential_version,
        credential_source, password_changed_at, updated_at
      ) VALUES(?, ?, ?, 'pbkdf2-sha256', ?, 0, NULL, 1, 1, 'bootstrap', ?, ?)`,
    canonicalUsername, passwordHash, passwordSalt, passwordIterations, now, now);
    await recordSecurityEvent({ eventType: "administrator.bootstrap_created", username: canonicalUsername, outcome: "allowed" });
  });
  delete environment.BOOTSTRAP_ADMIN_PASSWORD;
  return { status: "created", username };
}

export async function hasPortalAdministrator() {
  return Boolean(await one(`SELECT u.username FROM users u
    JOIN auth_user_scopes s ON s.username = u.username AND s.scope = 'admin'
    WHERE u.status = 'active' AND u.role = 'admin' LIMIT 1`));
}

export async function recordSecurityEvent({ eventType, username = null, networkFingerprint = null, outcome, details = {} }) {
  await run(`INSERT INTO security_events(id, event_type, username, network_fingerprint, outcome, details_json, occurred_at)
    VALUES(?, ?, ?, ?, ?, ?, ?)`, randomUUID(), eventType, username, networkFingerprint, outcome, JSON.stringify(details), nowIso());
}

function credentialMatches(record, password) {
  const iterations = Number(record?.password_iterations || passwordIterations);
  const actual = Buffer.from(hashPassword(password, record?.password_salt || dummySalt, iterations), "hex");
  const expected = Buffer.from(record?.password_hash || dummyHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyCredentials(usernameInput, password, networkFingerprint = null) {
  const username = String(usernameInput || "").trim();
  const record = await one(`SELECT u.username, u.display_name, u.role, u.customer_id, u.status,
      c.password_hash, c.password_salt, c.password_iterations, c.failed_attempts, c.locked_until,
      c.must_change_password, c.credential_version
    FROM users u JOIN auth_credentials c ON lower(c.username) = lower(u.username)
    WHERE lower(u.username) = lower(?)`, username);
  const now = Date.now();
  const locked = record?.locked_until && Date.parse(record.locked_until) > now;
  const matches = credentialMatches(record, password);

  if (!record || record.status !== "active" || locked || !matches) {
    if (record && !locked) {
      const failedAttempts = Number(record.failed_attempts || 0) + 1;
      const lockedUntil = failedAttempts >= lockoutThreshold ? new Date(now + lockoutMs).toISOString() : null;
      await run("UPDATE auth_credentials SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE username = ?", failedAttempts, lockedUntil, nowIso(), record.username);
    }
    await recordSecurityEvent({
      eventType: locked ? "authentication.locked" : "authentication.failed",
      username: record?.username || username || null,
      networkFingerprint,
      outcome: "denied"
    });
    return null;
  }

  await run("UPDATE auth_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE username = ?", nowIso(), record.username);
  const accessScopes = (await all("SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope", record.username)).map((row) => row.scope);
  await recordSecurityEvent({ eventType: "authentication.succeeded", username: record.username, networkFingerprint, outcome: "allowed" });
  return {
    username: record.username,
    displayName: record.display_name,
    role: record.role,
    customerId: record.customer_id,
    accessScopes,
    mustChangePassword: Boolean(record.must_change_password),
    credentialVersion: Number(record.credential_version)
  };
}

export async function changePassword({ username, currentPassword, newPassword, confirmation, networkFingerprint = null, requireCompromiseCheck = false, fetchImplementation = null }) {
  const record = await one(`SELECT u.username, u.display_name, u.role, u.customer_id, u.status,
      c.password_hash, c.password_salt, c.password_iterations, c.credential_version
    FROM users u JOIN auth_credentials c ON c.username = u.username
    WHERE lower(u.username) = lower(?)`, String(username || "").trim());
  if (!record || record.status !== "active" || !credentialMatches(record, currentPassword)) {
    await recordSecurityEvent({ eventType: "password.change_failed", username: record?.username || username || null, networkFingerprint, outcome: "denied", details: { reason: "current_credential" } });
    throw Object.assign(new Error("The current password is not correct."), { statusCode: 401 });
  }
  if (String(newPassword || "") !== String(confirmation || "")) {
    throw Object.assign(new Error("The new password and confirmation do not match."), { statusCode: 400 });
  }
  if (credentialMatches(record, newPassword)) {
    throw Object.assign(new Error("The new password must be different from the current password."), { statusCode: 400 });
  }
  await validateNewPassword(newPassword, record, { fetchImplementation, required: requireCompromiseCheck });
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword, passwordSalt);
  const credentialVersion = Number(record.credential_version || 1) + 1;
  const now = nowIso();
  await transaction(async () => {
    await run(`UPDATE auth_credentials SET password_hash = ?, password_salt = ?, password_algorithm = 'pbkdf2-sha256',
      password_iterations = ?, failed_attempts = 0, locked_until = NULL, must_change_password = 0,
      credential_version = ?, credential_source = 'persistent_identity_store', password_changed_at = ?, updated_at = ?
      WHERE username = ?`, passwordHash, passwordSalt, passwordIterations, credentialVersion, now, now, record.username);
    await run("UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE username = ?", now, record.username);
    await recordSecurityEvent({ eventType: "password.changed", username: record.username, networkFingerprint, outcome: "allowed", details: { sessionsInvalidated: true, credentialVersion } });
  });
  return {
    username: record.username,
    displayName: record.display_name,
    role: record.role,
    customerId: record.customer_id,
    accessScopes: (await all("SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope", record.username)).map((row) => row.scope),
    mustChangePassword: false,
    credentialVersion
  };
}

export async function createPersistentSession(user, accessType, ttlMs) {
  const id = randomBytes(32).toString("hex");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const credentialRecord = user.credentialVersion ? null : await one("SELECT credential_version FROM auth_credentials WHERE username = ?", user.username);
  const credentialVersion = Number(user.credentialVersion || credentialRecord?.credential_version || 1);
  await run(`INSERT INTO auth_sessions(id, username, access_type, credential_version, created_at, expires_at, last_seen_at)
    VALUES(?, ?, ?, ?, ?, ?, ?)`, id, user.username, accessType, credentialVersion, createdAt, expiresAt, createdAt);
  return { id, expiresAt };
}

export async function getPersistentSession(id) {
  if (!id) return null;
  const session = await one(`SELECT s.id, s.username, s.access_type, s.credential_version AS session_credential_version,
      s.created_at, s.expires_at, u.display_name, u.role, u.customer_id, u.status, u.identity_provider,
      c.credential_version, c.must_change_password
    FROM auth_sessions s
    JOIN users u ON u.username = s.username
    LEFT JOIN auth_credentials c ON c.username = s.username
    WHERE s.id = ? AND s.revoked_at IS NULL`, id);
  const currentCredentialVersion = Number(session?.credential_version || 1);
  const invalid = !session || session.status !== "active" || Date.parse(session.expires_at) <= Date.now() ||
    Number(session.session_credential_version) !== currentCredentialVersion;
  if (invalid) {
    if (session) await run("UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?", nowIso(), id);
    return null;
  }
  await run("UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?", nowIso(), id);
  return {
    id: session.id,
    username: session.username,
    displayName: session.display_name,
    role: session.role,
    customerId: session.customer_id,
    accessType: session.access_type,
    accessScopes: (await all("SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope", session.username)).map((row) => row.scope),
    mustChangePassword: Boolean(session.must_change_password || false),
    credentialVersion: currentCredentialVersion,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    identityProvider: session.identity_provider || "local"
  };
}

export async function revokePersistentSession(id) {
  if (id) await run("UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?", nowIso(), id);
}

export async function countActiveSessions() {
  return Number((await one("SELECT COUNT(*) AS value FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > ?", nowIso()))?.value || 0);
}

export async function consumeRateLimit(bucketKey, limit, windowMs) {
  const now = Date.now();
  const current = await one("SELECT request_count, reset_at FROM rate_limit_buckets WHERE bucket_key = ?", bucketKey);
  const expired = !current || Date.parse(current.reset_at) <= now;
  const requestCount = expired ? 1 : Number(current.request_count) + 1;
  const resetAt = expired ? new Date(now + windowMs).toISOString() : current.reset_at;
  await upsert("rate_limit_buckets", {
    bucket_key: bucketKey,
    request_count: requestCount,
    reset_at: resetAt,
    updated_at: nowIso()
  }, ["bucket_key"], ["request_count", "reset_at", "updated_at"]);
  return { allowed: requestCount <= limit, retryAfterSeconds: Math.max(1, Math.ceil((Date.parse(resetAt) - now) / 1000)) };
}
