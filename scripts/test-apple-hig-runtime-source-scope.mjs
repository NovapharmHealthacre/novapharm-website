import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = relative => readFileSync(relative, "utf8");
const manifest = JSON.parse(read("docs/design/apple-hig-runtime-source-scope-20261120.json"));
const owner = JSON.parse(read("config/intelligence/owner-production-constraints.json"));

function walk(root) {
  const output = [];
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const name = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) output.push(name.replaceAll(path.sep, "/"));
    }
  }
  visit(root);
  return output;
}
function occurrences(source, regex) {
  return [...source.matchAll(regex)].length;
}

test("source scope is a bounded, reviewed inventory, not an HIG production certificate", () => {
  assert.equal(manifest.schema, "novapharm.apple-hig.source-to-runtime-scope.v1");
  assert.match(manifest.sourceSnapshotSha, /^[a-f0-9]{40}$/);
  assert.match(manifest.scope, /No deployed route/);
  assert.equal(manifest.production.acceptedProductionHigTopics, 0);
  assert.equal(manifest.production.acceptedOutOfScopeHigTopics, 0);
  for (const gate of manifest.acceptancePriority) {
    assert.equal(gate.state, "pending", gate.area);
    assert.ok(gate.required.length > 40, gate.area);
  }
  assert.equal(owner.productionSignoff, manifest.production.requiredSignoff);
  assert.equal(owner.productionSignoff, "not_granted");
  assert.equal(owner.initialInfrastructureBudget.monthlyCapGbp, 0);
  assert.equal(owner.productionPermissions.activatePublicCustomerAccess, false);
  assert.equal(owner.productionPermissions.enableCustomerBilling, false);
});

test("Next.js route source count cannot be confused with public or authenticated URLs", () => {
  const pages = walk("apps").filter(file =>
    /^apps\/[^/]+\/(?:src\/)?app\/(?:.*\/)?page\.(?:tsx|jsx|ts|js)$/.test(file));
  assert.equal(pages.length, manifest.nextPages.sourcePageFiles);
  assert.equal(manifest.nextPages.sourcePageFiles, 26);
  for (const catchAll of manifest.nextPages.dynamicCatchAllSources)
    assert.ok(pages.includes(catchAll), "Unrepresented dynamic catch-all: " + catchAll);
  assert.match(manifest.nextPages.warning, /NOT 26 user-facing URL routes/);
  const corporatePages = read(manifest.corporate.pageRegister);
  assert.equal(occurrences(corporatePages, /\bpage\(\s*"[^"]*"\s*,\s*"[^"]+"/g),
    manifest.corporate.declaredPageDefinitions);
  assert.equal(occurrences(read(manifest.corporate.articleRegister),
    /import\s+\w+\s+from\s+"\.\//g), manifest.corporate.articleImportReferences);
  const catalogue = JSON.parse(read(manifest.corporate.nutraxinRegister));
  assert.equal(catalogue.products.length, manifest.corporate.nutraxinProducts);
  assert.equal(new Set(catalogue.products.map(p => p.slug)).size, catalogue.products.length);
});

test("protected Portal and Intelligence navigation counts have no implied live access", () => {
  const modules = JSON.parse(read(manifest.portal.moduleRegister));
  const groups = Object.fromEntries(["customer","employee","executive","admin"]
    .map(area => [area, modules.filter(m => m.area === area).length]));
  assert.equal(modules.length, manifest.portal.declaredModules);
  assert.deepEqual(groups, manifest.portal.areas);
  assert.equal(modules.filter(m => m.visibleInNavigation).length, manifest.portal.visibleInNavigation);
  assert.equal(modules.filter(m => m.releaseClassification === "hidden_until_dependency_exists").length,
    manifest.portal.hiddenUntilDependencies);
  assert.equal(new Set(modules.map(m => m.route)).size, modules.length);
  assert.ok(read(manifest.portal.routeImplementation).includes("verifiedPortalSession"),
    "Protected pages must still use server-side verified sessions");
  const workspaces = [...read(manifest.portal.intelligenceCatalogue).matchAll(
    /\{\s*slug:\s*"[^"]+",\s*title:\s*"[^"]+",\s*group:\s*"[^"]+",\s*state:\s*"([^"]+)"/g
  )].map(match => match[1]);
  assert.equal(workspaces.length, manifest.portal.intelligenceWorkspaces);
  assert.equal(workspaces.filter(x => x === "existing-read-only").length,
    manifest.portal.sourceLabeledReadOnly);
  assert.equal(workspaces.filter(x => x === "gated").length, manifest.portal.sourceLabeledGated);
  assert.match(manifest.portal.evidenceBoundary, /NOT authenticated production availability/);
});

test("native prototypes are not certified installed iOS or Android releases", () => {
  const swift = read(manifest.native.appleSwiftPackage);
  const gradle = read(manifest.native.androidBuild);
  const androidManifest = read(manifest.native.androidManifest);
  const expo = JSON.parse(read(manifest.native.expoConfig));
  assert.ok(swift.includes('.library(name: "NovaMLApple"'));
  assert.ok(gradle.includes('applicationId = "com.novapharm.intelligence.research"'));
  assert.ok(gradle.includes('versionName = "0.1.0-research"'));
  assert.doesNotMatch(androidManifest,
    /<uses-permission\b[^>]*android:name="android\.permission\.INTERNET"/);
  assert.equal(expo.expo.version, manifest.native.expoProductVersion);
  assert.equal(Boolean(expo.expo.ios?.bundleIdentifier), manifest.native.expoHasProductionIOSBundleId);
  assert.equal(Boolean(expo.expo.android?.package), manifest.native.expoHasProductionAndroidPackage);
  assert.equal(manifest.production.physicalVoiceOverTalkBackAccepted, false);
  assert.equal(manifest.production.signedNativeDistributionReceiptsAccepted, false);
  assert.equal(manifest.production.exactLiveProtectedDeploymentReceiptsAccepted, false);
});
