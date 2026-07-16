import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Readable, Writable } from "node:stream";

const runId = `${process.pid}-${Date.now()}`;
const protectedRoot = `/tmp/novapharm-local-owner-${runId}`;
const runtimeRoot = `${protectedRoot}/local-portal`;
const databasePath = `${runtimeRoot}/novapharm-local.sqlite`;
const documentRoot = `${runtimeRoot}/documents`;
const credentialFile = `${protectedRoot}/local-portal-credentials.txt`;
const credentialLauncher = `${protectedRoot}/show-local-portal-credentials.command`;
const username = "vishal@novapharmhealthcare.com";
const temporaryPassword = `N9!${randomBytes(30).toString("base64url")}zA`;
const permanentPassword = `Q7!${randomBytes(31).toString("base64url")}mB`;
const origin = "http://127.0.0.1:4173";

rmSync(protectedRoot, { recursive: true, force: true });
mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
writeFileSync(credentialFile, "Protected synthetic credential handoff\n", { mode: 0o600 });
writeFileSync(credentialLauncher, "#!/bin/zsh\n", { mode: 0o700 });
chmodSync(credentialFile, 0o600);
chmodSync(credentialLauncher, 0o700);

Object.assign(process.env, {
  NODE_ENV: "test",
  LOCAL_PORTAL_MODE: "true",
  HOST: "127.0.0.1",
  PORT: "4173",
  SITE_URL: origin,
  PUBLIC_ORIGIN: origin,
  PUBLIC_API_ORIGIN: origin,
  DATABASE_PROVIDER: "sqlite",
  DATABASE_PATH: databasePath,
  DATABASE_BACKUP_ROOT: `${runtimeRoot}/backups`,
  DOCUMENT_STORAGE_PROVIDER: "local-validation",
  DOCUMENT_STORAGE_ROOT: documentRoot,
  LOCAL_VALIDATION_SCAN_RESULT: "clean",
  SECURE_CONTENT_ROOT: resolve("_secure"),
  SESSION_SECRET: randomBytes(48).toString("base64url"),
  SESSION_TTL_MS: String(8 * 60 * 60 * 1000),
  SESSION_IDLE_TIMEOUT_MS: String(30 * 60 * 1000),
  EMAIL_PROVIDER: "local-capture",
  EMAIL_FROM: "NovaPharm Local Validation <no-send@local.novapharm.invalid>",
  CONTACT_NOTIFICATION_TO: "owner-review@local.novapharm.invalid",
  ENTRA_AUTH_ENABLED: "false",
  PREVIEW_MODE: "false",
  PORTAL_USERNAME: username,
  PORTAL_DISPLAY_NAME: "Vishal Chakravarty",
  BOOTSTRAP_ADMIN_PASSWORD: temporaryPassword,
  LOCAL_BOOTSTRAP_CREDENTIAL_FILE: credentialFile,
  LOCAL_BOOTSTRAP_DISPLAY_SCRIPT: credentialLauncher
});
for (const name of ["PORTAL_PASSWORD", "PORTAL_PASSWORD_HASH", "PORTAL_PASSWORD_SALT", "PORTAL_USERS_JSON", "RESEND_API_KEY", "MICROSOFT_CLIENT_SECRET", "SHAREPOINT_DRIVE_ID", "AZURE_STORAGE_CONNECTION_STRING"]) delete process.env[name];

let externalRequestCount = 0;
globalThis.fetch = async (url) => {
  externalRequestCount += 1;
  throw new Error(`Unexpected external request from local owner portal: ${url}`);
};

const { handleRequest } = await import("../server.mjs");
const { seedLocalPortalData } = await import("./local-portal/seed-data.mjs");
const { all, closeDatabase, one, run } = await import("../src/data/database.mjs");
await seedLocalPortalData();

