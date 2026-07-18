import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { Readable, Writable } from "node:stream";

const runId = `${process.pid}-${Date.now()}`;
const databasePath = `/tmp/novapharm-backend-activation-${runId}.sqlite`;
const documentRoot = `/tmp/novapharm-backend-activation-documents-${runId}`;
const adminUsername = "ActivationAdmin";
const adminPassword = `Aa1!${randomBytes(32).toString("base64url")}`;

rmSync(databasePath, { force: true });
rmSync(documentRoot, { force: true, recursive: true });
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_PATH: databasePath,
  DOCUMENT_STORAGE_ROOT: documentRoot,
  SESSION_SECRET: randomBytes(40).toString("base64url"),
  PORTAL_USERNAME: adminUsername,
  PORTAL_PASSWORD: adminPassword,
  EMAIL_PROVIDER: "microsoft-graph",
  EMAIL_FROM: "NovaPharm Healthcare <website@example.test>",
  CONTACT_NOTIFICATION_TO: "enquiries@example.test",
  MICROSOFT_EMAIL_SENDER: "website@example.test",
  MICROSOFT_GRAPH_AUTH_MODE: "client-secret",
  MICROSOFT_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  MICROSOFT_CLIENT_ID: "00000000-0000-0000-0000-000000000002",
  MICROSOFT_CLIENT_SECRET: randomBytes(36).toString("base64url")
});
delete process.env.RESEND_API_KEY;
delete process.env.PORTAL_PASSWORD_HASH;
delete process.env.PORTAL_PASSWORD_SALT;

