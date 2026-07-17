import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { Readable, Writable } from "node:stream";

const runId = `${process.pid}-${Date.now()}`;
const databasePath = `/tmp/novapharm-server-test-${runId}.sqlite`;
const documentStoragePath = `/tmp/novapharm-server-test-documents-${runId}`;
const adminUsername = "IntegrationAdmin";
const adminPassword = randomBytes(24).toString("base64url");

function randomStrongPassword(prefix = "Aa1!") {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%^&*";
  const bytes = randomBytes(32);
  let value = prefix;
  for (let index = 0; index < bytes.length; index += 1) {
    let character = alphabet[(bytes[index] + index) % alphabet.length];
    if (value.endsWith(character.repeat(3))) character = alphabet[(bytes[index] + index + 1) % alphabet.length];
    value += character;
  }
  return value;
}

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
const { hashPassword, isKnownCompromisedPassword, provisionAuthUsers, provisionBootstrapAdmin, verifyCredentials } = await import("../src/core/auth-service.mjs");
const { activateCustomer, createProduct, setApplicationStatus } = await import("../src/core/domain-service.mjs");

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

async function provisionTestUser({ username, role, customerId = null }) {
  const password = randomBytes(24).toString("base64url");
  const passwordSalt = randomBytes(16).toString("hex");
  await provisionAuthUsers([{
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
  privacyAcknowledgement: "yes",
  safetyConfirmation: "yes",
  sourcePage: "/contact/",
  sourceCta: "distribution-partnership",
  attributionPayload: JSON.stringify({ campaign: { utm_source: "integration", utm_medium: "test", utm_campaign: "backend-activation" }, referringHost: "partner.example.test" }),
  website: ""
};

const invalidContact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({ ...validContact, email: "invalid", privacyAcknowledgement: "" }),
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
assert.match(contact.payload.lead.leadNumber, /^NP-LEAD-\d{4}-\d{6}$/);
const consentRecord = await one(`SELECT country, consent_at, privacy_notice_version, safety_confirmation_at,
  source_page, source_cta, utm_source, utm_medium, utm_campaign, network_fingerprint
  FROM lead_details WHERE lead_id = ?`, contact.payload.lead.id);
assert.equal(consentRecord.country, "United Kingdom");
assert.ok(consentRecord.consent_at);
assert.equal(consentRecord.privacy_notice_version, "2026-07-14-v1.1");
assert.ok(consentRecord.safety_confirmation_at);
assert.equal(consentRecord.source_page, "/contact/");
assert.equal(consentRecord.source_cta, "distribution-partnership");
assert.equal(consentRecord.utm_source, "integration");
assert.equal(consentRecord.utm_medium, "test");
assert.equal(consentRecord.utm_campaign, "backend-activation");
assert.match(consentRecord.network_fingerprint, /^[a-f0-9]{64}$/);

const restrictedSafetyContact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({ ...validContact, email: "safety@example.test", message: "I experienced a serious reaction after I took this medicine and need help." }),
  address: "127.0.0.50"
});
assert.equal(restrictedSafetyContact.statusCode, 400);
assert.equal(restrictedSafetyContact.payload.error.includes("Yellow Card"), true);

const leadCountBeforeDuplicate = (await one("SELECT COUNT(*) AS value FROM leads")).value;
const duplicateContact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify(validContact),
  address: "127.0.0.51"
});
assert.equal(duplicateContact.statusCode, 201);
assert.equal(duplicateContact.payload.lead.id, contact.payload.lead.id);
assert.equal(duplicateContact.payload.lead.leadNumber, contact.payload.lead.leadNumber);
assert.equal(duplicateContact.payload.lead.duplicate, true);
assert.equal((await one("SELECT COUNT(*) AS value FROM leads")).value, leadCountBeforeDuplicate);

