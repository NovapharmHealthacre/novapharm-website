import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

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
  return {
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
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, securityHeaders(headers));
  response.end(body);
}

function json(response, status, payload, headers = {}) {
  send(response, status, JSON.stringify(payload), { "Content-Type": "application/json; charset=utf-8", ...headers });
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
  return createHash("sha256").update(`${sessionId}.${sessionSecret}`).digest("hex");
}

function createSession(username) {
  const id = randomBytes(32).toString("hex");
  sessions.set(id, { username, createdAt: Date.now(), role: username === portalUsername ? "admin" : "client" });
  return `${id}.${signSession(id)}`;
}

function getSession(request) {
  const value = parseCookies(request).np_session;
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature || signature !== signSession(id)) return null;
  const session = sessions.get(id);
  if (!session) return null;
  return { id, ...session };
}

function protectedPath(pathname) {
  return pathname.startsWith("/portal/") && pathname !== "/portal/" || pathname.startsWith("/admin/");
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  let clean = normalized === "/" ? "/index.html" : normalized;
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

function readJsonFile(name, fallback) {
  const path = join(dataDir, name);
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJsonFile(name, payload) {
  writeFileSync(join(dataDir, name), JSON.stringify(payload, null, 2));
}

function portalData() {
  return {
    announcements: [
      { category: "Regulatory", title: "MHRA readiness pack prepared", summary: "Core WDA(H), GDP, PV and supplier qualification documents are grouped for SharePoint synchronization." },
      { category: "Executive Platform", title: "Command Centre integrated", summary: "The full NovaPharm Executive Platform is available from the client portal with finance, PV, sourcing, tenders and M365 modules." },
      { category: "Investors", title: "Investor file room structure ready", summary: "Business plan, board pack, market data and implementation blueprint folders are prepared for secure document upload." }
    ],
    tasks: [
      { title: "Upload WDA(H) application pack", owner: "Regulatory", due: "When SharePoint credentials are configured", status: "Ready" },
      { title: "Review investor data room permissions", owner: "Admin", due: "Pre-launch", status: "Open" },
      { title: "Confirm Microsoft Graph tenant permissions", owner: "IT", due: "Before SharePoint sync", status: "Blocked by credentials" }
    ],
    folders: ["Regulatory Documents", "Product Catalogues", "Company Documents", "Business Plans", "Investor Files", "Downloads", "Announcements", "Task Tracking", "Executive Platform"]
  };
}

function adminSummary() {
  const leads = readJsonFile("contact-submissions.json", []);
  return {
    metrics: {
      leads: leads.length,
      users: sessions.size,
      seo: 100,
      documents: 9
    },
    leads: leads.slice(-20).reverse()
  };
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
      json(response, 200, { ok: true, redirectTo: "/portal/dashboard/" }, { "Set-Cookie": cookie("np_session", sessionCookie, { maxAge: 60 * 60 * 8 }) });
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
      const required = ["name", "email", "company", "enquiryType", "message"];
      if (required.some((key) => !String(body[key] || "").trim())) return json(response, 400, { error: "Please complete all required fields." });
      const leads = readJsonFile("contact-submissions.json", []);
      leads.push({
        id: randomBytes(8).toString("hex"),
        name: String(body.name).slice(0, 120),
        email: String(body.email).slice(0, 160),
        company: String(body.company).slice(0, 160),
        enquiryType: String(body.enquiryType).slice(0, 80),
        message: String(body.message).slice(0, 2000),
        createdAt: new Date().toISOString()
      });
      writeJsonFile("contact-submissions.json", leads);
      json(response, 200, { ok: true });
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

    if (pathname === "/api/admin/summary" && request.method === "GET") {
      const session = getSession(request);
      if (!session) return json(response, 401, { error: "Authentication required." });
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
    json(response, 500, { error: "Server error." });
  }
});

server.listen(port, host, () => {
  console.log(`NovaPharm Healthcare website running at http://${host}:${port}/`);
});