const graphRequests = [];
let graphThrottled = false;
function decodedMimeParts(encodedMime) {
  const mime = Buffer.from(String(encodedMime), "base64").toString("utf8");
  const parts = mime.split("Content-Transfer-Encoding: base64\r\n\r\n").slice(1);
  return parts.map((part) => Buffer.from(part.split(/\r\n--novapharm-/)[0].replace(/\s/g, ""), "base64").toString("utf8")).join("\n");
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes("login.microsoftonline.com")) {
    return new Response(JSON.stringify({ access_token: "synthetic-validation-token", expires_in: 3600 }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
  if (String(url).includes("graph.microsoft.com") && String(url).endsWith("/sendMail")) {
    assert.equal(options.headers["Content-Type"], "text/plain");
    graphRequests.push(decodedMimeParts(options.body));
    if (!graphThrottled) {
      graphThrottled = true;
      return new Response("throttled", { status: 429, headers: { "retry-after": "0" } });
    }
    return new Response(null, { status: 202 });
  }
  throw new Error(`Unexpected external request in backend activation test: ${url}`);
};

const { handleRequest } = await import("../server.mjs");
const { one, all, run } = await import("../src/data/database.mjs");

class TestRequest extends Readable {
  constructor({ method = "GET", url = "/", headers = {}, body = "", address = "127.10.0.1" } = {}) {
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
  const finished = new Promise((resolve, reject) => {
    response.once("finish", resolve);
    response.once("error", reject);
  });
  await handleRequest(new TestRequest(options), response);
  if (!response.writableFinished) await finished;
  const contentType = response.headers["Content-Type"] || "";
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

function headers(csrf, session = "", contentType = "application/json") {
  return {
    cookie: `np_csrf=${csrf}${session ? `; np_session=${session}` : ""}`,
    "x-csrf-token": csrf,
    "content-type": contentType
  };
}

const csrfResponse = await request({ url: "/api/security/csrf" });
const csrf = csrfResponse.payload.csrfToken;

const contactMessage = "Please assess this controlled UK distribution partnership enquiry exactly as submitted.";
const contact = await request({
  method: "POST",
  url: "/api/contact",
  headers: headers(csrf),
  body: JSON.stringify({
    name: "Backend Contact",
    email: "contact@example.test",
    company: "Backend Validation Ltd",
    role: "Commercial Director",
    country: "United Kingdom",
    enquiryType: "Distribution partnership",
    message: contactMessage,
    privacyAcknowledgement: "yes",
    safetyConfirmation: "yes",
    sourcePage: "/services/",
    sourceCta: "discuss-uk-market-entry",
    attributionPayload: JSON.stringify({ campaign: { utm_source: "linkedin", utm_medium: "organic", utm_campaign: "validation" }, referringHost: "linkedin.com" })
  })
});
assert.equal(contact.statusCode, 201);
assert.match(contact.payload.lead.leadNumber, /^NP-LEAD-\d{4}-\d{6}$/);
assert.equal((await one("SELECT message FROM leads WHERE id = ?", contact.payload.lead.id)).message, contactMessage);
assert.equal((await one("SELECT source_page FROM lead_details WHERE lead_id = ?", contact.payload.lead.id)).source_page, "/services/");
assert.equal(graphRequests.some((entry) => entry.includes(contactMessage)), true);
assert.equal(graphRequests.every((entry) => !entry.includes("network_fingerprint")), true);

const applicationPayload = {
  email: "applicant@example.test",
  submissionKey: "backend-activation-application-key-000001",
  expectedDocumentCount: 2,
  company: { legalName: "Activation Pharmacy Ltd", companyNumber: "87654321", customerType: "pharmacy" },
  responsiblePeople: [{ name: "Responsible Person", role: "Superintendent Pharmacist", email: "applicant@example.test" }],
  addresses: [{ type: "registered", address: "1 Validation Road", postcode: "AB1 2CD", country: "GB" }],
  compliance: { gdpStatus: "certified", insuranceStatus: "Evidence available", creditReferences: "Synthetic credit reference", tradeReferences: "Synthetic trade reference" },
  bank: { confirmationProvided: true },
  applicantDeclaration: "yes",
  privacyAcknowledgement: "yes"
};

const firstApplication = await request({ method: "POST", url: "/api/account-applications", headers: headers(csrf), body: JSON.stringify(applicationPayload), address: "127.10.0.2" });
assert.equal(firstApplication.statusCode, 201);
assert.equal(firstApplication.payload.application.status, "documents_pending");
const repeatedApplication = await request({ method: "POST", url: "/api/account-applications", headers: headers(csrf), body: JSON.stringify(applicationPayload), address: "127.10.0.3" });
assert.equal(repeatedApplication.statusCode, 200);
assert.equal(repeatedApplication.payload.application.id, firstApplication.payload.application.id);
assert.equal(repeatedApplication.payload.application.duplicate, true);
assert.equal((await one("SELECT COUNT(*) AS value FROM account_applications WHERE submission_key = ?", applicationPayload.submissionKey)).value, 1);

const application = repeatedApplication.payload.application;
const uploadUrl = (name, documentClass = "company_due_diligence") => `/api/account-applications/${application.id}/documents?${new URLSearchParams({ fileName: name, documentClass })}`;
const uploadHeaders = (token, contentType = "application/pdf") => ({ ...headers(csrf, "", contentType), "x-application-upload-token": token });
const firstFile = Buffer.from("%PDF-1.4\nFirst synthetic evidence\n");
const uploadedFirst = await request({ method: "POST", url: uploadUrl("registration.pdf"), headers: uploadHeaders(application.uploadToken), body: firstFile, address: "127.10.0.4" });
assert.equal(uploadedFirst.statusCode, 201);
const duplicateFirst = await request({ method: "POST", url: uploadUrl("registration.pdf"), headers: uploadHeaders(application.uploadToken), body: firstFile, address: "127.10.0.5" });
assert.equal(duplicateFirst.statusCode, 200);
assert.equal(duplicateFirst.payload.document.duplicate, true);

const doubleExtension = await request({ method: "POST", url: uploadUrl("payload.exe.pdf"), headers: uploadHeaders(application.uploadToken), body: Buffer.from("%PDF-1.4\nBlocked\n"), address: "127.10.0.6" });
assert.equal(doubleExtension.statusCode, 415);
assert.equal((await one("SELECT status FROM account_applications WHERE id = ?", application.id)).status, "documents_pending");

const uploadGrantId = application.uploadToken.split(".")[0];
await run("UPDATE application_upload_grants SET expires_at = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), uploadGrantId);
const expiredUpload = await request({ method: "POST", url: uploadUrl("insurance.pdf"), headers: uploadHeaders(application.uploadToken), body: Buffer.from("%PDF-1.4\nExpired\n"), address: "127.10.0.7" });
assert.equal(expiredUpload.statusCode, 403);

const refreshed = await request({
  method: "POST",
  url: `/api/account-applications/${application.id}/upload-authorisation`,
  headers: headers(csrf),
  body: JSON.stringify({ resumeToken: application.resumeToken }),
  address: "127.10.0.8"
});
assert.equal(refreshed.statusCode, 200);
Object.assign(application, refreshed.payload.authorisations);
const uploadedSecond = await request({ method: "POST", url: uploadUrl("insurance.pdf"), headers: uploadHeaders(application.uploadToken), body: Buffer.from("%PDF-1.4\nSecond synthetic evidence\n"), address: "127.10.0.9" });
assert.equal(uploadedSecond.statusCode, 201);

const completed = await request({
  method: "POST",
  url: `/api/account-applications/${application.id}/documents/complete`,
  headers: uploadHeaders(application.uploadToken),
  address: "127.10.0.10"
});
assert.equal(completed.statusCode, 200);
assert.equal(completed.payload.application.status, "submitted");
assert.equal(completed.payload.completion.uploadedCount, 2);
const revokedUpload = await request({ method: "POST", url: uploadUrl("late.pdf"), headers: uploadHeaders(application.uploadToken), body: Buffer.from("%PDF-1.4\nLate\n"), address: "127.10.0.11" });
assert.equal(revokedUpload.statusCode, 403);

const fileLimitApplication = await request({
  method: "POST",
  url: "/api/account-applications",
  headers: headers(csrf),
  body: JSON.stringify({
    ...applicationPayload,
    email: "file-limit@example.test",
    submissionKey: "backend-activation-file-limit-key-000002",
    expectedDocumentCount: 0,
    company: { ...applicationPayload.company, legalName: "File Limit Pharmacy Ltd", companyNumber: "87654322" },
    responsiblePeople: [{ ...applicationPayload.responsiblePeople[0], email: "file-limit@example.test" }]
  }),
  address: "127.10.0.111"
});
assert.equal(fileLimitApplication.statusCode, 201);
const fileLimit = fileLimitApplication.payload.application;
for (let index = 0; index < 10; index += 1) {
  const response = await request({
    method: "POST",
    url: `/api/account-applications/${fileLimit.id}/documents?${new URLSearchParams({ fileName: `evidence-${index}.pdf`, documentClass: "company_due_diligence" })}`,
    headers: uploadHeaders(fileLimit.uploadToken),
    body: Buffer.from(`%PDF-1.4\nUnique validation evidence ${index}\n`),
    address: "127.10.0.112"
  });
  assert.equal(response.statusCode, 201);
}
const fileLimitRejected = await request({
  method: "POST",
  url: `/api/account-applications/${fileLimit.id}/documents?${new URLSearchParams({ fileName: "evidence-11.pdf", documentClass: "company_due_diligence" })}`,
  headers: uploadHeaders(fileLimit.uploadToken),
  body: Buffer.from("%PDF-1.4\nOver file limit\n"),
  address: "127.10.0.112"
});
assert.equal(fileLimitRejected.statusCode, 409);

const login = await request({
  method: "POST",
  url: "/api/auth/login",
  headers: headers(csrf),
  body: JSON.stringify({ username: adminUsername, password: adminPassword, accessType: "admin" }),
  address: "127.10.0.12"
});
assert.equal(login.statusCode, 200);
const session = cookieValue(login.headers["Set-Cookie"], "np_session");
const adminHeaders = () => headers(csrf, session);

const invalidJump = await request({ method: "POST", url: `/api/admin/applications/${application.id}/status`, headers: adminHeaders(), body: JSON.stringify({ status: "approved" }), address: "127.10.0.13" });
assert.equal(invalidJump.statusCode, 409);
const prematureActivation = await request({ method: "POST", url: `/api/admin/applications/${application.id}/activate`, headers: adminHeaders(), address: "127.10.0.14" });
assert.equal(prematureActivation.statusCode, 409);

for (const nextStatus of ["under_initial_review", "compliance_review", "credit_review", "approved"]) {
  const transition = await request({
    method: "POST",
    url: `/api/admin/applications/${application.id}/status`,
    headers: adminHeaders(),
    body: JSON.stringify({ status: nextStatus, reason: `Synthetic review: ${nextStatus}` }),
    address: "127.10.0.15"
  });
  assert.equal(transition.statusCode, 200, `${nextStatus} transition failed`);
}

const applicationDetail = await request({ url: `/api/admin/applications/${application.id}`, headers: { cookie: `np_session=${session}` }, address: "127.10.0.16" });
assert.equal(applicationDetail.statusCode, 200);
assert.equal(applicationDetail.payload.application.documents.length, 2);
assert.equal(applicationDetail.payload.application.statusHistory.at(-1).to_status, "approved");
const leadDetail = await request({ url: `/api/admin/leads/${contact.payload.lead.id}`, headers: { cookie: `np_session=${session}` }, address: "127.10.0.17" });
assert.equal(leadDetail.statusCode, 200);
assert.equal(leadDetail.payload.lead.message, contactMessage);

const activation = await request({ method: "POST", url: `/api/admin/applications/${application.id}/activate`, headers: adminHeaders(), address: "127.10.0.18" });
assert.equal(activation.statusCode, 200);
assert.match(activation.payload.customer.customer_number, /^CUS-\d{6}$/);
assert.equal((await one("SELECT COUNT(*) AS value FROM customer_contacts WHERE customer_id = ?", activation.payload.customer.id)).value, 1);
assert.equal((await one(`SELECT COUNT(*) AS value FROM integration_events
  WHERE destination_system = 'sharepoint' AND aggregate_id IN (
    SELECT document_id FROM document_links WHERE entity_type = 'account_application' AND entity_id = ?
  )`, application.id)).value, 0);
await assert.rejects(
  () => run("UPDATE application_status_history SET reason = 'tampered' WHERE application_id = ?", application.id),
  /immutable/i
);

const reportingViews = [
  "reporting_current_leads", "reporting_application_pipeline", "reporting_notification_delivery",
  "reporting_daily_form_activity", "reporting_utm_attribution", "reporting_active_portal_users",
  "reporting_security_events", "reporting_document_quarantine", "reporting_account_activation"
];
for (const view of reportingViews) await all(`SELECT * FROM ${view}`);
assert.equal((await one("SELECT COUNT(*) AS value FROM reporting_document_quarantine")).value, 12);

const live = await request({ url: "/api/health/live" });
const ready = await request({ url: "/api/health/ready" });
assert.equal(live.statusCode, 200);
assert.equal(live.payload.status, "live");
assert.equal(ready.statusCode, 200);
assert.equal(ready.payload.ready, true);
assert.equal(ready.payload.email, "configured:microsoft-graph");
assert.equal(ready.payload.migration, "current");

const api404 = await request({ url: "/api/not-a-real-route", headers: { accept: "application/json" } });
assert.equal(api404.statusCode, 404);
assert.equal(api404.body, "Not found");
assert.equal(api404.body.includes("Error:"), false);
assert.equal((await request({ url: "/data/novapharm.sqlite" })).statusCode, 404);

const revoke = await request({ method: "POST", url: `/api/admin/users/${encodeURIComponent(adminUsername)}/sessions/revoke`, headers: adminHeaders(), address: "127.10.0.19" });
assert.equal(revoke.statusCode, 200);
assert.ok(revoke.payload.result.revokedSessions >= 1);
assert.equal((await request({ url: "/api/portal/session", headers: { cookie: `np_session=${session}` } })).statusCode, 401);

assert.equal(graphThrottled, true);
assert.equal((await one("SELECT COUNT(*) AS value FROM account_applications WHERE id = ?", application.id)).value, 1);
assert.equal((await one(`SELECT COUNT(*) AS value FROM document_links WHERE entity_type = 'account_application' AND entity_id = ?`, application.id)).value, 2);
assert.equal((await one("SELECT COUNT(*) AS value FROM documents")).value, 12);
assert.equal((await one("SELECT COUNT(*) AS value FROM application_status_history WHERE application_id = ?", application.id)).value, 7);
assert.ok(graphRequests.length >= 4);

globalThis.fetch = originalFetch;
rmSync(databasePath, { force: true });
rmSync(documentRoot, { force: true, recursive: true });
console.log("Backend activation tests passed: Graph throttling, enquiry references, exact message persistence, idempotent application creation, partial upload recovery, token expiry/revocation, document controls, status governance, admin detail/actions, reporting views, readiness and session revocation.");
