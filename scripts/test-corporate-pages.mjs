import assert from "node:assert/strict";
import { createServer } from "node:https";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const root = path.resolve(process.argv[2]);
const evidence = path.resolve(process.argv[3]);
const release = JSON.parse(readFileSync(path.join(root, "release.json"), "utf8"));
mkdirSync(evidence, { recursive: true });
const laboratory = mkdtempSync(path.join(tmpdir(), "novapharm-pages-tls-"));
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-sha256", "-days", "1", "-nodes", "-subj", "/CN=localhost", "-keyout", path.join(laboratory, "key.pem"), "-out", path.join(laboratory, "cert.pem")], { stdio: "ignore" });
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".avif": "image/avif", ".webp": "image/webp", ".ico": "image/x-icon", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };
const server = createServer({ key: readFileSync(path.join(laboratory, "key.pem")), cert: readFileSync(path.join(laboratory, "cert.pem")) }, (request, response) => {
  let file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (!file.startsWith(`${root}/`) && file !== root) { response.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!existsSync(file)) { response.writeHead(404).end("Not found"); return; }
  response.writeHead(200, { "Content-Type": `${mime[path.extname(file)] ?? "application/octet-stream"}; charset=utf-8` });
  response.end(request.method === "HEAD" ? undefined : readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `https://127.0.0.1:${server.address().port}`;
function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? htmlFiles(path.join(directory, entry.name)) : entry.name === "index.html" ? [path.join(directory, entry.name)] : []);
}
const routes = htmlFiles(root).filter((file) => !readFileSync(file, "utf8").includes('http-equiv="refresh"') && !file.includes("/_not-found/")).map((file) => `/${path.relative(root, path.dirname(file))}/`.replaceAll("//", "/"));
const results = [];
const violations = [];
const errors = [];
let completed = false;
try {
  for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
    const browser = await engine.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
      await context.addInitScript(() => localStorage.setItem("np_cookie_consent", JSON.stringify({ version: "2026-07-v2", categories: { preferences: false, analytics: false, marketing: false }, timestamp: new Date().toISOString(), preferenceId: "isolated-public-release-test" })));
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push({ engineName, url: page.url(), message: error.message }));
      page.on("console", (message) => { if (message.type() === "error") errors.push({ engineName, url: page.url(), message: message.text() }); });
      page.on("response", (response) => { if (response.status() >= 400) errors.push({ engineName, url: response.url(), message: `HTTP ${response.status()}` }); });
      for (const route of routes) {
        const response = await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
        assert.equal(response.status(), 200, route);
        await page.evaluate(async () => { for (const image of document.images) image.loading = "eager"; await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))); });
        assert.equal(await page.locator("main h1").count(), 1, `${engineName} ${route} must have one heading`);
        assert.equal(await page.locator("form,input[type=password],input[type=file]").count(), 0, `${route}: private controls exposed`);
        const broken = await page.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
        assert.deepEqual(broken, [], `${engineName} ${route}: broken imagery`);
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        if (axe.violations.length) violations.push({ engineName, route, violations: axe.violations });
        results.push({ engineName, route, status: "PASS", accessibilityViolations: axe.violations.length });
      }
      for (const width of [320, 390, 430, 768, 1024, 1181, 1200, 1280, 1300, 1440, 1600, 1920]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        await page.goto(origin, { waitUntil: "networkidle" });
        const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        assert(!overflowing, `${engineName} home overflow at ${width}`);
        await page.screenshot({ path: path.join(evidence, `${engineName}-home-${width}.png`), fullPage: true });
        results.push({ engineName, width, check: "responsive-home", status: "PASS" });
      }
      for (const route of ["/contact/", "/portal/", "/products/nutraxin/"]) {
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
          await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow at ${width}`);
          await page.screenshot({ path: path.join(evidence, `${engineName}-${route.replaceAll("/", "-")}-${width}.png`), fullPage: true });
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Pause visual motion", exact: true }).click();
      assert.equal(await page.locator(".corporate-hero").getAttribute("data-motion"), "still");
      await page.getByRole("button", { name: "Play visual motion", exact: true }).click();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(150);
      assert.equal(await page.locator(".corporate-hero").getAttribute("data-motion"), "still");
      await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
      assert((await page.getByRole("link", { name: "Email NovaPharm", exact: true }).getAttribute("href")).startsWith("mailto:vishal@novapharmhealthcare.com?subject="));
      await page.goto(`${origin}/portal/`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("h1").innerText(), "Your Secure Portal.");
      assert.equal(await page.getByRole("link", { name: "Open Secure Portal", exact: true }).getAttribute("href"), "https://portal.novapharmhealthcare.com/portal/");
      assert.equal(await page.getByText("Owner access is available. Customer access is not yet enabled.", { exact: true }).count(), 1);
      assert.equal(await page.locator("form,input[type=password]").count(), 0);
      await page.goto(origin, { waitUntil: "networkidle" });
      assert.equal(await page.locator(".desktop-nav").getByRole("link", { name: "Secure Portal", exact: true }).getAttribute("href"), "https://portal.novapharmhealthcare.com/portal/");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator(".mobile-menu summary").click();
      assert.equal(await page.locator(".mobile-menu").getByRole("link", { name: "Secure Portal", exact: true }).getAttribute("href"), "https://portal.novapharmhealthcare.com/portal/");
      const cookieContext = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
      const cookiePage = await cookieContext.newPage();
      await cookiePage.goto(origin, { waitUntil: "networkidle" });
      await cookiePage.getByRole("button", { name: "Reject non-essential", exact: true }).click();
      assert(await cookiePage.evaluate(() => JSON.parse(localStorage.getItem("np_cookie_consent")).categories.analytics === false));
      await cookieContext.close();
      await context.close();
      results.push({ engineName, check: "motion-reduced-motion-mailto-portal-navigation-cookie-rejection", status: "PASS" });
    } finally { await browser.close(); }
  }
  assert.deepEqual(violations, [], "Accessibility violations");
  assert.deepEqual(errors, [], "Browser/CSP/network errors");
  completed = true;
} finally {
  writeFileSync(path.join(evidence, "acceptance.json"), `${JSON.stringify({ origin, sourceRevision: release.sourceRevision, artifactFingerprint: release.artifactFingerprint, routes: routes.length, laboratoryTls: "Ephemeral self-signed certificate trusted only in isolated test contexts; public TLS requires separate verification", browserPluginFallbackReason: "Browser plugin not available; existing Playwright used", results, violations, errors, passed: completed }, null, 2)}\n`);
  await new Promise((resolve) => server.close(resolve));
  rmSync(laboratory, { recursive: true });
}
console.log(`PASS: ${routes.length} routes in Chromium and WebKit, 12 responsive widths per engine, real interactions, no Axe violations or browser errors.`);