const leadCountBeforeSpam = (await one("SELECT COUNT(*) AS value FROM leads")).value;
const spamContact = await request({
  method: "POST",
  url: "/api/contact",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({ ...validContact, website: "https://spam.invalid" }),
  address: "127.0.0.6"
});
assert.equal(spamContact.statusCode, 201);
assert.equal(spamContact.payload.lead.id, null);
assert.equal((await one("SELECT COUNT(*) AS value FROM leads")).value, leadCountBeforeSpam);

process.env.RESEND_API_KEY = randomBytes(24).toString("base64url");
process.env.EMAIL_FROM = "NovaPharm Healthcare <website@example.test>";
process.env.CONTACT_NOTIFICATION_TO = "team@example.test";
const originalFetch = globalThis.fetch;
const failedEmailIdempotencyKeys = [];
globalThis.fetch = async (_url, options) => {
  failedEmailIdempotencyKeys.push(options.headers["Idempotency-Key"]);
  const message = JSON.parse(options.body);
  if (message.text.startsWith("New ")) assert.equal(message.text.includes(validContact.message), true);
  assert.equal(message.text.includes("NP-LEAD-"), true);
  return new Response("Provider unavailable", { status: 503 });
};
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
const failedNotifications = await one("SELECT COUNT(*) AS value FROM notifications WHERE entity_id = ? AND status = 'retrying' AND attempt_count = 1", emailFailureContact.payload.lead.id);
assert.equal(failedNotifications.value, 2);
assert.equal(new Set(failedEmailIdempotencyKeys).size, 2);

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

process.env.RESEND_API_KEY = randomBytes(24).toString("base64url");
process.env.EMAIL_FROM = "NovaPharm Healthcare <website@example.test>";
process.env.CONTACT_NOTIFICATION_TO = "team@example.test";
const applicationEmailRequests = [];
globalThis.fetch = async (_url, options) => {
  applicationEmailRequests.push(options);
  return new Response(JSON.stringify({ id: `application-email-${applicationEmailRequests.length}` }), { status: 200, headers: { "content-type": "application/json" } });
};
const application = await request({
  method: "POST",
  url: "/api/account-applications",
  headers: authHeaders(csrfCookie),
  body: JSON.stringify({
    email: "rp@example.test",
    submissionKey: "integration-account-submission-000001",
    expectedDocumentCount: 1,
    company: { legalName: "Example Pharmacy Ltd", companyNumber: "12345678", customerType: "pharmacy" },
    responsiblePeople: [{ name: "Responsible Person", role: "Superintendent Pharmacist", email: "rp@example.test" }],
    addresses: [{ type: "registered", address: "1 Test Road", postcode: "AB1 2CD", country: "GB" }],
    compliance: { gdpStatus: "certified", insuranceStatus: "active", creditReferences: "Test credit reference", tradeReferences: "Test trade reference" },
    bank: { confirmationProvided: true },
    applicantDeclaration: "yes",
    privacyAcknowledgement: "yes"
  }),
  address: "127.0.0.9"
});
globalThis.fetch = originalFetch;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.CONTACT_NOTIFICATION_TO;
assert.equal(application.statusCode, 201);
assert.match(application.payload.application.applicationNumber, /^APP-\d{4}-\d{6}$/);
assert.equal(application.payload.application.status, "documents_pending");
assert.match(application.payload.application.uploadToken, /^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/i);
assert.match(application.payload.application.resumeToken, /^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/i);
assert.equal(applicationEmailRequests.length, 2);
assert.equal((await one("SELECT COUNT(*) AS value FROM notifications WHERE entity_id = ? AND status = 'sent'", application.payload.application.id)).value, 2);

const uploadParameters = new URLSearchParams({
  fileName: "test-evidence.pdf",
  documentClass: "company_due_diligence"
});
const uploadedDocument = await request({
  method: "POST",
  url: `/api/account-applications/${application.payload.application.id}/documents?${uploadParameters}`,
  headers: {
    cookie: `np_csrf=${csrfCookie}`,
    "x-application-upload-token": application.payload.application.uploadToken,
    "x-csrf-token": csrfCookie,
    "content-type": "application/pdf"
  },
  body: Buffer.from("%PDF-1.4\nNovaPharm integration evidence\n"),
  address: "127.0.0.10"
});
assert.equal(uploadedDocument.statusCode, 201);
assert.equal(uploadedDocument.payload.document.lifecycleStatus, "draft");

