import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const app = readFileSync(path.join(root, "native/novapharm-intelligence-mobile/App.tsx"), "utf8");
const tabs = app.match(/const tabs: ReadonlyArray<[\s\S]*?\];/)?.[0] ?? "";

test("compact iOS/Android navigation has four clear persistent sections", () => {
  assert.ok(tabs, "Top-level navigation must be explicit");
  const items = [...tabs.matchAll(/screen: "([^"]+)", label: "([^"]+)"/g)];
  assert.deepEqual(items.map(([, screen]) => screen), ["overview", "workspaces", "sources", "more"]);
  assert.deepEqual(items.map(([, , label]) => label), ["Overview", "Workspaces", "Sources", "More"]);
  assert.match(app, /accessibilityRole="tab"/);
  assert.match(app, /accessibilityState=\{\{ selected: active \}\}/);
  assert.match(app, /minHeight: 52/);
  assert.match(app, /const \{ width, fontScale \} = useWindowDimensions\(\)/);
  assert.match(app, /const largeText = fontScale >= 1\.4/);
  assert.match(app, /width >= 760 && !largeText/);
  assert.match(app, /navigationLarge: \{ flexWrap: "wrap" \}/);
  assert.match(app, /navItemLarge: \{ flex: 0, flexBasis: "46%", minHeight: 56/);
});

test("mobile candidate uses readable default content typography and supports system scaling", () => {
  assert.match(app, /description: \{ color: palette.secondary, fontSize: 17, lineHeight: 26/);
  assert.match(app, /sectionIntro: \{ fontSize: 17, color: palette.secondary, lineHeight: 26/);
  assert.match(app, /navLabel: \{ fontSize: 14, fontWeight: "600"/);
  assert.match(app, /const largeText = fontScale >= 1\.4/);
});

test("More retains review, research, Model Microscope, maps, disabled Visual, Science and account entry points", () => {
  const more = app.match(/\{screen === "more" && \([\s\S]*?\{screen === "review"/)?.[0] ?? "";
  assert.match(more, /screen: "countries", label: "Countries"/);
  assert.match(more, /screen: "review", label: "Evidence review"/);
  assert.match(more, /screen: "research", label: "Nova ML research"/);
  assert.match(more, /screen: "inspect", label: "Model Microscope"/);
  assert.match(more, /screen: "maps", label: "Maps and location"/);
  assert.match(more, /screen: "visual", label: "Visual research", detail: "Disabled CLIP candidate/);
  assert.match(more, /screen: "science", label: "Science research"/);
  assert.match(more, /screen: "account", label: "Enterprise access"/);
  assert.match(more, /accessibilityRole="button"/);
  assert.match(more, /onPress=\{\(\) => changeScreen\(item.screen\)\}/);
  assert.match(app, /moreAction: \{ minHeight: 56/);
  assert.match(app, /\{screen === "maps" && <MapsResearchScreen darkMode=\{darkMode\} \/>\}/);
  assert.match(app, /\{screen === "visual" && \(/);
  assert.match(app, /editable=\{false\}/);
  assert.match(app, /CLIP_MOBILE_RELEASE\.state/);
  assert.match(app, /<CountryDirectoryScreen \/>/);
  const selectedUnderMore = app.match(/tab\\.screen === "more" && \\(selected === "review"[\\s\\S]*?selected === "distribution-preview"\\)\\)/)?.[0] ?? "";
  assert.ok(selectedUnderMore, "More must own the complete accessible active-tab state");
  for (const nested of ["review", "research", "inspect", "maps", "visual",
    "countries", "science", "account", "customer-portal-preview", "distribution-preview"]) {
    assert.ok(selectedUnderMore.includes('selected === "' + nested + '"'),
      "More must remain active in " + nested);
  }
  assert.match(more, /screen: "customer-portal-preview", label: "Customer Portal"/);
  assert.match(more, /screen: "distribution-preview", label: "Distribution"/);
});

test("research navigation does not silently activate data, credentials or Apple assets", () => {
  assert.match(app, /No live medicine data/);
  assert.match(app, /Authentication not enabled/);
  assert.doesNotMatch(app, /fetch\(|access_token|client_secret|Authorization:|require\([^)]*\.(dmg|otf|ttf)/);
});

test("Science remains discoverable under More without breaking four-tab Apple navigation", () => {
  assert.match(app, /screen: "science", label: "Science research"/);
  assert.match(app, /screen === "science" && <ScienceResearchMobile/);
  assert.ok(!tabs.includes('label: "Science"'), "Science must not become a fifth persistent tab");
  assert.match(app, /No live medicine data, customer session, payments, external API calls or AI inference is enabled/);
});
