import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const read = file => readFileSync(file, "utf8");
const manifest = JSON.parse(read("docs/design/apple-hig-runtime-source-scope-20261120.json"));
const corporateSource = read(manifest.corporate.pageRegister);
const articleSource = read(manifest.corporate.articleRegister);
const productRegister = JSON.parse(read(manifest.corporate.nutraxinRegister));
const portalModules = JSON.parse(read(manifest.portal.moduleRegister));
const intelligenceSource = read(manifest.portal.intelligenceCatalogue);
const mlSourcePath = "apps/portal/data/nova-ml-modules.ts";
const mlSource = read(mlSourcePath);

const pageDefinitions = [...corporateSource.matchAll(/\bpage\(\s*"([^"]*)"\s*,\s*"([^"]+)"/g)]
  .map(match => ({slug:match[1],kind:match[2]}));
const articleRefs = [...articleSource.matchAll(/from "\.\/insights\/([a-z0-9-]+)\.json"/g)]
  .map(match => match[1]);
const articles = articleRefs.map(key => {
  const file = "apps/corporate/data/insights/" + key + ".json";
  const article = JSON.parse(read(file));
  assert.match(article.slug,/^[a-z0-9-]+$/,"Article source slug");
  return {slug:article.slug,file};
});
const workspaces = [...intelligenceSource.matchAll(
  /\{\s*slug:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*group:\s*"([^"]+)",\s*state:\s*"([^"]+)"/g
)].map(match=>({slug:match[1],title:match[2],group:match[3],state:match[4]}));
const mlSlugs = [...mlSource.matchAll(/\bslug:\s*"(nova-[a-z0-9-]+)"/g)].map(x=>x[1]);

const record = (kind,route,source,details={}) => ({
  kind,route,source,...details,
  status:"source_candidate_not_production_verified",
  productionReceipt:null,
  accessibilityAcceptance:null,
  independentApproval:null
});
const candidates = [
  ...pageDefinitions.map(x=>record("corporate_page","/"+(x.slug?x.slug+"/":""),manifest.corporate.pageRegister,
    {pageKind:x.kind,access:"public_candidate"})),
  ...articles.map(x=>record("corporate_article","/news-insights/"+x.slug+"/",x.file,
    {access:"public_candidate"})),
  ...productRegister.products.map(x=>record("catalogue_product","/products/nutraxin/"+x.slug+"/",
    manifest.corporate.nutraxinRegister,{access:"public_candidate",medicalAndCommercialClaimsAccepted:false})),
  ...portalModules.map(x=>record("portal_module",x.route,manifest.portal.moduleRegister,
    {code:x.code,area:x.area,visibleInSourceNavigation:x.visibleInNavigation,
      releaseClassification:x.releaseClassification,access:"protected_candidate",
      tenantAndRoleVerifiedInProduction:false})),
  ...workspaces.map(x=>record("intelligence_workspace",
    "/portal/executive-platform/medicines-intelligence/"+x.slug+"/",
    manifest.portal.intelligenceCatalogue,{sourceLabel:x.state,access:"protected_candidate",
      tenantAndRoleVerifiedInProduction:false})),
  ...mlSlugs.map(slug=>record("nova_ml_research",
    "/portal/executive-platform/nova-ml/"+slug+"/",mlSourcePath,
    {access:"protected_candidate",modelExecutionVerifiedInProduction:false}))
];
const counts = {
  corporatePages:pageDefinitions.length,
  articles:articles.length,
  nutraxinProducts:productRegister.products.length,
  portalModules:portalModules.length,
  intelligenceWorkspaces:workspaces.length,
  novaMLResearch:mlSlugs.length,
  totalCandidates:candidates.length
};
assert.equal(counts.corporatePages,manifest.corporate.declaredPageDefinitions);
assert.equal(counts.articles,manifest.corporate.articleImportReferences);
assert.equal(counts.nutraxinProducts,manifest.corporate.nutraxinProducts);
assert.equal(counts.portalModules,manifest.portal.declaredModules);
assert.equal(counts.intelligenceWorkspaces,manifest.portal.intelligenceWorkspaces);
assert.equal(counts.novaMLResearch,5);
assert.equal(counts.totalCandidates,138);
assert.equal(new Set(candidates.map(item=>item.route)).size,candidates.length,
  "Expanded source route candidates must be unique before public/device acceptance");
assert.ok(candidates.every(x=>x.route.startsWith("/") && x.status === "source_candidate_not_production_verified"));
assert.ok(candidates.filter(x=>x.access==="protected_candidate").every(x=>x.tenantAndRoleVerifiedInProduction===false ||
  x.kind==="nova_ml_research"));
const result = {
  schema:"novapharm.hig-route-acceptance-candidates.v1",
  sourceBaselineSha:manifest.sourceSnapshotSha,
  evaluatedCommit:process.env.GITHUB_SHA||null,
  generatedAt:new Date().toISOString(),
  sourceOnly:true,
  fullUrlUniverseProven:false,
  deployedOriginOrArtifactAccepted:false,
  productionSignoff:JSON.parse(read(manifest.production.constraints)).productionSignoff,
  methodology:"Distinct explicit source-derived routes; excludes dynamic article/person aliases, parameterized pages, and deployed route discovery. No HTTP, auth or user data.",
  counts,candidates
};
const folder="artifacts/apple-hig-production-audit";
mkdirSync(folder,{recursive:true});
const output=folder+"/source-route-candidates.json";
writeFileSync(output,JSON.stringify(result,null,2)+"\n");
console.log("Generated "+counts.totalCandidates+" unverified source-route candidates at "+output);
