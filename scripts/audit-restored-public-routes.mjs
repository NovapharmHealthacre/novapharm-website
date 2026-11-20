import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { inspectPublicHigSignals } from "./hig-public-route-signals.mjs";
import { corporateRoutesFromSource, reconcilePublicRouteUniverse, summarizeObservedPublisherShas } from "./reconcile-live-public-routes.mjs";

const origin = "https://novapharmhealthcare.com";
const output = "artifacts/site-restoration/live-route-audit.json";
const nonce = (process.env.GITHUB_SHA || "local").slice(0, 12) + "-" + Date.now();
const issues = [];
const routes = [];
const sitemapPaths = xml => [...new Set([...xml.matchAll(/<loc>\s*https:\/\/novapharmhealthcare\.com(\/[^<\s]*)\s*<\/loc>/gi)].map(m => m[1]))];
const expectedPaths = sitemapPaths(readFileSync("sitemap.xml", "utf8"));

async function request(path, expectHtml = true) {
  const response = await fetch(origin + path + (path.includes("?") ? "&" : "?") + "audit=" + nonce, {
    signal: AbortSignal.timeout(18000),
    redirect: "follow",
    headers: { "Cache-Control": "no-cache, no-store, max-age=0", "Pragma": "no-cache",
      "User-Agent": "NovaPharm-Restoration-Audit/1.0" }
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const mime = response.headers.get("content-type") || "";
  if (expectHtml && !mime.includes("text/html")) throw new Error("Unexpected content-type " + mime);
  return await response.text();
}

let livePaths = [];
try {
  livePaths = sitemapPaths(await request("/sitemap.xml", false));
  if (!livePaths.length) issues.push("Live sitemap returned no NovaPharm URLs");
} catch (error) {
  issues.push("Live sitemap read failed: " + String(error).slice(0, 170));
}
const approvedProductRegister = JSON.parse(readFileSync("apps/corporate/data/nutraxin-product-register.json", "utf8"));
const routeReconciliation = reconcilePublicRouteUniverse({
  expectedPaths, livePaths,
  productSlugs: approvedProductRegister.products.map(product => product.slug)
});
issues.push(...routeReconciliation.issues);
// Include source-declared Corporate pages even when *both* source and live
// sitemaps accidentally omit them. Public HTTP is checked read-only below.
const registeredCorporateRoutes = corporateRoutesFromSource(
  readFileSync("apps/corporate/data/pages.ts", "utf8"));
const routesMissingFromBothSitemaps = registeredCorporateRoutes.filter(path =>
  !expectedPaths.includes(path) && !livePaths.includes(path));
const allPaths = [...new Set([...expectedPaths, ...livePaths, ...registeredCorporateRoutes])];
if (allPaths.length < 59) issues.push("Expected at least 59 public routes; found " + allPaths.length);

let position = 0;
async function visit() {
  while (position < allPaths.length) {
    const path = allPaths[position++];
    const record = { path, httpOk: false, title: "", h1: "", canonical: "", errors: [], warnings: [] };
    try {
      const html = await request(path);
      record.httpOk = true;
      record.bytes = html.length;
      // Digest of the actual fetched public HTML bytes, NOT the deployed Git source SHA.
      record.htmlSnapshotSha256 = createHash("sha256").update(html).digest("hex");
      // Screening only: inspect public SSR semantics, not real keyboard/AT behavior.
      record.higSignals = inspectPublicHigSignals(html);
      record.warnings.push(...record.higSignals.warnings.map(x => "HIG SSR screening: " + x));
      record.title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]*>/g, "").slice(0, 180);
      record.h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]*>/g, "").slice(0, 180);
      const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0])
        .find(tag => /\brel\s*=\s*["']canonical["']/i.test(tag)) || "";
      record.canonical = canonicalTag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || "";
      if (!record.title) record.errors.push("Missing title");
      if (!record.h1) record.errors.push("Missing H1");
      if (record.canonical !== origin + path) record.errors.push("Missing/mismatched canonical");
      if (path === "/") {
        record.approvedHome = html.includes("/assets/media/home/earth-reference-1400.jpg")
          && html.includes("Better access begins with better decisions.")
          && html.includes("Built for trust.");
        if (!record.approvedHome) record.errors.push("Owner-approved Earth homepage missing");
      }
      if (/^\/products\/nutraxin\/[a-z0-9-]+\/$/.test(path)) {
        record.gtin13 = /"gtin13"\s*:\s*"\d{13}"/.test(html);
        record.productSchema = /"@type"\s*:\s*"Product"/.test(html);
        record.visibleAnswers = /data-nutraxin-answers|npd-nutraxin-answers/.test(html);
        if (!record.gtin13) record.warnings.push("GTIN13 not yet published");
        if (!record.productSchema) record.warnings.push("Product JSON-LD not detected");
        if (!record.visibleAnswers) record.warnings.push("Visible AEO answers not yet published");
      }
      if (path === "/contact/") {
        record.emailDraftOnly = html.includes("Open email draft") && html.includes("does not collect or transmit enquiry details");
        if (record.emailDraftOnly) record.warnings.push("Email draft only; no verified secure enquiry submission");
      }
    } catch (error) {
      record.errors.push(String(error).slice(0, 200));
    }
    routes.push(record);
  }
}
await Promise.all(Array.from({ length: 5 }, visit));
// Noindex scientific reference is intentionally excluded from sitemap; verify separately.
const quantum = { path:"/quantum-research/", httpOk:false, canonical:"", title:"", h1:"", errors:[], warnings:[], noindex:false };
try {
  const html = await request(quantum.path);
  quantum.httpOk = true;
  quantum.htmlSnapshotSha256 = createHash("sha256").update(html).digest("hex");
  quantum.title = (html.match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1] || "").slice(0, 180);
  quantum.h1 = (html.match(/<h1\b[^>]*>([^<]*)<\/h1>/i)?.[1] || "").slice(0, 180);
  quantum.canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
  quantum.noindex = /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i.test(html);
  if (!quantum.title || !quantum.h1) quantum.errors.push("Quantum title or H1 missing");
  if (!quantum.noindex) quantum.errors.push("Quantum research must remain noindex,nofollow");
  if (quantum.canonical !== origin + quantum.path) quantum.errors.push("Quantum canonical mismatch");
  if (/<form\b|<input\b|data-login-form|data-contact-form/i.test(html)) quantum.errors.push("Interactive/identifiable research input prohibited");
  if (!html.includes('/assets/css/quantum-research.css')) quantum.errors.push("Reviewed quantum CSS not referenced");
  const css = await request("/assets/css/quantum-research.css", false);
  if (css.length < 1000) quantum.errors.push("Reviewed quantum stylesheet missing or empty");
  if (livePaths.includes(quantum.path)) quantum.errors.push("Noindex quantum page must not be in canonical sitemap");
} catch (error) {
  quantum.errors.push("Quantum reference not live: " + String(error).slice(0, 180));
}
routes.push(quantum);

