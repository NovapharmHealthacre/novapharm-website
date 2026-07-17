import "dotenv/config";
import { observabilityStatus } from "./src/observability/azure-monitor.mjs";
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { constants as zlibConstants, createBrotliCompress, createGzip } from "node:zlib";
import {
  activateCustomer,
  applicationDetail,
  applicationDocumentContext,
  applicationNotificationContext,
  createLead,
  createOrder,
  createPurchaseOrder,
  createProduct,
  createSupplier,
  listApplications,
  listAudit,
  listCustomers,
  leadDetail,
  leadNotificationContext,
  listLeads,
  listOrders,
  listProducts,
  listPurchaseOrders,
  listSuppliers,
  operationalDashboard,
  markApplicationDocumentsSubmitted,
  setApplicationStatus,
  submitCustomerApplication,
  syncStatus
} from "./src/core/domain-service.mjs";
import { storeDocument } from "./src/core/document-service.mjs";
import {
  applicationUploadState,
  completeApplicationUploads,
  createApplicationUploadAuthorisations,
  refreshApplicationUploadAuthorisations,
  releaseApplicationUploadReservation,
  reserveApplicationUpload
} from "./src/core/application-upload-service.mjs";
import { previewAccessAllowed } from "./src/core/preview-auth.mjs";
import {
  advanceWorkflow,
  authorisedEnterpriseSearch,
  createCustomerQualityComplaint,
  createCustomerReturn,
  createCustomerSupport,
  enterpriseModuleSnapshot,
  transitionProductLifecycle
} from "./src/core/enterprise-domain-service.mjs";
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
  revokeUserSessions,
  verifyCredentials
} from "./src/core/auth-service.mjs";
import { databaseProvider, databaseReady } from "./src/data/database.mjs";
import { processSharePointEvents, sharePointFolderPlan } from "./src/integrations/sharepoint/sync-engine.mjs";
import { processPolarSpeedEvents } from "./src/integrations/polar-speed/sync-engine.mjs";
import { processDocumentScanEvents } from "./src/integrations/azure-storage/scan-engine.mjs";
import { emailIntegrationStatus, emailNotificationPreview, emailQueueStatus, processEmailRetries, replayEmailNotification, sendApplicationNotifications, sendLeadNotifications } from "./src/integrations/email/client.mjs";
import { documentStorageStatus } from "./src/storage/document-store.mjs";
import { appServicePrincipalFromHeaders, provisionFederatedIdentity } from "./src/core/entra-identity.mjs";
import { isResolvedSecret, isUnresolvedSecretReference } from "./src/core/secret-value.mjs";
import { hasSharePointCredentials } from "./src/integrations/sharepoint/graph-client.mjs";

const root = resolve(process.cwd());
const applicationVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const secureContentRoot = resolve(process.env.SECURE_CONTENT_ROOT || join(root, "_secure"));

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.PREVIEW_MODE === "true";
const isLocalPortal = process.env.LOCAL_PORTAL_MODE === "true";
const previewUsername = String(process.env.PREVIEW_ACCESS_USERNAME || "");
const previewPassword = String(process.env.PREVIEW_ACCESS_PASSWORD || "");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : "local-dev-session-secret-change-me");
const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const sessionIdleTimeoutMs = Number(process.env.SESSION_IDLE_TIMEOUT_MS || 30 * 60 * 1000);
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN || process.env.SITE_URL || `http://${host}:${port}`).origin;
const accessRedirects = {
  customer: "/portal/dashboard/",
  employee: "/employee/dashboard/",
  board: "/portal/executive-platform/",
  admin: "/admin/dashboard/"
};
const configuredPortalUsers = portalUsersFromEnvironment(process.env, { isProduction });

