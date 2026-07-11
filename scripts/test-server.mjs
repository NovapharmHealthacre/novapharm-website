import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { Readable, Writable } from "node:stream";

const runId = `${process.pid}-${Date.now()}`;
const databasePath = `/tmp/novapharm-server-test-${runId}.sqlite`;
const documentStoragePath = `/tmp/novapharm-server-test-documents-${runId}`;
const adminUsername = "IntegrationAdmin";
const adminPassword = randomBytes(24).toString("base64url");

rmSync(databasePath, { force: true });
rmSync(documentStoragePath, { force: true, recursive: true });
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = databasePath;
process.env.DOCUMENT_STORAGE_ROOT = documentStoragePath;
process.env.SESSION_SECRET = randomBytes(36).toString("base64url");
process.env.PORTAL_USERNAME = adminUsername;
process.env.PORTAL_PASSWORD = adminPassword;
delete process.env.PORTAL_PASSWORD_HASH;
delete process.env.PORTAL_PASSWORD_SALT;
delete process.env.PORTAL_USERS_JSON;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.CONTACT_NOTIFICATION_TO;

const { handleRequest } = await import("../server.mjs");
const { one, run } = await import("../src/data/database.mjs");
const { hashPassword, provisionAuthUsers } = await import("../src/core/auth-service.mjs");
const { activateCustomer, createProduct } = await import("../src/core/domain-service.mjs");

class TestRequest extends Readable {
  constructor({ method = "GET", url = "/", headers = {}, body = "", address = "127.0.0.1" } = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = { host: "novapharm.test", ...headers };
    this.socket = { remoteAddress: address };
    if (body) this.push(Buffer.isBuffer(body) ? body : Buffer.from(body));
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
  const contentType = response.headers["Content-Type"] || "";
  const body = response.body;
  const payload = contentType.includes("application/json") ? JSON.parse(body || "{}") : body;
  return { statusCode: response.statusCode, headers: response.headers, body, payload };
}

function cookieValue(setCookie, name) {
  const match = String(setCookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function authHeaders(csrfCookie, sessionCookie = "") {
  return {
    cookie: `np_csrf=${csrfCookie}${sessionCookie ? `; np_session=${sessionCookie}` : ""}`,
    "x-csrf-token": csrfCookie,
    "content-type": "application/json"
  };
}

async function login({ username, password, accessType, csrfCookie, address }) {
  const response = await request({
    method: "POST",
    url: "/api/auth/login",
    headers: authHeaders(csrfCookie),
    body: JSON.stringify({ username, password, accessType }),
    address
  });
  return { ...response, sessionCookie: cookieValue(response.headers["Set-Cookie"], "np_session") };
}

function provisionTestUser({ username, role, customerId = null }) {
  const password = randomBytes(24).toString("base64url");
  const passwordSalt = randomBytes(16).toString("hex");
  provisionAuthUsers([{
    username,
    displayName: username,
    role,
    passwordHash: hashPassword(password, passwordSalt),
    passwordSalt,
    accessScopes: role === "client" ? ["customer"] : [role],
    customerId
  }]);
  return password;
}

const csrfResponse = await request({ url: "/api/security/csrf" });
assert.equal(csrfResponse.statusCode, 200);
assert.match(csrfResponse.payload.csrfToken, /^[a-f0-9]{48}$/);
assert.equal(csrfResponse.headers["X-Content-Type-Options"], "nosniff");
assert.ok(!csrfResponse.headers["Content-Security-Policy"].includes("'unsafe-inline'"));
const csrfCookie = cookieValue(csrfResponse.headers["Set-Cookie"], "np_csrf");
assert.equal(csrfCookie, csrfResponse.payload.csrfToken);

const missingCsrf = await request({
  method: "POST",
  url: "/api/contact",
  headers: { "content-type": "application/json" },
  body: "{}",
  address: "127.0.0.2"
});
assert.equal(missingCsrf.statusCode, 403);

const invalidLogin = await login({
  username: adminUsername,
  password: randomBytes(18).toString("hex"),
  accessType: "board",
  csrfCookie,
  address: "127.0.0.3"
});
assert.equal(invalidLogin.statusCode, 401);

const validContact = {
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
};

const invalidContact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({ ...validContact, email: "invalid", consent: "" }),
  address: "127.0.0.4"
});
assert.equal(invalidContact.statusCode, 400);

const contact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify(validContact),
  address: "127.0.0.5"
});
assert.equal(contact.statusCode, 201);
assert.ok(contact.payload.lead.id);
const consentRecord = one("SELECT country, consent_at FROM lead_details WHERE lead_id = ?", contact.payload.lead.id);
assert.equal(consentRecord.country, "United Kingdom");
assert.ok(consentRecord.consent_at);

