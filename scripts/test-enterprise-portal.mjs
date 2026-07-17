import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable, Writable } from "node:stream";

const root = resolve(process.cwd());
const temporaryRoot = mkdtempSync(join(tmpdir(), "novapharm-enterprise-portal-"));
const databasePath = join(temporaryRoot, "enterprise.sqlite");
const bootstrapPassword = `T8!${randomBytes(30).toString("base64url")}aZ`;
const replacementPassword = `R7!${randomBytes(30).toString("base64url")}bY`;

function provisionedUser(username, displayName, role, password, accessScopes, customerId = null) {
  const passwordSalt = randomBytes(16).toString("hex");
  return {
    username,
    displayName,
    role,
    customerId,
    accessScopes,
    passwordSalt,
    passwordHash: pbkdf2Sync(password, passwordSalt, 210000, 32, "sha256").toString("hex"),
    mustChangePassword: false
  };
}

const validationPasswords = {
  customer: `C6!${randomBytes(28).toString("base64url")}cX`,
  otherCustomer: `D5!${randomBytes(28).toString("base64url")}dW`,
  employee: `E4!${randomBytes(28).toString("base64url")}eV`,
  board: `B3!${randomBytes(28).toString("base64url")}fU`
};
const validationUsers = [
  provisionedUser("customer-one@example.invalid", "TEST Customer One", "client", validationPasswords.customer, ["customer"], "demo-customer-001"),
  provisionedUser("customer-two@example.invalid", "TEST Customer Two", "client", validationPasswords.otherCustomer, ["customer"], "demo-customer-002"),
  provisionedUser("employee@example.invalid", "TEST Employee", "employee", validationPasswords.employee, ["employee"]),
  provisionedUser("board@example.invalid", "TEST Board Member", "board", validationPasswords.board, ["board"])
];

const baseEnvironment = {
  ...process.env,
  NODE_ENV: "test",
  LOCAL_PORTAL_MODE: "true",
  HOST: "127.0.0.1",
  PORT: "4173",
  SITE_URL: "http://127.0.0.1:4173",
  PUBLIC_ORIGIN: "http://127.0.0.1:4173",
  PUBLIC_API_ORIGIN: "http://127.0.0.1:4173",
  DATABASE_PROVIDER: "sqlite",
  DATABASE_PATH: databasePath,
  DATABASE_BACKUP_ROOT: join(temporaryRoot, "backups"),
  DOCUMENT_STORAGE_PROVIDER: "local-validation",
  DOCUMENT_STORAGE_ROOT: join(temporaryRoot, "documents"),
  LOCAL_VALIDATION_SCAN_RESULT: "clean",
  SECURE_CONTENT_ROOT: join(temporaryRoot, "secure-content"),
  SESSION_SECRET: randomBytes(48).toString("base64url"),
  SESSION_TTL_MS: String(8 * 60 * 60 * 1000),
  SESSION_IDLE_TIMEOUT_MS: String(30 * 60 * 1000),
  EMAIL_PROVIDER: "local-capture",
  EMAIL_FROM: "NovaPharm Local Test <no-send@example.invalid>",
  CONTACT_NOTIFICATION_TO: "owner-review@example.invalid",
  ENTRA_AUTH_ENABLED: "false",
  PREVIEW_MODE: "false"
};
for (const name of ["PORTAL_PASSWORD", "PORTAL_PASSWORD_HASH", "PORTAL_PASSWORD_SALT", "RESEND_API_KEY", "MICROSOFT_CLIENT_SECRET", "AZURE_STORAGE_CONNECTION_STRING"]) delete baseEnvironment[name];

function child(script, additions = {}) {
  const result = spawnSync(process.execPath, [join(root, script)], {
    cwd: root,
    env: { ...baseEnvironment, ...additions },
    encoding: "utf8"
  });
  assert.equal(result.status, 0, `${script} failed: ${String(result.stderr || result.stdout).slice(0, 1200)}`);
  return result.stdout.trim();
}

