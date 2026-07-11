import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { Readable } from "node:stream";

const databasePath = "/tmp/novapharm-server-test.sqlite";
const documentStoragePath = "/tmp/novapharm-server-test-documents";
rmSync(databasePath, { force: true });
rmSync(documentStoragePath, { force: true, recursive: true });
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = databasePath;
process.env.DOCUMENT_STORAGE_ROOT = documentStoragePath;
process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
process.env.PORTAL_USERNAME = "IntegrationAdmin";
process.env.PORTAL_PASSWORD = "Test-Only-Strong-Password-9";
delete process.env.PORTAL_PASSWORD_HASH;
delete process.env.PORTAL_PASSWORD_SALT;

const { handleRequest } = await import("../server.mjs");
const { one } = await import("../src/data/database.mjs");

class TestRequest extends Readable {
  constructor({ method = "GET", url = "/", headers = {}, body = "" } = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = { host: "novapharm.test", ...headers };
    this.socket = { remoteAddress: "127.0.0.1" };
    if (body) this.push(Buffer.from(body));
    this.push(null);
  }
}

class TestResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = "";
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  end(body = "") {
    this.body += Buffer.isBuffer(body) ? body.toString("utf8") : String(body);
  }
}

async function request(options) {
  const response = new TestResponse();
  await handleRequest(new TestRequest(options), response);
  const contentType = response.headers["Content-Type"] || "";
  const payload = contentType.includes("application/json") ? JSON.parse(response.body || "{}") : response.body;
  return { ...response, payload };
}

function cookieValue(setCookie, name) {
  const match = String(setCookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

const csrfResponse = await request({ url: "/api/security/csrf" });
assert.equal(csrfResponse.statusCode, 200);
assert.match(csrfResponse.payload.csrfToken, /^[a-f0-9]{48}$/);
assert.equal(csrfResponse.headers["X-Content-Type-Options"], "nosniff");
assert.ok(!csrfResponse.headers["Content-Security-Policy"].includes("'unsafe-inline'"));
const csrfCookie = cookieValue(csrfResponse.headers["Set-Cookie"], "np_csrf");
assert.equal(csrfCookie, csrfResponse.payload.csrfToken);

const invalidLogin = await request({
  method: "POST",
  url: "/api/auth/login",
  headers: { cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/json" },
  body: JSON.stringify({ username: "IntegrationAdmin", password: "incorrect", accessType: "board" })
});
assert.equal(invalidLogin.statusCode, 401);

const login = await request({
  method: "POST",
  url: "/api/auth/login",
  headers: { cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/json" },
  body: JSON.stringify({ username: "IntegrationAdmin", password: "Test-Only-Strong-Password-9", accessType: "board" })
});
assert.equal(login.statusCode, 200);
assert.equal(login.payload.redirectTo, "/portal/executive-platform/");
const sessionCookie = cookieValue(login.headers["Set-Cookie"], "np_session");
assert.ok(sessionCookie.includes("."));

const session = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${sessionCookie}` } });
assert.equal(session.statusCode, 200);
assert.equal(session.payload.user.username, "IntegrationAdmin");
assert.equal(session.payload.user.role, "admin");
assert.ok(session.payload.user.accessScopes.includes("board"));

const contact = await request({
  method: "POST",
  url: "/api/contact",
  headers: { cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/json" },
  body: JSON.stringify({
    name: "Test Contact",
    email: "contact@example.test",
    company: "Test Healthcare Ltd",
    role: "Commercial Director",
    country: "United Kingdom",
    telephone: "+44 20 7000 0000",
    enquiryType: "Distribution partnership",
    message: "This is a controlled integration test for the corporate enquiry workflow.",
    consent: "yes",
    website: ""
  })
});
assert.equal(contact.statusCode, 201);
assert.ok(contact.payload.lead.id);
assert.equal(one("SELECT country FROM lead_details WHERE lead_id = ?", contact.payload.lead.id).country, "United Kingdom");

const application = await request({
  method: "POST",
  url: "/api/account-applications",
  headers: { cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/json" },
  body: JSON.stringify({
    email: "rp@example.test",
    company: { legalName: "Example Pharmacy Ltd", companyNumber: "12345678", customerType: "pharmacy" },
    responsiblePeople: [{ name: "Responsible Person", role: "Superintendent Pharmacist", email: "rp@example.test" }],
    addresses: [{ type: "registered", address: "1 Test Road", postcode: "AB1 2CD", country: "GB" }],
    compliance: { gdpStatus: "certified", insuranceStatus: "active", creditReferences: "Test credit reference", tradeReferences: "Test trade reference" },
    bank: { confirmationProvided: true }
  })
});
assert.equal(application.statusCode, 201);
assert.match(application.payload.application.applicationNumber, /^APP-\d{4}-\d{6}$/);

const uploadParameters = new URLSearchParams({ uploadToken: application.payload.application.uploadToken, fileName: "test-evidence.pdf", documentClass: "company_due_diligence" });
const uploadedDocument = await request({
  method: "POST",
  url: `/api/account-applications/${application.payload.application.id}/documents?${uploadParameters}`,
  headers: { cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/pdf" },
  body: Buffer.from("%PDF-1.4\nNovaPharm integration evidence\n")
});
assert.equal(uploadedDocument.statusCode, 201);
assert.equal(uploadedDocument.payload.document.lifecycleStatus, "draft");

const health = await request({ url: "/api/health" });
assert.equal(health.statusCode, 200);
assert.equal(health.payload.status, "ok");
assert.equal(health.payload.database, "ready");
assert.match(health.payload.version, /^\d+\.\d+\.\d+$/);

const logout = await request({
  method: "POST",
  url: "/api/auth/logout",
  headers: { cookie: `np_csrf=${csrfCookie}; np_session=${sessionCookie}`, "x-csrf-token": csrfCookie }
});
assert.equal(logout.statusCode, 200);
const expiredSession = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${sessionCookie}` } });
assert.equal(expiredSession.statusCode, 401);

assert.ok(one("SELECT COUNT(*) AS value FROM security_events").value >= 2);
assert.ok(one("SELECT COUNT(*) AS value FROM auth_sessions").value >= 1);

rmSync(databasePath, { force: true });
rmSync(documentStoragePath, { force: true, recursive: true });
console.log("Server integration tests passed: CSRF, authentication, persistent session, contact, onboarding upload, health and logout.");