const leadCountBeforeSpam = one("SELECT COUNT(*) AS value FROM leads").value;
const spamContact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({ ...validContact, website: "https://spam.invalid" }),
  address: "127.0.0.6"
});
assert.equal(spamContact.statusCode, 201);
assert.equal(spamContact.payload.lead.id, null);
assert.equal(one("SELECT COUNT(*) AS value FROM leads").value, leadCountBeforeSpam);

process.env.RESEND_API_KEY = randomBytes(24).toString("base64url");
process.env.EMAIL_FROM = "NovaPharm Healthcare <website@example.test>";
process.env.CONTACT_NOTIFICATION_TO = "team@example.test";
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response("Provider unavailable", { status: 503 });
const emailFailureContact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({ ...validContact, email: "delivery-failure@example.test" }),
  address: "127.0.0.7"
});
globalThis.fetch = originalFetch;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.CONTACT_NOTIFICATION_TO;
assert.equal(emailFailureContact.statusCode, 201);
assert.equal(one("SELECT status FROM notifications WHERE entity_id = ? ORDER BY created_at DESC LIMIT 1", emailFailureContact.payload.lead.id).status, "failed");

for (let index = 0; index < 12; index += 1) {
  const allowed = await request({
    method: "POST",
    url: "/api/contact",
    headers: authHeaders(csrfCookie),
    body: JSON.stringify({ ...validContact, website: "automated-submission" }),
    address: "127.0.0.8"
  });
  assert.equal(allowed.statusCode, 201);
}
const contactRateLimited = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({ ...validContact, website: "automated-submission" }),
  address: "127.0.0.8"
});
assert.equal(contactRateLimited.statusCode, 429);

const application = await request({
  method: "POST",
  url: "/api/account-applications",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({
    email: "rp@example.test",
    company: { legalName: "Example Pharmacy Ltd", companyNumber: "12345678", customerType: "pharmacy" },
    responsiblePeople: [{ name: "Responsible Person", role: "Superintendent Pharmacist", email: "rp@example.test" }],
    addresses: [{ type: "registered", address: "1 Test Road", postcode: "AB1 2CD", country: "GB" }],
    compliance: { gdpStatus: "certified", insuranceStatus: "active", creditReferences: "Test credit reference", tradeReferences: "Test trade reference" },
    bank: { confirmationProvided: true }
  }),
  address: "127.0.0.9"
});
assert.equal(application.statusCode, 201);
assert.match(application.payload.application.applicationNumber, /^APP-\d{4}-\d{6}$/);

