/**
 * Source-driven route universe prevents a damaged sitemap from hiding pages
 * that are still linked in the owner-approved Corporate catalogue.
 */
export function corporateRoutesFromSource(source) {
  if (typeof source !== "string") throw new TypeError("Corporate page catalogue source required");
  const slugs = [...source.matchAll(/\bpage\(\s*"([^"]*)"\s*,\s*"([^"]+)"/g)].map(match => match[1]);
  if (slugs.length !== 32) throw new Error("Expected the 32 reviewed corporate page definitions");
  if (new Set(slugs).size !== slugs.length) throw new Error("Duplicate corporate page slug");
  if (slugs.some(slug => slug && !/^[a-z0-9]+(?:[-a-z0-9]*)(?:\/[a-z0-9]+(?:[-a-z0-9]*))*$/.test(slug)))
    throw new Error("Unsafe corporate page slug");
  return slugs.map(slug => slug ? "/" + slug + "/" : "/");
}

/**
 * Exact public sitemap reconciliation. A successful HTTP 200 across a reduced
 * sitemap is not proof that owner-approved products and routes survived.
 * This source-only contract does not publish, submit forms or access private APIs.
 */
const criticalRoutes = Object.freeze([
  "/", "/about/", "/capabilities/", "/contact/", "/legal/privacy/",
  "/products/", "/products/nutraxin/", "/products/esco/",
  "/products/marketplace/", "/regulatory-services/", "/services/",
  "/trust-centre/"
]);
// The approved static builder generates these routes after the earlier SEO pass.
// Their absence from checked-in prebuild sitemap.xml is valid; absence from
// the final LIVE sitemap is a release failure.
const generatedAfterSeo = new Set(["/products/esco/", "/products/marketplace/"]);
const neverIndexed = Object.freeze([
  "/quantum-research/", "/products/esco/bag/", "/products/track/",
  "/portal/dashboard/", "/portal/executive-platform/command-centre/",
  "/employee/dashboard/", "/admin/dashboard/"
]);
const shaPattern = /^[a-f0-9]{40}$/;

function assertValidPaths(paths, label) {
  if (!Array.isArray(paths)) throw new TypeError(label + " must be an array");
  for (const path of paths) {
    if (typeof path !== "string" || !/^\/(?:[a-z0-9-]+\/)*$/i.test(path)) {
      throw new Error(label + ": invalid canonical path " + String(path));
    }
  }
  if (new Set(paths).size !== paths.length)
    throw new Error(label + ": duplicate routes must be reconciled upstream");
}

export function reconcilePublicRouteUniverse({ expectedPaths, livePaths, productSlugs }) {
  assertValidPaths(expectedPaths, "Source sitemap");
  assertValidPaths(livePaths, "Live sitemap");
  if (!Array.isArray(productSlugs) || productSlugs.length < 19)
    throw new Error("Approved Nutraxin registry must include at least the original 19 SKUs");
  if (new Set(productSlugs).size !== productSlugs.length)
    throw new Error("Duplicate approved Nutraxin product slug");
  for (const slug of productSlugs)
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error("Unsafe Nutraxin product slug");
  const expected = new Set(expectedPaths);
  const live = new Set(livePaths);
  const requiredProducts = productSlugs.map(slug => "/products/nutraxin/" + slug + "/");
  const requirements = [...new Set([...criticalRoutes, ...requiredProducts])];
  const missingFromSourceSitemap = requirements.filter(path => !generatedAfterSeo.has(path) && !expected.has(path));
  const missingFromLiveSitemap = requirements.filter(path => !live.has(path));
  const sourceNotLive = expectedPaths.filter(path => !live.has(path));
  const unexpectedIndexedNutraxinPages = livePaths.filter(path =>
    path.startsWith("/products/nutraxin/") && path !== "/products/nutraxin/" &&
    !requiredProducts.includes(path));
  const restrictedIndexed = neverIndexed.filter(path => live.has(path));
  const restrictedPrefixes = livePaths.filter(path =>
    /^\/(?:employee|admin)\//.test(path) ||
    /^\/portal\/(?:dashboard|account|orders|executive-platform|settings)\//.test(path));
  const issues = [
    ...missingFromSourceSitemap.map(path => "Required source sitemap route missing: " + path),
    ...missingFromLiveSitemap.map(path => "Required live sitemap route missing: " + path),
    ...sourceNotLive.map(path => "Approved source sitemap route disappeared from live: " + path),
    ...unexpectedIndexedNutraxinPages.map(path => "Unregistered Nutraxin product indexed: " + path),
    ...restrictedIndexed.map(path => "Private, bag or research-only route indexed: " + path),
    ...restrictedPrefixes.map(path => "Protected route exposed to public indexing: " + path)
  ];
  return {
    approvedNutraxinProductCount: requiredProducts.length,
    expectedCriticalAndProductRoutes: requirements.length,
    missingFromSourceSitemap, missingFromLiveSitemap, sourceNotLive,
    unexpectedIndexedNutraxinPages, restrictedIndexed, restrictedPrefixes,
    issues
  };
}

function familyFor(path) {
  if (path === "/products/esco/" || path.startsWith("/products/esco/")) return "esco";
  if (path === "/products/nutraxin/" || path.startsWith("/products/nutraxin/")) return "nutraxin";
  if (path === "/products/" || path.startsWith("/products/") ||
      path === "/contact/" || path.startsWith("/legal/") || path === "/")
    return "static-public";
  return "corporate-editorial";
}

export function summarizeObservedPublisherShas(routes) {
  if (!Array.isArray(routes)) throw new TypeError("Route audit records required");
  const families = {};
  for (const record of routes) {
    if (!record?.path || !record.higSignals) continue;
    const family = familyFor(record.path);
    const observed = record.higSignals.deployedSourceSha;
    const group = families[family] ??= { routes: 0, missingSourceSha: 0, observedShaRoutes: {}, conflictingShas: false };
    group.routes++;
    if (!observed) group.missingSourceSha++;
    else {
      if (!shaPattern.test(observed)) throw new Error("Invalid observed SHA");
      group.observedShaRoutes[observed] ??= [];
      group.observedShaRoutes[observed].push(record.path);
    }
  }
  const issues = [];
  for (const [family, group] of Object.entries(families)) {
    group.conflictingShas = Object.keys(group.observedShaRoutes).length > 1;
    if (group.conflictingShas)
      issues.push("Multiple deployed source SHAs within " + family + "; inspect for partial release/rollback");
  }
  return {
    description: "Publisher family SHA split is a release-investigation signal, not a cross-family rollback verdict. Missing meta does not prove old code.",
    families, issues
  };
}


/**
 * Candidate source publication is NOT a live release acceptance.
 * Three already-live Corporate routes were added to the reviewed source sitemap
 * before the public XML has been published. Only a PR may classify that
 * narrow, independently probed delta as pending; all other issues remain fatal.
 * Manual/scheduled/post-release checks continue to fail on ANY source-live drift.
 */
const candidateSitemapDelta = Object.freeze([
  "/distribution/", "/market-access/", "/markets/"
]);
export function classifyCandidateSitemapReadiness({
  origin, eventName, candidateOnly, issues, sourceNotLive, routes
}) {
  const pending = Array.isArray(sourceNotLive) ? sourceNotLive : [];
  const allIssues = Array.isArray(issues) ? issues : [];
  const candidateMode = candidateOnly === true && eventName === "pull_request";
  const eligiblePaths = pending.length > 0 &&
    pending.every(path => candidateSitemapDelta.includes(path));
  const directChecks = eligiblePaths && pending.every(path => {
    const record = Array.isArray(routes) ? routes.find(item => item.path === path) : null;
    return record?.httpOk === true &&
      Array.isArray(record.errors) && record.errors.length === 0 &&
      record.title?.length > 0 && record.h1?.length > 0 &&
      record.canonical === origin + path &&
      record.higSignals?.language &&
      record.higSignals?.responsiveViewport === true &&
      record.higSignals?.h1Elements === 1 &&
      record.higSignals?.skipLinkWithTarget === true &&
      /^[a-f0-9]{40}$/i.test(record.higSignals?.deployedSourceSha || "");
  });
  const pendingIssueMessages = new Set(pending.map(path =>
    "Approved source sitemap route disappeared from live: " + path));
  const permittedCandidateDelta = Boolean(candidateMode && eligiblePaths && directChecks);
  const blockingIssues = permittedCandidateDelta
    ? allIssues.filter(issue => !pendingIssueMessages.has(issue))
    : [...allIssues];
  return {
    mode: candidateMode ? "source-only-pr-candidate" : "strict-live-publication",
    sourceDeltaPending: pending,
    permittedCandidateDelta,
    blockingIssues,
    candidateCheckPassed: blockingIssues.length === 0,
    strictLiveReleasePassed: allIssues.length === 0,
    warning: "Source-only PR success never establishes live sitemap publication, HIG acceptance or deployment authorization"
  };
}