class TestRequest extends Readable {
  constructor({ method = "GET", url = "/", headers = {}, body = "", address = "127.0.0.1" } = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = { host: "127.0.0.1:4173", origin, accept: "application/json", ...headers };
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
  get body() { return Buffer.concat(this.chunks).toString("utf8"); }
}

async function request(options = {}) {
  const response = new TestResponse();
  const finished = new Promise((resolveFinished, reject) => {
    response.once("finish", resolveFinished);
    response.once("error", reject);
  });
  await handleRequest(new TestRequest(options), response);
  if (!response.writableFinished) await finished;
  const contentType = String(response.headers["Content-Type"] || "");
  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
    payload: contentType.includes("application/json") ? JSON.parse(response.body || "{}") : response.body
  };
}

function cookieValue(setCookie, name) {
  const match = String(setCookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function requestHeaders(csrf, session = "", contentType = "application/json") {
  return {
    origin,
    cookie: `np_csrf=${csrf}${session ? `; np_session=${session}` : ""}`,
    "x-csrf-token": csrf,
    "content-type": contentType
  };
}

async function login(csrf, password, accessType, address) {
  return request({
    method: "POST",
    url: "/api/auth/login",
    headers: requestHeaders(csrf),
    body: JSON.stringify({ username, password, accessType }),
    address
  });
}

const live = await request({ url: "/api/live" });
assert.equal(live.statusCode, 200);
assert.equal(live.payload.status, "live");
const ready = await request({ url: "/api/ready" });
assert.equal(ready.statusCode, 200);
assert.equal(ready.payload.ready, true);
assert.equal(ready.payload.environment, "local_validation");
assert.equal(ready.payload.email, "configured:local-capture");
assert.equal(ready.payload.sharePoint, "disabled_local_validation");
assert.equal(ready.payload.entra, "disabled_local_validation");
assert.equal(ready.payload.observability, "disabled_local_validation");
assert.equal(statSync(databasePath).mode & 0o777, 0o600);
assert.equal(statSync(`${databasePath}-wal`).mode & 0o777, 0o600);
assert.equal(statSync(`${databasePath}-shm`).mode & 0o777, 0o600);

const seededCounts = {};
for (const table of ["customers", "customer_contacts", "products", "suppliers", "orders", "invoices", "purchase_orders", "leads", "account_applications"]) {
  seededCounts[table] = Number((await one(`SELECT COUNT(*) AS value FROM ${table}`)).value);
}
assert.deepEqual(seededCounts, {
  customers: 3,
  customer_contacts: 3,
  products: 5,
  suppliers: 3,
  orders: 5,
  invoices: 3,
  purchase_orders: 2,
  leads: 3,
  account_applications: 3
});
assert.equal((await all("PRAGMA foreign_key_check")).length, 0);
assert.equal((await all("SELECT legal_name FROM organizations")).every((row) => /TEST|DEMO/.test(row.legal_name)), true);

const csrfResponse = await request({ url: "/api/security/csrf" });
const csrf = csrfResponse.payload.csrfToken;
assert.ok(csrf);

const missingCsrf = await request({ method: "POST", url: "/api/auth/login", body: JSON.stringify({ username, password: temporaryPassword, accessType: "admin" }) });
assert.equal(missingCsrf.statusCode, 403);
const invalidLogin = await login(csrf, "incorrect-local-password", "admin", "127.0.1.2");
assert.equal(invalidLogin.statusCode, 401);

const temporaryLogin = await login(csrf, temporaryPassword, "admin", "127.0.1.3");
assert.equal(temporaryLogin.statusCode, 200);
assert.equal(temporaryLogin.payload.mustChangePassword, true);
assert.equal(temporaryLogin.payload.redirectTo, "/portal/change-password/");
const temporarySession = cookieValue(temporaryLogin.headers["Set-Cookie"], "np_session");
assert.ok(temporarySession);

const forcedRedirect = await request({ url: "/admin/dashboard/", headers: { cookie: `np_session=${temporarySession}`, accept: "text/html" }, address: "127.0.1.4" });
assert.equal(forcedRedirect.statusCode, 302);
assert.equal(forcedRedirect.headers.Location, "/portal/change-password/");
const passwordScreen = await request({ url: "/portal/change-password/", headers: { cookie: `np_session=${temporarySession}`, accept: "text/html" }, address: "127.0.1.5" });
assert.equal(passwordScreen.statusCode, 200);

const changed = await request({
  method: "POST",
  url: "/api/auth/change-password",
  headers: requestHeaders(csrf, temporarySession),
  body: JSON.stringify({ currentPassword: temporaryPassword, newPassword: permanentPassword, confirmation: permanentPassword }),
  address: "127.0.1.6"
});
assert.equal(changed.statusCode, 200);
const changedSession = cookieValue(changed.headers["Set-Cookie"], "np_session");
assert.ok(changedSession);
assert.equal(await one("SELECT must_change_password FROM auth_credentials WHERE lower(username) = lower(?)", username).then((row) => Number(row.must_change_password)), 0);
assert.equal((await import("node:fs")).existsSync(credentialFile), false);
assert.equal((await import("node:fs")).existsSync(credentialLauncher), false);

const oldSessionRejected = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${temporarySession}` }, address: "127.0.1.7" });
assert.equal(oldSessionRejected.statusCode, 401);
const oldPasswordRejected = await login(csrf, temporaryPassword, "admin", "127.0.1.8");
assert.equal(oldPasswordRejected.statusCode, 401);

const sessions = {};
for (const [index, accessType] of ["customer", "employee", "board", "admin"].entries()) {
  const result = await login(csrf, permanentPassword, accessType, `127.0.2.${index + 1}`);
  assert.equal(result.statusCode, 200, `${accessType} login failed`);
  sessions[accessType] = cookieValue(result.headers["Set-Cookie"], "np_session");
  const state = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${sessions[accessType]}` }, address: `127.0.2.${index + 10}` });
  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.payload.user.accessScopes, ["admin", "board", "customer", "employee"]);
  assert.equal(state.payload.user.accessType, accessType);
}

