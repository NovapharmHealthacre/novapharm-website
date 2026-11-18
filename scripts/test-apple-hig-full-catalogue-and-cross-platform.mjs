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
  assert.match(rule(".search-close"), /width:\s*44px;\s*height:\s*44px;/);
  assert.match(rule(".user-summary"), /grid-template-columns:\s*auto 44px;/);
  assert.match(rule(".user-summary button"), /width:\s*44px;\s*height:\s*44px;/);
  assert.match(rule(".icon-command"), /min-height:\s*44px;/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:/);
});

test("offline iOS/Android research form improves readable text and screen-reader status", () => {
  assert.match(mobile, /paragraph:\{fontSize:16,lineHeight:24/);
  assert.match(mobile, /label:\{fontSize:16,fontWeight:"600"/);
  assert.match(mobile, /checkboxText:\{flex:1,fontSize:16,lineHeight:24/);
  assert.match(mobile, /input:\{[^}]*fontSize:17/);
  assert.match(mobile, /accessibilityRole="checkbox"/);
  assert.match(mobile, /accessibilityState=\{\{checked:consent\}\}/);
  assert.match(mobile, /accessibilityLiveRegion="polite"/);
  assert.match(mobile, /Do not enter patient or confidential information/);
  assert.match(mobile, /does not verify medicine identity/);
  assert.doesNotMatch(mobile, /fetch\(|Authorization:|client_secret|access_token/);
});


const designDNA = read("docs/design/apple-hig-three-platform-adoption-20261118.md");

test("each of the 172 official HIG links keeps the owner's exact section-wise source metadata", () => {
  assert.equal(tracker.meta.userProvidedIndexFile, "Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv");
  assert.equal(tracker.meta.sourceAttachmentBytesAudited, false);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed, false);
  assert.equal(tracker.meta.allPlatformsProductionVerified, false);
  assert.equal(new Set(tracker.topics.map(item => item.sourceRowIndex)).size, 172);
  for (const [index, item] of tracker.topics.entries()) {
    assert.equal(item.sourceRowIndex, index, "User CSV row order must not drift: " + item.title);
    assert.ok(["Category", "Guideline"].includes(item.sourceType), "Missing CSV source type: " + item.title);
    assert.equal(typeof item.sourceDescription, "string");
    assert.ok(item.sourceDescription.trim(), "Missing exact owner-provided description: " + item.title);
    assert.equal(typeof item.sourceRequestedPlatforms, "string");
    assert.ok(item.sourceRequestedPlatforms.trim(), "Missing owner platform scope: " + item.title);
    assert.match(item.markdown, /^https:\/\/developer\.apple\.com\/design\/human-interface-guidelines\/[a-z0-9-]+\.md$/);
    if (item.guidelineReview === "reviewed") {
      assert.ok(Array.isArray(item.guidelineReviewEvidence) && item.guidelineReviewEvidence.length > 0,
        "Reviewed topics require article-level source evidence: " + item.title);
    }
  }
});

test("NovaPharm design DNA includes every original Apple archive and all three source-index files", () => {
  const archives = [
    "Bezel-MacBook-Air-M5.dmg", "Core_AI_Debugger(1).dmg",
    "Icon_Composer_27.3_beta(1).dmg", "Icons-Siri-AI(2).dmg",
    "iOS-27-Icon-Templates-Photoshop-Illustrator(2).dmg",
    "Logo-Sign-in-with-Apple(1).dmg", "NY(2).dmg",
    "SF-Arabic(2).dmg", "SF-Armenian(2).dmg", "SF-Georgian(2).dmg",
    "SF-Compact(1).dmg", "SF-Hebrew(2).dmg", "SF-Pro(1).dmg",
    "SF-Mono(1).dmg", "SF-Symbols-27(1).dmg",
    "Download-on-the-App-Store(1).zip", "Download-on-the-Mac-App-Store(1).zip",
    "AnimatingViewsAndTransitions.zip",
    "apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip",
    "ComposingCustomLayoutsWithSwiftUI(1).zip", "IMDF.zip"
  ];
  const indices = [
    "Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv",
    "Apple_HIG_Sectionwise_Guide_2026-11-18.md",
    "Apple_HIG_Complete_Sectionwise_Index_2026-11-18.xlsx"
  ];
  assert.equal(archives.length, 21);
  assert.equal(indices.length, 3);
  for (const name of [...archives, ...indices]) {
    assert.ok(designDNA.includes("| \`" + name + "\` |"),
      "Missing user-supplied attachment metadata: " + name);
  }
  assert.match(designDNA, /not opened, mounted, executed, unpacked or licensed/);
  assert.match(designDNA, /no map API credentials/i);
  assert.match(designDNA, /48×48 dp/);
  assert.match(designDNA, /44×44 pt/);
  assert.match(designDNA, /MapKit JS/);
  assert.match(designDNA, /not evidence that every app is already compliant/);
  assert.doesNotMatch(designDNA, /all 172 (?:guidelines|articles) (?:have been )?reviewed/i);
});


test("manual remote Apple link reachability audit (not article review)", { skip: process.env.HIG_VERIFY_LIVE_LINKS !== "1", timeout: 780000 }, async () => {
  // Run only by explicit GitHub workflow_dispatch. A successful HTTP response
  // proves link reachability, NEVER that the 172 guideline bodies were read.
  const paths = [
    ...tracker.topics.map(item => item.markdown),
    "https://developer.apple.com/documentation/mapkit",
    "https://developer.apple.com/documentation/mapkitjs",
    "https://register.apple.com/resources/imdf/"
  ];
  assert.equal(paths.length, 175);
  assert.equal(new Set(paths).size, 175);
  const results = [];
  for (let offset = 0; offset < paths.length; offset += 4) {
    const batch = paths.slice(offset, offset + 4);
    const responses = await Promise.all(batch.map(async url => {
      try {
        const response = await fetch(url, {
          redirect: "follow",
          headers: { Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8" },
          signal: AbortSignal.timeout(12000)
        });
        const finalUrl = new URL(response.url);
        await response.body?.cancel();
        const approvedHost = ["developer.apple.com", "register.apple.com"].includes(finalUrl.hostname);
        const state = !approvedHost ? "unexpected_redirect"
          : response.status === 404 || response.status === 410 ? "broken"
          : response.ok ? "reachable" : "unverified_http";
        return { url, finalUrl: response.url, state, status: response.status };
      } catch (error) {
        return { url, state: "unverified_network", error: String(error?.name || "request_error") };
      }
    }));
    results.push(...responses);
  }
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const dir = "artifacts/apple-hig-link-health";
  mkdirSync(dir, { recursive: true });
  const report = {
    checkedAt: new Date().toISOString(),
    scope: "175 public Apple URL reachability only; neither full article review nor application conformance",
    expected: 175,
    reachable: results.filter(x => x.state === "reachable").length,
    results
  };
  writeFileSync(dir + "/report.json", JSON.stringify(report, null, 2) + "\n");
  assert.equal(results.length, 175);
  const uncertain = results.filter(x => x.state !== "reachable");
  assert.deepEqual(uncertain, [], "Apple HIG remote reachability requires review of non-200 or blocked endpoints");
});