const duplicateDocument = await request({
  method: "POST",
  url: `/api/account-applications/${application.payload.application.id}/documents?${uploadParameters}`,
  headers: {
    cookie: `np_csrf=${csrfCookie}`,
    "x-application-upload-token": application.payload.application.uploadToken,
    "x-csrf-token": csrfCookie,
    "content-type": "application/pdf"
  },
  body: Buffer.from("%PDF-1.4\nNovaPharm integration evidence\n"),
  address: "127.0.0.101"
});
assert.equal(duplicateDocument.statusCode, 200);
assert.equal(duplicateDocument.payload.document.duplicate, true);
assert.equal((await one(`SELECT COUNT(*) AS value FROM document_links WHERE entity_type = 'account_application' AND entity_id = ?`, application.payload.application.id)).value, 1);

const completedUploads = await request({
  method: "POST",
  url: `/api/account-applications/${application.payload.application.id}/documents/complete`,
  headers: {
    cookie: `np_csrf=${csrfCookie}`,
    "x-application-upload-token": application.payload.application.uploadToken,
    "x-csrf-token": csrfCookie
  },
  address: "127.0.0.102"
});
assert.equal(completedUploads.statusCode, 200);
assert.equal(completedUploads.payload.application.status, "submitted");

const reusedCompletedToken = await request({
  method: "POST",
  url: `/api/account-applications/${application.payload.application.id}/documents?${uploadParameters}`,
  headers: {
    cookie: `np_csrf=${csrfCookie}`,
    "x-application-upload-token": application.payload.application.uploadToken,
    "x-csrf-token": csrfCookie,
    "content-type": "application/pdf"
  },
  body: Buffer.from("%PDF-1.4\nReused token\n"),
  address: "127.0.0.103"
});
assert.equal(reusedCompletedToken.statusCode, 403);

const queryTokenRejected = await request({
  method: "POST",
  url: `/api/account-applications/${application.payload.application.id}/documents?${uploadParameters}&uploadToken=${encodeURIComponent(application.payload.application.uploadToken)}`,
  headers: { cookie: `np_csrf=${csrfCookie}`, "x-csrf-token": csrfCookie, "content-type": "application/pdf" },
  body: Buffer.from("%PDF-1.4\nQuery token rejection\n"),
  address: "127.0.0.11"
});
assert.equal(queryTokenRejected.statusCode, 403);

await assert.rejects(() => activateCustomer(application.payload.application.id, adminUsername), /Only an approved application/);
for (const status of ["under_initial_review", "compliance_review", "credit_review", "approved"]) {
  await setApplicationStatus(application.payload.application.id, status, adminUsername, `Integration transition to ${status}`);
}
const customer = await activateCustomer(application.payload.application.id, adminUsername);
assert.equal((await one("SELECT status FROM account_applications WHERE id = ?", application.payload.application.id)).status, "activated");
assert.equal((await one("SELECT COUNT(*) AS value FROM application_status_history WHERE application_id = ?", application.payload.application.id)).value, 7);
assert.equal((await one("SELECT COUNT(*) AS value FROM customer_contacts WHERE customer_id = ?", customer.id)).value, 1);
const customerPassword = await provisionTestUser({ username: "CustomerUser", role: "client", customerId: customer.id });
const employeePassword = await provisionTestUser({ username: "EmployeeUser", role: "employee" });
const boardPassword = await provisionTestUser({ username: "BoardUser", role: "board" });
const lockoutPassword = await provisionTestUser({ username: "LockoutUser", role: "employee" });

