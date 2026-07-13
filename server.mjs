import "dotenv/config";
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { constants as zlibConstants, createBrotliCompress, createGzip } from "node:zlib";
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
  leadNotificationContext,
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
import { previewAccessAllowed } from "./src/core/preview-auth.mjs";
import {
  changePassword,
  consumeRateLimit,
  countActiveSessions,
  createPersistentSession,
  getPersistentSession,
  hasPortalAdministrator,
  portalUsersFromEnvironment,
  provisionBootstrapAdmin,
  provisionAuthUsers,
  recordSecurityEvent,
  revokePersistentSession,
  verifyCredentials
} from "./src/core/auth-service.mjs";
import { databaseReady } from "./src/data/database.mjs";
import { processSharePointEvents, sharePointFolderPlan } from "./src/integrations/sharepoint/sync-engine.mjs";
import { processPolarSpeedEvents } from "./src/integrations/polar-speed/sync-engine.mjs";
import { emailIntegrationStatus, sendLeadNotifications } from "./src/integrations/email/client.mjs";

const root = resolve(process.cwd());
const applicationVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const secureContentRoot = resolve(process.env.SECURE_CONTENT_ROOT || join(root, "_secure"));
const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.PREVIEW_MODE === "true";
const previewUsername = String(process.env.PREVIEW_ACCESS_USERNAME || "");
const previewPassword = String(process.env.PREVIEW_ACCESS_PASSWORD || "");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : "local-dev-session-secret-change-me");
const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN || process.env.SITE_URL || `http://${host}:${port}`).origin;
const accessRedirects = {
  customer: "/portal/dashboard/",
  employee: "/employee/dashboard/",
  board: "/portal/executive-platform/",
  admin: "/admin/dashboard/"
};
const configuredPortalUsers = portalUsersFromEnvironment(process.env, { isProduction });

if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 bytes.");
}
if (isPreview && (!previewUsername || !previewPassword)) throw new Error("PREVIEW_ACCESS_USERNAME and PREVIEW_ACCESS_PASSWORD are required when PREVIEW_MODE=true.");

if (isProduction) {
  for (const variable of ["DATABASE_PATH", "SECURE_CONTENT_ROOT", "DOCUMENT_STORAGE_ROOT", "PUBLIC_ORIGIN", "PUBLIC_API_ORIGIN", "SITE_URL"]) {
    if (!process.env[variable]) throw new Error(`${variable} is required in production.`);
  }
  if (host !== "0.0.0.0") throw new Error("HOST must be 0.0.0.0 in production.");
  if (!publicOrigin.startsWith("https://")) throw new Error("PUBLIC_ORIGIN must use HTTPS in production.");
  for (const variable of ["PUBLIC_API_ORIGIN", "SITE_URL"]) {
    if (new URL(process.env[variable]).origin !== publicOrigin) throw new Error(`${variable} must match PUBLIC_ORIGIN.`);
  }
}

await provisionBootstrapAdmin(process.env, { requireCompromiseCheck: isProduction, fetchImplementation: isProduction ? globalThis.fetch : null });
if (configuredPortalUsers.length) provisionAuthUsers(configuredPortalUsers);
if (!hasPortalAdministrator()) {
  if (isProduction) throw new Error("A persistent portal administrator must be configured in production.");
  console.warn("Portal login is not configured. Set the initial admin variables or PORTAL_USERS_JSON with hashed credentials.");
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf"
};

const blockedPublicTopLevel = new Set([
  "_secure",
  "architecture",
  "audit",
  "compliance",
  "data",
  "database",
  "deployment",
  "final-report",
  "geo",
  "integrations",
  "node_modules",
  "performance",
  "private-content",
  "public",
  "scripts",
  "security",
  "seo",
  "sharepoint",
  "src"
]);
const blockedPublicRootFiles = new Set([
  "Dockerfile",
  "package.json",
  "package-lock.json",
  "README.md",
  "render.yaml",
  "server.mjs"
]);