class TestRequest extends Readable {
  constructor({ method = "GET", url = "/", headers = {}, body = "", address = "127.20.0.1" } = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = { host: "127.0.0.1:4173", ...headers };
    this.socket = { remoteAddress: address };
    if (body) this.push(Buffer.from(body));
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

function cookieValue(setCookie, name) {
  const match = String(setCookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

try {
  child("scripts/local-portal/initialise.mjs", {
    PORTAL_USERNAME: "vishal@novapharmhealthcare.com",
    PORTAL_DISPLAY_NAME: "Vishal Chakravarty",
    BOOTSTRAP_ADMIN_PASSWORD: bootstrapPassword
  });
  child("scripts/import-nutraxin-catalogue.mjs");
  child("scripts/local-portal/seed-enterprise-scenarios.mjs");
  child("scripts/local-portal/seed-enterprise-scenarios.mjs");

  Object.assign(process.env, baseEnvironment, { PORTAL_USERS_JSON: JSON.stringify(validationUsers) });
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const { handleRequest } = await import("../server.mjs");
  const { all, closeDatabase, one, run } = await import("../src/data/database.mjs");

  async function request(options = {}) {
    const response = new TestResponse();
    const finished = new Promise((resolveFinished, reject) => {
      response.once("finish", resolveFinished);
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

  const csrfResponse = await request({ url: "/api/security/csrf" });
  assert.equal(csrfResponse.statusCode, 200);
  const csrf = csrfResponse.payload.csrfToken;
  const csrfCookie = `np_csrf=${csrf}`;
  const jsonHeaders = (session = "", token = csrf) => ({
    cookie: `${csrfCookie}${session ? `; np_session=${session}` : ""}`,
    "x-csrf-token": token,
    "content-type": "application/json",
    origin: "http://127.0.0.1:4173"
  });

  async function login(username, password, accessType, address) {
    const response = await request({ method: "POST", url: "/api/auth/login", headers: jsonHeaders(), body: JSON.stringify({ username, password, accessType }), address });
    return { ...response, session: cookieValue(response.headers["Set-Cookie"], "np_session") };
  }

  const bootstrapLogin = await login("vishal@novapharmhealthcare.com", bootstrapPassword, "customer", "127.20.0.2");
  assert.equal(bootstrapLogin.statusCode, 200);
  assert.equal(bootstrapLogin.payload.mustChangePassword, true);
  const blockedBeforeChange = await request({ url: "/api/enterprise/modules/customer.dashboard", headers: jsonHeaders(bootstrapLogin.session) });
  assert.equal(blockedBeforeChange.statusCode, 403);

  const passwordChange = await request({
    method: "POST",
    url: "/api/auth/change-password",
    headers: jsonHeaders(bootstrapLogin.session),
    body: JSON.stringify({ currentPassword: bootstrapPassword, newPassword: replacementPassword, confirmation: replacementPassword }),
    address: "127.20.0.2"
  });
  assert.equal(passwordChange.statusCode, 200);
  const ownerCustomerSession = cookieValue(passwordChange.headers["Set-Cookie"], "np_session");
  assert.ok(ownerCustomerSession);
  assert.equal((await login("vishal@novapharmhealthcare.com", bootstrapPassword, "customer", "127.20.0.3")).statusCode, 401);

  await run(`INSERT INTO orders(id, order_number, customer_id, status, subtotal_minor, tax_minor, total_minor, currency,
    version, source_system, created_at, created_by, updated_at, updated_by)
    VALUES(?, ?, ?, 'draft', 100, 0, 100, 'GBP', 1, 'local_validation', ?, 'test', ?, 'test')`,
  randomUUID(), "TEST-OTHER-CUSTOMER-ORDER", "demo-customer-002", new Date().toISOString(), new Date().toISOString());

  const ownerDashboard = await request({ url: "/api/enterprise/modules/customer.dashboard", headers: jsonHeaders(ownerCustomerSession) });
  assert.equal(ownerDashboard.statusCode, 200);
  assert.equal(ownerDashboard.payload.module.code, "customer.dashboard");
  assert.equal(ownerDashboard.payload.dataState, "synthetic");
  assert.ok(ownerDashboard.payload.metrics.length >= 4);
  const ownerOrders = await request({ url: "/api/enterprise/modules/customer.orders", headers: jsonHeaders(ownerCustomerSession) });
  assert.equal(ownerOrders.statusCode, 200);
  assert.equal(JSON.stringify(ownerOrders.payload).includes("TEST-OTHER-CUSTOMER-ORDER"), false);

  const customerLogin = await login("customer-one@example.invalid", validationPasswords.customer, "customer", "127.20.0.4");
  assert.equal(customerLogin.statusCode, 200);
  const otherCustomerLogin = await login("customer-two@example.invalid", validationPasswords.otherCustomer, "customer", "127.20.0.5");
  assert.equal(otherCustomerLogin.statusCode, 200);
  const customerOrders = await request({ url: "/api/enterprise/modules/customer.orders", headers: jsonHeaders(customerLogin.session) });
  const otherCustomerOrders = await request({ url: "/api/enterprise/modules/customer.orders", headers: jsonHeaders(otherCustomerLogin.session) });
  assert.equal(JSON.stringify(customerOrders.payload).includes("TEST-OTHER-CUSTOMER-ORDER"), false);
  assert.equal(JSON.stringify(otherCustomerOrders.payload).includes("TEST-OTHER-CUSTOMER-ORDER"), true);
  assert.equal((await request({ url: "/api/enterprise/modules/employee.finance", headers: jsonHeaders(customerLogin.session) })).statusCode, 403);

  const orderLine = await one("SELECT id, product_id FROM order_lines WHERE order_id = 'demo-nutraxin-order-001'");
  const support = await request({ method: "POST", url: "/api/enterprise/customer/support", headers: jsonHeaders(customerLogin.session), body: JSON.stringify({ subject: "Synthetic delivery document", description: "Please provide the controlled synthetic delivery document.", category: "documents" }), address: "127.20.0.6" });
  assert.equal(support.statusCode, 201);
  assert.match(support.payload.ticket.ticketNumber, /^TEST-TKT-/);
  const noCsrfReturn = await request({ method: "POST", url: "/api/enterprise/customer/returns", headers: jsonHeaders(customerLogin.session, "wrong-token"), body: "{}", address: "127.20.0.7" });
  assert.equal(noCsrfReturn.statusCode, 403);
  const crossCustomerReturn = await request({ method: "POST", url: "/api/enterprise/customer/returns", headers: jsonHeaders(otherCustomerLogin.session), body: JSON.stringify({ orderId: "demo-nutraxin-order-001", orderLineId: orderLine.id, quantity: 1, reasonCode: "packaging_observation" }), address: "127.20.0.8" });
  assert.equal(crossCustomerReturn.statusCode, 400);
  const customerReturn = await request({ method: "POST", url: "/api/enterprise/customer/returns", headers: jsonHeaders(customerLogin.session), body: JSON.stringify({ orderId: "demo-nutraxin-order-001", orderLineId: orderLine.id, quantity: 1, reasonCode: "packaging_observation" }), address: "127.20.0.9" });
  assert.equal(customerReturn.statusCode, 201);
  const blockedSafety = await request({ method: "POST", url: "/api/enterprise/customer/quality-complaints", headers: jsonHeaders(customerLogin.session), body: JSON.stringify({ orderId: "demo-nutraxin-order-001", productId: orderLine.product_id, description: "A patient reported a serious adverse event and included a date of birth." }), address: "127.20.0.10" });
  assert.equal(blockedSafety.statusCode, 400);
  const quality = await request({ method: "POST", url: "/api/enterprise/customer/quality-complaints", headers: jsonHeaders(customerLogin.session), body: JSON.stringify({ orderId: "demo-nutraxin-order-001", productId: orderLine.product_id, description: "The outer carton arrived with a visible crease; no safety information is included.", severity: "untriaged" }), address: "127.20.0.11" });
  assert.equal(quality.statusCode, 201);

  const customerSearch = await request({ url: `/api/enterprise/search?q=${encodeURIComponent("%' OR 1=1 --")}`, headers: jsonHeaders(customerLogin.session) });
  assert.equal(customerSearch.statusCode, 200);
  assert.ok(customerSearch.payload.results.every((item) => !String(item.reference).includes("OTHER-CUSTOMER")));

  const employeeLogin = await login("employee@example.invalid", validationPasswords.employee, "employee", "127.20.0.12");
  assert.equal(employeeLogin.statusCode, 200);
  assert.equal((await request({ url: "/api/enterprise/modules/employee.finance", headers: jsonHeaders(employeeLogin.session) })).statusCode, 200);
  assert.equal((await request({ url: "/api/enterprise/modules/executive.ceo-dashboard", headers: jsonHeaders(employeeLogin.session) })).statusCode, 403);
  const advanced = await request({ method: "POST", url: "/api/enterprise/workflows/demo-workflow-product-onboarding-nutraxin-review/advance", headers: jsonHeaders(employeeLogin.session), body: "{}", address: "127.20.0.13" });
  assert.equal(advanced.statusCode, 200);
  assert.equal(advanced.payload.workflow.currentStep, "data_complete");

  const boardLogin = await login("board@example.invalid", validationPasswords.board, "board", "127.20.0.14");
  assert.equal(boardLogin.statusCode, 200);
  assert.equal((await request({ url: "/api/enterprise/modules/executive.ceo-dashboard", headers: jsonHeaders(boardLogin.session) })).statusCode, 200);
  assert.equal((await request({ method: "POST", url: "/api/enterprise/workflows/demo-workflow-product-onboarding-nutraxin-review/advance", headers: jsonHeaders(boardLogin.session), body: "{}", address: "127.20.0.15" })).statusCode, 403);

  for (const accessType of ["employee", "board", "admin"]) {
    const loginResult = await login("vishal@novapharmhealthcare.com", replacementPassword, accessType, `127.20.1.${accessType.length}`);
    assert.equal(loginResult.statusCode, 200);
    const moduleCode = { employee: "employee.dashboard", board: "executive.command-centre", admin: "admin.dashboard" }[accessType];
    assert.equal((await request({ url: `/api/enterprise/modules/${moduleCode}`, headers: jsonHeaders(loginResult.session) })).statusCode, 200);
  }

  const ownerEmployeeLogin = await login("vishal@novapharmhealthcare.com", replacementPassword, "employee", "127.20.0.20");
  const nutraxinProduct = await one("SELECT id FROM products WHERE source_system = 'owner_supplied_nutraxin_catalogue' ORDER BY sku LIMIT 1");
  for (const status of ["review", "approved"]) {
    const transitioned = await request({ method: "POST", url: `/api/enterprise/products/${nutraxinProduct.id}/status`, headers: jsonHeaders(ownerEmployeeLogin.session), body: JSON.stringify({ status }), address: "127.20.0.21" });
    assert.equal(transitioned.statusCode, 200);
  }
  const blockedActivation = await request({ method: "POST", url: `/api/enterprise/products/${nutraxinProduct.id}/status`, headers: jsonHeaders(ownerEmployeeLogin.session), body: JSON.stringify({ status: "active" }), address: "127.20.0.22" });
  assert.equal(blockedActivation.statusCode, 409);

  const nutraxinCount = Number((await one("SELECT COUNT(*) AS value FROM products WHERE source_system = 'owner_supplied_nutraxin_catalogue'"))?.value || 0);
  const publicClaims = Number((await one(`SELECT COUNT(*) AS value FROM product_claims pc JOIN products p ON p.id = pc.product_id
    WHERE p.source_system = 'owner_supplied_nutraxin_catalogue' AND pc.public_use_status <> 'blocked'`))?.value || 0);
  const workflowTypes = Number((await one("SELECT COUNT(DISTINCT workflow_code) AS value FROM workflow_instances"))?.value || 0);
  const unbalancedJournals = await all(`SELECT je.id FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE je.status = 'posted' GROUP BY je.id HAVING SUM(jl.debit_minor) <> SUM(jl.credit_minor)`);
  assert.equal(nutraxinCount, 19);
  assert.equal(publicClaims, 0);
  assert.equal(workflowTypes, 6);
  assert.deepEqual(unbalancedJournals, []);
  assert.deepEqual(await all("PRAGMA foreign_key_check"), []);
  assert.equal(Number((await one("SELECT COUNT(*) AS value FROM catalogue_imports WHERE status = 'imported'"))?.value || 0), 1);
  assert.ok(Number((await one("SELECT COUNT(*) AS value FROM audit_logs WHERE action IN ('support_ticket.created','return.requested','complaint.opened','workflow.advanced')"))?.value || 0) >= 4);
  assert.ok(Number((await one("SELECT COUNT(*) AS value FROM security_events WHERE event_type = 'password.changed'"))?.value || 0) >= 1);

  await closeDatabase();
  console.log("Enterprise portal validated: 19-product import, six workflow types, owner access, role boundaries, customer isolation, CSRF, governed writes and lifecycle gate.");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