const controlledProduct = await createProduct({
  sku: "NPH-CUSTOMER-001",
  productName: "Customer-visible test product",
  listPriceMinor: 1000,
  mhraStatus: "approved",
  marketingStatus: "marketed",
  lifecycleStatus: "active"
}, adminUsername);
await createProduct({
  sku: "NPH-DRAFT-001",
  productName: "Internal draft test product",
  listPriceMinor: 1000,
  mhraStatus: "not_assessed",
  marketingStatus: "not_marketed",
  lifecycleStatus: "draft"
}, adminUsername);
assert.deepEqual(
  {
    regulatoryStatus: controlledProduct.regulatoryStatus,
    marketingStatus: controlledProduct.marketingStatus,
    mhraStatus: controlledProduct.mhraStatus,
    lifecycleStatus: controlledProduct.lifecycleStatus
  },
  {
    regulatoryStatus: "draft",
    marketingStatus: "not_marketed",
    mhraStatus: "not_assessed",
    lifecycleStatus: "draft"
  }
);

const customerLogin = await login({ username: "CustomerUser", password: customerPassword, accessType: "customer", csrfCookie, address: "127.0.0.11" });
const employeeLogin = await login({ username: "EmployeeUser", password: employeePassword, accessType: "employee", csrfCookie, address: "127.0.0.12" });
const boardLogin = await login({ username: "BoardUser", password: boardPassword, accessType: "board", csrfCookie, address: "127.0.0.13" });
const adminLogin = await login({ username: adminUsername, password: adminPassword, accessType: "admin", csrfCookie, address: "127.0.0.14" });
for (const result of [customerLogin, employeeLogin, boardLogin, adminLogin]) {
  assert.equal(result.statusCode, 200);
  assert.ok(result.sessionCookie.includes("."));
}
assert.equal(customerLogin.payload.redirectTo, "/portal/dashboard/");
assert.equal(employeeLogin.payload.redirectTo, "/employee/dashboard/");
assert.equal(boardLogin.payload.redirectTo, "/portal/executive-platform/");
assert.equal(adminLogin.payload.redirectTo, "/admin/dashboard/");

const wrongPortal = await login({ username: "CustomerUser", password: customerPassword, accessType: "employee", csrfCookie, address: "127.0.0.15" });
assert.equal(wrongPortal.statusCode, 403);

const customerPortalData = await request({ url: "/api/portal/data", headers: { cookie: `np_session=${customerLogin.sessionCookie}` }, address: "127.0.0.16" });
assert.equal(customerPortalData.statusCode, 200);
assert.equal(customerPortalData.payload.dashboard.account.id, customer.id);
assert.equal(customerPortalData.payload.integrations, undefined);
const customerProducts = await request({ url: "/api/catalog/products", headers: { cookie: `np_session=${customerLogin.sessionCookie}` }, address: "127.0.0.17" });
assert.equal(customerProducts.statusCode, 200);
assert.deepEqual(customerProducts.payload.products, []);

await run(`UPDATE products
  SET regulatory_status = 'approved', marketing_status = 'marketed', mhra_status = 'approved',
      lifecycle_status = 'active', updated_at = ?, updated_by = ?
  WHERE id = ?`, new Date().toISOString(), adminUsername, controlledProduct.id);
const approvedCustomerProducts = await request({ url: "/api/catalog/products", headers: { cookie: `np_session=${customerLogin.sessionCookie}` }, address: "127.0.0.171" });
assert.equal(approvedCustomerProducts.statusCode, 200);
assert.deepEqual(approvedCustomerProducts.payload.products.map((product) => product.sku), ["NPH-CUSTOMER-001"]);

