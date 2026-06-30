import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import {
  activateCustomer,
  applicationDocumentContext,
  createLead,
  createOrder,
  createPurchaseOrder,
  createProduct,
  createSupplier,
  listApplications,
  listAudit,
  listCustomers,
  listLeads,
  listOrders,
  listProducts,
  listPurchaseOrders,
  listSuppliers,
  operationalDashboard,
  submitCustomerApplication,
  syncStatus
} from "./src/core/domain-service.mjs";
import { storeDocument } from "./src/core/document-service.mjs";
import { databaseReady } from "./src/data/database.mjs";
import { processSharePointEvents, sharePointFolderPlan } from "./src/integrations/sharepoint/sync-engine.mjs";
import { processPolarSpeedEvents } from "./src/integrations/polar-speed/sync-engine.mjs";

const root = resolve(process.cwd());
const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });

const isProduction = process.env.NODE_ENV === "production";
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : "local-dev-session-secret-change-me");
const portalUsername = process.env.PORTAL_USERNAME || "";
const portalPassword = process.env.PORTAL_PASSWORD || "";
const portalPasswordHash = process.env.PORTAL_PASSWORD_HASH || "";
const portalPasswordSalt = process.env.PORTAL_PASSWORD_SALT || "";

if (!sessionSecret || sessionSecret.length < 24) {
  throw new Error("SESSION_SECRET must be set to at least 24 characters.");
}

if (!portalUsername || (!portalPassword && (!portalPasswordHash || !portalPasswordSalt))) {
  console.warn("Portal login is not configured. Set PORTAL_USERNAME and either PORTAL_PASSWORD or PORTAL_PASSWORD_HASH/PORTAL_PASSWORD_SALT.");
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf"
};

const sessions = new Map();
const rateBuckets = new Map();

function securityHeaders(extra = {}) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com 'unsafe-inline'",
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
      "frame-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'"
    ].join("; "),
    ...extra
  };
  if (isProduction) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, securityHeaders(headers));
  response.end(body);
}

function json(response, status, payload, headers = {}) {
  send(response, status, JSON.stringify(payload), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((cookie) => {
    const [key, ...rest] = cookie.trim().split("=");
    return [key, decodeURIComponent(rest.join("="))];
  }));
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"];
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (isProduction) parts.push("Secure");
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join("; ");
}

function csrfToken(request) {
  const cookies = parseCookies(request);
  return cookies.np_csrf || "";
}

function requireCsrf(request) {
  const sent = request.headers["x-csrf-token"];
  const stored = csrfToken(request);
  return Boolean(sent && stored && sent === stored);
}

function rateLimit(request, key, limit, windowMs) {
  const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.socket.remoteAddress || "local";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };
  if (bucket.resetAt < now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(bucketKey, bucket);
  return bucket.count <= limit;
}

function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
}

function verifyPassword(username, password) {
  if (!portalUsername || username !== portalUsername) return false;
  if (portalPasswordHash && portalPasswordSalt) {
    const actual = Buffer.from(hashPassword(password, portalPasswordSalt), "hex");
    const expected = Buffer.from(portalPasswordHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  return !isProduction && portalPassword && password === portalPassword;
}

function signSession(sessionId) {
  return createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
}

function applicationUploadToken(applicationId) {
  return createHmac("sha256", sessionSecret).update(`application-upload:${applicationId}`).digest("hex");
}

function validApplicationUploadToken(applicationId, token) {
  const expected = Buffer.from(applicationUploadToken(applicationId));
  const actual = Buffer.from(String(token || ""));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function createSession(username) {
  const id = randomBytes(32).toString("hex");
  sessions.set(id, { username, createdAt: Date.now(), expiresAt: Date.now() + 8 * 60 * 60 * 1000, role: username === portalUsername ? "admin" : "client", customerId: null });
  return `${id}.${signSession(id)}`;
}

function getSession(request) {
  const value = parseCookies(request).np_session;
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature || signature !== signSession(id)) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return { id, ...session };
}

function protectedPath(pathname) {
  return (pathname.startsWith("/portal/") && pathname !== "/portal/") ||
    pathname.startsWith("/employee/") ||
    pathname.startsWith("/admin/") ||
    /^\/NP_[A-Za-z0-9_]+\.html$/.test(pathname) ||
    pathname.startsWith("/docs/");
}

async function readBody(request) {
  const raw = await readRawBody(request, 512 * 1024);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 });
  }
}

async function readRawBody(request, maxBytes = 10 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("Request body is too large."), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const publicAsset = normalized.startsWith("/vendor/") || normalized.startsWith("/docs/");
  let clean = normalized === "/" ? "/index.html" : publicAsset ? `/public${normalized}` : normalized;
  let filePath = resolve(join(root, clean));
  if (!filePath.startsWith(root)) return null;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = resolve(join(filePath, "index.html"));
  }
  if (!existsSync(filePath) && !extname(filePath)) {
    const withIndex = resolve(join(root, clean, "index.html"));
    if (withIndex.startsWith(root)) filePath = withIndex;
  }
  return filePath;
}

