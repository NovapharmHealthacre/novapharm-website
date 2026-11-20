/**
 * Complete source-record census for the NovaPharm website, protected modules,
 * catalogue products and native packages. This is NOT live acceptance.
 *
 * Run: node scripts/audit-entire-novapharm-application-estate.mjs
 * Never fetches network resources, executes private routes, or deploys code.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const sources = Object.freeze({
  pages: "apps/corporate/data/pages.ts",
  articles: "apps/corporate/data/articles.ts",
  nutraxin: "apps/corporate/data/nutraxin-product-register.json",
  nutraxinRetail: "assets/data/nutraxin-retail-catalogue.json",
  esco: "assets/data/esco-catalogue.json",
  portal: "packages/portal-contracts/src/module-catalog.json",
  intelligence: "apps/portal/data/intelligence-workspaces.ts",
  nativeIos: "native/novapharm-intelligence-ios/project.yml",
  nativeAndroid: "native/novapharm-intelligence-android/app/build.gradle.kts",
  owner: "config/intelligence/owner-production-constraints.json"
});
const EXPECTED_APPS = Object.freeze([
  "api", "commerce-stock-api", "corporate", "esco-checkout", "founder",
  "nutraxin-customer-api", "nutraxin-payment-notifications", "nutraxin-payments",
  "nutraxin-products-checkout", "portal", "status", "technology"
]);
const EXPECTED_NATIVE = Object.freeze([
  "novapharm-intelligence-android", "novapharm-intelligence-apple",
  "novapharm-intelligence-ios", "novapharm-intelligence-mobile",
  "novapharm-intelligence-storekit"
]);
const ROLE_FOR_AREA = Object.freeze({
  customer: "customer", employee: "employee", executive: "board", admin: "admin"
});
const read = file => readFileSync(file, "utf8");
const json = file => JSON.parse(read(file));
const sha256 = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const safeRoute = slug => slug ? "/" + slug + "/" : "/";

export function buildEstateAudit() {
  const errors = [];
  const records = [];
  const keys = new Set();
  const add = (kind, id, source, access, route, detail = {}) => {
    const key = kind + ":" + id;
    assert.ok(!keys.has(key), "Repeated source audit record: " + key);
    keys.add(key);
    records.push({
      kind, id, source, access, route,
      sourceIdentified: true,
      sourceTestAndPreviewDoesNotEstablishLiveOperation: true,
      independentProductionEvidence: null,
      accessibilityAndSecurityApproval: null,
      ownerReleaseApproval: null,
      ...detail
    });
  };
  const addError = message => errors.push(message);
  const apps = readdirSync("apps", { withFileTypes:true })
    .filter(item => item.isDirectory()).map(item=>item.name).sort();
  const native = readdirSync("native", { withFileTypes:true })
    .filter(item => item.isDirectory()).map(item=>item.name).sort();
  assert.deepEqual(apps, [...EXPECTED_APPS].sort(), "Unexpected app added/removed: update census and reviewer");
  assert.deepEqual(native, [...EXPECTED_NATIVE].sort(), "Unexpected native project added/removed");
  for (const app of apps) {
    const isService = ["api", "commerce-stock-api","esco-checkout","nutraxin-customer-api",
      "nutraxin-payment-notifications","nutraxin-payments","nutraxin-products-checkout"].includes(app);
    add("app-project", app, "apps/" + app, isService ? "server-side-service" :
      app === "portal" ? "protected" : "public-candidate", null,
      { appKind: isService ? "API/service" : "Next.js application", appDeploymentVerified: false });
  }

  const pageSrc = read(sources.pages);
  const pages = [...pageSrc.matchAll(/\bpage\(\s*"([^"]*)"\s*,\s*"([^"]+)"/g)]
    .map(match => ({ slug: match[1], type: match[2] }));
  assert.equal(pages.length,32,"Corporate source register drift: expected 32 pages");
  assert.equal(new Set(pages.map(p=>p.slug)).size,32,"Duplicate corporate route");
  for (const page of pages)
    add("corporate-page", page.slug || "home", sources.pages, "public-candidate",
      safeRoute(page.slug), { contentKind: page.type });

  const articleImports = [...read(sources.articles).matchAll(
    /import\s+\w+\s+from\s+"\.\/insights\/([^"]+\.json)"/g)].map(m=>m[1]);
  assert.equal(articleImports.length,6,"Six canonical corporate article imports expected");
  for (const file of articleImports) {
    const path = "apps/corporate/data/insights/" + file;
    const article = json(path);
    assert.ok(article.slug && article.title && article.published && article.author,
      "Incomplete article metadata: " + path);
    add("corporate-article", article.slug, path, "public-candidate",
      "/news-insights/" + article.slug + "/", {
        publicationDate: article.published, updateDate: article.updated,
        contentMetadataPresent: true
      });
  }

  const nutraxin = json(sources.nutraxin);
  const retail = json(sources.nutraxinRetail);
  assert.equal(nutraxin.products.length,19);
  assert.equal(retail.products.length,19);
  const retailBySku = new Map(retail.products.map(product => [product.sku,product]));
  assert.equal(retailBySku.size,19,"Duplicate Nutraxin retail SKU");
  const nutraxinSlugs = new Set();
  for (const product of nutraxin.products) {
    if (nutraxinSlugs.has(product.slug)) addError("Duplicate Nutraxin slug " + product.slug);
    nutraxinSlugs.add(product.slug);
    const row = retailBySku.get(product.sku);
    if (!row || row.slug !== product.slug || !Number.isSafeInteger(row.retail_price_pence) ||
      row.retail_price_pence <= 0)
      addError("Nutraxin retail source/slug/price mismatch " + product.sku);
    add("nutraxin-sku", product.sku, sources.nutraxin, "public-candidate",
      "/products/nutraxin/" + product.slug + "/", {
        slug: product.slug, checkoutClaimFromRetailSource: Boolean(row?.ordering_enabled),
        warehouseStockAndPaymentAcceptedByThisAudit: false
      });
  }

  const esco = json(sources.esco);
  assert.equal(esco.entriesTotal,373);
  assert.equal(esco.categories.length,12);
  assert.equal(esco.checkoutEnabled,false);
  const allEsco = esco.categories.flatMap(category=>category.entries.map(entry => ({
    ...entry, category: category.name
  })));
  assert.equal(allEsco.length,373,"ESCO records do not match declared source total");
  for (const item of allEsco) {
    if (item.sellable !== false || item.priceGbp !== null)
      addError("Unverified ESCO supplier item marked saleable/priced: " + item.id);
    if (!item.name || !item.category || !Number.isInteger(item.sourceIndexPage))
      addError("ESCO model has incomplete catalogue provenance: " + item.id);
    add("esco-reference", item.id, sources.esco, "collection-only",
      "/products/esco/", {
        category: item.category, sourceIndexPage: item.sourceIndexPage,
        listedAsVerifiedStock: false, exactSupplierVariantAccepted: false,
        isIndividualIndexablePage: false
      });
  }

  const modules = json(sources.portal);
  assert.equal(modules.length,54);
  const roles = { customer:0, employee:0, executive:0, admin:0 };
  let navVisible = 0, hidden = 0, sourceWritesUnreleased = 0;
  const routes = new Set();
  for (const module of modules) {
    assert.ok(module.code && module.route && module.area &&
      typeof module.purpose === "string", "Incomplete Portal source module");
    if (!Object.hasOwn(ROLE_FOR_AREA,module.area)) addError("Unexpected Portal area " + module.code);
    if (!module.authorisedRoles?.includes(ROLE_FOR_AREA[module.area]))
      addError("Portal role mapping drift for " + module.code);
    if (routes.has(module.route)) addError("Duplicate Portal route " + module.route);
    routes.add(module.route);
    roles[module.area] += 1;
    if (module.visibleInNavigation) navVisible++;
    if (module.releaseClassification === "hidden_until_dependency_exists") {
      hidden++;
      if (module.visibleInNavigation) addError("Dependency-gated module is navigation-visible " + module.code);
    }
    const write = module.writeCapability === "controlled_repository_write_implemented_but_not_released";
    if (write) {
      sourceWritesUnreleased++;
      if (module.releaseClassification !== "informational_only")
        addError("Unreleased write module has unsafe release classification " + module.code);
    }
    if (module.productionStatus !== "not_deployed_owner_controlled")
      addError("Portal release classification changed: independently verify " + module.code);
    add("portal-module", module.code, sources.portal, "role-and-tenant-protected",
      module.route, {
        area:module.area, title: module.title, roles:module.authorisedRoles,
        visibleInNavigation:Boolean(module.visibleInNavigation),
        releaseClassification:module.releaseClassification,
        writeCapability:module.writeCapability,
        protectedLiveRouteVerified:false
      });
  }
  assert.deepEqual(roles,{customer:18,employee:13,executive:18,admin:5});
  assert.equal(navVisible,48);
  assert.equal(hidden,6);
  assert.equal(sourceWritesUnreleased,5);

  const workspaces = [...read(sources.intelligence).matchAll(
    /\{\s*slug:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*group:\s*"([^"]+)",\s*state:\s*"([^"]+)"/g
  )].map(m => ({slug:m[1],title:m[2],group:m[3],state:m[4]}));
  assert.equal(workspaces.length,22);
  assert.equal(new Set(workspaces.map(w=>w.slug)).size,22);
  assert.equal(workspaces.filter(w=>w.state==="existing-read-only").length,5);
  assert.equal(workspaces.filter(w=>w.state==="gated").length,17);
  for (const workspace of workspaces)
    add("intelligence-workspace",workspace.slug,sources.intelligence,
      "protected-candidate",null,{
        title:workspace.title, group:workspace.group, sourceState:workspace.state,
        realLiveWorkspaceAndMedicineRightsVerified:false
      });

  for (const project of native) add("native-project",project,"native/"+project,
    "signed-device-release-pending",null,{ signedDeviceReleaseAccepted:false });
  const ios = read(sources.nativeIos);
  const android = read(sources.nativeAndroid);
  if (!ios.includes("PRODUCT_BUNDLE_IDENTIFIER: com.example.NovaPharmNativePreview") ||
      !ios.includes('CODE_SIGNING_ALLOWED: "NO"'))
    addError("iOS signing/bundle state changed: explicit signed-release review required");
  if (!android.includes('applicationId = "com.novapharm.intelligence.research"') ||
      !android.includes('versionName = "0.1.0-research"'))
    addError("Android research identity changed: signed-release review required");
  const owner = json(sources.owner);
  const grouped = Object.fromEntries([...new Set(records.map(r=>r.kind))].map(kind =>
    [kind,records.filter(r=>r.kind===kind).length]));
  const summary = {
    distinctSourceRecords: records.length,
    byKind: grouped,
    portal: { modules:54, navigationVisible:navVisible, dependencyGated:hidden,
      ownerControlledWriteCodeNotReleased:sourceWritesUnreleased, byArea:roles },
    intelligence: {total:22, sourceReadOnly:5, gated:17},
    commerce: {nutraxinSku:19, escoCatalogueReferences:373, marketplaceSourceCandidates:392},
    ownerProductionSignoff:owner.productionSignoff,
    independentProductionAcceptanceClaimedByThisSourceAudit:0,
    errors:errors.length
  };
  return {
    schema:"novapharm.full-estate-source-census.v1",
    caveat:"Each row is a source object, not an individually verified live page or functioning application. Distinct source records overlap and cannot become an overall implementation percentage.",
    sourceSha256:Object.fromEntries(Object.entries(sources).map(([name,path])=>[name,sha256(path)])),
    summary, errors, records
  };
}

if (process.argv[1]?.endsWith("audit-entire-novapharm-application-estate.mjs")) {
  const report=buildEstateAudit();
  const output="artifacts/estate-audit/novapharm-full-source-census.json";
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({output,...report.summary}));
  if(report.errors.length){console.error("Estate source errors:",report.errors);process.exitCode=1;}
}