const customerEmployeeApi = await request({ url: "/api/customers", headers: { cookie: `np_session=${customerLogin.sessionCookie}` }, address: "127.0.0.18" });
assert.equal(customerEmployeeApi.statusCode, 403);
const employeeCustomers = await request({ url: "/api/customers", headers: { cookie: `np_session=${employeeLogin.sessionCookie}` }, address: "127.0.0.19" });
assert.equal(employeeCustomers.statusCode, 200);
const boardAdminApi = await request({ url: "/api/admin/summary", headers: { cookie: `np_session=${boardLogin.sessionCookie}` }, address: "127.0.0.20" });
assert.equal(boardAdminApi.statusCode, 403);
const adminSummary = await request({ url: "/api/admin/summary", headers: { cookie: `np_session=${adminLogin.sessionCookie}` }, address: "127.0.0.21" });
assert.equal(adminSummary.statusCode, 200);
assert.equal(adminSummary.payload.emailQueue.states.find((state) => state.status === "retrying").count, 2);
assert.equal(adminSummary.payload.metrics.emailDeliveryAttention, 2);

const retryWithoutCsrf = await request({
  method: "POST",
  url: "/api/integrations/email/retries",
  headers: { cookie: `np_session=${adminLogin.sessionCookie}` },
  address: "127.0.0.211"
});
assert.equal(retryWithoutCsrf.statusCode, 403);
await run("UPDATE notifications SET next_attempt_at = ? WHERE entity_id = ? AND status = 'retrying'", new Date(Date.now() - 1000).toISOString(), emailFailureContact.payload.lead.id);
process.env.RESEND_API_KEY = randomBytes(24).toString("base64url");
process.env.EMAIL_FROM = "NovaPharm Healthcare <website@example.test>";
process.env.CONTACT_NOTIFICATION_TO = "team@example.test";
const retryIdempotencyKeys = [];
globalThis.fetch = async (_url, options) => {
  retryIdempotencyKeys.push(options.headers["Idempotency-Key"]);
  return new Response(JSON.stringify({ id: `retry-email-${retryIdempotencyKeys.length}` }), { status: 200, headers: { "content-type": "application/json" } });
};
const retriedEmails = await request({
  method: "POST",
  url: "/api/integrations/email/retries",
  headers: authHeaders(csrfCookie, adminLogin.sessionCookie),
  address: "127.0.0.212"
});
globalThis.fetch = originalFetch;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.CONTACT_NOTIFICATION_TO;
assert.equal(retriedEmails.statusCode, 200);
assert.equal(retriedEmails.payload.processed, 2);
assert.equal(retriedEmails.payload.sent, 2);
assert.deepEqual(retryIdempotencyKeys.sort(), failedEmailIdempotencyKeys.sort());
assert.equal((await one("SELECT COUNT(*) AS value FROM notifications WHERE entity_id = ? AND status = 'sent' AND attempt_count = 2", emailFailureContact.payload.lead.id)).value, 2);

const bootstrapPassword = randomStrongPassword("Aa1!");
const compromisedCandidate = randomStrongPassword("Cc3!");
const compromisedDigest = createHash("sha1").update(compromisedCandidate).digest("hex").toUpperCase();
let paddingHeaderSeen = false;
assert.equal(await isKnownCompromisedPassword(compromisedCandidate, {
  required: true,
  fetchImplementation: async (_url, options) => {
    paddingHeaderSeen = options.headers["Add-Padding"] === "true";
    return new Response(`${compromisedDigest.slice(5)}:27\n00000000000000000000000000000000000:0`, { status: 200 });
  }
}), true);
assert.equal(paddingHeaderSeen, true);
const bootstrapEnvironment = {
  PORTAL_USERNAME: "Vishal",
  PORTAL_DISPLAY_NAME: "Vishal Chakravarty",
  BOOTSTRAP_ADMIN_PASSWORD: bootstrapPassword
};
const bootstrapResult = await provisionBootstrapAdmin(bootstrapEnvironment);
assert.equal(bootstrapResult.status, "created");
assert.equal(bootstrapEnvironment.BOOTSTRAP_ADMIN_PASSWORD, undefined);
const bootstrapIdentity = await one("SELECT role, display_name FROM users WHERE username = ?", "Vishal");
assert.equal(bootstrapIdentity.role, "admin");
assert.equal(bootstrapIdentity.display_name, "Vishal Chakravarty");
assert.deepEqual(
  (await one("SELECT group_concat(scope, ',') AS scopes FROM (SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope)", "Vishal")).scopes.split(","),
  ["admin", "board", "customer", "employee"]
);

