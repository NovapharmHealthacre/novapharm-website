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

test("Signals research uses the existing More → Nova ML research page without replacing other mobile features", () => {
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  const screen = read("native/novapharm-intelligence-mobile/SignalsResearchScreen.tsx");
  const shared = read("apps/portal/data/nova-signals-research.ts");
  assert.match(app, /"more" \| "review" \| "research"/);
  assert.match(app, /screen: "research", label: "Nova ML research"/);
  assert.match(app, /screen === "research" && \(/);
  assert.match(app, /<SignalsResearchScreen\s*\/>/);
  assert.match(app, /<MultimodalReviewScreen/);
  assert.match(app, /<MapsResearchScreen/);
  assert.match(app, /<CountryDirectoryScreen/);
  assert.match(screen, /novaSignalsResearchSources/);
  assert.match(screen, /novaSignalsResearchGroups/);
  assert.match(screen, /accessibilityRole="link"/);
  assert.match(screen, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(screen, /minHeight: 44/);
  assert.match(screen, /No OpenAI account access, patient data, voice capture/);
  assert.match(screen, /only three are candidates/);
  assert.equal((shared.match(/id: "[a-z0-9-]+", group:/g) ?? []).length, 15);
  assert.equal((shared.match(/url: "https:\/\/(?:openai\.com|cdn\.openai\.com)\//g) ?? []).length, 15);
  assert.doesNotMatch(screen + app, /fetch\(|XMLHttpRequest|WebSocket\(|getUserMedia|expo-av|Audio\.Recording|SecureStore|openAIKey/i);
});
test("mobile research opens only curated OpenAI source URLs on explicit tap", () => {
  const screen = read("native/novapharm-intelligence-mobile/SignalsResearchScreen.tsx");
  assert.ok(screen.includes(String.raw`(?:openai\.com|cdn\.openai\.com)`));
  assert.match(screen, /if \(!validSourceUrl\(url\)\)/);
  assert.match(screen, /onPress=\{\(\) => \{ void openSource\(source\.url\); \}\}/);
  assert.match(screen, /Linking\.openURL\(url\)/);
  assert.match(screen, /catch \{/);
});
test("source candidates remain 77 unverified country or territory labels rather than 101 live countries", () => {
  const register = JSON.parse(read("docs/intelligence/global-pharma-sources-20261117.json"));
  const labels = new Set(register.sources.map((source) => source.country));
  const nationalLabels = new Set([...labels].filter(label => label !== "Global" && label !== "European Union / EEA"));
  assert.equal(register.sources.length, 101);
  assert.equal(nationalLabels.size, 77);
  assert.ok(register.sources.every(source => source.integrationStatus === "candidate-only" && source.dataAdmission === "not-admitted" && source.rightsStatus === "not-reviewed" && source.activeAdapterId === null));
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  assert.match(app, /countryTerritoryCandidateLabels/);
  assert.match(app, /Country\/territory labels \(unverified\)/);
  assert.match(app, /Source entries are not verified country integrations/);
  assert.doesNotMatch(app, /101 countries integrated|101 live countries|101 country APIs connected/i);
});