if (!isResolvedSecret(sessionSecret, { minimumBytes: 32 })) {
  throw new Error("SESSION_SECRET must resolve to at least 32 bytes.");
}
if (!Number.isFinite(sessionTtlMs) || sessionTtlMs <= 0 || !Number.isFinite(sessionIdleTimeoutMs) || sessionIdleTimeoutMs <= 0 || sessionIdleTimeoutMs > sessionTtlMs) {
  throw new Error("Session lifetimes must be positive and SESSION_IDLE_TIMEOUT_MS must not exceed SESSION_TTL_MS.");
}
if (isPreview && (!previewUsername || isUnresolvedSecretReference(previewUsername) || !isResolvedSecret(previewPassword, { minimumBytes: 16 }))) {
  throw new Error("PREVIEW_ACCESS_USERNAME and a resolved PREVIEW_ACCESS_PASSWORD of at least 16 bytes are required when PREVIEW_MODE=true.");
}
if (isLocalPortal) {
  const localRuntimeRoot = resolve(dirname(process.env.DATABASE_PATH || ""));
  if (isProduction || isPreview || host !== "127.0.0.1" || port !== 4173 || publicOrigin !== "http://127.0.0.1:4173") {
    throw new Error("LOCAL_PORTAL_MODE must run only at http://127.0.0.1:4173 in a non-production, non-preview process.");
  }
  if (databaseProvider !== "sqlite" || process.env.DOCUMENT_STORAGE_PROVIDER !== "local-validation" || process.env.EMAIL_PROVIDER !== "local-capture") {
    throw new Error("The local owner portal requires SQLite, local-validation document storage and local-capture email.");
  }
  for (const path of [process.env.DATABASE_PATH, process.env.DOCUMENT_STORAGE_ROOT]) {
    if (!path || !isWithinDirectory(localRuntimeRoot, resolve(path))) throw new Error("Local portal data must remain inside its protected runtime root.");
  }
  for (const variable of ["RESEND_API_KEY", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_CERTIFICATE_PRIVATE_KEY", "AZURE_STORAGE_CONNECTION_STRING", "SHAREPOINT_DRIVE_ID"]) {
    if (process.env[variable]) throw new Error(`${variable} must not be supplied to the local owner portal.`);
  }
}

if (isProduction) {
  for (const variable of ["SECURE_CONTENT_ROOT", "PUBLIC_ORIGIN", "PUBLIC_API_ORIGIN", "SITE_URL"]) {
    if (!process.env[variable]) throw new Error(`${variable} is required in production.`);
  }
  if (databaseProvider === "sqlite" && !process.env.DATABASE_PATH) throw new Error("DATABASE_PATH is required for the SQLite production provider.");
  if (databaseProvider === "azure-sql" && (!process.env.AZURE_SQL_SERVER || !process.env.AZURE_SQL_DATABASE)) {
    throw new Error("AZURE_SQL_SERVER and AZURE_SQL_DATABASE are required for the Azure SQL production provider.");
  }
  if (host !== "0.0.0.0") throw new Error("HOST must be 0.0.0.0 in production.");
  if (!publicOrigin.startsWith("https://")) throw new Error("PUBLIC_ORIGIN must use HTTPS in production.");
  for (const variable of ["PUBLIC_API_ORIGIN", "SITE_URL"]) {
    if (new URL(process.env[variable]).origin !== publicOrigin) throw new Error(`${variable} must match PUBLIC_ORIGIN.`);
  }
}

await provisionBootstrapAdmin(process.env, { requireCompromiseCheck: isProduction, fetchImplementation: isProduction ? globalThis.fetch : null });
if (configuredPortalUsers.length) await provisionAuthUsers(configuredPortalUsers);
if (!await hasPortalAdministrator() && process.env.ENTRA_AUTH_ENABLED !== "true") {
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
  if (isPreview || isLocalPortal) headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
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
  if (!isProduction && !isLocalPortal) return true;
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).origin === publicOrigin;
  } catch {
    return false;
  }
}

function hasAllowedHost(request) {
  if (!isProduction && !isLocalPortal) return true;
  const received = String(request.headers.host || "").toLowerCase();
  const allowed = new Set([
    new URL(publicOrigin).host.toLowerCase(),
    String(process.env.WEBSITE_HOSTNAME || "").toLowerCase()
  ].filter(Boolean));
  return allowed.has(received);
}

