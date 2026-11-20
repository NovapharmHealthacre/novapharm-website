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
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
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


/** Never fetch a URL directly from repository JSON. Resolve a strictly
 * allowlisted official Apple route; do not follow redirects to any host. */
function validatedAppleAuditTarget(raw) {
  assert.equal(typeof raw, "string");
  const input = new URL(raw);
  assert.equal(input.protocol, "https:", "Apple audit only allows HTTPS");
  assert.equal(input.username, "");
  assert.equal(input.password, "");
  assert.equal(input.port, "");
  assert.equal(input.search, "", "No arbitrary query string accepted");
  const main = input.hostname === "developer.apple.com";
  const imdf = input.hostname === "register.apple.com" && input.pathname === "/resources/imdf/";
  const article = main && /^\/design\/human-interface-guidelines\/[a-z0-9-]+(?:\.md)?$/.test(input.pathname);
  const service = main && /^\/documentation\/(?:mapkit|mapkitjs)$/.test(input.pathname);
  const resources = main && new Set([
    "/design/resources/", "/fonts/", "/sf-symbols/", "/icon-composer/",
    "/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels"
  ]).has(input.pathname);
  assert.ok(article || service || resources || imdf, "Unapproved Apple audit path");
  assert.ok(!input.hash || article, "Only guideline articles may have anchors");
  const anchor = input.hash ? decodeURIComponent(input.hash.slice(1)) : "";
  assert.ok(!anchor || /^[A-Za-z0-9-]{1,120}$/.test(anchor), "Invalid section anchor");
  const pathname = anchor && !input.pathname.endsWith(".md") ? input.pathname + ".md" : input.pathname;
  const fetchedUrl = input.origin + pathname;
  return { fetchedUrl, anchor };
}

test("remote audit has a strict outbound host/path allowlist and blocks redirects", () => {
  const ok = [
    "https://developer.apple.com/design/human-interface-guidelines/accessibility.md",
    "https://developer.apple.com/design/human-interface-guidelines/typography#Using-system-fonts",
    "https://developer.apple.com/documentation/mapkit",
    "https://developer.apple.com/design/resources/",
    "https://register.apple.com/resources/imdf/"
  ];
  for (const url of ok) assert.ok(validatedAppleAuditTarget(url).fetchedUrl.startsWith("https://"));
  for (const url of [
    "https://evil.example/malicious",
    "http://developer.apple.com/design/human-interface-guidelines/accessibility.md",
    "https://developer.apple.com.evil.example/design/human-interface-guidelines/accessibility.md",
    "https://developer.apple.com@evil.example/design/human-interface-guidelines/accessibility.md",
    "https://developer.apple.com:1234/design/human-interface-guidelines/accessibility.md",
    "https://developer.apple.com/design/human-interface-guidelines/../../api/",
    "https://developer.apple.com/design/human-interface-guidelines/accessibility.md?redirect=https://evil.example",
    "https://register.apple.com/resources/private/"
  ]) assert.throws(() => validatedAppleAuditTarget(url), "Untrusted outbound URL must fail closed");
});

