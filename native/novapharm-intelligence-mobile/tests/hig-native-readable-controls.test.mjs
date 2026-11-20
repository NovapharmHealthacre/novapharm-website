import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const science = readFileSync(path.join(root,
  "native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx"), "utf8");
const review = readFileSync(path.join(root,
  "native/novapharm-intelligence-mobile/MultimodalReviewScreen.tsx"), "utf8");

test("mobile Science research provides readable instructions, labels and full-sized targets", () => {
  assert.match(science, /lead: \{[^\n]*fontSize: 17, lineHeight: 26/);
  assert.match(science, /description: \{[^\n]*fontSize: 16,[^\n]*lineHeight: 24/);
  assert.match(science, /requirement: \{ fontSize: 16, lineHeight: 24/);
  assert.match(science, /relatedText: \{ fontSize: 16,[^\n]*lineHeight: 24/);
  assert.match(science, /sourceLinkLabel: \{ fontSize: 16/);
  assert.match(science, /sourceDisclaimer: \{ fontSize: 14, lineHeight: 21/);
  assert.match(science, /footer: \{ fontSize: 15, lineHeight: 23/);
  assert.match(science, /relatedButton: \{ minHeight: 48,/);
  assert.match(science, /sourceLink: \{ minHeight: 48,/);
  assert.match(science, /accessibilityRole="link"/);
  assert.match(science, /accessibilityHint="Opens a public source in your device browser/);
  assert.doesNotMatch(science, /description: \{ fontSize: 13/);
});

test("offline multimodal consent exposes a visible checked symbol and accessible state", () => {
  assert.match(review, /accessibilityRole="checkbox"/);
  assert.match(review, /accessibilityState=\{\{checked:consent\}\}/);
  assert.match(review, /\{consent \? "✓" : ""\}/);
  assert.match(review, /checkboxMark:\{[^\n]*color:palette\.canvas/);
  assert.match(review, /checked:\{backgroundColor:palette\.primary,borderColor:palette\.primary\}/);
  assert.match(review, /checkbox:\{width:24,height:24/);
  assert.match(review, /checkboxRow:\{[^\n]*minHeight:54/);
});

test("unconsented local samples cannot initiate the simulated review", () => {
  assert.match(review, /const run = \(\) => \{\s*if \(!consent\) return;/);
  assert.match(review, /accessibilityState=\{\{disabled: !consent\}\} disabled=\{!consent\}/);
  assert.match(review, /nonSensitiveMaterialConfirmed:consent/);
  assert.match(review, /setResult\(null\)/);
  assert.doesNotMatch(review, /\bfetch\(|XMLHttpRequest|navigator\.mediaDevices|requestCameraPermissionsAsync/);
  assert.match(review, /Research-only, offline conflict screening/);
});

test("native Science source links keep approved-origin validation and accessible browser error handling", () => {
  assert.match(science, /const approvedReference =/);
  assert.match(science, /if \(!approvedReference\)/);
  assert.match(science, /AccessibilityInfo\.announceForAccessibility\(message\)/);
  assert.match(science, /accessibilityRole="alert" accessibilityLiveRegion="polite"/);
  assert.match(science, /void openResearchReference\(entry\.id, entry\.sourceUrl\)/);
  assert.doesNotMatch(science, /void Linking\.openURL\(entry\.sourceUrl\)/,
    "Research link navigation must not bypass source validation or error handling");
});
