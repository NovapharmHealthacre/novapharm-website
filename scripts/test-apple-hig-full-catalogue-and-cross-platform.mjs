import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");
const tracker = JSON.parse(read("docs/design/apple-hig-172-topic-acceptance-register.json"));
const css = read("apps/portal/app/globals.css");
const mobile = read("native/novapharm-intelligence-mobile/MultimodalReviewScreen.tsx");
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  assert.ok(match, "Missing CSS rule: " + selector);
  return match[1];
};

test("all 172 source links remain classified without false readiness claims", () => {
  const expected = {
    "Getting started": 10, Foundations: 19, Patterns: 26,
    Components: 73, Inputs: 14, Technologies: 30
  };
  assert.equal(tracker.topics.length, 172);
  assert.deepEqual(tracker.meta.counts, expected);
  const counts = Object.fromEntries(Object.keys(expected).map((section) => [
    section, tracker.topics.filter((entry) => entry.section === section).length
  ]));
  assert.deepEqual(counts, expected);
  const componentGroups = new Set(tracker.topics
    .filter((entry) => entry.section === "Components" && entry.subsection !== "Main")
    .map((entry) => entry.subsection));
  assert.equal(componentGroups.size, 8);
  assert.equal(new Set(tracker.topics.map((entry) => entry.url)).size, 172);
  for (const entry of tracker.topics) {
    assert.match(entry.url, /^https:\/\/developer\.apple\.com\/design\/human-interface-guidelines\/[a-z0-9-]+$/);
    assert.equal(entry.markdown, entry.url + ".md");
    assert.ok(["Critical", "High", "Medium", "Later"].includes(entry.priority));
    assert.ok(["pending_full_text_review", "reviewed"].includes(entry.guidelineReview));
    assert.ok(["not_verified", "in_progress", "not_applicable", "verified"].includes(entry.implementation));
    for (const platform of ["webEvidence", "iosEvidence", "androidEvidence", "releaseEvidence"]) {
      assert.ok(Array.isArray(entry[platform]), "Missing " + platform + " for " + entry.title);
    }
    if (entry.implementation === "verified") {
      assert.equal(entry.guidelineReview, "reviewed", "Verify the official page before signoff: " + entry.title);
      assert.ok(entry.releaseEvidence.length > 0, "A verified item needs independent release proof: " + entry.title);
      assert.ok(entry.webEvidence.length + entry.iosEvidence.length + entry.androidEvidence.length > 0,
        "A verified item needs application-specific evidence: " + entry.title);
    }
  }
});

test("Portal search and account commands offer 44px interaction targets", () => {
  assert.match(rule(".search-close"), /width:\\s*44px;\\s*height:\\s*44px;/);
  assert.match(rule(".user-summary"), /grid-template-columns:\\s*auto 44px;/);
  assert.match(rule(".user-summary button"), /width:\\s*44px;\\s*height:\\s*44px;/);
  assert.match(rule(".icon-command"), /min-height:\\s*44px;/);
  assert.match(css, /:focus-visible\\s*\\{[^}]*outline:/);
});

test("offline iOS/Android research form improves readable text and screen-reader status", () => {
  assert.match(mobile, /paragraph:\\{fontSize:16,lineHeight:24/);
  assert.match(mobile, /label:\\{fontSize:16,fontWeight:"600"/);
  assert.match(mobile, /checkboxText:\\{flex:1,fontSize:16,lineHeight:24/);
  assert.match(mobile, /input:\\{[^}]*fontSize:17/);
  assert.match(mobile, /accessibilityRole="checkbox"/);
  assert.match(mobile, /accessibilityState=\\{\\{checked:consent\\}\\}/);
  assert.match(mobile, /accessibilityLiveRegion="polite"/);
  assert.match(mobile, /Do not enter patient or confidential information/);
  assert.match(mobile, /does not verify medicine identity/);
  assert.doesNotMatch(mobile, /fetch\\(|Authorization:|client_secret|access_token/);
});
