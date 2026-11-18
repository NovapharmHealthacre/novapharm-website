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
