import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(path, "utf8");
const ts = read("apps/portal/data/intelligence-workspaces.ts");
const swift = read("native/novapharm-intelligence-ios/App/WorkspaceCatalog.swift");
const policy = read("native/novapharm-intelligence-ios/App/ReleasePolicy.swift");
const view = read("native/novapharm-intelligence-ios/App/NovaRootView.swift");
const config = read("native/novapharm-intelligence-ios/project.yml");
const constraints = JSON.parse(read("config/intelligence/owner-production-constraints.json"));

const webSlugs = [...ts.matchAll(/\{\s*slug:\s*"([^"]+)"/g)].map(m => m[1]);
const nativeSlugs = [...swift.matchAll(/item\(\.intelligence,\s*"([^"]+)"/g)].map(m => m[1]);
const portal = [...swift.matchAll(/item\(\.customerPortal,\s*"([^"]+)"/g)].map(m => m[1]);
const distribution = [...swift.matchAll(/item\(\.distribution,\s*"([^"]+)"/g)].map(m => m[1]);

test("Swift iOS Intelligence slugs stay exact, ordered and lossless against the canonical web catalogue", () => {
  assert.equal(webSlugs.length, 22);
  assert.deepEqual(nativeSlugs, webSlugs);
  assert.equal(new Set(nativeSlugs).size, 22);
});

test("Swift-native Portal and Distribution preserve offline planning module coverage", () => {
  assert.deepEqual(portal, [
    "dashboard", "account", "products", "prices", "orders", "invoices",
    "statements", "delivery", "documents", "support"
  ]);
  assert.deepEqual(distribution, [
    "inventory", "batches", "quality", "replenishment",
    "pick", "dispatch", "delivery", "returns", "performance"
  ]);
});

test("native iOS is a SwiftUI app, not an Expo wrapper, with SwiftData and Charts", () => {
  assert.match(config, /type: application/);
  assert.match(config, /platform: iOS/);
  assert.match(config, /IPHONEOS_DEPLOYMENT_TARGET: "17.0"/);
  assert.match(config, /PRODUCT_BUNDLE_IDENTIFIER: com\.example\.NovaPharmNativePreview/);
  assert.match(config, /CODE_SIGNING_ALLOWED: "NO"/);
  assert.match(view, /import SwiftUI/);
  assert.match(view, /import SwiftData/);
  assert.match(view, /import Charts/);
  assert.match(view, /Chart\(NovaArea\.allCases/);
  assert.match(view, /NavigationStack/);
  assert.match(view, /@Query/);
  assert.doesNotMatch(view, /WKWebView|ReactNative|Expo|URLSession|fetch\(/);
});

test("Swift Charts VoiceOver text stays source-derived and respects Dynamic Type", () => {
  assert.match(view, /@ScaledMetric\(relativeTo: \.body\) private var moduleChartHeight: CGFloat = 180/);
  assert.match(view, /\.frame\(height: moduleChartHeight\)/);
  assert.match(view, /\.accessibilityLabel\(moduleChartAccessibilitySummary\)/);
  assert.match(view, /\.accessibilityIdentifier\("novapharm\.intelligence\.modules-chart"\)/);
  assert.ok(view.includes('"Module catalogue sizes: " + NovaArea.allCases.map'),
    "Chart accessibility labels must enumerate the same areas as rendered bars");
  assert.ok(view.includes('"\\(area.title) \\(NovaCatalog.modules(in: area).count)"'),
    "VoiceOver values must derive from the actual NovaCatalog per area");
  assert.doesNotMatch(view, /\.accessibilityLabel\("Module catalogue sizes:/,
    "Fixed visible or spoken figures become misleading when counts change");
  assert.ok(view.includes('NavigationLink("Explore \\(NovaCatalog.modules(in: .intelligence).count) research workspaces")'),
    "The workspace shortcut label must reflect the same source count");
});

test("source preview never circumvents release or sensitive-data gates", () => {
  assert.equal(constraints.productionSignoff, "not_granted");
  assert.equal(constraints.initialInfrastructureBudget.monthlyCapGbp, 0);
  assert.equal(constraints.productionPermissions.activatePublicCustomerAccess, false);
  assert.equal(constraints.productionPermissions.enableCustomerBilling, false);
  for (const gate of [
    "productionApproved", "authenticatedMobileClientAvailable",
    "protectedNetworkOperationsEnabled", "billingEnabled", "privateDataCachingEnabled"
  ]) {
    assert.match(policy, new RegExp("static let " + gate + " = false"));
  }
  assert.match(policy, /canOpenProtectedWorkspace/);
  assert.match(policy, /false\s*\n\s*}/);
});


test("all 101 native Swift country references precisely match the canonical source, with zero approvals", () => {
  const source = JSON.parse(read("docs/intelligence/country-101-client-catalog-20261118.json"));
  const swiftSource = read("native/novapharm-intelligence-ios/App/CountryCatalog.swift");
  const view = read("native/novapharm-intelligence-ios/App/NovaCountryDirectoryView.swift");
  const literal = String.raw`"(?:\\.|[^"\\])*"`;
  const re = new RegExp(
    "\\.init\\(iso2: (" + literal + "), country: (" + literal +
    "), region: (" + literal + "), coverage: \\.(sourceCandidatesOnly|geographyResearchOnly), candidateSourceCount: (\\d+)\\)",
    "g"
  );
  const swiftCountries = [...swiftSource.matchAll(re)].map(m => ({
    iso2: JSON.parse(m[1]),
    country: JSON.parse(m[2]),
    region: JSON.parse(m[3]),
    coverage: m[4] === "sourceCandidatesOnly" ? "source-candidates-only" : "research-geography-only",
    candidateSourceCount: Number(m[5])
  }));
  const expected = source.countries.map(c => ({
    iso2: c.iso2, country: c.country, region: c.region,
    coverage: c.coverage, candidateSourceCount: c.candidateSourceCount
  }));
  assert.equal(source.summary.distinctNationalCountries, 101);
  assert.equal(source.summary.registeredNationalCountries, 77);
  assert.equal(source.summary.addedResearchOnlyNationalCountries, 24);
  assert.equal(source.summary.verifiedLicensedNationalSources, 0);
  assert.equal(source.summary.customerLiveNationalCountries, 0);
  assert.equal(source.liveMedicineRowsIncluded, false);
  assert.deepEqual(swiftCountries, expected);
  assert.match(view, /modifier\(NovaAdaptiveSearchModifier\(searchText: \$searchText/);
  assert.match(view, /No medicine facts or private information are loaded/);
  assert.doesNotMatch(view, /\bURLSession\b|\bfetch\s*\(|\bWKWebView\b|\bASWebAuthenticationSession\b/);
});


test("native UI acceptance uses an actual XCTest UI target and stable accessible identifiers", () => {
  const appTest = read("native/novapharm-intelligence-ios/UITests/NovaPharmNativeUITests.swift");
  const countryView = read("native/novapharm-intelligence-ios/App/NovaCountryDirectoryView.swift");
  const workflow = read(".github/workflows/nova-ios-swift-native.yml");
  assert.match(config, /NovaPharmNativeUITests:\s*\n\s*type: bundle\.ui-testing/);
  assert.match(config, /testTargets:\s*\n\s*-\s+NovaPharmNativeUITests/);
  assert.match(config, /TEST_TARGET_NAME: NovaPharmNative/);
  assert.match(view, /novapharm\.bookmark\.toggle/);
  assert.match(view, /novapharm\.saved\./);
  assert.match(view, /novapharm\.workspace\./);
  assert.match(countryView, /novapharm\.country\.live-status/);
  assert.match(countryView, /novapharm\.countries\.readonly-notice/);
  assert.match(appTest, /testNativeTabsAndGatedWorkspaceNavigation/);
  assert.match(appTest, /testCountryDirectoryAndOfflineRights/);
  assert.match(appTest, /testSavedShortcutPersistsAcrossAppRelaunchAndCanBeDeleted/);
  assert.match(workflow, /xcodebuild test/);
  assert.match(workflow, /-only-testing:NovaPharmNativeUITests/);
  assert.match(workflow, /-parallel-testing-enabled NO/);
  assert.match(workflow, /CODE_SIGNING_ALLOWED=NO/);
  assert.doesNotMatch(appTest, /URLSession|http[s]?:\/\/|WKWebView|Cognito|client_secret|access_token/);
});

test("iOS accessibility and iPad smoke tests have explicit, non-skippable evidence gates", () => {
  const ui = read("native/novapharm-intelligence-ios/UITests/NovaPharmAccessibilityUITests.swift");
  const countryView = read("native/novapharm-intelligence-ios/App/NovaCountryDirectoryView.swift");
  const workflow = read(".github/workflows/nova-ios-swift-native.yml");
  assert.match(view, /@ScaledMetric\(relativeTo: \.body\) private var moduleChartHeight: CGFloat = 180/);
  assert.match(view, /\.frame\(height: moduleChartHeight\)/);
  assert.match(view, /\.accessibilityLabel\(moduleChartAccessibilitySummary\)/);
  assert.doesNotMatch(view, /\.accessibilityLabel\("Module catalogue sizes:/);
  assert.match(countryView, /if dynamicTypeSize\.isAccessibilitySize/);
  assert.match(countryView, /\.pickerStyle\(\.menu\)/);
  assert.match(view, /struct NovaAdaptiveSearchModifier: ViewModifier/);
  assert.match(view, /novapharm\.workspaces\.inline-search/);
  assert.match(countryView, /novapharm\.countries\.inline-search/);
  assert.match(view, /\.modifier\(NovaAdaptiveSearchModifier\(searchText:/);
  assert.match(countryView, /\.modifier\(NovaAdaptiveSearchModifier\(searchText:/);
  assert.match(ui, /inlineSearch\.isHittable/);
  assert.match(ui, /coverageFilter\.isHittable/);
  assert.match(ui, /performAccessibilityAudit\(for:/);
  assert.match(ui, /\.contrast, \.textClipped, \.hitRegion, \.sufficientElementDescription/);
  assert.match(ui, /testLargestDynamicTypeMaintainsResearchNavigation/);
  assert.match(workflow, /content_size accessibility-extra-extra-extra-large/);
  assert.match(workflow, /-only-testing:NovaPharmNativeUITests\/NovaPharmNativeUITests/);
  assert.match(workflow, /-only-testing:NovaPharmNativeUITests\/NovaPharmAccessibilityUITests/);
  assert.match(read("native/novapharm-intelligence-ios/App/NovaTheme.swift"), /traits\.userInterfaceStyle == \.dark/);
  assert.match(workflow, /if: \$\{\{ always\(\) && steps\.native_build\.outcome == 'success' \}\}/);
  assert.match(workflow, /No iPad Simulator available; iPad acceptance remains blocked/);
  assert.match(workflow, /novapharm-ipad-simulator\.png/);
  assert.match(workflow, /NovaPharmNative-Accessibility\.xcresult/);
  assert.doesNotMatch(ui, /URLSession|WKWebView|client_secret|access_token/);
});


test("NovaPharm preserves corporate red while both semantic control tints exceed 4.5:1", () => {
  const theme = read("native/novapharm-intelligence-ios/App/NovaTheme.swift");
  assert.match(theme, /static let brandRed = Color\(red: 227\.0 \/ 255, green: 18\.0 \/ 255, blue: 11\.0 \/ 255\)/);
  assert.match(theme, /traits\.userInterfaceStyle == \.dark/);
  const tintLight = [217, 19, 13];
  const tintDark = [255, 145, 137];
  const groupedLight = [242, 242, 247];
  const groupedDark = [44, 44, 46];
  const selectedTabDark = [64, 64, 65];
  const linear = value => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const luminance = rgb => rgb.map(linear).reduce((a, x, i) =>
    a + x * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) => {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  assert.match(theme, /red: 217\.0 \/ 255, green: 19\.0 \/ 255, blue: 13\.0 \/ 255/);
  assert.match(theme, /red: 255\.0 \/ 255, green: 145\.0 \/ 255, blue: 137\.0 \/ 255/);
  assert.ok(contrast(tintLight, groupedLight) >= 4.5);
  assert.ok(contrast(tintLight, [255,255,255]) >= 4.5);
  assert.ok(contrast(tintDark, groupedDark) >= 4.5);
  assert.ok(contrast(tintDark, selectedTabDark) >= 4.5,
    "Selected-tab background must preserve contrast for normal-size text");
  assert.ok(contrast(tintDark, [28,28,30]) >= 4.5);
  assert.ok(contrast([227,18,11], groupedLight) < 4.5,
    "Never use the unadapted corporate red as light grouped-background small text");
});


test("public GitHub must not publish private Swift Simulator or accessibility artifacts", () => {
  const workflow = read(".github/workflows/nova-ios-swift-native.yml");
  const protectedUploads = [
    "Upload Apple accessibility and iPad evidence in private repositories only",
    "Upload native UI test evidence in private repositories only",
    "Upload non-distributable iOS Simulator artifact in private repositories only"
  ];
  for (const name of protectedUploads) {
    const start = workflow.indexOf("      - name: " + name);
    assert.ok(start >= 0, "Missing privacy guarded CI step: " + name);
    const body = workflow.slice(start, workflow.indexOf("\n      - name:", start + 1) < 0
      ? undefined : workflow.indexOf("\n      - name:", start + 1));
    assert.match(body, /if: \$\{\{ (?:always\(\) && )?github\.event\.repository\.private \}\}/);
    assert.match(body, /uses: actions\/upload-artifact@/);
  }
  assert.match(workflow, /if: \$\{\{ !github\.event\.repository\.private \}\}/);
  assert.match(workflow, /private Simulator binaries, screenshots, and XCResult uploads are suppressed/);
});
