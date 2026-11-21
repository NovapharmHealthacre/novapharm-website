import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { mobileBackDestination, moreDetailScreens } from "../preview-navigation.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const app = readFileSync(path.join(root, "native/novapharm-intelligence-mobile/App.tsx"), "utf8");

test("all ten More research previews return to More, not an accidental app exit", () => {
  assert.equal(moreDetailScreens.size, 10);
  for (const screen of moreDetailScreens) {
    assert.equal(mobileBackDestination(screen, false), "more", screen);
  }
});

test("workspace detail returns to its list before system Back is allowed", () => {
  assert.equal(mobileBackDestination("workspaces", true), "workspaces");
  assert.equal(mobileBackDestination("workspaces", false), null);
});

test("Android system Back remains available at the four top-level tabs", () => {
  for (const tab of ["overview", "workspaces", "sources", "more"]) {
    assert.equal(mobileBackDestination(tab, false), null, tab);
  }
  assert.equal(mobileBackDestination("unknown", false), null);
});

test("App subscribes and unsubscribes Android Back without affecting iOS or release gates", () => {
  assert.match(app, /if \(Platform\.OS !== "android"\) return;/);
  assert.match(app, /BackHandler\.addEventListener\("hardwareBackPress"/);
  assert.match(app, /subscription\.remove\(\)/);
  assert.match(app, /mobileBackDestination\(screen, selectedWorkspace !== null\)/);
  assert.match(app, /if \(destination === null\) return false;/);
  assert.match(app, /setSelectedWorkspace\(null\);\s*setScreen\(destination\);\s*return true;/);
  assert.match(app, /moreDetailScreens\.has\(screen\)/);
  assert.match(app, /accessibilityLabel="Back to More"/);
  assert.match(app, /minHeight: 48, paddingHorizontal: 24/);
  assert.match(app, /canSignIn: false as const/);
  assert.doesNotMatch(app, /\bfetch\s*\(|WebView|client_secret|access_token|AsyncStorage|SecureStore/);
});
