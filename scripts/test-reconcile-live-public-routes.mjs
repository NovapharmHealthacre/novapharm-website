import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePublicRouteUniverse, summarizeObservedPublisherShas } from "./reconcile-live-public-routes.mjs";

const slugs = Array.from({length:19}, (_, i) => "product-" + (i + 1));
const core = ["/", "/about/", "/capabilities/", "/contact/", "/legal/privacy/", "/products/",
  "/products/nutraxin/", "/products/esco/", "/products/marketplace/",
  "/regulatory-services/", "/services/", "/trust-centre/"];
const productPaths = slugs.map(slug => "/products/nutraxin/" + slug + "/");
const clean = [...core, ...productPaths];
const audit = (source=clean, live=clean, products=slugs) =>
  reconcilePublicRouteUniverse({expectedPaths:source,livePaths:live,productSlugs:products});

test("all 19 source-approved Nutraxin product pages and critical core routes are required", () => {
  const report = audit();
  assert.equal(report.approvedNutraxinProductCount, 19);
  assert.equal(report.expectedCriticalAndProductRoutes, 31);
  assert.deepEqual(report.issues, []);
});

test("quiet loss of a product from live or source sitemap cannot count as full coverage", () => {
  assert.ok(audit(clean,clean.filter(x=>x!==productPaths[4])).issues
    .includes("Required live sitemap route missing: " + productPaths[4]));
  assert.ok(audit(clean.filter(x=>x!==productPaths[5]),clean).issues
    .includes("Required source sitemap route missing: " + productPaths[5]));
  assert.ok(audit(clean,clean.filter(x=>x!=="/contact/")).issues
    .includes("Required live sitemap route missing: /contact/"));
  assert.throws(() => audit(clean,clean,slugs.slice(0,18)),/at least the original 19/);
});

test("unapproved product pages, protected routes and noindex research never enter sitemap", () => {
  const x=audit(clean,[...clean, "/products/nutraxin/fake-remedy/", "/employee/dashboard/",
    "/quantum-research/", "/products/esco/bag/"]);
  assert.ok(x.unexpectedIndexedNutraxinPages.includes("/products/nutraxin/fake-remedy/"));
  assert.ok(x.restrictedIndexed.includes("/quantum-research/"));
  assert.ok(x.restrictedIndexed.includes("/products/esco/bag/"));
  assert.ok(x.restrictedPrefixes.includes("/employee/dashboard/"));
  assert.ok(x.issues.length >= 4);
});

test("invalid or duplicated routes and slugs cannot fabricate healthy audit results", () => {
  assert.throws(() => audit([...clean, "/"], clean),/duplicate routes/);
  assert.throws(() => audit(clean, [...clean, "//evil/"]),/invalid canonical path/);
  assert.throws(() => audit(clean,clean,[...slugs.slice(0,18),slugs[0]]),/Duplicate approved/);
  assert.throws(() => audit(clean,clean,[...slugs.slice(0,18), "../evil"]),/Unsafe Nutraxin/);
});

const sha = x => x.repeat(40);
const route = (path, hash) => ({path,higSignals:{deployedSourceSha:hash}});
test("separate ESCO and corporate publisher heads are recorded without false rollback claim", () => {
  const report=summarizeObservedPublisherShas([
    route("/about/",sha("a")),route("/services/",sha("a")),
    route("/products/esco/",sha("b")),route("/contact/",null)]);
  assert.deepEqual(report.issues,[]);
  assert.equal(report.families["corporate-editorial"].routes,2);
  assert.equal(report.families.esco.routes,1);
  assert.equal(report.families["static-public"].missingSourceSha,1);
  assert.match(report.description,/not a cross-family rollback verdict/);
});

test("mixed published SHAs within the same estate flag investigation", () => {
  const report=summarizeObservedPublisherShas([
    route("/about/",sha("a")),route("/services/",sha("b"))]);
  assert.equal(report.families["corporate-editorial"].conflictingShas,true);
  assert.equal(report.issues.length,1);
  assert.match(report.issues[0],/partial release\/rollback/);
});
