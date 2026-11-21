/**
 * Read-only, fail-closed public release provenance comparison.
 * A pass is a technical readback, NEVER an independent HIG approval.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILIES = Object.freeze(["corporate-editorial", "static-public", "nutraxin", "esco"]);
const sha40 = /^[a-f0-9]{40}$/i;
const sha64 = /^[a-f0-9]{64}$/i;
const array = x => Array.isArray(x) ? x : null;

export function verifyPublicReleaseProvenance(audit, expectedShas) {
  const problems = [];
  const check = (condition, message) => { if (!condition) problems.push(message); };
  if (!audit || typeof audit !== "object" || !expectedShas || typeof expectedShas !== "object") {
    return { passed: false, problems: ["An audit object and an explicit per-family expected SHA map are required"], independentHigAcceptance: false };
  }
  check(audit.origin === "https://novapharmhealthcare.com", "Unexpected audited public origin");
  check(!Number.isNaN(Date.parse(audit.timestamp || "")), "Missing or invalid live observation timestamp");
  check(Array.isArray(audit.routes) && audit.routes.length >= 65, "Fewer than 65 independently requested public paths");
  check(audit.checked === audit.routes?.length, "Reported route count does not match its individual observations");
  check(audit.failures === 0, "One or more public routes failed");
  check(array(audit.issues)?.length === 0, "Unresolved public route or sitemap audit issues");
  for (const name of ["missingFromSourceSitemap", "missingFromLiveSitemap", "sourceNotLive", "restrictedIndexed", "restrictedPrefixes", "unexpectedIndexedNutraxinPages"]) {
    check(array(audit.routeReconciliation?.[name])?.length === 0, "Sitemap reconciliation not clear: " + name);
  }
  check(array(audit.corporateSourceCoverage?.routesMissingFromBothSitemaps)?.length === 0,
    "Corporate source routes absent from both checked-in and live sitemap");
  const routes = audit.routes || [];
  const paths = new Set();
  for (const route of Array.isArray(routes) ? routes : []) {
    check(typeof route.path === "string" && route.path.startsWith("/") && !paths.has(route.path),
      "Invalid or duplicate public path: " + String(route.path));
    paths.add(route.path);
    check(route.httpOk === true && array(route.errors)?.length === 0,
      "Public route HTTP or markup check failed: " + String(route.path));
    check(sha64.test(route.htmlSnapshotSha256 || ""),
      "Actual public HTML snapshot digest missing: " + String(route.path));
    if (route.path === "/quantum-research/") {
      check(route.noindex === true, "Public research reference lost its noindex disposition");
    } else {
      check(sha40.test(route.higSignals?.deployedSourceSha || ""),
        "Published source revision missing: " + String(route.path));
      check(route.higSignals?.responsiveViewport === true &&
        route.higSignals?.h1Elements === 1 &&
        route.higSignals?.skipLinkWithTarget === true &&
        Boolean(route.higSignals?.language), "Basic public HTML signals absent: " + String(route.path));
    }
  }
  for (const required of ["/", "/contact/", "/distribution/", "/market-access/", "/markets/",
    "/products/", "/products/nutraxin/", "/products/esco/", "/products/marketplace/", "/quantum-research/"]) {
    check(paths.has(required), "Critical public route missing from the observations: " + required);
  }
  check(audit.higScreening?.routesScreened === audit.checked - 1, "Research-only route was not separated from SSR screening");
  check(audit.higScreening?.withSourceSha === audit.higScreening?.routesScreened,
    "Not every public SSR route exposes a source SHA");
  check(audit.higScreening?.missingSourceSha === 0, "Audited public routes still lack source SHA metadata");
  check(audit.higScreening?.routesWithHtmlSnapshotDigest === audit.checked,
    "Not all requested public pages have a content snapshot digest");
  const families = audit.publisherProvenance?.families;
  check(Boolean(families && typeof families === "object"), "Missing publisher-family reconciliation");
  check(Object.keys(expectedShas).sort().join(",") === [...FAMILIES].sort().join(","),
    "Supply expected release source SHA for exactly the four actual public publisher families");
  check(Object.keys(families || {}).sort().join(",") === [...FAMILIES].sort().join(","),
    "Unknown or missing family in independently observed publisher inventory");
  let total = 0;
  for (const family of FAMILIES) {
    const expected = expectedShas[family];
    check(sha40.test(expected || ""), "Invalid or absent expected source revision for " + family);
    const record = families?.[family];
    if (!record) continue;
    check(Number.isInteger(record.routes) && record.routes > 0, "Invalid observed route count for " + family);
    check(record.missingSourceSha === 0, "Missing source SHA within " + family);
    check(record.conflictingShas === false, "Multiple published revisions within " + family);
    const entries = Object.entries(record.observedShaRoutes || {});
    check(entries.length === 1 && entries[0][0].toLowerCase() === String(expected || "").toLowerCase(),
      "Live revision does not match explicitly expected " + family + " release SHA");
    const count = entries.reduce((sum, [, list]) => sum + (Array.isArray(list) ? list.length : 0), 0);
    check(count === record.routes, "Published family route count mismatch for " + family);
    total += Number.isInteger(record.routes) ? record.routes : 0;
  }
  check(total === audit.higScreening?.routesScreened, "Publisher-family inventory does not cover every screened route");
  return {
    passed: problems.length === 0,
    evidenceLevel: "read-only-exact-public-HTML-and-operator-provided-release-SHA-comparison",
    independentHigAcceptance: false,
    additionalRequired: "Independently authorised source/release proof, manual AT and device tests, Security/Quality review, rights and owner signoff",
    checked: audit.checked,
    sourceShasObserved: audit.higScreening?.withSourceSha ?? null,
    problems
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const file = process.argv[2] || "artifacts/site-restoration/live-route-audit.json";
  const expected = {
    "corporate-editorial": process.env.NOVA_EXPECTED_CORPORATE_SHA,
    "static-public": process.env.NOVA_EXPECTED_STATIC_SHA,
    nutraxin: process.env.NOVA_EXPECTED_NUTRAXIN_SHA,
    esco: process.env.NOVA_EXPECTED_ESCO_SHA
  };
  const report = verifyPublicReleaseProvenance(JSON.parse(readFileSync(file, "utf8")), expected);
  const dest = "artifacts/hig-public-provenance-readback/report.json";
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify({ timestamp: new Date().toISOString(), auditPath: file,
    ...report }, null, 2) + "\n");
  console.log(JSON.stringify({ report: dest, passed: report.passed, checked: report.checked,
    problems: report.problems, independentHigAcceptance: false }));
  if (!report.passed) process.exitCode = 1;
}