function portalData() {
  return {
    dashboard: operationalDashboard(),
    integrations: syncStatus(),
    sharePointFolders: sharePointFolderPlan(),
    dataPolicy: "Operational values come from the canonical database. External source states are shown explicitly when credentials or contracts are not configured."
  };
}

function adminSummary() {
  const dashboard = operationalDashboard();
  const leads = listLeads(20);
  return {
    metrics: {
      leads: leads.length,
      users: sessions.size,
      customers: dashboard.customers,
      products: dashboard.products,
      openOrders: dashboard.openOrders,
      pendingSyncEvents: dashboard.pendingSyncEvents
    },
    leads,
    applications: listApplications(20),
    integrations: syncStatus(),
    audit: listAudit(30),
    sourceStatus: dashboard.sourceStatus,
    dataFreshness: dashboard.dataFreshness
  };
}

function authenticated(request, response, roles = []) {
  const session = getSession(request);
  if (!session) {
    json(response, 401, { error: "Authentication required." });
    return null;
  }
  if (roles.length && !roles.includes(session.role)) {
    json(response, 403, { error: "You do not have permission for this action." });
    return null;
  }
  return session;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname === "/api/security/csrf" && request.method === "GET") {
      const token = csrfToken(request) || randomBytes(24).toString("hex");
      json(response, 200, { csrfToken: token }, { "Set-Cookie": cookie("np_csrf", token, { httpOnly: false, maxAge: 3600 }) });
      return;
    }

    if (pathname === "/api/auth/login" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!rateLimit(request, "login", 8, 15 * 60 * 1000)) return json(response, 429, { error: "Too many login attempts. Try again later." });
      const body = await readBody(request);
      if (!verifyPassword(String(body.username || ""), String(body.password || ""))) {
        return json(response, 401, { error: "Invalid username or password." });
      }
      const sessionCookie = createSession(String(body.username));
      json(response, 200, { ok: true, redirectTo: "/employee/dashboard/" }, { "Set-Cookie": cookie("np_session", sessionCookie, { maxAge: 60 * 60 * 8 }) });
      return;
    }

    if (pathname === "/api/auth/logout" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = getSession(request);
      if (session) sessions.delete(session.id);
      json(response, 200, { ok: true }, { "Set-Cookie": cookie("np_session", "", { maxAge: 0 }) });
      return;
    }

    if (pathname === "/api/contact" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!rateLimit(request, "contact", 12, 60 * 60 * 1000)) return json(response, 429, { error: "Too many submissions. Try again later." });
      const body = await readBody(request);
      const lead = createLead(body);
      json(response, 201, { ok: true, lead });
      return;
    }

    if (pathname === "/api/account-applications" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!rateLimit(request, "account-application", 5, 60 * 60 * 1000)) return json(response, 429, { error: "Too many applications. Try again later." });
      const application = submitCustomerApplication(await readBody(request));
      json(response, 201, { ok: true, application: { ...application, uploadToken: applicationUploadToken(application.id) } });
      return;
    }

    const applicationDocumentMatch = pathname.match(/^\/api\/account-applications\/([^/]+)\/documents$/);
    if (applicationDocumentMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!rateLimit(request, "application-document", 30, 60 * 60 * 1000)) return json(response, 429, { error: "Too many document uploads." });
      if (!validApplicationUploadToken(applicationDocumentMatch[1], url.searchParams.get("uploadToken"))) return json(response, 403, { error: "Invalid application upload token." });
      const context = applicationDocumentContext(applicationDocumentMatch[1]);
      const document = storeDocument({
        bytes: await readRawBody(request),
        fileName: url.searchParams.get("fileName"),
        contentType: String(request.headers["content-type"] || "application/octet-stream").split(";")[0],
        documentClass: url.searchParams.get("documentClass") || "customer_onboarding",
        entityType: "account_application",
        entityId: context.id,
        businessNumber: context.applicationNumber,
        displayName: context.companyName,
        actor: "public_applicant"
      });
      json(response, 201, { document });
      return;
    }

    const activationMatch = pathname.match(/^\/api\/account-applications\/([^/]+)\/activate$/);
    if (activationMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = authenticated(request, response, ["admin"]);
      if (!session) return;
      const customer = activateCustomer(activationMatch[1], session.username);
      json(response, 200, { ok: true, customer });
      return;
    }

    if (pathname === "/api/portal/session" && request.method === "GET") {
      const session = getSession(request);
      if (!session) return json(response, 401, { error: "Authentication required." });
      json(response, 200, { user: { username: session.username, role: session.role } });
      return;
    }

    if (pathname === "/api/portal/data" && request.method === "GET") {
      if (!getSession(request)) return json(response, 401, { error: "Authentication required." });
      json(response, 200, portalData());
      return;
    }

    if (pathname === "/api/dashboard" && request.method === "GET") {
      const session = authenticated(request, response);
      if (!session) return;
      const customerId = session.role === "client" ? session.customerId : null;
      json(response, 200, operationalDashboard(customerId));
      return;
    }

    if (pathname === "/api/catalog/products" && request.method === "GET") {
      if (!authenticated(request, response)) return;
      json(response, 200, { products: listProducts(url.searchParams.get("q") || ""), dataFreshness: new Date().toISOString() });
      return;
    }

    if (pathname === "/api/customers" && request.method === "GET") {
      if (!authenticated(request, response, ["admin"])) return;
      json(response, 200, { customers: listCustomers(url.searchParams.get("q") || "") });
      return;
    }

    if (pathname === "/api/suppliers" && request.method === "GET") {
      if (!authenticated(request, response, ["admin"])) return;
      json(response, 200, { suppliers: listSuppliers(url.searchParams.get("q") || "") });
      return;
    }

    if (pathname === "/api/suppliers" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 201, { supplier: createSupplier(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/products" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 201, { product: createProduct(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/orders" && request.method === "GET") {
      const session = authenticated(request, response);
      if (!session) return;
      json(response, 200, { orders: listOrders({ customerId: session.role === "client" ? session.customerId : null }) });
      return;
    }

    if (pathname === "/api/orders" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = authenticated(request, response);
      if (!session) return;
      const scopedCustomerId = session.role === "client" ? session.customerId : null;
      json(response, 201, { order: createOrder(await readBody(request), session.username, scopedCustomerId) });
      return;
    }

    if (pathname === "/api/purchase-orders" && request.method === "GET") {
      if (!authenticated(request, response, ["admin"])) return;
      json(response, 200, { purchaseOrders: listPurchaseOrders() });
      return;
    }

    if (pathname === "/api/purchase-orders" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 201, { purchaseOrder: createPurchaseOrder(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/documents/upload" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = authenticated(request, response);
      if (!session) return;
      const bytes = await readRawBody(request);
      const document = storeDocument({
        bytes,
        fileName: url.searchParams.get("fileName"),
        contentType: String(request.headers["content-type"] || "application/octet-stream").split(";")[0],
        documentClass: url.searchParams.get("documentClass") || "general",
        entityType: url.searchParams.get("entityType"),
        entityId: url.searchParams.get("entityId"),
        businessNumber: url.searchParams.get("businessNumber"),
        displayName: url.searchParams.get("displayName"),
        actor: session.username
      });
      json(response, 201, { document });
      return;
    }

    if (pathname === "/api/integrations/status" && request.method === "GET") {
      if (!authenticated(request, response, ["admin"])) return;
      json(response, 200, { integrations: syncStatus(), sharePointFolders: sharePointFolderPlan() });
      return;
    }

    if (pathname === "/api/integrations/sharepoint/sync" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!authenticated(request, response, ["admin"])) return;
      json(response, 200, await processSharePointEvents({ limit: 50 }));
      return;
    }

    if (pathname === "/api/integrations/polar-speed/sync" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!authenticated(request, response, ["admin"])) return;
      json(response, 200, await processPolarSpeedEvents({ limit: 50 }));
      return;
    }

    if (pathname === "/api/health" && request.method === "GET") {
      json(response, 200, {
        status: "ok",
        database: databaseReady() ? "ready" : "unavailable",
        sharePoint: process.env.MICROSOFT_TENANT_ID ? "configured" : "credentials_required",
        polarSpeed: process.env.POLAR_SPEED_API_BASE_URL ? "configured" : "api_contract_required"
      });
      return;
    }

    if (pathname === "/api/admin/summary" && request.method === "GET") {
      const session = authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 200, adminSummary());
      return;
    }

    if (protectedPath(pathname) && !getSession(request)) {
      response.writeHead(302, securityHeaders({ Location: "/portal/" }));
      response.end();
      return;
    }

    const filePath = safeFilePath(pathname);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      send(response, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const type = mime[extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, securityHeaders({ "Content-Type": type, "Cache-Control": type.startsWith("text/html") ? "no-store" : "public, max-age=31536000, immutable" }));
    createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error(error);
    const status = Number(error.statusCode || (String(error.code || "").startsWith("SQLITE_CONSTRAINT") ? 409 : 500));
    json(response, status, { error: status >= 500 ? "Server error." : error.message });
  }
});

server.on("error", (error) => {
  console.error(`NovaPharm Healthcare website failed to start on ${host}:${port}.`, error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`NovaPharm Healthcare website running at http://${host}:${port}/`);
});
