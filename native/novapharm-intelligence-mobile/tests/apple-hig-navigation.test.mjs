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
});

test("More retains accessible review, research and account entry points", () => {
  const more = app.match(/\{screen === "more" && \([\s\S]*?\{screen === "review"/)?.[0] ?? "";
  assert.match(more, /screen: "review", label: "Evidence review"/);
  assert.match(more, /screen: "research", label: "Nova ML research"/);
  assert.match(more, /screen: "account", label: "Enterprise access"/);
  assert.match(more, /accessibilityRole="button"/);
  assert.match(more, /onPress=\{\(\) => changeScreen\(item.screen\)\}/);
  assert.match(app, /moreAction: \{ minHeight: 56/);
  assert.match(app, /tab.screen === "more" && \(selected === "review" \|\| selected === "research" \|\| selected === "account"\)/);
});

test("research navigation does not silently activate data, credentials or Apple assets", () => {
  assert.match(app, /No live medicine data/);
  assert.match(app, /Authentication not enabled/);
  assert.doesNotMatch(app, /fetch\(|access_token|client_secret|Authorization:|require\([^)]*\.(dmg|otf|ttf)/);
});