const customerRoutes = ["dashboard", "account", "orders", "invoices", "statements", "products", "price-lists", "stock-availability", "order-tracking", "delivery-tracking", "returns", "quality-complaints", "documents", "support", "regulatory-documents", "downloads", "analytics", "settings"].map((slug) => `/portal/${slug}/`);
const employeeRoutes = ["dashboard", "customers", "suppliers", "products", "orders", "warehouse", "purchasing", "finance", "quality", "regulatory", "crm", "reports", "administration"].map((slug) => `/employee/${slug}/`);
const executiveFiles = ["NP_Hub.html", "NP_CEO.html", "NP_Sales.html", "NP_Customers.html", "NP_Products.html", "NP_NHS_Data.html", "NP_PLPI.html", "NP_PV.html", "NP_Sourcing.html", "NP_Tenders.html", "NP_Warehouse.html", "NP_SLA.html", "NP_Finance.html", "NP_Capital.html", "NP_M365.html", "NP_Documents.html", "NP_AI_Tech.html", "NP_Blockchain.html"];
const boardRoutes = ["/portal/executive-platform/", "/portal/ceo-dashboard/", ...executiveFiles.filter((name) => name !== "NP_CEO.html").map((name) => `/portal/executive-platform/${name}`)];
const adminRoutes = ["/admin/dashboard/", "/admin/local-review/", "/admin/users/", "/admin/content/", "/admin/analytics/"];

for (const [scope, routes] of Object.entries({ customer: customerRoutes, employee: employeeRoutes, board: boardRoutes, admin: adminRoutes })) {
  for (const route of routes) {
    const page = await request({ url: route, headers: { cookie: `np_session=${sessions[scope]}`, accept: "text/html" }, address: "127.0.3.1" });
    assert.equal(page.statusCode, 200, `${scope} route failed: ${route}`);
    assert.doesNotMatch(page.body, /Secure portal backend is not active on this static host yet\./);
  }
}
const signedOutProtected = await request({ url: "/admin/local-review/", headers: { accept: "text/html" }, address: "127.0.3.2" });
assert.equal(signedOutProtected.statusCode, 302);

