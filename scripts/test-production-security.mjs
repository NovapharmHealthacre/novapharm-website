import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { Readable, Writable } from "node:stream";

const runId = `${process.pid}-${Date.now()}`;
const databasePath = `/tmp/novapharm-production-security-${runId}.sqlite`;
const documentStoragePath = `/tmp/novapharm-production-security-documents-${runId}`;
const username = "Vishal";
const password = `Aa1!${randomBytes(24).toString("hex")}`;
const permanentPassword = `Zz9!${randomBytes(24).toString("hex")}`;

process.env.NODE_ENV = "production";
process.env.DATABASE_PATH = databasePath;
process.env.DOCUMENT_STORAGE_ROOT = documentStoragePath;
process.env.SECURE_CONTENT_ROOT = `/tmp/novapharm-production-security-content-${runId}`;
process.env.SESSION_SECRET = randomBytes(36).toString("base64url");
process.env.HOST = "0.0.0.0";
process.env.PUBLIC_ORIGIN = "https://novapharmhealthcare.com";
process.env.PUBLIC_API_ORIGIN = "https://novapharmhealthcare.com";
process.env.SITE_URL = "https://novapharmhealthcare.com";
process.env.PORTAL_USERNAME = username;
process.env.PORTAL_DISPLAY_NAME = "Vishal Chakravarty";
process.env.BOOTSTRAP_ADMIN_PASSWORD = password;
process.env.PORTAL_PASSWORD = "";
process.env.PORTAL_PASSWORD_HASH = "";
process.env.PORTAL_PASSWORD_SALT = "";
process.env.PORTAL_USERS_JSON = "";

const originalFetch = globalThis.fetch;
const passwordRangeRequests = [];
globalThis.fetch = async (url, options) => {
  passwordRangeRequests.push({ url: String(url), padding: options?.headers?.["Add-Padding"] });
  return new Response("00000000000000000000000000000000000:0", { status: 200 });
};
const { handleRequest } = await import("../server.mjs");
assert.equal(process.env.BOOTSTRAP_ADMIN_PASSWORD, undefined);

class TestRequest extends Readable {
  constructor({ method = "GET", url = "/", headers = {}, body = "" } = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = { host: "novapharmhealthcare.com", ...headers };
    this.socket = { remoteAddress: "127.0.0.1" };
    if (body) this.push(Buffer.from(body));
    this.push(null);
  }
}

class TestResponse extends Writable {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.headersSent = false;
    this.chunks = [];
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;
    this.headersSent = true;
    return this;
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    callback();
  }

  get body() {
    return Buffer.concat(this.chunks).toString("utf8");
  }
}

async function request(options) {
  const response = new TestResponse();
  const finished = new Promise((resolve, reject) => {
    response.once("finish", resolve);
    response.once("error", reject);
  });
  await handleRequest(new TestRequest(options), response);
  if (!response.writableFinished) await finished;
  const payload = String(response.headers["Content-Type"] || "").includes("application/json")
    ? JSON.parse(response.body || "{}")
    : response.body;
  return { statusCode: response.statusCode, headers: response.headers, payload };
}

function cookieValue(setCookie, name) {
  const match = String(setCookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

const csrf = await request({ url: "/api/security/csrf" });
assert.equal(csrf.statusCode, 200);
assert.match(csrf.headers["Strict-Transport-Security"], /max-age=31536000/);
assert.match(csrf.headers["Set-Cookie"], /Secure/);
assert.match(csrf.headers["Content-Security-Policy"], /connect-src 'self'/);
assert.doesNotMatch(csrf.headers["Content-Security-Policy"], /pwnedpasswords/);
const csrfCookie = cookieValue(csrf.headers["Set-Cookie"], "np_csrf");

const rejectedOrigin = await request({
  method: "POST",
  url: "/api/auth/login",
  headers: {
    origin: "https://example.invalid",
    cookie: `np_csrf=${csrfCookie}`,
    "x-csrf-token": csrfCookie,
    "content-type": "application/json"
  },
  body: JSON.stringify({ username, password, accessType: "board" })
});
assert.equal(rejectedOrigin.statusCode, 403);

const login = await request({
  method: "POST",
  url: "/api/auth/login",
  headers: {
    origin: "https://novapharmhealthcare.com",
    cookie: `np_csrf=${csrfCookie}`,
    "x-csrf-token": csrfCookie,
    "content-type": "application/json"
  },
  body: JSON.stringify({ username, password, accessType: "board" })
});
assert.equal(login.statusCode, 200);
assert.equal(login.payload.redirectTo, "/portal/change-password/");
assert.equal(login.payload.mustChangePassword, true);
assert.match(login.headers["Set-Cookie"], /HttpOnly/);
assert.match(login.headers["Set-Cookie"], /Secure/);
assert.match(login.headers["Set-Cookie"], /SameSite=Lax/);
assert.doesNotMatch(login.headers["Set-Cookie"], new RegExp(password));
const sessionCookie = cookieValue(login.headers["Set-Cookie"], "np_session");

const blockedAdmin = await request({
  url: "/api/admin/summary",
  headers: { cookie: `np_session=${sessionCookie}` }
});
assert.equal(blockedAdmin.statusCode, 403);
assert.equal(blockedAdmin.payload.code, "password_change_required");

const changed = await request({
  method: "POST",
  url: "/api/auth/change-password",
  headers: {
    origin: "https://novapharmhealthcare.com",
    cookie: `np_csrf=${csrfCookie}; np_session=${sessionCookie}`,
    "x-csrf-token": csrfCookie,
    "content-type": "application/json"
  },
  body: JSON.stringify({ currentPassword: password, newPassword: permanentPassword, confirmation: permanentPassword })
});
assert.equal(changed.statusCode, 200);
assert.match(changed.headers["Set-Cookie"], /Secure/);
assert.ok(passwordRangeRequests.length >= 2);
assert.ok(passwordRangeRequests.every((entry) => /^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/.test(entry.url) && entry.padding === "true"));
assert.ok(passwordRangeRequests.every((entry) => !entry.url.includes(password) && !entry.url.includes(permanentPassword)));

const retiredLogin = await request({
  method: "POST",
  url: "/api/auth/login",
  headers: { origin: "https://novapharmhealthcare.com", cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/json" },
  body: JSON.stringify({ username, password, accessType: "board" })
});
assert.equal(retiredLogin.statusCode, 401);
const permanentLogin = await request({
  method: "POST",
  url: "/api/auth/login",
  headers: { origin: "https://novapharmhealthcare.com", cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/json" },
  body: JSON.stringify({ username, password: permanentPassword, accessType: "board" })
});
assert.equal(permanentLogin.statusCode, 200);
assert.equal(permanentLogin.payload.mustChangePassword, false);

const health = await request({ url: "/api/health" });
assert.equal(health.statusCode, 200);
assert.equal(health.payload.environment, "production");

rmSync(databasePath, { force: true });
rmSync(documentStoragePath, { force: true, recursive: true });
rmSync(process.env.SECURE_CONTENT_ROOT, { force: true, recursive: true });
globalThis.fetch = originalFetch;
console.log("Production security tests passed: one-time bootstrap, breach-range checking, forced password change, old-password rejection, HSTS, secure cookies, same-origin enforcement and health.");