test("manual remote Apple link reachability audit (not article review)", { skip: process.env.HIG_VERIFY_LIVE_LINKS !== "1", timeout: 780000 }, async () => {
  // Explicit workflow_dispatch only. A 200 response or page hash is never
  // evidence of full Apple guideline interpretation or platform readiness.
  const paths = [
    ...tracker.topics.map(item => item.markdown),
    ...tracker.inPageAnchors.map(item => item.url),
    ...tracker.supportingResources.map(item => item.url),
    "https://developer.apple.com/documentation/mapkit",
    "https://developer.apple.com/documentation/mapkitjs",
    "https://register.apple.com/resources/imdf/"
  ];
  assert.equal(paths.length, 210);
  assert.equal(new Set(paths).size, 210);
  const normalizeHeading = (value) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const results = [];
  for (let offset = 0; offset < paths.length; offset += 4) {
    const batch = paths.slice(offset, offset + 4);
    const responses = await Promise.all(batch.map(async url => {
      let fetchedUrl;
      let anchor;
      try {
        ({ fetchedUrl, anchor } = validatedAppleAuditTarget(url));
        const response = await fetch(fetchedUrl, {
          redirect: "manual",
          headers: { Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8" },
          signal: AbortSignal.timeout(12000)
        });
        const finalUrl = new URL(response.url);
        const approvedHost = finalUrl.origin === new URL(fetchedUrl).origin;
        const markdownPage = fetchedUrl.endsWith(".md");
        const body = response.ok ? await response.text() : "";
        if (!response.ok) await response.body?.cancel();
        const { createHash } = await import("node:crypto");
        const headings = markdownPage && body
          ? body.split("\n").filter(line => /^#{1,6}\s+/.test(line))
          : [];
        const hasHeading = !markdownPage || headings.some(line => /^#\s+\S/.test(line));
        const hasSectionHeading = (fragment) => headings.some(line =>
          normalizeHeading(line.replace(/^#{1,6}\s+/, "")) === normalizeHeading(fragment));
        const sectionFound = !anchor || hasSectionHeading(anchor);
        const recordedDrift = tracker.inPageAnchors.find(entry => entry.url === url)?.auditFinding;
        const replacement = recordedDrift?.replacementReference
          ? validatedAppleAuditTarget(recordedDrift.replacementReference) : null;
        const replacementFound = !sectionFound && replacement &&
          replacement.fetchedUrl === fetchedUrl && hasSectionHeading(replacement.anchor);
        const state = !approvedHost || (response.status >= 300 && response.status < 400) ? "redirect_unverified"
          : response.status === 404 || response.status === 410 ? "broken"
          : !response.ok ? "unverified_http"
          : !hasHeading ? "unexpected_content"
          : !sectionFound && replacementFound ? "source_anchor_drift"
          : !sectionFound ? "anchor_unverified" : "reachable";
        // Preserve only status, hashes and headings, not full copyrighted pages.
        return { url, fetchedUrl, finalUrl: response.url, anchor: anchor || null,
          sectionFound, replacementFound: Boolean(replacementFound),
          replacementReference: replacementFound ? recordedDrift.replacementReference : null,
          state, status: response.status,
          contentSha256: body ? createHash("sha256").update(body).digest("hex") : null,
          bodyBytes: Buffer.byteLength(body),
          headings: headings.slice(0, 40).map(line => line.slice(0, 180)) };
      } catch (error) {
        return { url, fetchedUrl, state: "unverified_network",
          error: String(error?.name || "request_error") };
      }
    }));
    results.push(...responses);
  }
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const dir = "artifacts/apple-hig-link-health";
  mkdirSync(dir, { recursive: true });
  const report = {
    checkedAt: new Date().toISOString(),
    scope: "210 Apple URL and section-anchor reachability checks; not full article review or application conformance",
    expected: 210,
    reachable: results.filter(x => x.state === "reachable").length,
    originalAnchorDrift: results.filter(x => x.state === "source_anchor_drift").length,
    results
  };
  writeFileSync(dir + "/report.json", JSON.stringify(report, null, 2) + "\n");
  assert.equal(results.length, 210);
  const knownDrift = results.filter(x => x.state === "source_anchor_drift");
  const recorded = tracker.inPageAnchors.filter(x => x.auditFinding?.state === "original_anchor_missing");
  assert.equal(recorded.length, 1, "Only the observed owner-workbook Siri anchor may drift");
  assert.deepEqual(knownDrift.map(x => x.url).sort(),
    recorded.filter(x => knownDrift.some(y => y.url === x.url)).map(x => x.url).sort(),
    "Never allow source-drift exceptions without exact registered evidence");
  assert.deepEqual(results.filter(x => !["reachable", "source_anchor_drift"].includes(x.state)), [],
    "Unexpected Apple URLs or article anchors still require human review");
  assert.equal(results.filter(x => x.state === "reachable").length + knownDrift.length, 210,
    "All 210 originals must be reachable or transparently identified as changed");
  assert.ok(recorded[0].auditFinding.replacementReference, "Known source drift requires an official replacement");
});


test("the complete 172-article and 516-platform source review cannot silently regress", () => {
  assert.equal(tracker.topics.length, 172);
  assert.equal(new Set(tracker.topics.map(t => t.url)).size, 172);
  assert.equal(new Set(tracker.topics.map(t => t.sourceRowIndex)).size, 172);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed, true,
    "The source-review baseline is complete; deployment is independently gated");
  for (const topic of tracker.topics) {
    assert.equal(topic.guidelineReview, "reviewed",
      "Source review cannot regress without a new, explicitly reviewed audit: " + topic.title);
    assert.ok(Array.isArray(topic.guidelineReviewEvidence) &&
      topic.guidelineReviewEvidence.some(e => typeof e === "string" && e.includes(topic.markdown)),
      "Original Apple source must be cited in the review evidence: " + topic.title);
    for (const p of ["web", "ios", "android"]) {
      const decision = topic.platformApplicability[p];
      assert.ok(["applicable", "not_applicable"].includes(decision?.state),
        "No scoped decision may return to unassessed: " + topic.title + "/" + p);
      assert.ok(typeof decision.rationale === "string" && decision.rationale.length >= 70,
        "Each platform decision needs a source-specific reason: " + topic.title + "/" + p);
    }
  }
  assert.equal(tracker.meta.platformsAssessed, 516);
  assert.equal(tracker.meta.productionEvidenceAudit.verifiedImplementationCount,
    tracker.topics.filter(t => t.implementation === "verified").length,
    "Source review must not invent production verification");
});

test("all 516 topic/platform applicability decisions fail closed until source-specific review", () => {
  const states = [];
  for (const topic of tracker.topics) {
    assert.ok(topic.platformApplicability, "Missing platform decision matrix: " + topic.title);
    assert.deepEqual(Object.keys(topic.platformApplicability).sort(), ["android", "ios", "web"]);
    for (const platform of ["web", "ios", "android"]) {
      const decision = topic.platformApplicability[platform];
      assert.ok(["unassessed", "applicable", "not_applicable"].includes(decision.state),
        "Invalid platform decision: " + topic.title + "/" + platform);
      if (decision.state !== "unassessed") {
        assert.equal(topic.guidelineReview, "reviewed",
          "Applicability must follow actual Apple full-text review: " + topic.title + "/" + platform);
        assert.ok(typeof decision.rationale === "string" && decision.rationale.trim().length >= 20,
          "Platform applicability needs a source-specific reason: " + topic.title + "/" + platform);
      } else {
        assert.equal(decision.rationale, null,
          "An unassessed platform may not claim a conformance rationale: " + topic.title + "/" + platform);
      }
      states.push(decision.state);
    }
  }
  assert.equal(states.length, 516);
  assert.equal(tracker.meta.platformsAssessed, states.filter(x => x !== "unassessed").length);
  if (tracker.meta.allGuidelinePagesFullyReviewed === true) {
    assert.ok(tracker.topics.every(topic =>
      topic.guidelineReview === "reviewed" &&
      Array.isArray(topic.guidelineReviewEvidence) &&
      topic.guidelineReviewEvidence.length > 0),
    "Full-text completion must be backed by article-level evidence for all 172 topics");
  }
});


test("30 exact user workbook anchors and 5 supporting Apple resources remain independently gated", () => {
  assert.equal(tracker.inPageAnchors.length, 30);
  assert.equal(tracker.supportingResources.length, 5);
  assert.equal(tracker.meta.ownerWorkbookAnchors, 30);
  assert.equal(tracker.meta.ownerWorkbookSupportingResources, 5);
  assert.equal(tracker.meta.totalOriginalWorkbookLinks, 207);
  assert.equal(tracker.meta.totalTrackedLinkTargets, 210);
  assert.equal(tracker.meta.workbookTenTabsRead, true);
  assert.equal(tracker.meta.workbookSixSectionSheetRowsCrossChecked, 172);
  assert.equal(tracker.meta.workbookAllModulesRowsCrossChecked, 172);
  assert.equal(tracker.meta.workbookVsCsvFieldMismatches, 0);
  assert.deepEqual(tracker.meta.workbookCrossCheckFields, [
    "Section", "Subsection", "Topic", "Type", "Description",
    "Priority", "Platforms", "URL", "Markdown"
  ]);
  const articleURLs = new Set(tracker.topics.map(x => x.url));
  const targets = new Set(tracker.topics.map(x => x.markdown));
  for (const [index, anchor] of tracker.inPageAnchors.entries()) {
    assert.equal(anchor.sourceRowIndex, index);
    assert.ok(anchor.section && anchor.article && anchor.heading && anchor.sourceDescription);
    assert.equal(anchor.sectionVerified, false, "Anchors are indexed, not independently page-verified");
    assert.ok(articleURLs.has(anchor.parentUrl), "Workbook anchor parent missing: " + anchor.url);
    assert.equal(anchor.url.split("#")[0], anchor.parentUrl);
    assert.ok(anchor.url.split("#")[1]?.length, "Workbook anchor needs a section fragment");
    assert.ok(!targets.has(anchor.url), "Duplicate anchor URL");
    targets.add(anchor.url);
  }
  for (const [index, resource] of tracker.supportingResources.entries()) {
    assert.equal(resource.sourceRowIndex, index);
    assert.ok(resource.name && resource.sourcePurpose);
    assert.equal(resource.sourceVerified, false, "Supporting resource URL requires separate review");
    assert.match(resource.url, /^https:\/\/developer\.apple\.com\//);
    assert.ok(!targets.has(resource.url), "Duplicate supporting link");
    targets.add(resource.url);
  }
  for (const source of [
    "https://developer.apple.com/documentation/mapkit",
    "https://developer.apple.com/documentation/mapkitjs",
    "https://register.apple.com/resources/imdf/"
  ]) {
    assert.ok(!targets.has(source), "Duplicate extended MapKit/IMDF URL");
    targets.add(source);
  }
  assert.equal(targets.size, 210);
});


test("all 172 HIG topics are within the owner's reported completed review, without claiming independent source or release proof", () => {
  const owner = tracker.meta.ownerReviewAttestation;
  assert.equal(owner.status, "completed_as_reported_by_owner");
  assert.equal(owner.attestedOn, "2026-11-19");
  assert.equal(owner.indexedTopicsWithinAttestedCoverage, 172);
  assert.equal(owner.fullTextReviewIndependentlyVerifiedForAll172, false);
  assert.equal(owner.platformApplicabilityApprovedForAll516, false);
  assert.equal(owner.implementationOrProductionConformanceCertified, false);
  assert.equal(tracker.topics.length, 172);
  assert.equal(new Set(tracker.topics.map(t => t.markdown)).size, 172);
  for (const topic of tracker.topics) {
    assert.equal(topic.ownerReviewAttestation?.status, "included_in_owner_reported_coverage", topic.title);
    assert.equal(topic.ownerReviewAttestation?.attestedOn, "2026-11-19", topic.title);
    assert.equal(topic.ownerReviewAttestation?.sourceMarkdown, topic.markdown, topic.title);
    assertRegisteredAcceptance(topic);
  }
  // Exact article-level evidence remains separate from the owner's broader statement.
  const evidenced = tracker.topics.filter(t => t.guidelineReview === "reviewed");
  assert.ok(evidenced.length <= owner.indexedTopicsWithinAttestedCoverage);
  for (const topic of evidenced) {
    assert.ok(Array.isArray(topic.guidelineReviewEvidence) && topic.guidelineReviewEvidence.length > 0);
  }
  assert.equal(tracker.meta.platformsAssessed,
    tracker.topics.flatMap(t => Object.values(t.platformApplicability)).filter(x => x.state !== "unassessed").length);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});


test("nine additionally reviewed current HIG primary articles have per-platform rationale without false release completion", () => {
  const topics = ["Design principles","Designing for iOS","Branding","Writing","Loading","Entering data","Managing accounts","Searching","Generative AI"];
  const reviewed = topics.map(name => tracker.topics.find(t => t.title === name));
  assert.ok(reviewed.every(Boolean));
  for(const item of reviewed){
    assert.equal(item.guidelineReview,"reviewed",item.title);
    assert.ok(item.guidelineReviewEvidence.length >= 2,item.title);
    assert.ok(item.guidelineReviewEvidence[0].includes(item.markdown),item.title);
    assertRegisteredAcceptance(item);
    assertRegisteredAcceptance(item);
    for(const platform of ["web","ios","android"]){
      const decision=item.platformApplicability[platform];
      assert.ok(["applicable","not_applicable"].includes(decision.state),item.title+"/"+platform);
      assert.ok(decision.rationale.length>=40,item.title+"/"+platform);
    }
  }
  assert.equal(reviewed.find(x => x.title==="Designing for iOS").platformApplicability.web.state,"not_applicable");
  assert.equal(reviewed.find(x => x.title==="Designing for iOS").platformApplicability.ios.state,"applicable");
  assert.equal(reviewed.find(x => x.title==="Designing for iOS").platformApplicability.android.state,"not_applicable");
  assert.ok(tracker.topics.filter(x=>x.guidelineReview==="reviewed").length>=19);
  assert.ok(tracker.meta.platformsAssessed>=57);
  tracker.topics.forEach(assertRegisteredAcceptance);
  assert.equal(tracker.meta.ownerReviewAttestation.indexedTopicsWithinAttestedCoverage,172);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("eight additional Apple component and VoiceOver article reviews retain source and release boundaries",()=>{
  const names=["Buttons","Alerts","Tab bars","Search fields","Progress indicators","Labels","Charts","VoiceOver"];
  for(const name of names){
    const t=tracker.topics.find(x=>x.title===name);
    assert.equal(t?.guidelineReview,"reviewed",name);
    assert.ok(t.guidelineReviewEvidence[0].includes(t.markdown),name);
    assert.ok(t.guidelineReviewEvidence.length>=2,name);
    for(const platform of ["web","ios","android"]){
      const decision=t.platformApplicability[platform];
      assert.ok(["applicable","not_applicable"].includes(decision.state),name+"/"+platform);
      assert.ok(decision.rationale.length>40,name+"/"+platform);
    }
    assertRegisteredAcceptance(t);
    assertRegisteredAcceptance(t);
  }
  assert.equal(tracker.topics.find(t=>t.title==="VoiceOver").platformApplicability.android.state,"not_applicable");
  assert.ok(tracker.topics.filter(x=>x.guidelineReview==="reviewed").length>=19);
  assert.ok(tracker.meta.platformsAssessed>=57);
  assert.equal(tracker.meta.ownerReviewAttestation.indexedTopicsWithinAttestedCoverage,172);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("eight more primary HIG foundation/icon articles have unique source findings and platform-specific decisions", () => {
  const names = ["Layout", "Privacy", "Inclusion", "Images", "Icons", "SF Symbols", "Materials", "App icons"];
  for (const name of names) {
    const topic = tracker.topics.find(x => x.title === name);
    assert.ok(topic, "Missing indexed Apple article: " + name);
    assert.equal(topic.guidelineReview, "reviewed", name);
    assert.ok(Array.isArray(topic.guidelineReviewEvidence) && topic.guidelineReviewEvidence.length >= 3, name);
    assert.ok(topic.guidelineReviewEvidence[0].includes(topic.markdown), name);
    assert.ok(topic.guidelineReviewEvidence[0].includes("2026-11-19"), name);
    assertRegisteredAcceptance(topic);
    assertRegisteredAcceptance(topic);
    for (const platform of ["web", "ios", "android"]) {
      const item = topic.platformApplicability[platform];
      assert.ok(["applicable", "not_applicable"].includes(item.state), name + "/" + platform);
      assert.ok(typeof item.rationale === "string" && item.rationale.length >= 80, name + "/" + platform);
    }
  }
  for (const name of ["SF Symbols", "Materials", "App icons"]) {
    const topic = tracker.topics.find(x => x.title === name);
    assert.equal(topic.platformApplicability.ios.state, "applicable", name);
    assert.equal(topic.platformApplicability.android.state, "not_applicable", name);
    assert.equal(topic.platformApplicability.web.state, "not_applicable", name);
  }
  assert.ok(tracker.topics.filter(x => x.guidelineReview === "reviewed").length >= 27);
  assert.ok(tracker.meta.platformsAssessed >= 81);
  tracker.topics.forEach(assertRegisteredAcceptance);
  assert.equal(tracker.meta.ownerReviewAttestation.indexedTopicsWithinAttestedCoverage, 172);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("25 additional current official article decisions are source-grounded and fail closed for release", () => {
  const names = [
    "Text fields", "Sidebars", "Scroll views", "Focus and selection", "Undo and redo",
    "Settings", "Onboarding", "Notifications", "File management", "Managing notifications",
    "Disclosure controls", "Pickers", "Tab views", "Launching", "Modality",
    "Offering help", "Action sheets", "Segmented controls", "Navigation and search",
    "Sheets", "Windows", "Popovers", "Context menus", "Text views", "Virtual keyboards"
  ];
  assert.equal(new Set(names).size, 25);
  for (const name of names) {
    const topic = tracker.topics.find(x => x.title === name);
    assert.ok(topic, name);
    assert.equal(topic.guidelineReview, "reviewed", name);
    assert.equal(topic.guidelineReviewEvidence?.length, 3, name);
    assert.ok(topic.guidelineReviewEvidence[0].includes(topic.markdown), name);
    assert.ok(topic.guidelineReviewEvidence[0].includes("2026-11-19"), name);
    assertRegisteredAcceptance(topic);
    assertRegisteredAcceptance(topic);
    for (const platform of ["web", "ios", "android"]) {
      const d = topic.platformApplicability[platform];
      assert.ok(d && ["applicable", "not_applicable"].includes(d.state), name + "/" + platform);
      assert.ok(typeof d.rationale === "string" && d.rationale.length >= 75, name + "/" + platform);
    }
  }
  for (const name of ["Tab views", "Windows"]) {
    assert.equal(tracker.topics.find(x => x.title === name).platformApplicability.ios.state,
      "not_applicable", "Do not treat AppKit/iPadOS-only components as native iPhone iOS requirements");
  }
  const reviewedCount = tracker.topics.filter(x => x.guidelineReview === "reviewed").length;
  const appliedCount = tracker.topics.flatMap(x => Object.values(x.platformApplicability))
    .filter(d => d.state !== "unassessed").length;
  assert.ok(reviewedCount >= 52, "Do not regress previous 52 source assessments");
  assert.ok(appliedCount >= 156, "Do not regress previous 156 platform decisions");
  assert.equal(tracker.meta.platformsAssessed, appliedCount);
  tracker.topics.forEach(assertRegisteredAcceptance);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
  assert.equal(tracker.meta.ownerReviewAttestation.indexedTopicsWithinAttestedCoverage, 172);
});

const ownerProductionConstraints = JSON.parse(read("config/intelligence/owner-production-constraints.json"));
const isSha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const isGitHubReceipt = value => typeof value === "string" &&
  /^https:\/\/github\.com\/NovapharmHealthacre\/novapharm-website\/(?:actions\/runs|pull|issues)\/[0-9]+/.test(value);

/**
 * Structural acceptance rules: authenticating claims against live services,
 * production logs and real devices still requires an independent human check.
 * The static CI gate must NOT turn a green workflow or a source commit into
 * a verified HIG implementation.
 */
function validateProductionVerifiedTopic(topic) {
  assert.equal(topic.guidelineReview, "reviewed", topic.title + ": source article required");
  const platforms = ["web", "ios", "android"];
  const inScope = platforms.filter(p => topic.platformApplicability[p]?.state === "applicable");
  assert.ok(inScope.length > 0, topic.title + ": zero applicable platforms cannot be a verified implementation");
  assert.ok(platforms.every(p =>
    ["applicable", "not_applicable"].includes(topic.platformApplicability[p]?.state)),
    topic.title + ": all three applicability decisions required");
  assert.ok(Array.isArray(topic.releaseEvidence) && topic.releaseEvidence.length >= inScope.length,
    topic.title + ": distinct independent production release receipts required");
  for (const platform of inScope) {
    const rows = topic[platform + "Evidence"];
    assert.ok(Array.isArray(rows) && rows.length > 0,
      topic.title + "/" + platform + ": actual delivered platform evidence required");
    const full = rows.find(row => row && typeof row === "object" &&
      row.platform === platform && row.verificationLevel === "full" &&
      row.jobConclusion === "success" && isSha(row.observedLiveSourceSha) &&
      isGitHubReceipt(row.runUrl) && isGitHubReceipt(row.independentReviewUrl) &&
      typeof row.observedAt === "string" && !Number.isNaN(Date.parse(row.observedAt)) &&
      typeof row.accessibilityEvidenceUrl === "string" &&
      /^https:\/\//.test(row.accessibilityEvidenceUrl) &&
      typeof row.releaseReceiptUrl === "string" && /^https:\/\//.test(row.releaseReceiptUrl) &&
      Array.isArray(row.checkedJourneys) && row.checkedJourneys.length > 0 &&
      Array.isArray(row.assistiveTechnology) && row.assistiveTechnology.length > 0);
    assert.ok(full, topic.title + "/" + platform + ": complete live/device observation and independent receipt required");
    if (platform !== "web") {
      assert.ok(typeof full.signedArtifactUrl === "string" &&
        /^https:\/\//.test(full.signedArtifactUrl),
      topic.title + "/" + platform + ": signed native build/store distribution receipt required");
    } else if (full.protectedCustomerService === true) {
      assert.equal(ownerProductionConstraints.productionSignoff, "granted",
        "Protected production cannot be accepted while signoff remains not_granted");
      assert.ok(typeof full.tenantIsolationEvidenceUrl === "string" &&
        /^https:\/\//.test(full.tenantIsolationEvidenceUrl),
      topic.title + "/web: protected tenant boundary proof required");
    }
    const release = topic.releaseEvidence.find(row => row && typeof row === "object" &&
      row.platform === platform && row.reviewDecision === "approved" &&
      row.observedLiveSourceSha === full.observedLiveSourceSha &&
      isGitHubReceipt(row.independentReviewUrl) &&
      typeof row.releaseReceiptUrl === "string" &&
      row.releaseReceiptUrl === full.releaseReceiptUrl);
    assert.ok(release, topic.title + "/" + platform + ": a reviewed exact-SHA release record is required");
  }
}

// HIG production claims advance only with actual evidence. Never freeze the
// audit at its 19-Nov-2026 zero-verified starting point.
function validateOwnerSignoff() {
  assert.ok(["not_granted", "granted"].includes(ownerProductionConstraints.productionSignoff));
  if (ownerProductionConstraints.productionSignoff === "granted") {
    assert.ok(isGitHubReceipt(ownerProductionConstraints.productionSignoffEvidenceUrl),
      "Owner signoff needs an independently reviewable release receipt");
  }
}
function validateApprovedOutOfScopeTopic(topic) {
  assert.equal(topic.guidelineReview, "reviewed", topic.title + ": official article must be reviewed");
  assert.ok(["web", "ios", "android"].every(p =>
    topic.platformApplicability[p]?.state === "not_applicable" &&
    typeof topic.platformApplicability[p]?.rationale === "string" &&
    topic.platformApplicability[p].rationale.length >= 40),
    topic.title + ": every platform needs an explicit out-of-scope rationale");
  const a = topic.notApplicableApproval;
  assert.ok(a && a.reviewDecision === "approved" &&
    isGitHubReceipt(a.independentReviewUrl) &&
    typeof a.approvedAt === "string" && !Number.isNaN(Date.parse(a.approvedAt)) &&
    typeof a.reason === "string" && a.reason.length >= 40,
    topic.title + ": independent reviewer-approved N/A disposition required");
  assert.deepEqual(topic.releaseEvidence, [], "N/A approval is not deployment proof");
}
function assertRegisteredAcceptance(topic) {
  if (topic.implementation === "verified") validateProductionVerifiedTopic(topic);
  else if (topic.implementation === "not_applicable") validateApprovedOutOfScopeTopic(topic);
  else assert.ok(["not_verified", "in_progress"].includes(topic.implementation),
    topic.title + ": unknown acceptance status");
}
function expectedProgrammeCertified() {
  validateOwnerSignoff();
  return ownerProductionConstraints.productionSignoff === "granted" &&
    tracker.topics.length === 172 &&
    tracker.topics.every(t => t.guidelineReview === "reviewed" &&
      ["web", "ios", "android"].every(p =>
        ["applicable", "not_applicable"].includes(t.platformApplicability[p]?.state)) &&
      ["verified", "not_applicable"].includes(t.implementation));
}

test("verified HIG claims cannot be manufactured from source-only checks, skipped jobs or incomplete receipts", () => {
  const rtl = tracker.topics.find(x => x.title === "Right to left");
  const audit = tracker.meta.productionEvidenceAudit;
  validateOwnerSignoff();
  assert.equal(audit.productionSignoffObserved, ownerProductionConstraints.productionSignoff);
  assert.equal(audit.readOnlyEvidenceOnly, true);
  assert.equal(audit.verifiedImplementationCount,
    tracker.topics.filter(t => t.implementation === "verified").length);
  assert.equal(rtl.guidelineReview, "reviewed");
  assert.ok(rtl.guidelineReviewEvidence[0].includes(rtl.markdown));
  assert.ok(rtl.webEvidence.length >= 1);
  const scoped = rtl.webEvidence[0];
  assert.equal(scoped.verificationLevel, "partial");
  assert.equal(scoped.jobConclusion, "success");
  assert.ok(isSha(scoped.observedLiveSourceSha));
  assert.ok(isGitHubReceipt(scoped.runUrl));
  assert.deepEqual(["web", "ios", "android"].map(p => rtl.platformApplicability[p].state),
    ["applicable", "applicable", "applicable"]);
  assertRegisteredAcceptance(rtl);
  assert.ok(audit.excludedAsAcceptance.some(x => x.run === 44528135827 &&
    x.job === "live-browser" && x.jobConclusion === "skipped"),
    "A skipped production-browser job must never count as a live verification");
  for (const topic of tracker.topics) {
    if (topic.implementation === "verified") validateProductionVerifiedTopic(topic);
  }
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("production acceptance evidence rejects forged or scoped-only fixture", () => {
  const topic = structuredClone(tracker.topics.find(x => x.title === "Right to left"));
  topic.implementation = "verified";
  assert.throws(() => validateProductionVerifiedTopic(topic),
    /distinct independent production release receipts required/);
  topic.releaseEvidence = [{platform:"web",reviewDecision:"approved"},{platform:"ios"},{platform:"android"}];
  assert.throws(() => validateProductionVerifiedTopic(topic),
    /complete live\/device observation and independent receipt required/);
  topic.webEvidence = [{
    platform:"web",verificationLevel:"full",jobConclusion:"skipped",
    observedLiveSourceSha:"d00b2eee866d4a2dd2ff7d87ded583be0d7cab98",
    runUrl:"https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44528135827"
  }];
  assert.throws(() => validateProductionVerifiedTopic(topic),
    /complete live\/device observation and independent receipt required/);
});

test("a platform-exclusive N/A decision cannot be self-approved or counted as deployment", () => {
  const tv = structuredClone(tracker.topics.find(t => t.title === "Digit entry views"));
  tv.implementation = "not_applicable";
  assert.throws(() => validateApprovedOutOfScopeTopic(tv),
    /independent reviewer-approved N\/A disposition required/);
  tv.notApplicableApproval = {
    reviewDecision: "approved",
    independentReviewUrl: "https://example.com/self-approval",
    approvedAt: "2026-11-19T00:00:00Z",
    reason: "Apple tvOS-only digit entry is not native to web, iOS, or Android."
  };
  assert.throws(() => validateApprovedOutOfScopeTopic(tv),
    /independent reviewer-approved N\/A disposition required/);
  validateOwnerSignoff();
});

test("independent primary source review and bounded live RTL evidence cannot masquerade as full production programme completion", () => {
  assert.ok(tracker.topics.filter(x => x.guidelineReview === "reviewed").length >= 68);
  assert.ok(tracker.meta.platformsAssessed >= 204);
  assert.ok(tracker.topics.flatMap(x => Object.values(x.platformApplicability))
    .filter(x => x.state !== "unassessed").length >= 204);
  assert.equal(tracker.topics.filter(x => x.implementation === "verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("write an inspectable 172-topic production acceptance gap ledger", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const reviewed = tracker.topics.filter(t => t.guidelineReview === "reviewed").length;
  const decisions = tracker.topics.flatMap(t => Object.values(t.platformApplicability))
    .filter(d => d.state !== "unassessed").length;
  const verified = tracker.topics.filter(t => t.implementation === "verified").length;
  const priorities = {Critical:0,High:1,Medium:2,Later:3};
  const topics = tracker.topics.map((t, index) => {
    const unassessedPlatforms = ["web","ios","android"].filter(p =>
      t.platformApplicability[p]?.state === "unassessed");
    const applicablePlatforms = ["web","ios","android"].filter(p =>
      t.platformApplicability[p]?.state === "applicable");
    // A conceptually out-of-scope Apple API is only a CANDIDATE. It still
    // requires real independent approval before "not_applicable" is accepted.
    const candidateOutOfScope = unassessedPlatforms.length === 0 &&
      applicablePlatforms.length === 0;
    const platformEvidence = Object.fromEntries(["web","ios","android"].map(p => {
      const list = t[p + "Evidence"];
      return [p, {
        applicability: t.platformApplicability[p]?.state,
        recordedEvidenceCount: Array.isArray(list) ? list.length : 0,
        fullReleaseAccepted: t.implementation === "verified" &&
          Array.isArray(t.releaseEvidence) &&
          t.releaseEvidence.some(e => e && e.platform === p && e.reviewDecision === "approved")
      }];
    }));
    const blockers = [];
    if (t.guidelineReview !== "reviewed") blockers.push("official_source_review");
    if (unassessedPlatforms.length) blockers.push("platform_decisions:" + unassessedPlatforms.join(","));
    for (const p of applicablePlatforms) {
      if (platformEvidence[p].recordedEvidenceCount === 0)
        blockers.push("observed_" + p + "_implementation");
      if (!platformEvidence[p].fullReleaseAccepted)
        blockers.push("accepted_" + p + "_release_receipt");
    }
    if (candidateOutOfScope && t.implementation !== "not_applicable")
      blockers.push("independently_accepted_out_of_scope_disposition");
    if (applicablePlatforms.length === 0 && !candidateOutOfScope)
      blockers.push("unresolved_platform_scope");
    if (t.implementation !== "verified" && t.implementation !== "not_applicable")
      blockers.push("final_independent_implementation_approval");
    return {
      sourceRowIndex: t.sourceRowIndex ?? index,
      title: t.title, section: t.section, priority: t.priority,
      officialMarkdown: t.markdown, articleReview: t.guidelineReview,
      implementation: t.implementation, candidateOutOfScope,
      unassessedPlatforms, applicablePlatforms, platformEvidence, blockers
    };
  }).sort((a,b) => (priorities[a.priority] ?? 99) - (priorities[b.priority] ?? 99)
    || a.sourceRowIndex - b.sourceRowIndex);
  const report = {
    schema: "novapharm.hig-production-acceptance-gap.v1",
    generatedAt: new Date().toISOString(),
    sourceCommit: process.env.GITHUB_SHA || null,
    provenance: "Source register, not independent production conformance",
    totalTopics: tracker.topics.length,
    ownerAttestedCoverage: tracker.meta.ownerReviewAttestation.indexedTopicsWithinAttestedCoverage,
    independentlyDocumentedArticleReviews: reviewed,
    totalPlatformDecisions: tracker.topics.length * 3,
    assessedPlatformDecisions: decisions,
    registeredProductionVerifiedTopics: verified,
    registeredNotApplicableTopics: tracker.topics.filter(t => t.implementation === "not_applicable").length,
    candidateOutOfScopeTopicsPendingIndependentApproval: topics
      .filter(t => t.candidateOutOfScope && t.implementation !== "not_applicable")
      .map(t => ({title:t.title,sourceRowIndex:t.sourceRowIndex})),
    // A reviewed non-applicable topic is not a production "verified implementation".
    // Track accepted total dispositions separately from genuine deployments.
    allTopicsIndependentlyDispositioned: tracker.topics.every(t =>
      t.implementation === "verified" || t.implementation === "not_applicable"),
    recordedPartialLiveObservations: tracker.topics.flatMap(t =>
      ["web","ios","android"].flatMap(p => (t[p+"Evidence"]||[]).filter(e =>
        e && typeof e === "object" && e.verificationLevel === "partial"))).length,
    productionSignoffObserved: ownerProductionConstraints.productionSignoff,
    // Programme closure is a reviewed platform disposition for every topic,
    // NOT a claim that 172 unsupported Apple APIs shipped into all platforms.
    productionCanBeCertified: tracker.topics.every(t =>
      t.implementation === "verified" || t.implementation === "not_applicable") &&
      ownerProductionConstraints.productionSignoff === "granted" &&
      tracker.meta.allPlatformsProductionVerified === true,
    topics
  };
  assert.equal(report.totalTopics, 172);
  assert.equal(report.independentlyDocumentedArticleReviews,
    tracker.topics.filter(t => t.guidelineReview === "reviewed").length);
  assert.equal(report.assessedPlatformDecisions, tracker.meta.platformsAssessed);
  assert.equal(report.registeredProductionVerifiedTopics,
    tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
  assert.ok(report.recordedPartialLiveObservations >= 6);
  assert.equal(report.allTopicsIndependentlyDispositioned,
    tracker.topics.every(t => ["verified", "not_applicable"].includes(t.implementation)));
  assert.ok(report.candidateOutOfScopeTopicsPendingIndependentApproval
    .some(t => t.title === "Digit entry views"),
    "Apple tvOS-only Digit entry is a pending N/A candidate, not a shipped web/iOS/Android component");
  const indexedProofs = tracker.meta.productionEvidenceAudit.scopedPublicEvidence;
  const sourceProofs = tracker.topics.flatMap(t =>
    ["web","ios","android"].flatMap(platform =>
      (t[platform + "Evidence"] || [])
        .filter(e => e && e.verificationLevel === "partial")
        .map(e => ({
          topic: t.title, platform, jobId: e.jobId,
          sourceRun: Number(e.runUrl?.match(/\/runs\/([0-9]+)/)?.[1] || 0)
        }))));
  assert.equal(indexedProofs.length, sourceProofs.length,
    "Every topic/platform partial observation must appear in the source-run receipt index");
  assert.equal(indexedProofs.length, tracker.meta.productionEvidenceAudit.recordedPartialTopicPlatformObservations,
    "Metadata partial-observation count must reconcile to the indexed artifact records");
  for (const e of sourceProofs) {
    assert.ok(e.sourceRun > 0, e.topic + ": partial evidence has no real workflow run URL");
    const related = indexedProofs.filter(p => p.topic === e.topic &&
      p.sourceRun === e.sourceRun && p.jobId === e.jobId);
    assert.equal(related.length, 1,
      e.topic + ": every partial platform proof requires exactly one scoped indexed receipt");
    assert.equal(related[0].jobConclusion, "success",
      e.topic + ": a skipped or failed job cannot count as a public production observation");
  }
  assert.deepEqual(
    [...new Set(indexedProofs.map(x => x.sourceRun))].sort((a,b) => a-b),
    [...tracker.meta.productionEvidenceAudit.distinctObservedPublicLiveRuns].sort((a,b) => a-b),
    "Live-run provenance must reconcile across indexed receipts and distinct workflow runs");

  assert.equal(report.productionCanBeCertified, expectedProgrammeCertified());
  assert.equal(topics.length, 172);
  assert.equal(new Set(topics.map(t => t.sourceRowIndex)).size, 172);
  const dir = "artifacts/apple-hig-production-audit";
  mkdirSync(dir, { recursive:true });
  writeFileSync(dir + "/172-topic-gap-ledger.json", JSON.stringify(report, null, 2) + "\n");
  console.log("HIG production acceptance: " + verified + "/172 verified, " +
    reviewed + "/172 primary reviews, " + decisions + "/516 platform decisions. " +
    "Detailed gap ledger: " + dir + "/172-topic-gap-ledger.json");
});

test("optional read-only public website HTML sample (not HIG compliance)",
  { skip: process.env.HIG_SAMPLE_PUBLIC_ORIGIN !== "1", timeout: 150000 }, async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  // This survey does not call AWS, authenticate, submit forms, send email,
  // deploy assets or visit untrusted URLs. Limit navigation to six fixed
  // public pages and do not store any response bodies or private content.
  const origin = "https://novapharmhealthcare.com";
  const routes = ["/", "/legal/accessibility/", "/contact/", "/products/",
    "/capabilities/", "/oncology/"];
  const results = [];
  for (const route of routes) {
    const row = {route, httpStatus:null, contentType:null, lang:null,
      h1Count:null, sourceSha:null, errors:[], scope:"read_only_html"};
    try {
      const response = await fetch(origin + route, {
        method:"GET", redirect:"manual", signal:AbortSignal.timeout(22000),
        headers:{"Accept":"text/html", "User-Agent":"NovaPharm-HIG-read-only-source-evidence/1"}
      });
      row.httpStatus = response.status;
      row.contentType = response.headers.get("content-type");
      if (response.status !== 200) row.errors.push("HTTP status " + response.status);
      if (!row.contentType?.toLowerCase().includes("text/html"))
        row.errors.push("Response not HTML");
      const size = Number(response.headers.get("content-length") || 0);
      if (size > 1600000) throw new Error("HTML exceeds read-only sample size budget");
      const html = (await response.text()).slice(0, 1600001);
      if (html.length > 1600000) throw new Error("HTML exceeds read-only sample size budget");
      row.lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || null;
      row.h1Count = [...html.matchAll(/<h1(?:\s[^>]*)?>/gi)].length;
      const meta = html.match(/<meta\b[^>]*name=["']novapharm-source-sha["'][^>]*>/i)?.[0] || "";
      row.sourceSha = meta.match(/\bcontent=["']([a-f0-9]{40})["']/i)?.[1] || null;
      if (!row.lang || !/^en(?:-|$)/i.test(row.lang)) row.errors.push("Missing English HTML language");
      if (row.h1Count !== 1) row.errors.push("Missing or duplicate H1");
      if (!row.sourceSha) row.errors.push("No published provenance SHA");
      if (route === "/legal/accessibility/" &&
          !/does not claim full conformance|does not claim full WCAG|does not claim full compliance/i.test(html))
        row.errors.push("Current accessibility disclosure cannot be confirmed");
    } catch (error) {
      row.errors.push(String(error.message || error).slice(0, 250));
    }
    results.push(row);
  }
  const directory = "artifacts/apple-hig-production-audit";
  mkdirSync(directory, {recursive:true});
  const report = {
    schema:"novapharm.hig-public-html-sample.v1",
    observedAt:new Date().toISOString(),
    origin, observedBy:"read-only Node HTTP HTML; NOT rendered browser",
    testedRouteCount:routes.length,
    passedRoutes:results.filter(row => row.errors.length === 0).length,
    notTested:["JavaScript behavior","browser layout","keyboard navigation",
      "assistive technology","screen readers","authenticated customer routes",
      "native mobile devices","source rights","HIG conformance"],
    results
  };
  writeFileSync(directory + "/public-origin-sample.json",
    JSON.stringify(report,null,2)+"\n");
  console.log("Public HIG HTML evidence " + report.passedRoutes +
    "/" + routes.length + " sampled routes passed narrow HTTP/landmark checks; " +
    "NOT production HIG acceptance.");
  assert.equal(report.passedRoutes, routes.length,
    "Read-only live HTML sample gaps: see public-origin-sample.json");
});

test("actual production Capabilities/Oncology rendered screenshots are partial evidence, never a 172-topic release certificate", () => {
  const audit = tracker.meta.productionEvidenceAudit;
  for (const [name, expectedCounts] of [["Layout", 3], ["Images", 1]]) {
    const topic = tracker.topics.find(t => t.title === name);
    assertRegisteredAcceptance(topic);
    assert.ok(topic.webEvidence.length >= expectedCounts, name);
    assert.ok(Array.isArray(topic.iosEvidence));
    assert.ok(Array.isArray(topic.androidEvidence));
    assertRegisteredAcceptance(topic);
    for (const proof of topic.webEvidence.filter(p =>
      p.evidenceType === "scoped_live_public_observation" && p.verificationLevel === "partial")) {
      assert.equal(proof.verificationLevel, "partial", name);
      assert.equal(proof.jobConclusion, "success", name);
      assert.ok(isGitHubReceipt(proof.runUrl), name);
      assert.ok(typeof proof.artifactUrl === "string" && proof.artifactUrl.includes("/artifacts/"), name);
      assert.ok(proof.checkedJourneys.length >= 2, name);
      assert.ok(proof.scopeLimits.length >= 2, name);
      if (![135618272024,136093044118].includes(proof.jobId)) {
        assert.equal(proof.observedLiveSourceSha, null,
          "Do not convert a run head or exact CSS bytes into an unobserved HTML release SHA");
      } else {
        assert.ok(isSha(proof.observedLiveSourceSha),
          "Only independently observed public HTML SHA may be attached to a rendered live receipt");
      }
    }
  }
  const layout = tracker.topics.find(t => t.title === "Layout");
  assert.ok(layout.webEvidence.some(e => e.runUrl.endsWith("44532249980")));
  assert.ok(layout.webEvidence.some(e => e.runUrl.endsWith("44532250088")));
  assert.ok(audit.distinctObservedPublicLiveRuns.includes(44528135812));
  assert.ok(audit.distinctObservedPublicLiveRuns.includes(44532249980));
  assert.ok(audit.distinctObservedPublicLiveRuns.includes(44532250088));
  assert.ok(audit.recordedPartialTopicPlatformObservations >= 6);
  assert.equal(audit.verifiedImplementationCount,
    tracker.topics.filter(t => t.implementation === "verified").length);
  assert.equal(tracker.topics.filter(t => t.implementation === "verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
});

test("optional read-only rendered public HIG evidence sampling",
  { skip: process.env.HIG_RENDER_PUBLIC_ORIGIN !== "1", timeout: 720000 }, async () => {
  const { chromium, webkit } = await import("playwright");
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const path = await import("node:path");
  const origin = "https://novapharmhealthcare.com";
  const routes = ["/", "/contact/", "/legal/accessibility/",
    "/capabilities/", "/oncology/", "/products/"];
  const widths = [
    {name:"compact-320",width:320,height:720},
    {name:"mobile-390",width:390,height:844},
    {name:"desktop-1440",width:1440,height:900}
  ];
  const folder = "artifacts/apple-hig-production-audit/rendered-public";
  mkdirSync(folder, {recursive:true});
  const rows = [];
  for (const [engine, launch] of [["chromium",chromium],["webkit",webkit]]) {
    const browser = await launch.launch({headless:true});
    try {
      for (const viewport of widths) {
        const context = await browser.newContext({
          viewport:{width:viewport.width,height:viewport.height},
          reducedMotion:"reduce",serviceWorkers:"block",permissions:[]
        });
        let blockedRequests = 0;
        // Never send POST/PUT/PATCH/DELETE, analytics, off-domain tracking,
        // identity requests or paid/clinical API traffic during this audit.
        await context.route("**/*", async route => {
          const request = route.request();
          const remote = new URL(request.url());
          if (!["GET","HEAD"].includes(request.method()) || remote.origin !== origin) {
            blockedRequests += 1;
            await route.abort();
          } else {
            await route.continue();
          }
        });
        try {
          for (const pathname of routes) {
            const row = {
              engine, viewport:viewport.name, pathname, httpStatus:null,
              publishedSourceSha:null, hasH1:false, language:null,
              horizontalOverflowPx:null, firstKeyboardFocusVisible:false,
              keyboardFocusSequence:[],
              seriousAxeViolations:[], otherAxeViolations:[],
              blockedExternalOrUnsafeRequests:0, errors:[]
            };
            const beforeBlocked = blockedRequests;
            const page = await context.newPage();
            try {
              const response = await page.goto(origin + pathname, {
                waitUntil:"domcontentloaded",timeout:35000
              });
              row.httpStatus = response?.status() || null;
              if (row.httpStatus !== 200) row.errors.push("Page did not return HTTP 200");
              await page.waitForLoadState("load", {timeout:7000}).catch(()=>{});
              const doc = await page.evaluate(() => {
                const meta = document.querySelector('meta[name="novapharm-source-sha"]');
                return {
                  lang:document.documentElement.lang,
                  h1Count:document.querySelectorAll("main h1").length,
                  overflow:Math.max(0,document.documentElement.scrollWidth -
                    document.documentElement.clientWidth),
                  sha:meta?.getAttribute("content") || null
                };
              });
              row.language = doc.lang;
              row.hasH1 = doc.h1Count === 1;
              row.horizontalOverflowPx = doc.overflow;
              row.publishedSourceSha = /^[a-f0-9]{40}$/.test(doc.sha||"") ? doc.sha : null;
              if (!row.hasH1) row.errors.push("Missing or duplicate main H1");
              if (!row.language?.startsWith("en")) row.errors.push("Missing expected language declaration");
              if (doc.overflow > 2) row.errors.push("Horizontal overflow: " + doc.overflow + "px");
              await page.keyboard.press("Tab");
              row.firstKeyboardFocusVisible = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 &&
                  getComputedStyle(el).visibility !== "hidden";
              });
              if (!row.firstKeyboardFocusVisible)
                row.errors.push("First Tab did not reach a visible focus target");
              // Five bounded Tab stops give reviewers a navigation trace instead
              // of one Boolean. This records only element roles/tags and CSS
              // cues, never typed values, page contents or personal data.
              const observeFocusedElement = () => page.evaluate(() => {
                const element = document.activeElement;
                if (!element || element === document.body) {
                  return { tag: null, role: null, inViewport: false,
                    cssFocusCueHeuristic: false };
                }
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return {
                  tag: element.tagName.toLowerCase(),
                  role: element.getAttribute("role"),
                  inViewport: rect.width > 0 && rect.height > 0 &&
                    rect.right > 0 && rect.bottom > 0 &&
                    rect.left < innerWidth && rect.top < innerHeight,
                  cssFocusCueHeuristic:
                    (style.outlineStyle !== "none" &&
                      Number.parseFloat(style.outlineWidth) > 0) ||
                    style.boxShadow !== "none"
                };
              });
              row.keyboardFocusSequence.push(await observeFocusedElement());
              for (let tabIndex = 1; tabIndex < 5; tabIndex += 1) {
                await page.keyboard.press("Tab");
                row.keyboardFocusSequence.push(await observeFocusedElement());
              }
              if (engine === "chromium" && viewport.name === "mobile-390") {
                const audit = await new AxeBuilder({page})
                  .withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
                row.seriousAxeViolations = audit.violations
                  .filter(v => ["serious","critical"].includes(v.impact))
                  .map(v => ({rule:v.id,impact:v.impact,nodes:v.nodes.length}));
                row.otherAxeViolations = audit.violations
                  .filter(v => !["serious","critical"].includes(v.impact))
                  .map(v => ({rule:v.id,impact:v.impact,nodes:v.nodes.length}));
                if (row.seriousAxeViolations.length)
                  row.errors.push("Serious/critical axe rule violations: " +
                    row.seriousAxeViolations.map(v=>v.rule).join(","));
              }
              if (engine === "chromium") {
                const filename = pathname === "/" ? "home" :
                  pathname.split("/").filter(Boolean).pop();
                await page.screenshot({
                  path:path.join(folder,filename + "-" + viewport.name + ".png"),
                  fullPage:true,animations:"disabled",timeout:20000
                });
              }
            } catch (error) {
              row.errors.push(String(error?.message || error).slice(0,350));
            } finally {
              row.blockedExternalOrUnsafeRequests = blockedRequests - beforeBlocked;
              rows.push(row);
              await page.close();
            }
          }
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  const result = {
    schema:"novapharm.hig-read-only-public-rendered-evidence.v1",
    generatedAt:new Date().toISOString(),
    origin,sourceCommit:process.env.GITHUB_SHA || null,
    methodology:"Read-only published public Chromium/WebKit, five bounded sequential Tab focus observations and axe on mobile Chromium only; CSS focus cue detection is heuristic, not a visual or assistive-technology audit",
    scope:"Six public routes, three screen widths (320, 390, 1440) and two engines; screenshots private to CI",
    cautions:["No authenticated roles, account submissions, billing or patient data",
      "Only first keyboard focus probed; not a complete WCAG audit",
      "No independent manual VoiceOver, TalkBack, NVDA, zoom, RTL or signed native app proof",
      "Source PR SHA is not assumed identical to published origin SHA",
      "Blocked off-domain resources may affect rendering",
      "Passed observations do not automatically promote any HIG topic to verified"],
    total:rows.length,failed:rows.filter(r=>r.errors.length).length,rows
  };
  const observedShas = [...new Set(rows.map(r => r.publishedSourceSha).filter(Boolean))];
  result.uniquePublishedSourceShas = observedShas;
  result.singlePublicReleaseObserved = observedShas.length === 1 &&
    rows.every(r => r.publishedSourceSha === observedShas[0]);
  if (!result.singlePublicReleaseObserved) {
    console.warn("Public route release SHA mismatch or missing: do not treat mixed public builds as one deployed version.");
  }
  writeFileSync(path.join(folder,"results.json"),JSON.stringify(result,null,2)+"\n");
  console.log("Read-only rendered public HIG sampling: " + result.total +
    " observations, " + result.failed + " gaps. This is NOT a production conformance certificate.");
  assert.equal(result.total, routes.length * widths.length * 2);
   assert.equal(result.total, 36, "Read-only production scope must not silently shrink");
  assert.equal(result.failed,0,"Observed public browser/accessibility gaps: see screenshot and JSON artifact");
   assert.equal(result.singlePublicReleaseObserved, true,
     "Every public rendered HIG observation must share the same exact published source SHA");
});

test("four further Apple official HIG critical topics are source-specific, not production assertions", () => {
  const titles = ["Typography","Gestures","Menus and actions","Machine learning"];
  for (const name of titles) {
    const item = tracker.topics.find(t => t.title === name);
    assert.ok(item,name);
    assert.equal(item.guidelineReview,"reviewed",name);
    assert.equal(item.guidelineReviewEvidence.length,3,name);
    assert.ok(item.guidelineReviewEvidence[0].includes(item.markdown),name);
    assert.ok(item.guidelineReviewEvidence[0].includes("2026-11-19"),name);
    for (const platform of ["web","ios","android"]) {
      const d = item.platformApplicability[platform];
      assert.equal(d.state,"applicable",name+"/"+platform);
      assert.ok(d.rationale.length >= 110,name+"/"+platform);
      assert.ok(Array.isArray(item[platform+"Evidence"]));
    }
    assertRegisteredAcceptance(item);
    assertRegisteredAcceptance(item);
  }
  assert.ok(tracker.topics.find(t=>t.title==="Typography")
    .guidelineReviewEvidence[0].includes("Dynamic Type"));
  assert.ok(tracker.topics.find(t=>t.title==="Gestures")
    .guidelineReviewEvidence[0].includes("non-gesture alternative"));
  assert.ok(tracker.topics.find(t=>t.title==="Menus and actions")
    .guidelineReviewEvidence[0].includes("collection group"));
  assert.ok(tracker.topics.find(t=>t.title==="Machine learning")
    .guidelineReviewEvidence[0].includes("limitations"));
  assert.ok(tracker.topics.filter(t=>t.guidelineReview==="reviewed").length>=68);
  assert.ok(tracker.meta.platformsAssessed>=204);
  assert.equal(tracker.topics.filter(t=>t.implementation==="verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
});

test("11 remaining Critical Apple primary articles and collection indices have distinct tri-platform review decisions", () => {
  const names = [
    "Foundations", "Dark Mode", "Charting data", "Feedback", "Components",
    "Layout and organization", "Lists and tables", "Split views",
    "Menus", "Toolbars", "Selection and input"
  ];
  const indexPages = new Set(["Foundations","Components","Layout and organization","Selection and input"]);
  assert.equal(new Set(names).size, 11);
  for (const name of names) {
    const item = tracker.topics.find(t => t.title === name);
    assert.ok(item, name);
    assert.equal(item.priority, "Critical", name);
    assert.equal(item.guidelineReview, "reviewed", name);
    assert.equal(item.guidelineReviewEvidence.length, 3, name);
    assert.ok(item.guidelineReviewEvidence[0].includes(item.markdown), name);
    assert.ok(item.guidelineReviewEvidence[0].includes("2026-11-19"), name);
    assert.equal(item.guidelineReviewEvidence[0].includes("collectionGroup index"),
      indexPages.has(name), "Do not classify a category index as a standalone implemented component: " + name);
    for (const p of ["web", "ios", "android"]) {
      assert.equal(item.platformApplicability[p].state, "applicable", name + "/" + p);
      assert.ok(item.platformApplicability[p].rationale.length > 120, name + "/" + p);
      assert.ok(Array.isArray(item[p + "Evidence"]));
    }
    assertRegisteredAcceptance(item);
    assertRegisteredAcceptance(item);
  }
  assert.equal(tracker.topics.filter(t => t.priority === "Critical" &&
    t.guidelineReview !== "reviewed").length, 0);
  assert.ok(tracker.topics.filter(t => t.guidelineReview === "reviewed").length >= 68);
  assert.ok(tracker.meta.platformsAssessed >= 204);
  assert.equal(tracker.topics.filter(t => t.implementation === "verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
});

test("real 12/12 read-only live rendered observations remain scoped to partial Accessibility and Layout evidence", () => {
  const publicRun = 44540795085;
  const audit = tracker.meta.productionEvidenceAudit;
  assert.equal(new Set(audit.distinctObservedPublicLiveRuns).size,
    audit.distinctObservedPublicLiveRuns.length,
    "The historical live runs must remain deduplicated, but future real runs are allowed");
  assert.ok(audit.distinctObservedPublicLiveRuns.includes(publicRun));
  for (const name of ["Accessibility", "Layout"]) {
    const topic = tracker.topics.find(t => t.title === name);
    const evidence = topic.webEvidence.filter(e => e.jobId === 135618272024);
    assert.equal(evidence.length, 1, name);
    assert.equal(evidence[0].verificationLevel, "partial", name);
    assert.equal(evidence[0].jobConclusion, "success", name);
    assert.ok(evidence[0].runUrl.endsWith(String(publicRun)), name);
    assert.ok(evidence[0].artifactUrl.endsWith("/14539093077"), name);
    assert.equal(evidence[0].observedLiveSourceSha,
      "d00b2eee866d4a2dd2ff7d87ded583be0d7cab98", name);
    assert.equal(evidence[0].readBackArtifact.totalRenderedObservations, 12, name);
    assert.equal(evidence[0].readBackArtifact.narrowGapCount, 0, name);
    assert.equal(evidence[0].checkedRoutes.length, 3, name);
    assert.ok(evidence[0].checkedJourneys.some(x => x.includes("12 read-only")), name);
    assertRegisteredAcceptance(topic);
    assertRegisteredAcceptance(topic);
  }
  assert.ok(audit.recordedPartialTopicPlatformObservations >= 6);
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("downloaded successful live-rendered artifact confirms public provenance but cannot certify full HIG production", () => {
  const proof = tracker.meta.productionEvidenceAudit.renderedPublicArtifactReadback;
  assert.equal(proof.sourceRun, 44540795085);
  assert.equal(proof.jobId, 135618272024);
  assert.equal(proof.artifactId, 14539093077);
  assert.equal(proof.publishedSourceSha, "d00b2eee866d4a2dd2ff7d87ded583be0d7cab98");
  assert.equal(proof.totalObservations, 12);
  assert.equal(proof.failures, 0);
  assert.equal(proof.mobileChromiumAxeAudits, 3);
  assert.equal(proof.reportedSeriousOrCriticalAxeViolations, 0);
  assert.equal(proof.reportedOtherAxeViolations, 0);
  assert.equal(proof.maximumHorizontalOverflowPx, 0);
  assert.equal(proof.firstTabVisibleFocusFailures, 0);
  assert.equal(proof.observedRoutes.length, 3);
  assert.deepEqual(proof.browsers, ["chromium","webkit"]);
  assert.deepEqual(proof.viewportWidths, [390,1440]);
  assert.notEqual(proof.publishedSourceSha,
    "e78b6115946d688de91b539c7fb1e1fd86bf7bd4",
    "CI PR code SHA is not the deployed public HTML SHA");
  assert.equal(tracker.topics.filter(t => t.implementation === "verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("independently inspected 36 public browser observations are only partial web evidence", () => {
  const audit = tracker.meta.productionEvidenceAudit;
  const proof = audit.expandedRenderedPublicArtifactReadback;
  assert.ok(proof, "A genuine read-back of the public rendered artifact is required");
  assert.equal(proof.sourceRun, 44677599844);
  assert.equal(proof.jobId, 136093044118);
  assert.equal(proof.artifactId, 14602609082);
  assert.equal(proof.evidenceFile, "results.json");
  assert.equal(proof.evidenceJsonSha256,
    "32405fe0243196abb86f4fbc9dde97e823c1c7828a2871b66a0960d4d134e5a2");
  assert.equal(proof.totalObservations, 36);
  assert.equal(proof.failedObservations, 0);
  assert.equal(proof.renderedScreenshots, 18);
  assert.equal(proof.reportedAxeRuleViolations, 0);
  assert.equal(proof.automatedAxeAuditedMobileChromiumRoutes, 6);
  assert.equal(proof.observedLiveShaUniformAcrossRoutes, true);
  assert.deepEqual(proof.viewportWidths, [320,390,1440]);
  assert.deepEqual(proof.browsers, ["chromium","webkit"]);
  assert.deepEqual(proof.observedRoutes,
    ["/", "/contact/", "/legal/accessibility/", "/capabilities/", "/oncology/", "/products/"]);
  assert.equal(proof.publishedSourceSha, "d00b2eee866d4a2dd2ff7d87ded583be0d7cab98");
  for (const title of ["Accessibility","Layout"]) {
    const t = tracker.topics.find(x => x.title === title);
    const receipts = t.webEvidence.filter(e => e.jobId === proof.jobId);
    assert.equal(receipts.length, 1, title + ": one bounded receipt per article");
    const e = receipts[0];
    assert.equal(e.verificationLevel, "partial", title);
    assert.equal(e.jobConclusion, "success", title);
    assert.equal(e.observedLiveSourceSha, proof.publishedSourceSha, title);
    assert.equal(e.checkedRoutes.length, 6, title);
    assert.equal(e.readBackArtifact.totalRenderedObservations, 36, title);
    assert.equal(e.readBackArtifact.narrowGapCount, 0, title);
    assert.equal(e.readBackArtifact.resultJsonSha256, proof.evidenceJsonSha256, title);
    assertRegisteredAcceptance(t);
    if (t.implementation === "verified") {
      assert.ok(t.releaseEvidence.length > 0,
        title + ": an independent full receipt, never the partial observation, must authorize the released implementation");
      assert.ok(t.webEvidence.some(r => r.verificationLevel === "full"),
        title + ": only a separate fully verified live web record can support production acceptance");
    }
  }
  assert.ok(audit.distinctObservedPublicLiveRuns.includes(proof.sourceRun));
  const observedPartialCount = tracker.topics.reduce((n,t) =>
    n + ["web","ios","android"].reduce((x,p) =>
      x + (t[p+"Evidence"]||[]).filter(e => e?.verificationLevel === "partial").length,0),0);
  assert.ok(observedPartialCount >= 8,
    "Preserve the eight historic scoped partial receipts but permit future independently evidenced runs");
  assert.equal(audit.recordedPartialTopicPlatformObservations, observedPartialCount);
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified(),
    "The real production gate must derive from all independently accepted topics and owner signoff");
});

test("12 additional current Apple HIG articles establish reasoned non-applicability, not fake native support", () => {
  const names = [
    "Motion", "Collaboration and sharing", "Boxes", "Collections",
    "Outline views", "Edit menus", "Token fields", "Combo boxes",
    "Digit entry views", "Steppers", "Toggles", "Pointing devices"
  ];
  assert.equal(new Set(names).size, 12);
  const macOnly = ["Outline views","Token fields","Combo boxes"];
  for (const name of names) {
    const topic = tracker.topics.find(x=>x.title===name);
    assert.ok(topic,"Missing indexed official HIG topic "+name);
    assert.equal(topic.guidelineReview,"reviewed",name);
    assert.equal(topic.guidelineReviewEvidence.length,3,name);
    assert.ok(topic.guidelineReviewEvidence[0].includes(topic.markdown),name);
    assert.ok(topic.guidelineReviewEvidence[0].includes("2026-11-19"),name);
    assertRegisteredAcceptance(topic);
    assertRegisteredAcceptance(topic);
    for (const platform of ["web","ios","android"]) {
      const decision = topic.platformApplicability[platform];
      assert.ok(["applicable","not_applicable"].includes(decision.state),
        name+"/"+platform);
      assert.ok(decision.rationale.length>=100,name+"/"+platform);
      assert.ok(Array.isArray(topic[platform+"Evidence"]));
    }
  }
  for (const name of macOnly) {
    const topic = tracker.topics.find(t=>t.title===name);
    assert.equal(topic.platformApplicability.ios.state,"not_applicable",name);
    assert.equal(topic.platformApplicability.android.state,"not_applicable",name);
    assert.equal(topic.platformApplicability.web.state,"applicable",
      "Web implementation is analogous only, not an Apple native API: "+name);
  }
  const digit = tracker.topics.find(t=>t.title==="Digit entry views");
  for (const p of ["web","ios","android"]) {
    assert.equal(digit.platformApplicability[p].state,"not_applicable",
      "Apple tvOS-only PIN component is not a NovaPharm web/iPhone/Android feature");
  }
  assert.ok(tracker.topics.find(t=>t.title==="Motion")
    .guidelineReviewEvidence[0].includes("cancellable"));
  assert.ok(tracker.topics.find(t=>t.title==="Collaboration and sharing")
    .guidelineReviewEvidence[0].includes("permission"));
  assert.ok(tracker.topics.find(t=>t.title==="Steppers")
    .guidelineReviewEvidence[0].includes("visible value"));
  assert.ok(tracker.topics.find(t=>t.title==="Toggles")
    .guidelineReviewEvidence[0].includes("more than color"));
  assert.ok(tracker.topics.filter(t=>t.guidelineReview==="reviewed").length>=80);
  const actual = tracker.topics.flatMap(t=>Object.values(t.platformApplicability))
    .filter(v=>v.state!=="unassessed").length;
  assert.ok(actual>=240);
  assert.equal(tracker.meta.platformsAssessed,actual);
  assert.equal(tracker.topics.filter(t=>t.implementation==="verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed,
    tracker.topics.every(t => t.guidelineReview === "reviewed"));
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("10 official HIG productivity/commerce topics have bounded platform-specific source reviews", () => {
  const names = ["Designing for iPadOS","Multitasking","Keyboards","Drag and drop",
    "Widgets","Apple Pay","Apple In-App Purchase","Content","Status","Inputs"];
  assert.equal(new Set(names).size,10);
  const indexes = new Set(["Content","Status","Inputs"]);
  for(const name of names) {
    const t=tracker.topics.find(x=>x.title===name);
    assert.ok(t,name);
    assert.equal(t.guidelineReview,"reviewed",name);
    assert.equal(t.guidelineReviewEvidence.length,3,name);
    assert.ok(t.guidelineReviewEvidence[0].includes(t.markdown),name);
    assert.ok(t.guidelineReviewEvidence[0].includes("2026-11-19"),name);
    assert.equal(t.sourceType==="Category",indexes.has(name),name);
    for(const p of ["web","ios","android"]) {
      assert.ok(["applicable","not_applicable"].includes(t.platformApplicability[p].state),
        name+"/"+p);
      assert.ok(t.platformApplicability[p].rationale.length>100,name+"/"+p);
      assert.ok(Array.isArray(t[p+"Evidence"]));
    }
    assertRegisteredAcceptance(t);
    assertRegisteredAcceptance(t);
  }
  for (const name of ["Apple Pay","Apple In-App Purchase","Widgets","Designing for iPadOS"])
    assert.equal(tracker.topics.find(x=>x.title===name).platformApplicability.android.state,
      "not_applicable", "No Apple-native exclusive API is shipped by Android for "+name);
  assert.equal(tracker.topics.find(x=>x.title==="Apple Pay").platformApplicability.web.state,
    "applicable");
  assert.equal(tracker.topics.find(x=>x.title==="Apple In-App Purchase").platformApplicability.web.state,
    "not_applicable", "Apple StoreKit is not the public Stripe website payment API");
  assert.equal(tracker.topics.find(x=>x.title==="Apple In-App Purchase").platformApplicability.ios.state,
    "applicable", "Native digital content requires separate StoreKit/App Review classification");
  assert.equal(tracker.topics.find(x=>x.title==="Widgets").platformApplicability.ios.state,
    "applicable", "Native WidgetKit is different from web dashboard cards");
  assert.equal(tracker.topics.find(x=>x.title==="Widgets").platformApplicability.web.state,
    "not_applicable");
  assert.ok(tracker.topics.find(x=>x.title==="Multitasking")
    .guidelineReviewEvidence[0].includes("restoring working context"));
  assert.ok(tracker.topics.find(x=>x.title==="Keyboards")
    .guidelineReviewEvidence[0].includes("Full Keyboard Access"));
  assert.ok(tracker.topics.find(x=>x.title==="Drag and drop")
    .guidelineReviewEvidence[0].includes("safe undo"));
  assert.ok(tracker.topics.filter(t=>t.guidelineReview==="reviewed").length>=90);
  assert.ok(tracker.meta.platformsAssessed>=270);
  assert.equal(tracker.topics.filter(t=>t.implementation==="verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("full HIG completion distinguishes approved out-of-scope topics from shipped features", () => {
  // A native Apple tvOS-only control cannot be "production-implemented" in a
  // product comprising web/iOS/Android solely by writing code or a guideline review.
  const tv=tracker.topics.find(t => t.title === "Digit entry views");
  assert.ok(tv);
  assert.equal(tv.guidelineReview,"reviewed");
  assert.deepEqual(["web","ios","android"].map(p=>tv.platformApplicability[p].state),
    ["not_applicable","not_applicable","not_applicable"]);
  assertRegisteredAcceptance(tv);
  assertRegisteredAcceptance(tv);
  tracker.topics.filter(t => t.implementation === "not_applicable")
    .forEach(validateApprovedOutOfScopeTopic);
  tracker.topics.filter(t => t.implementation === "verified")
    .forEach(validateProductionVerifiedTopic);
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("nine original Apple HIG native system/media article reviews preserve platform boundary and source proof",()=>{
  const names=["Printing","Web views","Image views","App Shortcuts","Live Activities",
    "Status bars","Home Screen quick actions","Going full screen","Playing video"];
  assert.equal(new Set(names).size,9);
  for(const name of names){
    const t=tracker.topics.find(x=>x.title===name);
    assert.ok(t,name);
    assert.equal(t.guidelineReview,"reviewed",name);
    assert.equal(t.sourceType,"Guideline",name);
    assert.equal(t.guidelineReviewEvidence.length,3,name);
    assert.ok(t.guidelineReviewEvidence[0].includes(t.markdown),name);
    assert.ok(t.guidelineReviewEvidence[0].includes("2026-11-19"),name);
    for(const p of ["web","ios","android"]){
      const d=t.platformApplicability[p];
      assert.ok(["applicable","not_applicable"].includes(d.state),name+"/"+p);
      assert.ok(d.rationale.length>100,name+"/"+p);
      assert.ok(Array.isArray(t[p+"Evidence"]));
    }
    assertRegisteredAcceptance(t);
    assertRegisteredAcceptance(t);
  }
  for(const name of ["Web views","App Shortcuts","Live Activities",
    "Status bars","Home Screen quick actions"]){
    assert.equal(tracker.topics.find(x=>x.title===name).platformApplicability.web.state,
      "not_applicable", "Native embedded or OS-level Apple experiences are not a web site's shipped APIs: "+name);
    assert.equal(tracker.topics.find(x=>x.title===name).platformApplicability.ios.state,
      "applicable",name);
    assert.equal(tracker.topics.find(x=>x.title===name).platformApplicability.android.state,
      "not_applicable",name);
  }
  assert.equal(tracker.topics.find(x=>x.title==="Image views").platformApplicability.web.state,
    "applicable");
  assert.equal(tracker.topics.find(x=>x.title==="Printing").platformApplicability.web.state,
    "applicable");
  assert.equal(tracker.topics.find(x=>x.title==="Going full screen").platformApplicability.web.state,
    "applicable");
  assert.equal(tracker.topics.find(x=>x.title==="Playing video").platformApplicability.web.state,
    "applicable");
  assert.ok(tracker.topics.find(x=>x.title==="Live Activities")
    .guidelineReviewEvidence[0].includes("privacy-redacted"));
  assert.ok(tracker.topics.find(x=>x.title==="App Shortcuts")
    .guidelineReviewEvidence[0].includes("up to ten"));
  assert.ok(tracker.topics.filter(t=>t.guidelineReview==="reviewed").length >= 99);
  assert.equal(tracker.meta.platformsAssessed,
    tracker.topics.flatMap(t => Object.values(t.platformApplicability))
      .filter(d => d.state !== "unassessed").length);
  assert.equal(tracker.topics.filter(t=>t.implementation==="verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});

test("native iOS and Android prototypes do not count as shipped HIG production receipts", () => {
  const applePkg = read("native/novapharm-intelligence-apple/Package.swift");
  const appleReadme = read("native/novapharm-intelligence-apple/README.md");
  const androidGradle = read("native/novapharm-intelligence-android/app/build.gradle.kts");
  const androidManifest = read("native/novapharm-intelligence-android/app/src/main/AndroidManifest.xml");
  const androidReadme = read("native/novapharm-intelligence-android/README.md");
  const expoConfig = JSON.parse(read("native/novapharm-intelligence-mobile/app.json"));
  const expoPackage = JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));
  const expoReadme = read("native/novapharm-intelligence-mobile/README.md");

  // Real source audit: these are reviewable package/app candidates, not
  // evidence of signed distribution, tested physical devices or customer login.
  assert.ok(applePkg.includes('.library(name: "NovaMLApple"'));
  assert.ok(applePkg.includes(".iOS(.v17)"));
  assert.ok(appleReadme.includes("not** a signed") || appleReadme.includes("not a signed"));
  assert.ok(androidGradle.includes('applicationId = "com.novapharm.intelligence.research"'));
  assert.ok(androidGradle.includes('versionName = "0.1.0-research"'));
  assert.doesNotMatch(androidManifest, /<uses-permission\b[^>]*android:name="android\.permission\.INTERNET"/i);
  assert.match(androidManifest, /android:allowBackup="false"/);
  assert.match(androidManifest, /android:usesCleartextTraffic="false"/);
  assert.match(androidReadme, /not a signed Play Store release/i);
  assert.equal(expoPackage.private, true);
  assert.equal(expoConfig.expo?.ios?.supportsTablet, true);
  assert.equal(expoConfig.expo?.android?.edgeToEdgeEnabled, true);
  // Today this is an unsigned research candidate. If an independently
  // authorized release later adds app identifiers, the existence of an ID is
  // not itself a signed app/device/store receipt and must not break CI.
  for (const [platform, identifier] of [
    ["ios", expoConfig.expo?.ios?.bundleIdentifier],
    ["android", expoConfig.expo?.android?.package]
  ]) {
    if (identifier == null) continue;
    assert.ok(typeof identifier === "string" &&
      /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*){2,}$/.test(identifier),
      platform + ": a candidate application identifier must be a non-placeholder reverse-domain ID");
    assert.doesNotMatch(identifier, /(?:example|placeholder|invalid)/i,
      platform + ": placeholder app identifiers cannot qualify for release");
  }
  assert.ok(expoReadme.includes("Not a signed IPA/APK/AAB"));

  assert.equal(tracker.topics.filter(t => t.implementation === "verified").length, tracker.meta.productionEvidenceAudit.verifiedImplementationCount);
  validateOwnerSignoff();
  assert.equal(tracker.meta.allPlatformsProductionVerified, expectedProgrammeCertified());
});


test("172 distinct dated article-review observations and genuinely separate platform rationales", () => {
  // Source-review quality gate only. This validates the written audit ledger,
  // not the truth of external Apple content or production implementation.
  const articleSummaries = new Set();
  for (const topic of tracker.topics) {
    const notes = topic.guidelineReviewEvidence;
    assert.ok(Array.isArray(notes) && notes.length >= 2,
      "Missing article-specific review notes: " + topic.title);
    const first = notes[0].trim();
    assert.ok(first.length >= 100,
      "Article-specific source finding is too short: " + topic.title);
    assert.ok(!articleSummaries.has(first),
      "Copied article-specific review finding: " + topic.title);
    articleSummaries.add(first);
    const combined = notes.join(" ");
    assert.ok(combined.includes(topic.markdown),
      "Original official Markdown link is missing: " + topic.title);
    assert.match(combined, /\b2026-11-(?:18|19|20)\b/u,
      "Missing actual November source-review date: " + topic.title);
    const rationales = ["web", "ios", "android"].map(platform => {
      const decision = topic.platformApplicability[platform];
      assert.ok(["applicable", "not_applicable"].includes(decision.state),
        "Unassessed platform: " + topic.title + "/" + platform);
      assert.ok(typeof decision.rationale === "string" &&
        decision.rationale.trim().length >= 70,
        "Insufficient platform-specific reason: " + topic.title + "/" + platform);
      return decision.rationale.trim();
    });
    assert.equal(new Set(rationales).size, 3,
      "Copied web/iOS/Android applicability rationale: " + topic.title);
  }
  assert.equal(articleSummaries.size, 172);
  // Source review can be complete while approved N/A and deployment acceptance
  // remain open; don't silently interpret documentation as a release receipt.
  assert.equal(tracker.meta.allGuidelinePagesFullyReviewed, true);
  assert.equal(tracker.meta.platformsAssessed, 516);
  assert.equal(tracker.meta.productionEvidenceAudit.verifiedImplementationCount,
    tracker.topics.filter(topic => topic.implementation === "verified").length);
});
