import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (name) => readFileSync(path.join(root, name), "utf8");
test("mobile app uses canonical intelligence catalogue and candidate source register", () => {
  const mobile = read("native/novapharm-intelligence-mobile/App.tsx");
  const catalogue = read("apps/portal/data/intelligence-workspaces.ts");
  const candidates = JSON.parse(read("docs/intelligence/global-pharma-sources-20261117.json"));
  assert.match(mobile, /apps\/portal\/data\/intelligence-workspaces/);
  assert.match(mobile, /global-pharma-sources-20261117\.json/);
  assert.equal((catalogue.match(/\{ slug: "/g) || []).length, 22);
  assert.ok(candidates.sources.length >= 100);
  assert.ok(candidates.sources.every((item) => item.rightsStatus === "not-reviewed" && item.integrationStatus === "candidate-only"));
});
test("preview does not send credentials or pretend private data is live", () => {
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.match(app, /No live medicine data/);
  assert.match(app, /Authentication not enabled/);
  assert.doesNotMatch(app, /fetch\(|AsyncStorage|SecureStore|access_token|client_secret|Authorization:/);
});
test("native app is isolated from existing npm workspace and leaves app ids to signing review", () => {
  const rootPackage = JSON.parse(read("package.json"));
  const mobilePackage = JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));
  const expo = JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo;
  assert.deepEqual(rootPackage.workspaces, ["apps/*", "packages/*"]);
  assert.equal(mobilePackage.private, true);
  assert.equal(expo.ios.bundleIdentifier, undefined);
  assert.equal(expo.android.package, undefined);
});

test("enterprise preview uses virtualized source browsing with adaptive layout", () => {
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.match(app, /FlatList/);
  assert.match(app, /numColumns=\{twoColumns \? 2 : 1\}/);
  assert.match(app, /sourceRegions\.map/);
  assert.match(app, /accessibilityRole="tab"/);
  assert.match(app, /minHeight: 44/);
  assert.match(app, /No live medicine data/);
  assert.match(app, /productionAccepted|Not connected|not approved/i);
});
test("no source candidate is silently represented as verified market facts", () => {
  const candidates = JSON.parse(read("docs/intelligence/global-pharma-sources-20261117.json"));
  assert.equal(candidates.sources.filter((s) => s.integrationStatus !== "candidate-only").length, 0);
  assert.equal(candidates.sources.filter((s) => s.rightsStatus !== "not-reviewed").length, 0);
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.doesNotMatch(app, /sourceRegister\.sources\.map\(.*fetch/);
});

test("iOS/Android preview uses the same offline multimodal conflict gate as protected web", () => {
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  const mobilePanel = read("native/novapharm-intelligence-mobile/MultimodalReviewScreen.tsx");
  const webPanel = read("apps/portal/components/multimodal-review-panel.tsx");
  const webWorkspace = read("apps/portal/components/nova-ml-workspaces.tsx");
  const core = read("src/core/intelligence-multimodal-evidence-review.mjs");
  assert.match(app, /screen: "review"/);
  assert.match(app, /<MultimodalReviewScreen/);
  assert.match(mobilePanel, /assessMultimodalEvidence/);
  assert.match(mobilePanel, /assessMultimodalResearchBasis/);
  assert.match(webPanel, /assessMultimodalEvidence/);
  assert.match(webPanel, /assessMultimodalResearchBasis/);
  assert.match(webWorkspace, /<MultimodalReviewPanel/);
  assert.match(core, /canPublish: false/);
  assert.match(core, /identityVerified: false/);
  for (const requiredField of ["referenceStrength", "observedStrength", "referenceDoseForm", "observedDoseForm", "referenceManufacturer", "observedManufacturer"]) {
    assert.ok(mobilePanel.includes(requiredField), "Mobile review missing " + requiredField);
    assert.ok(webPanel.includes(requiredField), "Web review missing " + requiredField);
    assert.ok(core.includes(requiredField), "Shared policy missing " + requiredField);
  }
  assert.doesNotMatch(mobilePanel, /fetch\(|AsyncStorage|SecureStore|Camera|ImagePicker|access_token/);
});

test("Expo CLIP preview is a real iOS/Android screen but never claims live inference", () => {
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  const contract = read("native/novapharm-intelligence-mobile/clip-research.ts");
  assert.match(app, /screen === "visual"/);
  assert.match(app, /Visual catalogue research/);
  assert.match(app, /CLIP_MOBILE_RELEASE\.state/);
  assert.match(app, /editable=\{false\}/);
  assert.match(app, /Similarity cannot establish/);
  assert.match(contract, /source_candidate_disabled/);
  assert.match(contract, /modelRuntimeConnected: false/);
  assert.doesNotMatch(app, /fetch\(|Authorization:|access_token|client_secret|WebView/);
  assert.doesNotMatch(contract, /fetch\(|Authorization:|access_token|client_secret|AsyncStorage/);
});

test("web and iOS/Android private previews expose one non-live governed model microscope", () => {
  const modules = read("apps/portal/data/nova-ml-modules.ts");
  const web = read("apps/portal/components/nova-ml-workspaces.tsx");
  const mobile = read("native/novapharm-intelligence-mobile/App.tsx");
  const routes = read("apps/portal/data/routes.ts");
  assert.match(modules, /slug: "nova-model-microscope"/);
  assert.match(routes, /novaMlWorkspaceSlugs/);
  assert.match(web, /No approved inspection artifacts available/);
  assert.match(mobile, /Model Microscope/);
  assert.match(mobile, /screen === "inspect"/);
  assert.match(mobile, /No approved model inspections/);
  assert.doesNotMatch(mobile, /fetch\(|AsyncStorage|SecureStore|access_token/);
});

test("web and mobile share five not-operational inspection stages without a model runtime", () => {
  const catalog = read("apps/portal/data/nova-ml-modules.ts");
  const web = read("apps/portal/components/nova-ml-workspaces.tsx");
  const mobile = read("native/novapharm-intelligence-mobile/App.tsx");
  for (const stage of ["model-registry", "feature-evidence", "circuit-hypotheses", "failure-analysis", "review-export"]) {
    assert.match(catalog, new RegExp('id: "' + stage + '"'));
  }
  assert.match(catalog, /state: "not-operational"/);
  assert.match(web, /modelMicroscopeInspectionStages\.map/);
  assert.match(mobile, /modelMicroscopeInspectionStages\.map/);
  assert.doesNotMatch(mobile, /src\/core\/ai\/model-microscope\.mjs|model-microscope-signed-evidence\.mjs|fetch\(|URLSession|Authorization:/);
});

test("protected web and offline mobile both expose only the first-party synthetic feature reference", () => {
  const web = read("apps/portal/components/nova-ml-workspaces.tsx");
  const mobile = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.match(web, /inspectSyntheticFeature/);
  assert.match(web, /Run synthetic reference/);
  assert.match(mobile, /inspectSyntheticFeature/);
  assert.match(mobile, /Run synthetic reference/);
  assert.match(web, /Synthetic only/);
  assert.match(mobile, /Synthetic only/);
  assert.doesNotMatch(mobile, /model-microscope-signed-evidence\.mjs|model-microscope\.mjs|fetch\(/);
});

test("Expo recognizes shared first-party mjs reference in both platform bundles", () => {
  const metro = read("native/novapharm-intelligence-mobile/metro.config.cjs");
  assert.match(metro, /sourceExts/);
  assert.match(metro, /"mjs"/);
  assert.match(metro, /watchFolders/);
});

const mobileWorkflow = read(".github/workflows/intelligence-global-mobile-contracts.yml");
const mobileCandidate = mobileWorkflow.split("  mobile-bundle-preflight:\n")[1];
const mobilePackage = JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));
const mobileLockfile = JSON.parse(read("native/novapharm-intelligence-mobile/package-lock.json"));

test("committed mobile dependency graph matches the isolated private Expo package manifest", () => {
  assert.equal(mobilePackage.private, true);
  assert.equal(mobileLockfile.name, mobilePackage.name);
  assert.equal(mobileLockfile.version, mobilePackage.version);
  assert.equal(mobileLockfile.lockfileVersion, 3);
  assert.deepEqual(mobileLockfile.packages[""].dependencies, mobilePackage.dependencies);
  assert.deepEqual(mobileLockfile.packages[""].devDependencies, mobilePackage.devDependencies);
  const resolved = Object.entries(mobileLockfile.packages).filter(([name]) => name);
  assert.ok(resolved.length >= 500, "Unexpectedly incomplete CI-generated dependency graph");
  for (const [name, entry] of resolved) {
    assert.match(entry.resolved ?? "", /^https:\/\/registry\.npmjs\.org\//,
      "Unreviewed external package host for " + name);
    assert.match(entry.integrity ?? "", /^sha512-/,
      "No SHA-512 registry tarball integrity for " + name);
    assert.ok(entry.license, "No stated package licence for " + name);
  }
});

test("mobile CI requires checked-in lockfile before deterministic npm ci and both Expo exports", () => {
  assert.ok(mobileCandidate, "Isolated Expo mobile job must exist");
  assert.match(mobileCandidate, /working-directory: native\/novapharm-intelligence-mobile/);
  assert.match(mobileCandidate, /test -s package-lock\.json/);
  assert.match(mobileCandidate, /l\.lockfileVersion !== 3/);
  assert.match(mobileCandidate, /l\.packages\?\.\[""\]\?\.name !== p\.name/);
  assert.match(mobileCandidate, /Unapproved resolver URL or missing SHA-512/);
  assert.match(mobileCandidate, /npm audit --omit=dev --audit-level=high --no-fund/);
  assert.doesNotMatch(mobileCandidate, /npm install|--package-lock-only|--no-package-lock|npm update/);
  assert.match(mobileCandidate, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(mobileCandidate, /if-no-files-found: error/);
  assert.match(mobileCandidate, /retention-days: 7/);
  assert.match(mobileCandidate, /path: native\/novapharm-intelligence-mobile\/package-lock\.json/);
  const stages = [
    "test -s package-lock.json",
    "Verify lockfile registry and integrity",
    "actions/upload-artifact@",
    "npm ci --ignore-scripts",
    "npm audit --omit=dev --audit-level=high --no-fund",
    "npm run typecheck",
    "npx expo export --platform ios",
    "npx expo export --platform android"
  ];
  const positions = stages.map((stage) => mobileCandidate.indexOf(stage));
  assert.ok(positions.every((index) => index >= 0), "A mobile CI stage is missing");
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b),
    "Clean npm ci and iOS/Android bundles must follow lockfile verification");
});

test("committed lockfile does not bypass auth, signing, data rights or release approval", () => {
  const app = JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo;
  assert.equal(app.ios.bundleIdentifier, undefined);
  assert.equal(app.android.package, undefined);
  assert.doesNotMatch(mobileCandidate, /eas build|xcodebuild archive|gradle .*bundleRelease|app-store|play-store|AWS_ACCESS_KEY_ID|client_secret|access_token/i);
  assert.match(read("native/novapharm-intelligence-mobile/README.md"), /Reproducibility and security are still pending independent acceptance/);
});