routes.sort((a, b) => a.path.localeCompare(b.path));
const failed = routes.filter(r => r.errors.length);
const incompleteProductSEO = routes.filter(r => /^\/products\/nutraxin\/[a-z0-9-]+\/$/.test(r.path) && !r.gtin13);
const screened = routes.filter(route => route.higSignals);
const publisherProvenance = summarizeObservedPublisherShas(screened);
issues.push(...publisherProvenance.issues);
const result = {
  timestamp: new Date().toISOString(), origin,
  methodology: "Read-only unauthenticated HTTPS cache-bypassed requests, no customer/medical data, no form submits or checkout, source and live sitemap union",
  expectedPaths: expectedPaths.length, liveSitemapPaths: livePaths.length,
  checked: routes.length, failures: failed.length,
  productGtinNotPublished: incompleteProductSEO.length,
  corporateSourceCoverage: {
    declaredRoutes: registeredCorporateRoutes.length,
    routesMissingFromBothSitemaps,
    independentDirectHttpProbes: routesMissingFromBothSitemaps.length,
    interpretation: "Missing sitemap entry is a discovery gap; direct read-only route probes establish whether it is reachable, not whether Google indexed it"
  },
  routeReconciliation,
  publisherProvenance,
  higScreening: {
    meaning: "Public SSR HTML signals only; not rendered keyboard/VoiceOver/WCAG or independently accepted Apple HIG",
    sourceReadOnly: true,
    routesScreened: screened.length,
    withDocumentLanguage: screened.filter(x => Boolean(x.higSignals.language)).length,
    withDeviceWidthViewport: screened.filter(x => x.higSignals.responsiveViewport).length,
    withOneH1: screened.filter(x => x.higSignals.h1Elements === 1).length,
    withLinkedSkipTarget: screened.filter(x => x.higSignals.skipLinkWithTarget).length,
    withSourceSha: screened.filter(x => Boolean(x.higSignals.deployedSourceSha)).length,
    missingSourceSha: screened.filter(x => !x.higSignals.deployedSourceSha).length,
    routesWithHtmlSnapshotDigest: routes.filter(x => Boolean(x.htmlSnapshotSha256)).length,
    htmlSnapshotDigestIsNotDeployedSourceSha: true,
    distinctObservedLiveShas: [...new Set(screened.map(x => x.higSignals.deployedSourceSha).filter(Boolean))]
  },
  issues, routes
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ expected: expectedPaths.length, live: livePaths.length, checked: routes.length,
  failed: failed.length, productGtinNotPublished: incompleteProductSEO.length,
  higScreened: screened.length, sourceShaMissing: result.higScreening.missingSourceSha,
  htmlSnapshotDigests: result.higScreening.routesWithHtmlSnapshotDigest,
  omittedRegisteredCorporateRoutes: result.corporateSourceCoverage.routesMissingFromBothSitemaps, issues }));
if (failed.length) console.error("Route failures: " + JSON.stringify(failed.map(r => ({ path: r.path, errors: r.errors })).slice(0, 70)));
if (failed.length || issues.length) process.exitCode = 1;