const contactPayload = {
  name: "TEST Local Contact",
  email: "local.contact@example.invalid",
  company: "TEST Local Contact Company Ltd",
  role: "Commercial Director",
  country: "United Kingdom",
  enquiryType: "Distribution partnership",
  message: "Synthetic local enquiry for owner workflow review only; no patient or safety information.",
  privacyAcknowledgement: "yes",
  safetyConfirmation: "yes",
  website: "",
  sourcePage: "/contact/",
  sourceCta: "local-owner-validation"
};
const contact = await request({ method: "POST", url: "/api/contact", headers: requestHeaders(csrf), body: JSON.stringify(contactPayload), address: "127.0.4.1" });
assert.equal(contact.statusCode, 201);
assert.match(contact.payload.lead.leadNumber, /^NP-LEAD-/);
const contactNotifications = await all("SELECT id, status, provider_message_id, payload_json FROM notifications WHERE entity_type = 'lead' AND entity_id = ?", contact.payload.lead.id);
assert.equal(contactNotifications.length, 2);
assert.equal(contactNotifications.every((row) => row.status === "sent" && row.provider_message_id.startsWith("local-capture/")), true);
assert.equal(contactNotifications.every((row) => JSON.parse(row.payload_json).message.text.length > 0), true);

const preview = await request({ url: `/api/admin/notifications/${contactNotifications[0].id}/preview`, headers: { cookie: `np_session=${sessions.admin}` }, address: "127.0.4.2" });
assert.equal(preview.statusCode, 200);
assert.equal(preview.payload.preview.localCapture, true);
assert.match(preview.payload.preview.message.html, /NovaPharm|Synthetic|enquiry/i);

const applicationPayload = {
  email: "local.application@example.invalid",
  submissionKey: `local-owner-application-${runId}`,
  expectedDocumentCount: 1,
  company: { legalName: "TEST Local Account Application Ltd", companyNumber: "TEST-LOCAL-001", customerType: "pharmacy" },
  responsiblePeople: [{ name: "TEST Responsible Person", role: "Responsible Person", email: "local.application@example.invalid" }],
  addresses: [{ type: "registered", address: "1 TEST Local Way", postcode: "TE1 1ST", country: "GB" }],
  compliance: { gdpStatus: "in_progress", insuranceStatus: "Synthetic evidence", creditReferences: "Synthetic", tradeReferences: "Synthetic" },
  bank: { confirmationProvided: true },
  applicantDeclaration: "yes",
  privacyAcknowledgement: "yes"
};
const application = await request({ method: "POST", url: "/api/account-applications", headers: requestHeaders(csrf), body: JSON.stringify(applicationPayload), address: "127.0.5.1" });
assert.equal(application.statusCode, 201);
const duplicateApplication = await request({ method: "POST", url: "/api/account-applications", headers: requestHeaders(csrf), body: JSON.stringify(applicationPayload), address: "127.0.5.2" });
assert.equal(duplicateApplication.statusCode, 200);
assert.equal(duplicateApplication.payload.application.duplicate, true);
const applicationId = application.payload.application.id;
const recovered = await request({
  method: "POST",
  url: `/api/account-applications/${applicationId}/upload-authorisation`,
  headers: requestHeaders(csrf),
  body: JSON.stringify({ resumeToken: duplicateApplication.payload.application.resumeToken }),
  address: "127.0.5.3"
});
assert.equal(recovered.statusCode, 200);
const uploadToken = recovered.payload.authorisations.uploadToken;
const uploaded = await request({
  method: "POST",
  url: `/api/account-applications/${applicationId}/documents?fileName=synthetic-evidence.pdf&documentClass=company_due_diligence`,
  headers: { ...requestHeaders(csrf, "", "application/pdf"), "x-application-upload-token": uploadToken },
  body: Buffer.from("%PDF-1.4\nSynthetic local validation document — not production scanned\n%%EOF\n"),
  address: "127.0.5.4"
});
assert.equal(uploaded.statusCode, 201);
assert.equal(uploaded.payload.document.securityStatus, "quarantine");
const scans = await request({ method: "POST", url: "/api/integrations/storage/scans", headers: requestHeaders(csrf, sessions.admin), address: "127.0.5.5" });
assert.equal(scans.statusCode, 200);
assert.equal(scans.payload.clean >= 1, true);
const uploadedDocument = await one("SELECT security_status, malware_scan_result FROM documents WHERE id = ?", uploaded.payload.document.id);
assert.equal(uploadedDocument.security_status, "clean");
assert.equal(uploadedDocument.malware_scan_result, "synthetic_local_validation_clean_not_production_scanned");
assert.equal(Number((await one("SELECT COUNT(*) AS value FROM integration_events WHERE destination_system = 'sharepoint' AND aggregate_id = ?", uploaded.payload.document.id)).value), 0);

