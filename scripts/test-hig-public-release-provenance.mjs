import assert from "node:assert/strict";
import test from "node:test";
import { FAMILIES, verifyPublicReleaseProvenance as verify } from "./verify-hig-public-release-provenance.mjs";

const expected = Object.freeze({
  "corporate-editorial": "a".repeat(40),
  "static-public": "b".repeat(40),
  nutraxin: "c".repeat(40),
  esco: "d".repeat(40)
});
function fixture() {
  const groups = {
    "corporate-editorial": ["/about/", "/distribution/", "/market-access/", "/markets/", "/services/", "/capabilities/",
      ...Array.from({length:25}, (_, i) => "/corporate-" + i + "/")],
    "static-public": ["/", "/contact/", "/products/", "/products/marketplace/", "/legal/", "/legal/privacy/",
      "/legal/cookies/", "/legal/terms/", "/legal/accessibility/", "/legal/environment-carbon/",
      "/legal/modern-slavery/", "/products/strategic-portfolio/"],
    nutraxin: ["/products/nutraxin/", ...Array.from({length:19}, (_, i) => "/products/nutraxin/product-" + i + "/")],
    esco: ["/products/esco/"]
  };
  const routes = [];
  const families = {};
  for (const family of FAMILIES) {
    const paths = groups[family];
    families[family] = {
      routes: paths.length, missingSourceSha: 0, conflictingShas: false,
      observedShaRoutes: { [expected[family]]: paths }
    };
    for (const path of paths) {
      routes.push({path, httpOk: true, errors: [],
        htmlSnapshotSha256: "e".repeat(64),
        higSignals: {deployedSourceSha: expected[family], language: "en-GB", responsiveViewport: true,
          h1Elements: 1, skipLinkWithTarget: true}});
    }
  }
  routes.push({path:"/quantum-research/", httpOk:true, errors:[], noindex:true,
    htmlSnapshotSha256:"f".repeat(64)});
  return {
    timestamp:"2026-11-21T03:00:00.000Z", origin:"https://novapharmhealthcare.com",
    checked:routes.length, failures:0, issues:[], routes,
    corporateSourceCoverage:{routesMissingFromBothSitemaps:[]},
    routeReconciliation:{missingFromSourceSitemap:[],missingFromLiveSitemap:[],
      sourceNotLive:[], restrictedIndexed:[], restrictedPrefixes:[],
      unexpectedIndexedNutraxinPages:[]},
    higScreening:{routesScreened:64,withSourceSha:64,missingSourceSha:0,
      routesWithHtmlSnapshotDigest:65},
    publisherProvenance:{families}
  };
}
test("64 public screens plus noindex research can pass explicit four-family release parity without claiming HIG acceptance",()=>{
  const report=verify(fixture(),expected);
  assert.equal(report.passed,true,JSON.stringify(report.problems));
  assert.equal(report.checked,65);
  assert.equal(report.independentHigAcceptance,false);
  assert.match(report.additionalRequired,/manual AT/);
});
test("missing source SHA and a synthetic content digest cannot establish published revision",()=>{
  const audit=fixture();
  const row=audit.routes.find(x=>x.path.startsWith("/products/nutraxin/product"));
  row.higSignals.deployedSourceSha=null;
  audit.higScreening.withSourceSha=63;
  audit.higScreening.missingSourceSha=1;
  audit.publisherProvenance.families.nutraxin.missingSourceSha=1;
  assert.equal(verify(audit,expected).passed,false);
  assert.ok(verify(audit,expected).problems.some(x=>x.includes("Published source revision missing")));
});
test("stale or forged expected publisher SHA fails, even when all pages are reachable",()=>{
  const wrong={...expected,esco:"f".repeat(40)};
  assert.equal(verify(fixture(),wrong).passed,false);
  assert.equal(verify(fixture(),{...expected,nutraxin:"not-a-sha"}).passed,false);
  assert.equal(verify(fixture(),{"corporate-editorial":expected["corporate-editorial"]}).passed,false);
});
test("same-family mixed SHAs fail rather than being hidden by cross-family differences",()=>{
  const audit=fixture();
  audit.publisherProvenance.families["corporate-editorial"].conflictingShas=true;
  assert.ok(verify(audit,expected).problems.some(x=>x.includes("Multiple published revisions")));
});
test("a missing source/live sitemap entry blocks readiness even if all sampled routes work",()=>{
  const audit=fixture();
  audit.routeReconciliation.sourceNotLive=["/markets/"];
  audit.issues=["Approved source sitemap route disappeared from live: /markets/"];
  assert.equal(verify(audit,expected).passed,false);
});
test("a broken form or private route added to a sitemap fails the release candidate",()=>{
  const audit=fixture();
  audit.routes.find(x=>x.path==="/contact/").errors.push("HTTP 500");
  audit.failures=1;
  audit.routeReconciliation.restrictedIndexed=["/portal/dashboard/"];
  assert.equal(verify(audit,expected).passed,false);
});
test("noindex research and actual fetched HTML digests are mandatory",()=>{
  const audit=fixture();
  audit.routes.find(x=>x.path==="/quantum-research/").noindex=false;
  audit.routes[0].htmlSnapshotSha256=null;
  assert.equal(verify(audit,expected).passed,false);
});
test("source and publisher census must cover the actual observed route universe",()=>{
  const audit=fixture();
  audit.publisherProvenance.families.esco.routes=2;
  assert.equal(verify(audit,expected).passed,false);
  audit.publisherProvenance.families.esco.routes=1;
  audit.routes.pop();
  audit.checked=64;
  assert.equal(verify(audit,expected).passed,false);
});


test("a fabricated aggregate cannot conceal an individually mixed Corporate publisher",()=>{
  const audit=fixture();
  audit.routes.find(x=>x.path==="/about/").higSignals.deployedSourceSha="f".repeat(40);
  const verdict=verify(audit,expected);
  assert.equal(verdict.passed,false);
  assert.ok(verdict.problems.some(x=>x.includes("summary disagrees with individually observed routes")));
});
test("fake green SHA and HTML digest totals are rejected against the route observations",()=>{
  const audit=fixture();
  audit.higScreening.withSourceSha=63;
  audit.higScreening.routesWithHtmlSnapshotDigest=64;
  const verdict=verify(audit,expected);
  assert.equal(verdict.passed,false);
  assert.ok(verdict.problems.some(x=>x.includes("census")));
});
