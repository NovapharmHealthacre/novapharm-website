import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { corporateRoutesFromSource, reconcilePublicRouteUniverse, summarizeObservedPublisherShas, classifyCandidateSitemapReadiness } from "./reconcile-live-public-routes.mjs";

test("all thirty-two source-defined Corporate routes are screened even if sitemap forgets three", () => {
  const source=readFileSync("apps/corporate/data/pages.ts","utf8");
  const routes=corporateRoutesFromSource(source);
  assert.equal(routes.length,32);
  for (const path of ["/distribution/","/market-access/","/markets/"]) assert.ok(routes.includes(path));
  assert.equal(new Set(routes).size,32);
  assert.throws(() => corporateRoutesFromSource(source.replace(
    'page("distribution", "narrative"', 'page("about", "narrative"')), /Duplicate corporate page slug/);
  assert.throws(() => corporateRoutesFromSource("page(\"\", \"home\""), /Expected the 32/);
});

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


test("post-build ESCO and Marketplace routes are required live but absent from prebuild sitemap is allowed", () => {
  const prebuild = clean.filter(path => !["/products/esco/", "/products/marketplace/"].includes(path));
  assert.deepEqual(audit(prebuild,clean).issues,[]);
  assert.ok(audit(prebuild,clean.filter(path => path !== "/products/esco/")).issues
    .includes("Required live sitemap route missing: /products/esco/"));
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


const pendingPaths = ["/distribution/", "/market-access/", "/markets/"];
const pendingIssues = pendingPaths.map(path =>
  "Approved source sitemap route disappeared from live: " + path);
const verifiedSourceProbe = path => ({
  path, httpOk:true, errors:[], title:"NovaPharm", h1:"Verified public page",
  canonical:"https://novapharmhealthcare.com" + path,
  higSignals:{language:"en-GB", responsiveViewport:true, h1Elements:1,
    skipLinkWithTarget:true, deployedSourceSha:"a".repeat(40)}
});
const candidate = (changes={}) => classifyCandidateSitemapReadiness({
  origin:"https://novapharmhealthcare.com", eventName:"pull_request",
  candidateOnly:true, sourceNotLive:pendingPaths, issues:pendingIssues,
  routes:pendingPaths.map(verifiedSourceProbe),
  ...changes
});

test("only three verified, already-live Corporate pages may be pending in a source-only PR", () => {
  const out=candidate();
  assert.equal(out.mode,"source-only-pr-candidate");
  assert.equal(out.permittedCandidateDelta,true);
  assert.deepEqual(out.blockingIssues,[]);
  assert.equal(out.candidateCheckPassed,true);
  assert.equal(out.strictLiveReleasePassed,false);
  assert.match(out.warning,/never establishes live sitemap publication/);
});
test("manual and scheduled live audits cannot waive source-to-publication drift", () => {
  for (const eventName of ["workflow_dispatch","schedule","push"]) {
    const out=candidate({eventName});
    assert.equal(out.mode,"strict-live-publication");
    assert.equal(out.permittedCandidateDelta,false);
    assert.deepEqual(out.blockingIssues,pendingIssues);
  }
  assert.equal(candidate({candidateOnly:false}).permittedCandidateDelta,false);
});
test("new unreviewed sitemap additions and failures cannot be called pending publication", () => {
  const path="/private-portal/";
  const out=candidate({sourceNotLive:[...pendingPaths,path],
    issues:[...pendingIssues,"Approved source sitemap route disappeared from live: " + path],
    routes:[...pendingPaths.map(verifiedSourceProbe),verifiedSourceProbe(path)]});
  assert.equal(out.candidateCheckPassed,false);
  assert.equal(out.permittedCandidateDelta,false);
});
test("candidate bypass refuses invalid direct response, canonical and SHA metadata", () => {
  for (const broken of [
    {httpOk:false}, {errors:["HTTP 404"]}, {canonical:"https://example.com/"},
    {higSignals:{language:"en-GB",responsiveViewport:true,h1Elements:1,
      skipLinkWithTarget:true,deployedSourceSha:null}},
    {title:""}
  ]) {
    const paths=pendingPaths.map(verifiedSourceProbe);
    paths[1]={...paths[1],...broken};
    assert.equal(candidate({routes:paths}).permittedCandidateDelta,false,
      "Unsafe route unexpectedly accepted: " + JSON.stringify(broken));
  }
});
test("unrelated sitemap and security findings remain candidate-blocking", () => {
  const x=candidate({issues:[...pendingIssues,"Private route exposed to public indexing: /admin/dashboard/"]});
  assert.equal(x.permittedCandidateDelta,true);
  assert.equal(x.candidateCheckPassed,false);
  assert.deepEqual(x.blockingIssues,["Private route exposed to public indexing: /admin/dashboard/"]);
});