function networkFingerprint(request) {
  const forwardedAddress = process.env.WEBSITE_INSTANCE_ID
    ? request.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    : "";
  const address = forwardedAddress || request.socket.remoteAddress || "local";
  return createHmac("sha256", sessionSecret).update(address).digest("hex");
}

async function rateLimit(request, key, limit, windowMs) {
  return (await consumeRateLimit(`${key}:${networkFingerprint(request)}`, limit, windowMs)).allowed;
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

async function createSession(user, accessType = "customer") {
  const { id } = await createPersistentSession(user, accessType, sessionTtlMs);
  return `${id}.${signSession(id)}`;
}

function referrerDomain(request) {
  try { return request.headers.referer ? new URL(request.headers.referer).hostname : ""; }
  catch { return ""; }
}

function getSession(request) {
  const value = parseCookies(request).np_session;
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!validSessionSignature(id, signature)) return null;
  return getPersistentSession(id, { idleTimeoutMs: sessionIdleTimeoutMs });
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

function enterpriseContext(session) {
  const localOwnerCustomer = isLocalPortal && session.accessType === "customer" && hasScope(session, ["admin"])
    ? "demo-customer-001"
    : null;
  return {
    username: session.username,
    displayName: session.displayName,
    role: session.role,
    accessType: session.accessType,
    accessScopes: session.accessScopes,
    customerId: session.customerId || localOwnerCustomer,
    userId: session.userId || null
  };
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

async function portalData(session) {
  if (session.accessType === "customer") {
    const context = enterpriseContext(session);
    if (!context.customerId) throw Object.assign(new Error("A customer account is not linked to this identity."), { statusCode: 403 });
    return {
      dashboard: await operationalDashboard(context.customerId),
      dataPolicy: "Customer values are restricted to the authenticated customer account and come from the canonical database."
    };
  }
  return {
    dashboard: await operationalDashboard(),
    integrations: await syncStatus(),
    sharePointFolders: sharePointFolderPlan(),
    dataPolicy: "Operational values come from the canonical database. External source states are shown explicitly when credentials or contracts are not configured."
  };
}

async function adminSummary() {
  const dashboard = await operationalDashboard();
  const leads = await listLeads(20);
  const emailQueue = await emailQueueStatus();
  return {
    metrics: {
      leads: leads.length,
      activeSessions: await countActiveSessions(),
      customers: dashboard.customers,
      products: dashboard.products,
      openOrders: dashboard.openOrders,
      pendingSyncEvents: dashboard.pendingSyncEvents,
      emailDeliveryAttention: emailQueue.states
        .filter((state) => state.status === "retrying" || state.status === "blocked")
        .reduce((total, state) => total + Number(state.count || 0), 0)
    },
    leads,
    applications: await listApplications(20),
    integrations: await syncStatus(),
    emailQueue,
    audit: await listAudit(30),
    sourceStatus: dashboard.sourceStatus,
    dataFreshness: dashboard.dataFreshness
  };
}

async function healthSnapshot() {
  const databaseIsReady = await databaseReady();
  const identity = process.env.ENTRA_AUTH_ENABLED === "true"
    ? "entra_configured"
    : await hasPortalAdministrator() ? "local_validation_identity_configured" : "unavailable";
  const email = emailIntegrationStatus();
  const storage = documentStorageStatus();
  const ready = databaseIsReady && identity !== "unavailable" && email.startsWith("configured:") && Boolean(storage);
  return {
    status: ready ? "ready" : databaseIsReady ? "degraded" : "unavailable",
    service: "novapharm-web",
    version: applicationVersion,
    environment: isLocalPortal ? "local_validation" : isPreview ? "validation" : isProduction ? "production" : "development",
    timestamp: new Date().toISOString(),
    application: "live",
    database: databaseIsReady ? "ready" : "unavailable",
    migration: databaseIsReady ? "current" : "unavailable",
    email,
    documentStorage: storage,
    identity: isLocalPortal && identity !== "unavailable" ? "local_owner_validation_identity_configured" : identity,
    entra: isLocalPortal ? "disabled_local_validation" : process.env.ENTRA_AUTH_ENABLED === "true" ? "configured" : "owner_configuration_required",
    sharePoint: isLocalPortal ? "disabled_local_validation" : hasSharePointCredentials() ? "configured" : "owner_configuration_required",
    observability: isLocalPortal ? "disabled_local_validation" : observabilityStatus,
    ready
  };
}

async function authenticated(request, response, roles = []) {
  const session = await getSession(request);
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

async function scopedAuthentication(request, response, scopes, roles = []) {
  const session = await authenticated(request, response, roles);
  if (!session) return null;
  if (!hasScope(session, scopes)) {
    json(response, 403, { error: "You do not have permission for this portal area." });
    return null;
  }
  return session;
}

export async function handleRequest(request, response) {
  try {
    if (!hasAllowedHost(request)) return json(response, 421, { error: "The requested host is not available." });
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (isPreview && !["/api/health", "/api/health/live", "/api/health/ready", "/api/live", "/api/ready", "/robots.txt"].includes(pathname) && !previewAccessAllowed(request.headers.authorization, previewUsername, previewPassword)) {
      return send(response, 401, "Preview authentication required.", {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Basic realm="NovaPharm private preview", charset="UTF-8"'
      });
    }

    if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method || "GET") && !hasAllowedOrigin(request)) {
      await recordSecurityEvent({ eventType: "request.origin_rejected", networkFingerprint: networkFingerprint(request), outcome: "denied", details: { pathname } });
      return json(response, 403, { error: "Request origin is not permitted.", code: "origin_rejected" });
    }

    if (pathname === "/api/security/csrf" && request.method === "GET") {
      const token = csrfToken(request) || randomBytes(24).toString("hex");
      json(response, 200, { csrfToken: token }, { "Set-Cookie": cookie("np_csrf", token, { httpOnly: false, maxAge: 3600 }) });
      return;
    }

    if (pathname === "/robots.txt" && request.method === "GET" && (isPreview || isLocalPortal)) {
      send(response, 200, "User-agent: *\nDisallow: /\n", { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      return;
    }

    if (pathname === "/api/auth/login" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "login", 8, 15 * 60 * 1000)) return json(response, 429, { error: "Too many login attempts. Try again later." });
      const body = await readBody(request);
      const user = await verifyCredentials(String(body.username || ""), String(body.password || ""), networkFingerprint(request));
      if (!user) {
        return json(response, 401, { error: "Invalid username or password." });
      }
      const accessType = normalizeAccessType(body.accessType);
      if (!hasScope(user, [accessType])) {
        return json(response, 403, { error: "This account is not authorised for the selected portal area." });
      }
      const sessionCookie = await createSession(user, accessType);
      const redirectTo = user.mustChangePassword ? "/portal/change-password/" : accessRedirects[accessType];
      json(response, 200, { ok: true, accessType, mustChangePassword: user.mustChangePassword, redirectTo }, { "Set-Cookie": cookie("np_session", sessionCookie, { maxAge: Math.floor(sessionTtlMs / 1000) }) });
      return;
    }

    if (pathname === "/api/auth/federated" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "federated-login", 12, 15 * 60 * 1000)) return json(response, 429, { error: "Too many sign-in attempts. Try again later." });
      const identity = appServicePrincipalFromHeaders(request.headers);
      if (!identity) return json(response, 401, { error: "Microsoft sign-in could not be verified." });
      const user = await provisionFederatedIdentity(identity);
      if (!user) return json(response, 403, { error: "This Microsoft identity is not approved for a NovaPharm portal." });
      const body = await readBody(request);
      const accessType = normalizeAccessType(body.accessType);
      if (!hasScope(user, [accessType])) return json(response, 403, { error: "This identity is not authorised for the selected portal area." });
      const sessionCookie = await createSession(user, accessType);
      json(response, 200, { ok: true, accessType, redirectTo: accessRedirects[accessType] }, { "Set-Cookie": cookie("np_session", sessionCookie, { maxAge: Math.floor(sessionTtlMs / 1000) }) });
      return;
    }

    if (pathname === "/api/auth/change-password" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "password-change", 6, 15 * 60 * 1000)) return json(response, 429, { error: "Too many password-change attempts. Try again later." });
      const existingSession = await getSession(request);
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
      const sessionCookie = await createSession(user, existingSession.accessType);
      json(response, 200, { ok: true, redirectTo: accessRedirects[existingSession.accessType] }, { "Set-Cookie": cookie("np_session", sessionCookie, { maxAge: Math.floor(sessionTtlMs / 1000) }) });
      return;
    }

    if (pathname === "/api/auth/logout" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await getSession(request);
      if (session) await revokePersistentSession(session.id);
      json(response, 200, { ok: true, logoutUrl: session?.identityProvider?.startsWith("entra-") ? "/.auth/logout?post_logout_redirect_uri=/portal/" : "/portal/" }, { "Set-Cookie": cookie("np_session", "", { maxAge: 0 }) });
      return;
    }

    if (pathname === "/api/contact" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "contact", 12, 60 * 60 * 1000)) return json(response, 429, { error: "Too many submissions. Try again later." });
      const body = await readBody(request);
      const lead = await createLead({ ...body, referrerDomain: referrerDomain(request) }, "public_website", { networkFingerprint: networkFingerprint(request) });
      if (lead.id) {
        try {
          await sendLeadNotifications(await leadNotificationContext(lead.id));
        } catch (error) {
          console.error("Contact notification delivery failed.", { status: error.providerStatus || "unavailable" });
        }
      }
      json(response, 201, { ok: true, lead });
      return;
    }

    if (pathname === "/api/account-applications" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "account-application", 5, 60 * 60 * 1000)) return json(response, 429, { error: "Too many applications. Try again later." });
      const application = await submitCustomerApplication(await readBody(request));
      const uploadAuthorisations = await createApplicationUploadAuthorisations(application.id, application.expectedDocumentCount);
      try {
        await sendApplicationNotifications(await applicationNotificationContext(application.id));
      } catch (error) {
        console.error("Account application notification delivery failed.", { status: error.providerStatus || "unavailable" });
      }
      json(response, application.duplicate ? 200 : 201, { ok: true, application: { ...application, ...uploadAuthorisations } });
      return;
    }

    const applicationDocumentMatch = pathname.match(/^\/api\/account-applications\/([^/]+)\/documents$/);
    if (applicationDocumentMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!await rateLimit(request, "application-document", 30, 60 * 60 * 1000)) return json(response, 429, { error: "Too many document uploads." });
      const context = await applicationDocumentContext(applicationDocumentMatch[1]);
      if (!["documents_pending", "submitted", "information_requested"].includes(context.status)) {
        return json(response, 409, { error: "This application is not accepting supporting documents." });
      }
      const documentClass = url.searchParams.get("documentClass") || "customer_onboarding";
      if (!["licence", "company_due_diligence", "agreement"].includes(documentClass)) {
        return json(response, 400, { error: "Unsupported application document class." });
      }
      const reservation = await reserveApplicationUpload(context.id, request.headers["x-application-upload-token"]);
      try {
        const document = await storeDocument({
          bytes: await readRawBody(request),
          fileName: url.searchParams.get("fileName"),
          contentType: String(request.headers["content-type"] || "application/octet-stream").split(";")[0],
          documentClass,
          entityType: "account_application",
          entityId: context.id,
          businessNumber: context.applicationNumber,
          displayName: context.companyName,
          actor: "public_applicant"
        });
        if (document.duplicate) await releaseApplicationUploadReservation(reservation.grantId);
        json(response, document.duplicate ? 200 : 201, { document });
      } catch (error) {
        await releaseApplicationUploadReservation(reservation.grantId);
        throw error;
      }
      return;
    }

    const uploadRefreshMatch = pathname.match(/^\/api\/account-applications\/([^/]+)\/upload-authorisation$/);
    if (uploadRefreshMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!await rateLimit(request, "application-upload-refresh", 6, 60 * 60 * 1000)) return json(response, 429, { error: "Too many upload recovery requests." });
      const body = await readBody(request);
      const authorisations = await refreshApplicationUploadAuthorisations(uploadRefreshMatch[1], body.resumeToken);
      json(response, 200, { ok: true, authorisations });
      return;
    }

    const uploadCompleteMatch = pathname.match(/^\/api\/account-applications\/([^/]+)\/documents\/complete$/);
    if (uploadCompleteMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const completion = await completeApplicationUploads(uploadCompleteMatch[1], request.headers["x-application-upload-token"]);
      const application = await markApplicationDocumentsSubmitted(uploadCompleteMatch[1]);
      try {
        await sendApplicationNotifications(await applicationNotificationContext(uploadCompleteMatch[1]));
      } catch (error) {
        console.error("Completed application notification delivery failed.", { status: error.providerStatus || "unavailable" });
      }
      json(response, 200, { ok: true, application, completion, uploadState: await applicationUploadState(uploadCompleteMatch[1]) });
      return;
    }

    const activationMatch = pathname.match(/^\/api\/account-applications\/([^/]+)\/activate$/);
    if (activationMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await authenticated(request, response, ["admin"]);
      if (!session) return;
      const customer = await activateCustomer(activationMatch[1], session.username);
      json(response, 200, { ok: true, customer });
      return;
    }

    if (pathname === "/api/portal/session" && request.method === "GET") {
      const session = await getSession(request);
      if (!session) return json(response, 401, { error: "Authentication required." });
      json(response, 200, { user: { username: session.username, displayName: session.displayName, role: session.role, accessType: session.accessType, accessScopes: session.accessScopes, mustChangePassword: session.mustChangePassword } });
      return;
    }

    if (pathname === "/api/portal/data" && request.method === "GET") {
      const session = await scopedAuthentication(request, response, ["customer", "employee", "board"]);
      if (!session) return;
      json(response, 200, await portalData(session));
      return;
    }

    if (pathname === "/api/dashboard" && request.method === "GET") {
      const session = await scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      const context = enterpriseContext(session);
      if (session.accessType === "customer" && !context.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      const customerId = session.accessType === "customer" ? context.customerId : null;
      json(response, 200, await operationalDashboard(customerId));
      return;
    }

    if (pathname === "/api/catalog/products" && request.method === "GET") {
      const session = await scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      const context = enterpriseContext(session);
      if (session.accessType === "customer" && !context.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      json(response, 200, { products: await listProducts(url.searchParams.get("q") || "", { customerVisibleOnly: session.accessType === "customer" }), dataFreshness: new Date().toISOString() });
      return;
    }

    if (pathname === "/api/customers" && request.method === "GET") {
      if (!await scopedAuthentication(request, response, ["employee"])) return;
      json(response, 200, { customers: await listCustomers(url.searchParams.get("q") || "") });
      return;
    }

    if (pathname === "/api/suppliers" && request.method === "GET") {
      if (!await scopedAuthentication(request, response, ["employee"])) return;
      json(response, 200, { suppliers: await listSuppliers(url.searchParams.get("q") || "") });
      return;
    }

    if (pathname === "/api/suppliers" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      json(response, 201, { supplier: await createSupplier(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/products" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      json(response, 201, { product: await createProduct(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/orders" && request.method === "GET") {
      const session = await scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      const context = enterpriseContext(session);
      if (session.accessType === "customer" && !context.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      json(response, 200, { orders: await listOrders({ customerId: session.accessType === "customer" ? context.customerId : null }) });
      return;
    }

    if (pathname === "/api/orders" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await scopedAuthentication(request, response, ["customer", "employee"]);
      if (!session) return;
      const context = enterpriseContext(session);
      if (session.accessType === "customer" && !context.customerId) return json(response, 403, { error: "A customer account is not linked to this identity." });
      const scopedCustomerId = session.accessType === "customer" ? context.customerId : null;
      json(response, 201, { order: await createOrder(await readBody(request), session.username, scopedCustomerId) });
      return;
    }

    if (pathname === "/api/purchase-orders" && request.method === "GET") {
      if (!await scopedAuthentication(request, response, ["employee"])) return;
      json(response, 200, { purchaseOrders: await listPurchaseOrders() });
      return;
    }

    if (pathname === "/api/purchase-orders" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      json(response, 201, { purchaseOrder: await createPurchaseOrder(await readBody(request), session.username) });
      return;
    }

    if (pathname === "/api/documents/upload" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await scopedAuthentication(request, response, ["customer", "employee", "board"]);
      if (!session) return;
      const requestedEntityType = url.searchParams.get("entityType");
      const requestedEntityId = url.searchParams.get("entityId");
      const context = enterpriseContext(session);
      if (session.accessType === "customer" && (!context.customerId || requestedEntityType !== "customer" || requestedEntityId !== context.customerId)) {
        return json(response, 403, { error: "Customer documents must be linked to the authenticated customer account." });
      }
      const bytes = await readRawBody(request);
      const document = await storeDocument({
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

    const enterpriseModuleMatch = pathname.match(/^\/api\/enterprise\/modules\/([a-z0-9.-]+)$/);
    if (enterpriseModuleMatch && request.method === "GET") {
      const session = await authenticated(request, response);
      if (!session) return;
      json(response, 200, await enterpriseModuleSnapshot(enterpriseModuleMatch[1], enterpriseContext(session)));
      return;
    }

    if (pathname === "/api/enterprise/search" && request.method === "GET") {
      const session = await authenticated(request, response);
      if (!session) return;
      json(response, 200, await authorisedEnterpriseSearch(url.searchParams.get("q") || "", enterpriseContext(session)));
      return;
    }

    if (pathname === "/api/enterprise/customer/support" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "customer-support", 20, 60 * 60 * 1000)) return json(response, 429, { error: "Too many support requests. Try again later." });
      const session = await scopedAuthentication(request, response, ["customer"]);
      if (!session) return;
      json(response, 201, { ticket: await createCustomerSupport(await readBody(request), enterpriseContext(session)) });
      return;
    }

    if (pathname === "/api/enterprise/customer/returns" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "customer-return", 12, 60 * 60 * 1000)) return json(response, 429, { error: "Too many return requests. Try again later." });
      const session = await scopedAuthentication(request, response, ["customer"]);
      if (!session) return;
      json(response, 201, { returnRequest: await createCustomerReturn(await readBody(request), enterpriseContext(session)) });
      return;
    }

    if (pathname === "/api/enterprise/customer/quality-complaints" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      if (!await rateLimit(request, "customer-quality", 12, 60 * 60 * 1000)) return json(response, 429, { error: "Too many quality requests. Try again later." });
      const session = await scopedAuthentication(request, response, ["customer"]);
      if (!session) return;
      json(response, 201, { complaint: await createCustomerQualityComplaint(await readBody(request), enterpriseContext(session)) });
      return;
    }

    const workflowAdvanceMatch = pathname.match(/^\/api\/enterprise\/workflows\/([^/]+)\/advance$/);
    if (workflowAdvanceMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      const session = await scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      json(response, 200, { workflow: await advanceWorkflow(workflowAdvanceMatch[1], session.username) });
      return;
    }

    const productTransitionMatch = pathname.match(/^\/api\/enterprise\/products\/([^/]+)\/status$/);
    if (productTransitionMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired. Refresh and try again." });
      const session = await scopedAuthentication(request, response, ["employee"]);
      if (!session) return;
      const body = await readBody(request);
      json(response, 200, { product: await transitionProductLifecycle(productTransitionMatch[1], body.status, session.username) });
      return;
    }

    if (pathname === "/api/integrations/status" && request.method === "GET") {
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, { integrations: await syncStatus(), emailQueue: await emailQueueStatus(), sharePointFolders: sharePointFolderPlan() });
      return;
    }

    if (pathname === "/api/integrations/sharepoint/sync" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, await processSharePointEvents({ limit: 50 }));
      return;
    }

    if (pathname === "/api/integrations/polar-speed/sync" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, await processPolarSpeedEvents({ limit: 50 }));
      return;
    }

    if (pathname === "/api/integrations/storage/scans" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, await processDocumentScanEvents({ limit: 50 }));
      return;
    }

    if (pathname === "/api/integrations/email/retries" && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, await processEmailRetries({ limit: 50 }));
      return;
    }

    if (["/api/health/live", "/api/live"].includes(pathname) && request.method === "GET") {
      json(response, 200, { status: "live", service: "novapharm-web", version: applicationVersion, timestamp: new Date().toISOString() });
      return;
    }

    if (["/api/health/ready", "/api/ready"].includes(pathname) && request.method === "GET") {
      const health = await healthSnapshot();
      json(response, health.ready ? 200 : 503, health);
      return;
    }

    if (pathname === "/api/health" && request.method === "GET") {
      const health = await healthSnapshot();
      json(response, health.database === "ready" ? 200 : 503, {
        ...health,
        status: health.database === "ready" ? "ok" : "degraded",
        readinessStatus: health.status,
        polarSpeed: process.env.POLAR_SPEED_API_BASE_URL ? "configured" : "api_contract_required"
      });
      return;
    }

    if (pathname === "/api/admin/summary" && request.method === "GET") {
      const session = await authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 200, await adminSummary());
      return;
    }

    const adminLeadMatch = pathname.match(/^\/api\/admin\/leads\/([^/]+)$/);
    if (adminLeadMatch && request.method === "GET") {
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, { lead: await leadDetail(adminLeadMatch[1]) });
      return;
    }

    const adminApplicationMatch = pathname.match(/^\/api\/admin\/applications\/([^/]+)$/);
    if (adminApplicationMatch && request.method === "GET") {
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, { application: await applicationDetail(adminApplicationMatch[1]) });
      return;
    }

    const adminApplicationStatusMatch = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/status$/);
    if (adminApplicationStatusMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await authenticated(request, response, ["admin"]);
      if (!session) return;
      const body = await readBody(request);
      json(response, 200, { ok: true, application: await setApplicationStatus(adminApplicationStatusMatch[1], body.status, session.username, body.reason) });
      return;
    }

    const adminActivationMatch = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/activate$/);
    if (adminActivationMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 200, { ok: true, customer: await activateCustomer(adminActivationMatch[1], session.username) });
      return;
    }

    const adminEmailReplayMatch = pathname.match(/^\/api\/admin\/notifications\/([^/]+)\/replay$/);
    if (adminEmailReplayMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 200, { ok: true, delivery: await replayEmailNotification(adminEmailReplayMatch[1], session.username) });
      return;
    }

    const adminEmailPreviewMatch = pathname.match(/^\/api\/admin\/notifications\/([^/]+)\/preview$/);
    if (adminEmailPreviewMatch && request.method === "GET") {
      if (!await authenticated(request, response, ["admin"])) return;
      json(response, 200, { preview: await emailNotificationPreview(adminEmailPreviewMatch[1]) });
      return;
    }

    const adminSessionRevokeMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/sessions\/revoke$/);
    if (adminSessionRevokeMatch && request.method === "POST") {
      if (!requireCsrf(request)) return json(response, 403, { error: "Security token expired." });
      const session = await authenticated(request, response, ["admin"]);
      if (!session) return;
      json(response, 200, { ok: true, result: await revokeUserSessions(decodeURIComponent(adminSessionRevokeMatch[1]), session.username) });
      return;
    }

    const pathSession = protectedPath(pathname) ? await getSession(request) : null;
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
  const processQueuedEmails = async () => {
    try {
      await processEmailRetries({ limit: 20 });
    } catch (error) {
      console.error("Queued email processing failed.", { status: error.providerStatus || "unavailable" });
    }
  };
  const emailRetryTimer = isLocalPortal ? null : setInterval(processQueuedEmails, 60_000);
  emailRetryTimer?.unref();
  if (!isLocalPortal) void processQueuedEmails();
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (emailRetryTimer) clearInterval(emailRetryTimer);
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