const uploadParameters = new URLSearchParams({
  uploadToken: application.payload.application.uploadToken,
  fileName: "test-evidence.pdf",
  documentClass: "company_due_diligence"
});
const uploadedDocument = await request({
  method: "POST",
  url: `/api/account-applications/${application.payload.application.id}/documents?${uploadParameters}`,
  headers: { cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/pdf" },
  body: Buffer.from("%PDF-1.4\nNovaPharm integration evidence\n"),
  address: "127.0.0.10"
});
assert.equal(uploadedDocument.statusCode, 201);
assert.equal(uploadedDocument.payload.document.lifecycleStatus, "draft");

const customer = activateCustomer(application.payload.application.id, adminUsername);
const customerPassword = provisionTestUser({ username: "CustomerUser", role: "client", customerId: customer.id });
const employeePassword = provisionTestUser({ username: "EmployeeUser", role: "employee" });
const boardPassword = provisionTestUser({ username: "BoardUser", role: "board" });
const lockoutPassword = provisionTestUser({ username: "LockoutUser", role: "employee" });

createProduct({
  sku: "NPH-CUSTOMER-001",
  productName: "Customer-visible test product",
  listPriceMinor: 1000,
  mhraStatus: "approved",
  marketingStatus: "marketed",
  lifecycleStatus: "active"
}, adminUsername);
createProduct({
  sku: "NPH-DRAFT-001",
  productName: "Internal draft test product",
  listPriceMinor: 1000,
  mhraStatus: "not_assessed",
  marketingStatus: "not_marketed",
  lifecycleStatus: "draft"
}, adminUsername);

const customerLogin = await login({ username: "CustomerUser", password: customerPassword, accessType: "customer", csrfCookie, address: "127.0.0.11" });
const employeeLogin = await login({ username: "EmployeeUser", password: employeePassword, accessType: "employee", csrfCookie, address: "127.0.0.12" });
const boardLogin = await login({ username: "BoardUser", password: boardPassword, accessType: "board", csrfCookie, address: "127.0.0.13" });
const adminLogin = await login({ username: adminUsername, password: adminPassword, accessType: "board", csrfCookie, address: "127.0.0.14" });
for (const result of [customerLogin, employeeLogin, boardLogin, adminLogin]) {
  assert.equal(result.statusCode, 200);
  assert.ok(result.sessionCookie.includes("."));
}
assert.equal(customerLogin.payload.redirectTo, "/portal/dashboard/");
assert.equal(employeeLogin.payload.redirectTo, "/employee/dashboard/");
assert.equal(boardLogin.payload.redirectTo, "/portal/executive-platform/");
assert.equal(adminLogin.payload.redirectTo, "/portal/executive-platform/");

const wrongPortal = await login({ username: "CustomerUser", password: customerPassword, accessType: "employee", csrfCookie, address: "127.0.0.15" });
assert.equal(wrongPortal.statusCode, 403);

const customerPortalData = await request({ url: "/api/portal/data", headers: { cookie: `np_session=${customerLogin.sessionCookie}` }, address: "127.0.0.16" });
assert.equal(customerPortalData.statusCode, 200);
assert.equal(customerPortalData.payload.dashboard.account.id, customer.id);
assert.equal(customerPortalData.payload.integrations, undefined);
const customerProducts = await request({ url: "/api/catalog/products", headers: { cookie: `np_session=${customerLogin.sessionCookie}` }, address: "127.0.0.17" });
assert.equal(customerProducts.statusCode, 200);
assert.deepEqual(customerProducts.payload.products.map((product) => product.sku), ["NPH-CUSTOMER-001"]);

const customerEmployeeApi = await request({ url: "/api/customers", headers: { cookie: `np_session=${customerLogin.sessionCookie}` }, address: "127.0.0.18" });
assert.equal(customerEmployeeApi.statusCode, 403);
const employeeCustomers = await request({ url: "/api/customers", headers: { cookie: `np_session=${employeeLogin.sessionCookie}` }, address: "127.0.0.19" });
assert.equal(employeeCustomers.statusCode, 200);
const boardAdminApi = await request({ url: "/api/admin/summary", headers: { cookie: `np_session=${boardLogin.sessionCookie}` }, address: "127.0.0.20" });
assert.equal(boardAdminApi.statusCode, 403);
const adminSummary = await request({ url: "/api/admin/summary", headers: { cookie: `np_session=${adminLogin.sessionCookie}` }, address: "127.0.0.21" });
assert.equal(adminSummary.statusCode, 200);

const privateUploadRejected = await request({
  method: "POST",
  url: "/api/documents/upload?fileName=other.pdf&documentClass=general&entityType=customer&entityId=another-customer",
  headers: { cookie: `np_csrf=${csrfCookie}; np_session=${customerLogin.sessionCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/pdf" },
  body: Buffer.from("%PDF-1.4\nUnauthorised test\n"),
  address: "127.0.0.22"
});
assert.equal(privateUploadRejected.statusCode, 403);

for (const [url, sessionCookie, expected] of [
  ["/portal/dashboard/", customerLogin.sessionCookie, 200],
  ["/employee/dashboard/", customerLogin.sessionCookie, 302],
  ["/employee/dashboard/", employeeLogin.sessionCookie, 200],
  ["/portal/dashboard/", employeeLogin.sessionCookie, 302],
  ["/portal/executive-platform/", boardLogin.sessionCookie, 200],
  ["/admin/dashboard/", boardLogin.sessionCookie, 302],
  ["/portal/dashboard/", adminLogin.sessionCookie, 200],
  ["/employee/dashboard/", adminLogin.sessionCookie, 200],
  ["/portal/executive-platform/", adminLogin.sessionCookie, 200],
  ["/admin/dashboard/", adminLogin.sessionCookie, 200]
]) {
  const protectedResponse = await request({ url, headers: { cookie: `np_session=${sessionCookie}`, accept: "text/html" }, address: "127.0.0.23" });
  assert.equal(protectedResponse.statusCode, expected, `${url} returned ${protectedResponse.statusCode}`);
}

for (const url of ["/portal/executive-platform/", "/docs/NP_Implementation_Blueprint_v2.pdf"]) {
  const unauthenticated = await request({ url, headers: { accept: "text/html" }, address: "127.0.0.24" });
  assert.equal(unauthenticated.statusCode, 302);
  assert.equal(unauthenticated.headers.Location, "/portal/");
}
for (const url of ["/_secure/executive-platform/NP_Hub.html", "/architecture/master-data-model.md", "/data/novapharm.sqlite", "/Dockerfile", "/render.yaml"]) {
  const blocked = await request({ url, address: "127.0.0.25" });
  assert.equal(blocked.statusCode, 404);
}

const expiringLogin = await login({ username: "EmployeeUser", password: employeePassword, accessType: "employee", csrfCookie, address: "127.0.0.26" });
const expiringSessionId = expiringLogin.sessionCookie.split(".")[0];
run("UPDATE auth_sessions SET expires_at = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), expiringSessionId);
const expiredSession = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${expiringLogin.sessionCookie}` }, address: "127.0.0.27" });
assert.equal(expiredSession.statusCode, 401);

for (let index = 0; index < 8; index += 1) {
  const failed = await login({
    username: "LockoutUser",
    password: randomBytes(18).toString("hex"),
    accessType: "employee",
    csrfCookie,
    address: `127.0.1.${index + 1}`
  });
  assert.equal(failed.statusCode, 401);
}
const lockedLogin = await login({ username: "LockoutUser", password: lockoutPassword, accessType: "employee", csrfCookie, address: "127.0.1.20" });
assert.equal(lockedLogin.statusCode, 401);
assert.ok(one("SELECT locked_until FROM auth_credentials WHERE username = ?", "LockoutUser").locked_until);

let finalRateLimitResponse;
for (let index = 0; index < 9; index += 1) {
  finalRateLimitResponse = await login({
    username: `UnknownUser${index}`,
    password: randomBytes(18).toString("hex"),
    accessType: "customer",
    csrfCookie,
    address: "127.0.2.1"
  });
}
assert.equal(finalRateLimitResponse.statusCode, 429);

const health = await request({ url: "/api/health" });
assert.equal(health.statusCode, 200);
assert.equal(health.payload.status, "ok");
assert.equal(health.payload.database, "ready");
assert.match(health.payload.version, /^\d+\.\d+\.\d+$/);

const logout = await request({
  method: "POST",
  url: "/api/auth/logout",
  headers: authHeaders(csrfCookie, adminLogin.sessionCookie),
  address: "127.0.0.28"
});
assert.equal(logout.statusCode, 200);
const revokedSession = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${adminLogin.sessionCookie}` } });
assert.equal(revokedSession.statusCode, 401);

assert.ok(one("SELECT COUNT(*) AS value FROM security_events").value >= 15);
assert.ok(one("SELECT COUNT(*) AS value FROM auth_sessions").value >= 5);

rmSync(databasePath, { force: true });
rmSync(documentStoragePath, { force: true, recursive: true });
console.log("Server integration tests passed: CSRF, contact validation/consent/spam/rate limits/email failure, onboarding uploads, all portal roles, scope boundaries, protected files, expiry, lockout, health and logout.");
