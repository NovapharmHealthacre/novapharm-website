import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const expected = ["labels", "approvals", "ndc", "adverse-events", "recalls"];

test("native Swift and Expo Android publish five offline FDA source references", () => {
  const swift = read("native/novapharm-intelligence-ios/App/USFdaSourceCatalog.swift");
  const expo = read("native/novapharm-intelligence-mobile/USFdaSourcePreviewScreen.tsx");
  for (const id of expected) {
    assert.match(swift, new RegExp('id: "' + id + '"'));
    assert.match(expo, new RegExp('id: "' + id + '"'));
  }
  assert.equal((swift.match(/\.init\(id:/g) || []).length, 5);
  assert.equal((expo.match(/\{ id: "/g) || []).length, 5);
  assert.match(swift, /canRequestProtectedFDAResearch/);
  assert.match(expo, /canFetchProtectedFacts: false/);
  assert.doesNotMatch(swift, /URLSession|httpRequest|accessToken|apiKey/);
  assert.doesNotMatch(expo, /fetch\(|XMLHttpRequest|axios\.|access_token|Authorization:/);
});

test("native release policy is not bypassed by source metadata navigation", () => {
  const swift = read("native/novapharm-intelligence-ios/App/ReleasePolicy.swift");
  const expo = read("native/novapharm-intelligence-mobile/App.tsx");
  const swiftRoot = read("native/novapharm-intelligence-ios/App/NovaRootView.swift");
  const project = read("native/novapharm-intelligence-ios/project.yml");
  const config = JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo;
  assert.match(swift, /protectedNetworkOperationsEnabled = false/);
  assert.match(expo, /No live medicine data/);
  assert.match(expo, /USFdaSourcePreviewScreen/);
  assert.match(swiftRoot, /NovaFDASourcePreviewView/);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER: com\.example\.NovaPharmNativePreview/);
  assert.equal(config.android.package, undefined);
  assert.equal(config.ios.bundleIdentifier, undefined);
});

test("native Swift Core tests include the FDA catalog and its no-connection checks", () => {
  const packageFile = read("native/novapharm-intelligence-ios/Package.swift");
  const tests = read("native/novapharm-intelligence-ios/CoreTests/NovaFDASourceContractTests.swift");
  assert.match(packageFile, /USFdaSourceCatalog\.swift/);
  assert.match(packageFile, /USFdaSourcePreviewView\.swift/);
  assert.match(tests, /realSourceRecordsAvailable/);
  assert.match(tests, /canRequestProtectedFDAResearch/);
});
