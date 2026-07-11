import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { all, nowIso, one, run, transaction } from "../data/database.mjs";

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
        customerId: entry?.customerId || null
      });
    });
  }

  if (environment.PORTAL_USERNAME) {
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
      customerId: null
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

export function provisionAuthUsers(users) {
  const now = nowIso();
  for (const user of users) {
    transaction(() => {
      const existing = one("SELECT id, username FROM users WHERE lower(username) = lower(?)", user.username);
      const userId = existing?.id || randomUUID();
      const username = existing?.username || user.username;
      run(`INSERT INTO users(id, username, display_name, role, customer_id, status, created_at, updated_at)
        VALUES(?, ?, ?, ?, ?, 'active', ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          display_name = excluded.display_name,
          role = excluded.role,
          customer_id = COALESCE(excluded.customer_id, users.customer_id),
          status = 'active',
          updated_at = excluded.updated_at`,
      userId, username, user.displayName, user.role, user.customerId, now, now);
      run(`INSERT INTO auth_credentials(username, password_hash, password_salt, password_algorithm, password_iterations, failed_attempts, locked_until, password_changed_at, updated_at)
        VALUES(?, ?, ?, 'pbkdf2-sha256', ?, 0, NULL, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          password_hash = excluded.password_hash,
          password_salt = excluded.password_salt,
          password_algorithm = excluded.password_algorithm,
          password_iterations = excluded.password_iterations,
          password_changed_at = CASE WHEN auth_credentials.password_hash <> excluded.password_hash THEN excluded.password_changed_at ELSE auth_credentials.password_changed_at END,
          updated_at = excluded.updated_at`,
      username, user.passwordHash, user.passwordSalt, passwordIterations, now, now);
      run("DELETE FROM auth_user_scopes WHERE username = ?", username);
      for (const scope of user.accessScopes) {
        run("INSERT INTO auth_user_scopes(username, scope, created_at) VALUES(?, ?, ?)", username, scope, now);
      }
    });
  }
  return users.length;
}

export function recordSecurityEvent({ eventType, username = null, networkFingerprint = null, outcome, details = {} }) {
  run(`INSERT INTO security_events(id, event_type, username, network_fingerprint, outcome, details_json, occurred_at)
    VALUES(?, ?, ?, ?, ?, ?, ?)`, randomUUID(), eventType, username, networkFingerprint, outcome, JSON.stringify(details), nowIso());
}

export function verifyCredentials(usernameInput, password, networkFingerprint = null) {
  const username = String(usernameInput || "").trim();
  const record = one(`SELECT u.username, u.display_name, u.role, u.customer_id, u.status,
      c.password_hash, c.password_salt, c.password_iterations, c.failed_attempts, c.locked_until
    FROM users u JOIN auth_credentials c ON lower(c.username) = lower(u.username)
    WHERE lower(u.username) = lower(?)`, username);
  const now = Date.now();
  const locked = record?.locked_until && Date.parse(record.locked_until) > now;
  const iterations = Number(record?.password_iterations || passwordIterations);
  const actual = Buffer.from(hashPassword(password, record?.password_salt || dummySalt, iterations), "hex");
  const expected = Buffer.from(record?.password_hash || dummyHash, "hex");
  const matches = actual.length === expected.length && timingSafeEqual(actual, expected);

  if (!record || record.status !== "active" || locked || !matches) {
    if (record && !locked) {
      const failedAttempts = Number(record.failed_attempts || 0) + 1;
      const lockedUntil = failedAttempts >= lockoutThreshold ? new Date(now + lockoutMs).toISOString() : null;
      run("UPDATE auth_credentials SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE username = ?", failedAttempts, lockedUntil, nowIso(), record.username);
    }
    recordSecurityEvent({
      eventType: locked ? "authentication.locked" : "authentication.failed",
      username: record?.username || username || null,
      networkFingerprint,
      outcome: "denied"
    });
    return null;
  }

  run("UPDATE auth_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE username = ?", nowIso(), record.username);
  const accessScopes = all("SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope", record.username).map((row) => row.scope);
  recordSecurityEvent({ eventType: "authentication.succeeded", username: record.username, networkFingerprint, outcome: "allowed" });
  return {
    username: record.username,
    displayName: record.display_name,
    role: record.role,
    customerId: record.customer_id,
    accessScopes
  };
}

export function createPersistentSession(user, accessType, ttlMs) {
  const id = randomBytes(32).toString("hex");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  run(`INSERT INTO auth_sessions(id, username, access_type, created_at, expires_at, last_seen_at)
    VALUES(?, ?, ?, ?, ?, ?)`, id, user.username, accessType, createdAt, expiresAt, createdAt);
  return { id, expiresAt };
}

export function getPersistentSession(id) {
  if (!id) return null;
  const session = one(`SELECT s.id, s.username, s.access_type, s.created_at, s.expires_at,
      u.display_name, u.role, u.customer_id, u.status
    FROM auth_sessions s JOIN users u ON u.username = s.username
    WHERE s.id = ? AND s.revoked_at IS NULL`, id);
  if (!session || session.status !== "active" || Date.parse(session.expires_at) <= Date.now()) {
    if (session) run("UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?", nowIso(), id);
    return null;
  }
  run("UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?", nowIso(), id);
  return {
    id: session.id,
    username: session.username,
    displayName: session.display_name,
    role: session.role,
    customerId: session.customer_id,
    accessType: session.access_type,
    accessScopes: all("SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope", session.username).map((row) => row.scope),
    createdAt: session.created_at,
    expiresAt: session.expires_at
  };
}

export function revokePersistentSession(id) {
  if (id) run("UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?", nowIso(), id);
}

export function countActiveSessions() {
  return Number(one("SELECT COUNT(*) AS value FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > ?", nowIso())?.value || 0);
}

export function consumeRateLimit(bucketKey, limit, windowMs) {
  const now = Date.now();
  const current = one("SELECT request_count, reset_at FROM rate_limit_buckets WHERE bucket_key = ?", bucketKey);
  const expired = !current || Date.parse(current.reset_at) <= now;
  const requestCount = expired ? 1 : Number(current.request_count) + 1;
  const resetAt = expired ? new Date(now + windowMs).toISOString() : current.reset_at;
  run(`INSERT INTO rate_limit_buckets(bucket_key, request_count, reset_at, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(bucket_key) DO UPDATE SET request_count = excluded.request_count, reset_at = excluded.reset_at, updated_at = excluded.updated_at`,
  bucketKey, requestCount, resetAt, nowIso());
  return { allowed: requestCount <= limit, retryAfterSeconds: Math.max(1, Math.ceil((Date.parse(resetAt) - now) / 1000)) };
}