const activation = await request({ method: "POST", url: "/api/admin/applications/demo-application-003/activate", headers: requestHeaders(csrf, sessions.admin), address: "127.0.5.6" });
assert.equal(activation.statusCode, 200);
assert.match(activation.payload.customer.legal_name, /TEST|DEMO/);

const expiringLogin = await login(csrf, permanentPassword, "admin", "127.0.6.1");
const expiringSession = cookieValue(expiringLogin.headers["Set-Cookie"], "np_session");
await run("UPDATE auth_sessions SET expires_at = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), expiringSession.split(".")[0]);
const expired = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${expiringSession}` }, address: "127.0.6.2" });
assert.equal(expired.statusCode, 401);

const logout = await request({ method: "POST", url: "/api/auth/logout", headers: requestHeaders(csrf, changedSession), address: "127.0.6.3" });
assert.equal(logout.statusCode, 200);
const loggedOut = await request({ url: "/api/portal/session", headers: { cookie: `np_session=${changedSession}` }, address: "127.0.6.4" });
assert.equal(loggedOut.statusCode, 401);

let rateLimitedStatus = 0;
for (let attempt = 0; attempt < 9; attempt += 1) {
  const response = await request({
    method: "POST",
    url: "/api/auth/login",
    headers: requestHeaders(csrf),
    body: JSON.stringify({ username: "missing-local-user@example.invalid", password: "invalid", accessType: "admin" }),
    address: "127.0.7.1"
  });
  rateLimitedStatus = response.statusCode;
}
assert.equal(rateLimitedStatus, 429);

for (let attempt = 0; attempt < 8; attempt += 1) {
  const response = await login(csrf, `wrong-password-${attempt}`, "admin", `127.0.8.${attempt + 1}`);
  assert.equal(response.statusCode, 401);
}
const locked = await login(csrf, permanentPassword, "admin", "127.0.8.20");
assert.equal(locked.statusCode, 401);
assert.equal(Number((await one("SELECT COUNT(*) AS value FROM security_events WHERE event_type IN ('authentication.failed', 'authentication.locked')")).value) >= 9, true);
assert.equal(externalRequestCount, 0);

await closeDatabase();
rmSync(protectedRoot, { recursive: true, force: true });
console.log(JSON.stringify({
  status: "passed",
  ownerIdentity: username,
  scopes: ["customer", "employee", "board", "admin"],
  routeCounts: { customer: customerRoutes.length, employee: employeeRoutes.length, board: boardRoutes.length, admin: adminRoutes.length },
  contact: "local_capture_passed",
  accountApplication: "submit_duplicate_recovery_upload_passed",
  documents: "quarantine_and_synthetic_clean_test_passed",
  sessions: "forced_change_revoke_expire_logout_lockout_rate_limit_passed",
  externalRequests: externalRequestCount
}));