const bootstrapLogin = await login({ username: "Vishal", password: bootstrapPassword, accessType: "admin", csrfCookie, address: "127.0.3.1" });
const secondBootstrapLogin = await login({ username: "Vishal", password: bootstrapPassword, accessType: "customer", csrfCookie, address: "127.0.3.2" });
assert.equal(bootstrapLogin.statusCode, 200);
assert.equal(bootstrapLogin.payload.mustChangePassword, true);
assert.equal(bootstrapLogin.payload.redirectTo, "/portal/change-password/");
assert.equal(secondBootstrapLogin.statusCode, 200);

const forcedPasswordPage = await request({ url: "/admin/dashboard/", headers: { cookie: `np_session=${bootstrapLogin.sessionCookie}`, accept: "text/html" }, address: "127.0.3.3" });
assert.equal(forcedPasswordPage.statusCode, 302);
assert.equal(forcedPasswordPage.headers.Location, "/portal/change-password/");
const changePage = await request({ url: "/portal/change-password/", headers: { cookie: `np_session=${bootstrapLogin.sessionCookie}`, accept: "text/html" }, address: "127.0.3.4" });
assert.equal(changePage.statusCode, 200);
assert.match(changePage.body, /Create your permanent password/);

const passwordChangeWithoutCsrf = await request({
  method: "POST",
  url: "/api/auth/change-password",
  headers: { cookie: `np_session=${bootstrapLogin.sessionCookie}`, "content-type": "application/json" },
  body: JSON.stringify({ currentPassword: bootstrapPassword, newPassword: "unused", confirmation: "unused" }),
  address: "127.0.3.5"
});
assert.equal(passwordChangeWithoutCsrf.statusCode, 403);

const weakPasswordChange = await request({
  method: "POST",
  url: "/api/auth/change-password",
  headers: authHeaders(csrfCookie, bootstrapLogin.sessionCookie),
  body: JSON.stringify({ currentPassword: bootstrapPassword, newPassword: "TooShort1!", confirmation: "TooShort1!" }),
  address: "127.0.3.6"
});
assert.equal(weakPasswordChange.statusCode, 400);

const wrongCurrentPassword = await request({
  method: "POST",
  url: "/api/auth/change-password",
  headers: authHeaders(csrfCookie, bootstrapLogin.sessionCookie),
  body: JSON.stringify({ currentPassword: `Wrong1!${randomBytes(16).toString("hex")}`, newPassword: `Bb2!${randomBytes(24).toString("hex")}`, confirmation: `Bb2!${randomBytes(24).toString("hex")}` }),
  address: "127.0.3.7"
});
assert.equal(wrongCurrentPassword.statusCode, 401);