function securityHeaders(extra = {}, { allowPrivateInline = false } = {}) {
  const productionUpgrade = isProduction ? ["upgrade-insecure-requests"] : [];
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src 'self'${allowPrivateInline ? " 'unsafe-inline'" : ""}`,
      `style-src 'self'${allowPrivateInline ? " 'unsafe-inline'" : ""}`,
      "font-src 'self'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "worker-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...productionUpgrade
    ].join("; "),
    ...extra
  };
  if (isPreview) headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
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

function hasAllowedOrigin(request) {
  if (!isProduction) return true;
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).origin === publicOrigin;
  } catch {
    return false;
  }
}

function networkFingerprint(request) {
  const address = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.socket.remoteAddress || "local";
  return createHmac("sha256", sessionSecret).update(address).digest("hex");
}

function rateLimit(request, key, limit, windowMs) {
  return consumeRateLimit(`${key}:${networkFingerprint(request)}`, limit, windowMs).allowed;
}

function normalizeAccessType(value) {
  return accessRedirects[String(value || "").toLowerCase()] ? String(value).toLowerCase() : "customer";
}

function signSession(sessionId) {
  return createHmac("sha256", sessionSecret).update(sessionId).digest("hex");
}

function validSessionSignature(id, signature) {
  if (!id || !signature) return false;
  const expected = Buffer.from(signSession(id), "hex");
  const actual = Buffer.from(String(signature), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function applicationUploadToken(applicationId) {
  const expiresAt = Date.now() + 30 * 60 * 1000;
  const signature = createHmac("sha256", sessionSecret).update(`application-upload:${applicationId}:${expiresAt}`).digest("hex");
  return `${expiresAt}.${signature}`;
}

function validApplicationUploadToken(applicationId, token) {
  const [expiresAtValue, signature] = String(token || "").split(".");
  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 31 * 60 * 1000) return false;
  const expected = Buffer.from(createHmac("sha256", sessionSecret).update(`application-upload:${applicationId}:${expiresAt}`).digest("hex"), "hex");
  const actual = Buffer.from(String(signature || ""), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function createSession(user, accessType = "customer") {
  const { id } = createPersistentSession(user, accessType, sessionTtlMs);
  return `${id}.${signSession(id)}`;
}

function getSession(request) {
  const value = parseCookies(request).np_session;
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!validSessionSignature(id, signature)) return null;
  return getPersistentSession(id);
}

function protectedPath(pathname) {
  return (pathname.startsWith("/portal/") && pathname !== "/portal/") ||
    pathname.startsWith("/employee/") ||
    pathname.startsWith("/board/") ||
    pathname.startsWith("/admin/") ||
    /^\/NP_[A-Za-z0-9_]+\.html$/.test(pathname) ||
    pathname.startsWith("/docs/");
}

function requiredScope(pathname) {
  if (pathname.startsWith("/admin/")) return "admin";
  if (pathname.startsWith("/employee/")) return "employee";
  if (pathname.startsWith("/board/") || pathname.startsWith("/portal/executive-platform/") || pathname.startsWith("/portal/ceo-dashboard/") || /^\/NP_[A-Za-z0-9_]+\.html$/.test(pathname) || pathname.startsWith("/docs/")) return "board";
  if (pathname.startsWith("/portal/")) return "customer";
  return null;
}

function canAccessPath(session, pathname) {
  if (pathname === "/portal/change-password" || pathname === "/portal/change-password/") return Boolean(session);
  const scope = requiredScope(pathname);
  if (!scope) return true;
  return session?.accessScopes?.includes(scope) || session?.accessScopes?.includes("admin");
}

function hasScope(session, scopes) {
  return Boolean(session && scopes.some((scope) => session.accessScopes?.includes(scope) || session.accessScopes?.includes("admin")));
}

function isWithinDirectory(directory, filePath) {
  const pathFromDirectory = relative(directory, filePath);
  return pathFromDirectory === "" || (!pathFromDirectory.startsWith("..") && !isAbsolute(pathFromDirectory));
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
  const pathSegments = normalized.split("/").filter(Boolean);
  if (pathSegments.some((segment) => segment.startsWith("."))) return null;
  if (blockedPublicTopLevel.has(pathSegments[0])) return null;
  if (pathSegments.length === 1 && blockedPublicRootFiles.has(pathSegments[0])) return null;
  const executivePrefix = "/portal/executive-platform";
  const rootExecutiveMatch = normalized.match(/^\/(NP_[A-Za-z0-9_]+\.html)$/);
  let filePath;

  const secureFile = (path) => {
    const candidate = resolve(secureContentRoot, path);
    return isWithinDirectory(secureContentRoot, candidate) ? candidate : null;
  };
  const publicFile = (path) => {
    const candidate = resolve(root, `.${path}`);
    return isWithinDirectory(root, candidate) ? candidate : null;
  };

  if (normalized === "/") {
    filePath = publicFile("/index.html");
  } else if (normalized === "/portal/ceo-dashboard" || normalized === "/portal/ceo-dashboard/") {
    filePath = secureFile("executive-platform/NP_CEO.html");
  } else if (normalized === executivePrefix || normalized === `${executivePrefix}/`) {
    filePath = secureFile("executive-platform/index.html");
  } else if (normalized.startsWith(`${executivePrefix}/`)) {
    filePath = secureFile(`executive-platform/${normalized.slice(`${executivePrefix}/`.length)}`);
  } else if (rootExecutiveMatch) {
    filePath = secureFile(`executive-platform/${rootExecutiveMatch[1]}`);
  } else if (normalized.startsWith("/docs/")) {
    filePath = secureFile(`executive-platform/docs/${normalized.slice("/docs/".length)}`);
  } else if ((normalized.startsWith("/portal/") && normalized !== "/portal/") || normalized.startsWith("/employee/") || normalized.startsWith("/admin/") || normalized.startsWith("/board/")) {
    filePath = secureFile(normalized.slice(1));
  } else if (normalized.startsWith("/vendor/")) {
    filePath = publicFile(`/public${normalized}`);
  } else {
    filePath = publicFile(normalized);
  }
  if (!filePath) return null;

  const contentRoot = isWithinDirectory(secureContentRoot, filePath) ? secureContentRoot : root;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = resolve(join(filePath, "index.html"));
  }
  if (!existsSync(filePath) && !extname(filePath)) {
    const withIndex = resolve(join(filePath, "index.html"));
    if (isWithinDirectory(contentRoot, withIndex)) filePath = withIndex;
  }
  return isWithinDirectory(contentRoot, filePath) ? filePath : null;
}

function portalData(session) {
  if (session.role === "client") {
    return {
      dashboard: operationalDashboard(session.customerId),
      dataPolicy: "Customer values are restricted to the authenticated customer account and come from the canonical database."
    };
  }
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
      activeSessions: countActiveSessions(),
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
  if (session.mustChangePassword) {
    json(response, 403, { error: "A password change is required before this action.", code: "password_change_required", redirectTo: "/portal/change-password/" });
    return null;
  }
  return session;
}

function scopedAuthentication(request, response, scopes, roles = []) {
  const session = authenticated(request, response, roles);
  if (!session) return null;
  if (!hasScope(session, scopes)) {
    json(response, 403, { error: "You do not have permission for this portal area." });
    return null;
  }
  return session;
}

export async function handleRequest(request, response) {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (isPreview && !["/api/health", "/robots.txt"].includes(pathname) && !previewAccessAllowed(request.headers.authorization, previewUsername, previewPassword)) {
      return send(response, 401, "Preview authentication required.", {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Basic realm="NovaPharm private preview", charset="UTF-8"'
      });
    }

    if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method || "GET") && !hasAllowedOrigin(request)) {
      recordSecurityEvent({ eventType: "request.origin_rejected", networkFingerprint: networkFingerprint(request), outcome: "denied", details: { pathname } });
      return json(response, 403, { error: "Request origin is not permitted.", code: "origin_rejected" });
    }

    if (pathname === "/api/security/csrf" && request.method === "GET") {
      const token = csrfToken(request) || randomBytes(24).toString("hex");
      json(response, 200, { csrfToken: token }, { "Set-Cookie": cookie("np_csrf", token, { httpOnly: false, maxAge: 3600 }) });
      return;
    }

    if (pathname === "/robots.txt" && request.method === "GET" && isPreview) {
      send(response, 200, "User-agent: *\nDisallow: /\n", { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      return;
    }

    if (pathname === "/api/auth/login" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!rateLimit(request, "login", 8, 15 * 60 * 1000)) return json(response, 429, { error: "Too many login attempts. Try again later." });
      const body = await readBody(request);
      const user = verifyCredentials(String(body.username || ""), String(body.password || ""), networkFingerprint(request));
      if (!user) {
        return json(response, 401, { error: "Invalid username or password." });
      }
      const accessType = normalizeAccessType(body.accessType);
      if (!hasScope(user, [accessType])) {
        return json(response, 403, { error: "This account is not authorised for the selected portal area." });
      }
      const sessionCookie = createSession(user, accessType);
      const redirectTo = user.mustChangePassword ? "/portal/change-password/" : accessRedirects[accessType];
      json(response, 200, { ok: true, accessType, mustChangePassword: user.mustChangePassword, redirectTo }, { "Set-Cookie": cookie("np_session", sessionCookie, { maxAge: Math.floor(sessionTtlMs / 1000) }) });
      return;
    }

    if (pathname === "/api/auth/change-password" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!rateLimit(request, "password-change", 6, 15 * 60 * 1000)) return json(response, 429, { error: "Too many password-change attempts. Try again later." });
      const existingSession = getSession(request);
      if (!existingSession) return json(response, 401, { error: "Authentication required." });
      const body = await readBody(request);
      const user = await changePassword({
        username: existingSession.username,
        currentPassword: String(body.currentPassword || ""),
        newPassword: String(body.newPassword || ""),
        confirmation: String(body.confirmation || ""),
        networkFingerprint: networkFingerprint(request),
        requireCompromiseCheck: isProduction,
        fetchImplementation: isProduction ? globalThis.fetch : null
      });
      const sessionCookie = createSession(user, existingSession.accessType);
      json(response, 200, { ok: true, redirectTo: accessRedirects[existingSession.accessType] }, { "Set-Cookie": cookie("np_session", sessionCookie, { maxAge: Math.floor(sessionTtlMs / 1000) }) });
      return;
    }

    if (pathname === "/api/auth/logout" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = getSession(request);
      if (session) revokePersistentSession(session.id);
      json(response, 200, { ok: true }, { "Set-Cookie": cookie("np_session", "", { maxAge: 0 }) });
      return;
    }

    if (pathname === "/api/contact" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!rateLimit(request, "contact", 12, 60 * 60 * 1000)) return json(response, 429, { error: "Too many submissions. Try again later." });
      const body = await readBody(request);
      const lead = createLead(body);
      if (lead.id) {
        try {
          await sendLeadNotifications(leadNotificationContext(lead.id));
        } catch (error) {
          console.error("Contact notification delivery failed.", { status: error.providerStatus || "unavailable" });
        }
      }
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
      json(response, 200, { user: { username: session.username, displayName: session.displayName, role: session.role, accessType: session.accessType, accessScopes: session.accessScopes, mustChangePassword: session.mustChangePassword } });
      return;
    }

    if (pathname === "/api/portal/data" && request.method === "GET") {
      const session = scopedAuthentication(request, response, ["customer", "employee", "board"]);
      if (!session) return;
      json(response, 200, portalData(session));
      return;
    }

    if (pathname === "/api/dashboard" && request.method === "GET") {
      const session = scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      if (session.role === "client" && !session.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      const customerId = session.role === "client" ? session.customerId : null;
      json(response, 200, operationalDashboard(customerId));
      return;
    }

    if (pathname === "/api/catalog/products" && request.method === "GET") {
      const session = scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      if (session.role === "client" && !session.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      json(response, 200, { products: listProducts(url.searchParams.get("q") || "", { customerVisibleOnly: session.role === "client" }), dataFreshness: new Date().toISOString() });
      return;
    }

    if (pathname === "/api/customers" && request.method === "GET") {
      if (!scopedAuthentication(request, response, ["employee"])) return;
      json(response, 200, { customers: listCustomers(url.searchParams.get("q") || "") });
      return;
    }

    if (pathname === "/api/suppliers" && request.method === "GET") {
      if (!scopedAuthentication(request, response, ["employee"])) return;
      json(response, 200, { suppliers: listSuppliers(url.searchParams.get("q") || "") });
      return;
    }

    if (pathname === "/api/suppliers" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      json(response, 201, { supplier: createSupplier(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/products" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      json(response, 201, { product: createProduct(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/orders" && request.method === "GET") {
      const session = scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      if (session.role === "client" && !session.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      json(response, 200, { orders: listOrders({ customerId: session.role === "client" ? session.customerId : null }) });
      return;
    }

    if (pathname === "/api/orders" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      if (session.role === "client" && !session.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      const scopedCustomerId = session.role === "client" ? session.customerId : null;
      json(response, 201, { order: createOrder(await readBody(request), session.username, scopedCustomerId) });
      return;
    }

    if (pathname === "/api/purchase-orders" && request.method === "GET") {
      if (!scopedAuthentication(request, response, ["employee"])) return;
      json(response, 200, { purchaseOrders: listPurchaseOrders() });
      return;
    }

    if (pathname === "/api/purchase-orders" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      json(response, 201, { purchaseOrder: createPurchaseOrder(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/documents/upload" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = scopedAuthentication(request, response, ["customer", "employee", "board"]);
      if (!session) return;
      const requestedEntityType = url.searchParams.get("entityType");
      const requestedEntityId = url.searchParams.get("entityId");
      if (session.role === "client" && (!session.customerId || requestedEntityType !== "customer" || requestedEntityId !== session.customerId)) {
        return json(response, 403, { error: "Customer documents must be linked to the authenticated customer account." });
      }
      const bytes = await readRawBody(request);
      const document = storeDocument({
        bytes,
        fileName: url.searchParams.get("fileName"),
        contentType: String(request.headers["content-type"] || "application/octet-stream").split(";")[0],
        documentClass: url.searchParams.get("documentClass") || "general",
        entityType: requestedEntityType,
        entityId: requestedEntityId,
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
      const ready = databaseReady();
      json(response, ready ? 200 : 503, {
        status: ready ? "ok" : "degraded",
        service: "novapharm-web",
        version: applicationVersion,
        environment: isProduction ? "production" : "development",
        timestamp: new Date().toISOString(),
        database: ready ? "ready" : "unavailable",
        email: emailIntegrationStatus(),
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

    const pathSession = protectedPath(pathname) ? getSession(request) : null;
    if (protectedPath(pathname) && !pathSession) {
      response.writeHead(302, securityHeaders({ Location: "/portal/" }));
      response.end();
      return;
    }
    if (pathSession?.mustChangePassword && pathname !== "/portal/change-password" && pathname !== "/portal/change-password/") {
      response.writeHead(302, securityHeaders({ Location: "/portal/change-password/" }));
      response.end();
      return;
    }
    if (protectedPath(pathname) && !canAccessPath(pathSession, pathname)) {
      response.writeHead(302, securityHeaders({ Location: "/portal/" }));
      response.end();
      return;
    }

    const filePath = safeFilePath(pathname);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      const notFoundPage = join(root, "404.html");
      const acceptsHtml = String(request.headers.accept || "").includes("text/html");
      if (acceptsHtml && existsSync(notFoundPage)) {
        response.writeHead(404, securityHeaders({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }));
        createReadStream(notFoundPage).pipe(response);
      } else {
        send(response, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      }
      return;
    }

    const type = mime[extname(filePath).toLowerCase()] || "application/octet-stream";
    const privateContent = isWithinDirectory(secureContentRoot, filePath);
    const cacheControl = privateContent
      ? "no-store"
      : type.startsWith("text/html")
        ? "public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=86400"
        : "public, max-age=3600, s-maxage=604800, stale-while-revalidate=2592000";
    const staticHeaders = securityHeaders({ "Content-Type": type, "Cache-Control": cacheControl }, { allowPrivateInline: privateContent });
    if (privateContent || pathname === "/portal" || pathname.startsWith("/portal/") || pathname.startsWith("/employee/") || pathname.startsWith("/admin/") || pathname.startsWith("/board/") || pathname.startsWith("/docs/")) {
      staticHeaders["X-Robots-Tag"] = "noindex, nofollow, noarchive";
    }
    const acceptedEncoding = String(request.headers["accept-encoding"] || "");
    const canCompress = /^(?:text\/|application\/(?:javascript|json|manifest\+json|xml))|image\/svg\+xml/.test(type);
    if (canCompress && acceptedEncoding.includes("br")) Object.assign(staticHeaders, { "Content-Encoding": "br", Vary: "Accept-Encoding" });
    else if (canCompress && acceptedEncoding.includes("gzip")) Object.assign(staticHeaders, { "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
    response.writeHead(200, staticHeaders);
    if (canCompress && acceptedEncoding.includes("br")) createReadStream(filePath).pipe(createBrotliCompress({ params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } })).pipe(response);
    else if (canCompress && acceptedEncoding.includes("gzip")) createReadStream(filePath).pipe(createGzip({ level: 6 })).pipe(response);
    else createReadStream(filePath).pipe(response);
  } catch (error) {
    const status = Number(error.statusCode || (String(error.code || "").startsWith("SQLITE_CONSTRAINT") ? 409 : 500));
    if (status >= 500) console.error(error);
    const acceptsHtml = String(request.headers.accept || "").includes("text/html");
    if (status >= 500 && acceptsHtml && !String(request.url || "").startsWith("/api/") && !response.headersSent) {
      const errorPage = join(root, "500.html");
      if (existsSync(errorPage)) {
        response.writeHead(status, securityHeaders({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }));
        createReadStream(errorPage).pipe(response);
        return;
      }
    }
    json(response, status, { error: status >= 500 ? "Server error." : error.message });
  }
}

export const server = createServer(handleRequest);

server.on("error", (error) => {
  console.error(`NovaPharm Healthcare website failed to start on ${host}:${port}.`, error);
  process.exitCode = 1;
});

const startedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (startedDirectly) {
  server.listen(port, host, () => {
    console.log(`NovaPharm Healthcare website running at http://${host}:${port}/`);
  });
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; completing active requests before shutdown.`);
    const forceTimer = setTimeout(() => {
      server.closeAllConnections();
      process.exitCode = 1;
    }, 25000);
    forceTimer.unref();
    server.close(() => {
      clearTimeout(forceTimer);
      console.log("NovaPharm Healthcare website stopped cleanly.");
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
