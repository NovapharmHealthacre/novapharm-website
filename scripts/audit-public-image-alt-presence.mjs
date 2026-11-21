/**
 * Read-only SSR image accessibility screening for all registered public pages.
 * Checks presence of HTML img alt attributes; never certifies alt quality,
 * decorative intent, CSS backgrounds, SVG semantics, WCAG or Apple HIG.
 */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { corporateRoutesFromSource } from "./reconcile-live-public-routes.mjs";

const origin = "https://novapharmhealthcare.com";
const output = "artifacts/site-restoration/public-image-alt-presence.json";

export function safePageRoute(route) {
  if (typeof route !== "string" || !/^\/(?:[a-z0-9-]+\/)*$/i.test(route) ||
      route.includes("//") || route.includes(".."))
    throw new Error("Unsafe public page route: " + String(route));
  return route;
}

export function publicPageRoutes({ sitemap, corporateSource }) {
  assert.equal(typeof sitemap, "string");
  const urls = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(x=>x[1]);
  const listed = urls.map(value=>{
    const url = new URL(value);
    if (url.origin !== origin || url.search || url.hash)
      throw new Error("Unexpected sitemap URL: " + value);
    return safePageRoute(url.pathname);
  });
  if (new Set(listed).size !== listed.length) throw new Error("Duplicate sitemap URLs");
  const declared = corporateRoutesFromSource(corporateSource).map(safePageRoute);
  const routes = [...new Set([...listed, ...declared, "/quantum-research/"])].sort();
  if (routes.length < 65) throw new Error("Registered public route scope unexpectedly reduced");
  return routes;
}

export function screenImgAltAttributes(html) {
  if (typeof html !== "string") throw new TypeError("Public HTML required");
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]);
  let withAlt = 0, emptyAlt = 0, missingAlt = 0, longAlt = 0;
  const missingTagIndexes = [], decorativeCandidates = [];
  for (let index=0; index<tags.length; index++) {
    const tag = tags[index];
    const match = /(?:^|\s)alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    if (!match) {
      missingAlt++;
      missingTagIndexes.push(index);
      continue;
    }
    withAlt++;
    const alt = match[1] ?? match[2];
    if (alt === "") {
      emptyAlt++;
      decorativeCandidates.push(index);
    } else if (alt.length > 250) longAlt++;
  }
  return {
    images: tags.length, withExplicitAlt: withAlt,
    missingAlt, emptyAltDecorativeCandidates: emptyAlt,
    excessivelyLongAltCandidates: longAlt,
    missingTagIndexes, decorativeCandidates,
    meaning: "Static alt-attribute presence only; human must review descriptive quality and decorative intent"
  };
}

export function auditAltPresence({ publishedTree, corporateSource }) {
  const sitemap = readFileSync(join(publishedTree, "sitemap.xml"), "utf8");
  const routes = publicPageRoutes({ sitemap, corporateSource });
  const results = routes.map(route => {
    const path = route === "/" ? "index.html" : route.slice(1) + "index.html";
    try {
      const html = readFileSync(join(publishedTree, path), "utf8");
      const observations = screenImgAltAttributes(html);
      return { route, sourceFile: path, ...observations,
        errors: observations.missingAlt
          ? ["HTML img elements missing an explicit alt attribute"] : [] };
    } catch (error) {
      return { route, sourceFile: path, images: null,
        errors: ["Cannot inspect public HTML: " + String(error).slice(0, 140)] };
    }
  });
  return {
    schema: "novapharm.read-only-public-html-image-alt-presence.v1",
    level: "source HTML alt presence, NOT human image accessibility approval",
    totalPages: routes.length,
    pagesWithImages: results.filter(x => x.images > 0).length,
    totalImages: results.reduce((n,x)=>n+(x.images||0),0),
    imagesMissingAlt: results.reduce((n,x)=>n+(x.missingAlt||0),0),
    emptyAltHumanReviewCandidates: results.reduce((n,x)=>n+(x.emptyAltDecorativeCandidates||0),0),
    pagesWithIssues: results.filter(x=>x.errors.length).length,
    pages: results
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const sourceTree = resolve(process.env.SOURCE_TREE || "source-tree");
  const publishedTree = resolve(process.env.PUBLISHED_TREE || "published-tree");
  const corporateSource = readFileSync(join(sourceTree, "apps/corporate/data/pages.ts"), "utf8");
  const report = auditAltPresence({ publishedTree, corporateSource });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ pages: report.totalPages, pagesWithImages: report.pagesWithImages,
    images: report.totalImages, missingAlt: report.imagesMissingAlt,
    emptyAltRequiresHumanReview: report.emptyAltHumanReviewCandidates,
    pagesWithIssues: report.pagesWithIssues }));
  if (report.pagesWithIssues) process.exitCode = 1;
}
