/**
 * Read-only production parity: compare every registered public HTML route to
 * the exact file in gh-pages. This does not prove the original authoring SHA,
 * browser accessibility, authenticated functionality or Apple HIG acceptance.
 * No forms, payments, account APIs, customer records or write calls.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { corporateRoutesFromSource } from "./reconcile-live-public-routes.mjs";
import { inspectPublicHigSignals } from "./hig-public-route-signals.mjs";

export const origin = "https://novapharmhealthcare.com";
const output = "artifacts/site-restoration/gh-pages-live-byte-parity.json";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const exactGitSha = tree => {
  const sha = execFileSync("git", ["-C", tree, "rev-parse", "HEAD"],
    { encoding: "utf8", timeout: 5000 }).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Cannot establish actual checked-out Git commit");
  return sha;
};

export function sitemapRoutes(xml) {
  assert.equal(typeof xml, "string");
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1]);
  if (!urls.length) throw new Error("Public sitemap contains no URLs");
  const paths = urls.map(url => {
    const parsed = new URL(url);
    if (parsed.origin !== origin || parsed.search || parsed.hash)
      throw new Error("Unexpected external or parameterized sitemap URL: " + url);
    return publicHtmlPath(parsed.pathname).route;
  });
  if (new Set(paths).size !== paths.length) throw new Error("Duplicate public sitemap URLs");
  return paths;
}

export function publicHtmlPath(route) {
  if (typeof route !== "string" || !/^\/(?:[a-z0-9-]+\/)*$/i.test(route) ||
      route.includes("//") || route.includes("..")) throw new Error("Unsafe public route: " + String(route));
  return { route, relative: route === "/" ? "index.html" : route.slice(1) + "index.html" };
}

export function comparePublicHtml({ route, checkedInBytes, liveBytes, status, mime }) {
  publicHtmlPath(route);
  const result = {
    route, sourceFileSha256: checkedInBytes ? hash(checkedInBytes) : null,
    liveHtmlSha256: liveBytes ? hash(liveBytes) : null,
    sourceBytes: checkedInBytes?.length ?? null, liveBytes: liveBytes?.length ?? null,
    httpStatus: status ?? null, mime: mime ?? null,
    exactByteMatch: false, errors: []
  };
  if (!checkedInBytes) result.errors.push("No matching gh-pages HTML file");
  if (status !== 200) result.errors.push("Expected direct HTTP 200");
  if (!String(mime || "").toLowerCase().includes("text/html")) result.errors.push("HTML content-type absent");
  if (!liveBytes) result.errors.push("No public HTML bytes");
  if (checkedInBytes && liveBytes) {
    result.exactByteMatch = checkedInBytes.equals(liveBytes);
    if (!result.exactByteMatch) result.errors.push("Published bytes differ from exact gh-pages source");
  }
  return result;
}

export async function audit({ sourceTree, publishedTree, fetchPage = fetch, nonce = "read-only" }) {
  const sitemap = readFileSync(join(publishedTree, "sitemap.xml"), "utf8");
  const sitemapPaths = sitemapRoutes(sitemap);
  const corporate = corporateRoutesFromSource(readFileSync(join(sourceTree, "apps/corporate/data/pages.ts"), "utf8"));
  const separatelyNoindex = "/quantum-research/";
  const routes = [...new Set([...sitemapPaths, ...corporate, separatelyNoindex])].sort();
  const missingFromSitemap = corporate.filter(route => !sitemapPaths.includes(route));
  const checkedOutPublisherCommitSha = exactGitSha(publishedTree);
  const checkedOutAuditCommitSha = exactGitSha(sourceTree);
  const rows = new Array(routes.length);
  let pos = 0;
  async function visit() {
    while (pos < routes.length) {
      const index = pos++;
      const route = routes[index];
      const { relative } = publicHtmlPath(route);
      let checkedInBytes = null, liveBytes = null, status = null, mime = null, error = null;
      try { checkedInBytes = readFileSync(join(publishedTree, relative)); }
      catch (err) { error = "Local file read: " + String(err).slice(0, 160); }
      try {
        const response = await fetchPage(origin + route + "?parity=" + encodeURIComponent(nonce), {
          method: "GET", redirect: "manual", signal: AbortSignal.timeout(20000),
          headers: { "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache", "User-Agent": "NovaPharm-Public-Parity-Audit/1.0" }
        });
        status = response.status;
        mime = response.headers.get("content-type");
        if (status === 200) liveBytes = Buffer.from(await response.arrayBuffer());
      } catch (err) { error = (error ? error + "; " : "") + "HTTPS read: " + String(err).slice(0, 160); }
      const row = comparePublicHtml({ route, checkedInBytes, liveBytes, status, mime });
      if (error) row.errors.push(error);
      if (liveBytes) {
        const signals = inspectPublicHigSignals(liveBytes.toString("utf8"));
        row.observedSourceRevision = signals.deployedSourceSha;
        row.verifiedRevisionMetadata = Boolean(signals.deployedSourceSha);
      }
      rows[index] = row;
    }
  }
  await Promise.all(Array.from({ length: 5 }, visit));
  const ordinaryPublicRows = rows.filter(row => row.route !== separatelyNoindex);
  return {
    schema: "novapharm.read-only-published-html-byte-parity.v1",
    inspectedAt: new Date().toISOString(), origin,
    level: "public-static-html-source-to-live-check-only; not Apple HIG, accessibility, identity or production signoff",
    sourceTree, publishedTree, checkedOutPublisherCommitSha, checkedOutAuditCommitSha,
    sitemapRoutes: sitemapPaths.length, ordinaryPublicRoutes: ordinaryPublicRows.length,
    inspectedRoutes: routes.length, missingFromSitemap,
    exactByteMatches: rows.filter(row => row.exactByteMatch && !row.errors.length).length,
    bytesMismatched: rows.filter(row => row.errors.some(error => error.includes("differ"))).length,
    sourceRevisionMetadataMissing: rows.filter(row => row.verifiedRevisionMetadata === false).length,
    sourceRevisionMetadataMissingOrdinary: ordinaryPublicRows.filter(row => row.verifiedRevisionMetadata === false).length,
    researchRevisionMetadataMissing: rows.find(row => row.route === separatelyNoindex)?.verifiedRevisionMetadata === false,
    failures: rows.filter(row => row.errors.length).length,
    routes: rows
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const report = await audit({
    sourceTree: resolve(process.env.SOURCE_TREE || "source-tree"),
    publishedTree: resolve(process.env.PUBLISHED_TREE || "published-tree"),
    nonce: (process.env.GITHUB_SHA || "read-only").slice(0, 12)
  });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    sitemapRoutes: report.sitemapRoutes, checked: report.inspectedRoutes,
    exactMatches: report.exactByteMatches, failures: report.failures,
    shaMetadataMissing: report.sourceRevisionMetadataMissing,
    shaMetadataMissingOrdinary: report.sourceRevisionMetadataMissingOrdinary,
    publisherGitSha: report.checkedOutPublisherCommitSha,
    missingFromSitemap: report.missingFromSitemap
  }));
  if (report.failures) {
    console.error(JSON.stringify(report.routes.filter(x => x.errors.length).map(x => ({ route:x.route, errors:x.errors })).slice(0, 70)));
    process.exitCode = 1;
  }
}
