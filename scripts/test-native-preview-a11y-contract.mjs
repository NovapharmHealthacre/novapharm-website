import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const swift = readFileSync("native/novapharm-intelligence-ios/App/NovaRootView.swift","utf8");
const android = readFileSync(
  "native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitResearchScreen.kt",
  "utf8"
);

test("native iOS Saved screen handles retired source-module identifiers honestly", () => {
  assert.match(swift,/private var displayableSaved:\s*\[NovaWorkspace\]/);
  assert.match(swift,/saved\.compactMap \{\s*NovaCatalog\.lookup\(id: \$0\.workspaceID\)\s*\}/);
  assert.match(swift,/ForEach\(displayableSaved\)/);
  assert.match(swift,/if displayableSaved\.isEmpty \{/);
  assert.match(swift,/if saved\.isEmpty \{/);
  assert.ok(swift.includes('ContentUnavailableView("Saved shortcuts unavailable"'));
  assert.ok(swift.includes("No account or medicine records are affected."));
  assert.ok(!swift.includes("ForEach(saved, id: \\.workspaceID)"));
  assert.ok(!swift.includes("context.delete(bookmark) ") || swift.includes("context.save()"));
});

test("Android reserves TalkBack heading semantics for actual research section headings", () => {
  assert.ok(android.includes('line("Sparse-circuit research", 27f, true)'));
  assert.ok(android.includes('line("Quantum and computational science", 24f, true)'));
  assert.ok(android.includes('line("Unverified research candidate", 20f, true)'));
  assert.ok(android.includes('line("Research only · Not a clinical or production AI feature", 16f)'));
  assert.ok(android.includes('line("Offline source-only research • no hardware or clinical activation", 15f)'));
  assert.ok(!android.includes('line("Research only · Not a clinical or production AI feature", 16f, true)'));
  assert.ok(!android.includes('line("Offline source-only research • no hardware or clinical activation", 15f, true)'));
  assert.ok(android.includes("setAccessibilityHeading(true)"));
  assert.ok(android.includes('accessibilityPaneTitle = "NovaPharm Intelligence research — read only"'));
});

test("native accessibility refinements cannot accidentally change their offline release boundary",()=>{
  const iosProject=readFileSync("native/novapharm-intelligence-ios/project.yml","utf8");
  const androidManifest=readFileSync(
    "native/novapharm-intelligence-android/app/src/main/AndroidManifest.xml","utf8");
  assert.ok(iosProject.includes("CODE_SIGNING_ALLOWED: \"NO\""));
  assert.ok(iosProject.includes("PRODUCT_BUNDLE_IDENTIFIER: com.example.NovaPharmNativePreview"));
  assert.ok(androidManifest.includes('android:allowBackup="false"'));
  assert.ok(androidManifest.includes('android:usesCleartextTraffic="false"'));
  assert.ok(!androidManifest.includes("<uses-permission"));
});