const permanentPassword = randomStrongPassword("Zz9!");
const passwordChanged = await request({
  method: "POST",
  url: "/api/auth/change-password",
  headers: authHeaders(csrfCookie, bootstrapLogin.sessionCookie),
  body: JSON.stringify({ currentPassword: bootstrapPassword, newPassword: permanentPassword, confirmation: permanentPassword }),
  address: "127.0.3.8"
});
assert.equal(passwordChanged.statusCode, 200);
const replacementSessionCookie = cookieValue(passwordChanged.headers["Set-Cookie"], "np_session");
assert.ok(replacementSessionCookie.includes("."));
assert.equal((await request({ url: "/api/portal/session", headers: { cookie: `np_session=${bootstrapLogin.sessionCookie}` }, address: "127.0.3.9" })).statusCode, 401);
assert.equal((await request({ url: "/api/portal/session", headers: { cookie: `np_session=${secondBootstrapLogin.sessionCookie}` }, address: "127.0.3.10" })).statusCode, 401);
const replacementSession = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${replacementSessionCookie}` }, address: "127.0.3.11" });
assert.equal(replacementSession.statusCode, 200);
assert.equal(replacementSession.payload.user.mustChangePassword, false);
assert.equal((await login({ username: "Vishal", password: bootstrapPassword, accessType: "board", csrfCookie, address: "127.0.3.12" })).statusCode, 401);
assert.equal((await login({ username: "Vishal", password: permanentPassword, accessType: "board", csrfCookie, address: "127.0.3.13" })).statusCode, 200);

const staleSalt = randomBytes(16).toString("hex");
await provisionAuthUsers([{
  username: "Vishal",
  displayName: "Vishal Chakravarty",
  role: "admin",
  passwordHash: hashPassword(randomStrongPassword("Stale1!"), staleSalt),
  passwordSalt: staleSalt,
  accessScopes: ["customer", "employee", "board", "admin"],
  customerId: null
}]);
assert.ok(await verifyCredentials("Vishal", permanentPassword));
assert.equal((await one("SELECT must_change_password FROM auth_credentials WHERE username = ?", "Vishal")).must_change_password, 0);
assert.ok(await one("SELECT id FROM security_events WHERE username = ? AND event_type = 'password.changed'", "Vishal"));

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
  ["/portal/ceo-dashboard/", boardLogin.sessionCookie, 200],
  ["/portal/executive-platform/NP_Hub.html", boardLogin.sessionCookie, 200],
  ["/admin/dashboard/", boardLogin.sessionCookie, 302],
  ["/portal/dashboard/", adminLogin.sessionCookie, 200],
  ["/employee/dashboard/", adminLogin.sessionCookie, 200],
  ["/portal/executive-platform/", adminLogin.sessionCookie, 200],
  ["/portal/ceo-dashboard/", adminLogin.sessionCookie, 200],
  ["/admin/dashboard/", adminLogin.sessionCookie, 200]
]) {
  const protectedResponse = await request({ url, headers: { cookie: `np_session=${sessionCookie}`, accept: "text/html" }, address: "127.0.0.23" });
  assert.equal(protectedResponse.statusCode, expected, `${url} returned ${protectedResponse.statusCode}`);
}

for (const url of ["/portal/executive-platform/", "/portal/ceo-dashboard/", "/portal/executive-platform/NP_Hub.html", "/docs/NP_Implementation_Blueprint_v2.pdf"]) {
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
await run("UPDATE auth_sessions SET expires_at = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), expiringSessionId);
const expiredSession = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${expiringLogin.sessionCookie}` }, address: "127.0.0.27" });
assert.equal(expiredSession.statusCode, 401);

const idleLogin = await login({ username: "EmployeeUser", password: employeePassword, accessType: "employee", csrfCookie, address: "127.0.0.28" });
const idleSessionId = idleLogin.sessionCookie.split(".")[0];
await run("UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?", new Date(Date.now() - 31 * 60 * 1000).toISOString(), idleSessionId);
const idleSession = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${idleLogin.sessionCookie}` }, address: "127.0.0.29" });
assert.equal(idleSession.statusCode, 401);

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
assert.ok((await one("SELECT locked_until FROM auth_credentials WHERE username = ?", "LockoutUser")).locked_until);

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

assert.ok((await one("SELECT COUNT(*) AS value FROM security_events")).value >= 15);
assert.ok((await one("SELECT COUNT(*) AS value FROM auth_sessions")).value >= 5);

rmSync(databasePath, { force: true });
rmSync(documentStoragePath, { force: true, recursive: true });
console.log("Server integration tests passed: CSRF, contact controls, idempotent email retry, account acknowledgement, onboarding, all portal roles, bootstrap and forced password change, session invalidation, scope boundaries, protected files, absolute and inactivity expiry, lockout, health and logout.");
