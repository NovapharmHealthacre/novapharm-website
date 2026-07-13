import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { Readable, Writable } from "node:stream";

const runId = `${process.pid}-${Date.now()}`;
const username = "PreviewAdmin";
const portalPassword = `Aa1!${randomBytes(24).toString("hex")}`;
const portalSalt = randomBytes(16).toString("hex");
const previewUsername = "reviewer";
const previewPassword = randomBytes(24).toString("base64url");
process.env.NODE_ENV = "production";
process.env.PREVIEW_MODE = "true";
process.env.PREVIEW_ACCESS_USERNAME = previewUsername;
process.env.PREVIEW_ACCESS_PASSWORD = previewPassword;
process.env.DATABASE_PATH = `/tmp/novapharm-preview-security-${runId}.sqlite`;
process.env.DOCUMENT_STORAGE_ROOT = `/tmp/novapharm-preview-documents-${runId}`;
process.env.SECURE_CONTENT_ROOT = `/tmp/novapharm-preview-content-${runId}`;
process.env.SESSION_SECRET = randomBytes(36).toString("base64url");
process.env.HOST = "0.0.0.0";
process.env.PUBLIC_ORIGIN = "https://preview.example.test";
process.env.PUBLIC_API_ORIGIN = "https://preview.example.test";
process.env.SITE_URL = "https://preview.example.test";
process.env.PORTAL_USERNAME = username;
process.env.PORTAL_DISPLAY_NAME = "Preview Administrator";
process.env.PORTAL_PASSWORD_SALT = portalSalt;
process.env.PORTAL_PASSWORD_HASH = pbkdf2Sync(portalPassword, portalSalt, 210000, 32, "sha256").toString("hex");
process.env.PORTAL_PASSWORD = "";
process.env.PORTAL_USERS_JSON = "";
process.env.BOOTSTRAP_ADMIN_PASSWORD = "";

const { handleRequest } = await import("../server.mjs");

class TestRequest extends Readable {
  constructor({ url = "/", headers = {} } = {}) {
    super();
    this.method = "GET";
    this.url = url;
    this.headers = { host: "preview.example.test", ...headers };
    this.socket = { remoteAddress: "127.0.0.1" };
    this.push(null);
  }
}

class TestResponse extends Writable {
  constructor() { super(); this.statusCode = 200; this.headers = {}; this.chunks = []; this.headersSent = false; }
  writeHead(statusCode, headers = {}) { this.statusCode = statusCode; this.headers = headers; this.headersSent = true; return this; }
  _write(chunk, encoding, callback) { this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)); callback(); }
  get body() { return Buffer.concat(this.chunks).toString("utf8"); }
}

async function request(options) {
  const response = new TestResponse();
  await handleRequest(new TestRequest(options), response);
  return response;
}

const unauthorised = await request({ url: "/" });
assert.equal(unauthorised.statusCode, 401);
assert.match(unauthorised.headers["WWW-Authenticate"], /NovaPharm private preview/);
assert.match(unauthorised.headers["X-Robots-Tag"], /noindex/);
const invalid = await request({ url: "/", headers: { authorization: `Basic ${Buffer.from(`${previewUsername}:incorrect`).toString("base64")}` } });
assert.equal(invalid.statusCode, 401);
const authorised = await request({ url: "/", headers: { authorization: `Basic ${Buffer.from(`${previewUsername}:${previewPassword}`).toString("base64")}`, accept: "text/html" } });
assert.equal(authorised.statusCode, 200);
assert.match(authorised.headers["X-Robots-Tag"], /noindex, nofollow, noarchive/);
const robots = await request({ url: "/robots.txt" });
assert.equal(robots.statusCode, 200);
assert.equal(robots.body, "User-agent: *\nDisallow: /\n");
const health = await request({ url: "/api/health" });
assert.equal(health.statusCode, 200);

rmSync(process.env.DATABASE_PATH, { force: true });
rmSync(process.env.DOCUMENT_STORAGE_ROOT, { recursive: true, force: true });
rmSync(process.env.SECURE_CONTENT_ROOT, { recursive: true, force: true });
console.log("Preview security tests passed: private authentication gate, invalid-credential rejection, noindex headers, disallow-all robots and public health check.");
