import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ledger = JSON.parse(readFileSync("docs/design/apple-hig-attachment-evidence-20261118.json", "utf8"));
const register = JSON.parse(readFileSync("docs/design/apple-hig-172-topic-acceptance-register.json", "utf8"));
const report = readFileSync("docs/design/apple-hig-source-and-attachment-audit-20261118.md", "utf8");

test("owner-supplied 32 Apple/HIG files have one-to-one audit entries without a false integration claim", () => {
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.attachments.length, 32);
  const names = ledger.attachments.map((entry) => entry.name);
  assert.equal(new Set(names).size, names.length);
  const mandatory = [
    "IMDF.zip",
    "SF-Symbols-27(1).dmg",
    "SF-Pro(1).dmg",
    "Core_AI_Debugger(1).dmg",
    "Bezel-MacBook-Air-M5.dmg",
    "Icon_Composer_27.3_beta(1).dmg",
    "apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip",
    "ComposingCustomLayoutsWithSwiftUI(1).zip",
    "AnimatingViewsAndTransitions.zip",
    "Download-on-the-App-Store(1).zip",
    "Download-on-the-Mac-App-Store(1).zip",
    "Apple_HIG_Sectionwise_Guide_2026-11-18.md",
    "Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv",
    "Apple_HIG_Complete_Sectionwise_Index_2026-11-18.xlsx",
    "SF-Arabic(1).dmg", "SF-Arabic(2).dmg",
    "SF-Hebrew(1).dmg", "SF-Hebrew(2).dmg",
    "SF-Armenian(1).dmg", "SF-Armenian(2).dmg",
    "SF-Georgian(1).dmg", "SF-Georgian(2).dmg"
  ];
  for (const name of mandatory) assert.ok(names.includes(name), "Missing owner upload: " + name);
  for (const item of ledger.attachments) {
    assert.ok(Number.isInteger(item.sizeBytes) && item.sizeBytes > 0, "Missing actual byte size: " + item.name);
    assert.equal(item.integrationVerified, false, "Do not invent shipped native assets: " + item.name);
    assert.ok(item.group && item.kind && item.findings && item.inspectionLevel && item.usePolicy);
    assert.ok(["file_metadata_only","disk_image_envelope_inspected","guide_text_reviewed","workbook_content_reviewed","archive_or_source_inspected"].includes(item.inspectionLevel));
    if (item.inspectionLevel === "file_metadata_only") assert.equal(item.sha256, null, "Uninspected bytes may not have an invented hash");
    if (item.name.endsWith(".dmg")) {
      assert.ok(["file_metadata_only", "disk_image_envelope_inspected"].includes(item.inspectionLevel),
        "DMG cannot be called license or installer verified");
      if (item.inspectionLevel === "disk_image_envelope_inspected") {
        assert.match(item.findings, /UDIF 'koly'/);
        assert.match(item.findings, /NOT inspected/);
        assert.match(item.sha256, /^[0-9a-f]{64}$/);
      }
    }
    if (item.sha256 != null) assert.match(item.sha256, /^[0-9a-f]{64}$/);
  }
});

test("byte-inspected archive records retain exact hashes and no false Mac or IP clearances", () => {
  const expected = {
    "IMDF.zip": ["d40e5fa749a0d0ae013a77984e90531d8a4f44b429638e86b843847cae20cf64", 10],
    "ComposingCustomLayoutsWithSwiftUI(1).zip": ["0fe4ce8ac081e1d7e9248022e2ffc59f94ccafe5ff8846a0964e419d8aa1fd35", 104],
    "AnimatingViewsAndTransitions.zip": ["4335b52757b8ce3933c769cf14494873a4530914063cb1092c46b4d39a5c061f", 181],
    "apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip": ["df3518b0ee2cdf7e4facf984e88b5df5ec8e5a97b8787d73eb55c589a7019c28", 151],
    "Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv": ["77d4d437a42835b83c30ea4378cf65d70d9e8c814750246c1440b36f79abbbca", 172]
  };
  for (const [name, [hash, count]] of Object.entries(expected)) {
    const item = ledger.attachments.find((entry) => entry.name === name);
    assert.ok(item);
    assert.equal(item.sha256, hash);
    assert.equal(item.archiveEntries, count);
    assert.equal(item.inspectionLevel, "archive_or_source_inspected");
  }
  assert.equal(ledger.attachments.filter((item) => item.inspectionLevel === "archive_or_source_inspected").length, Object.keys(expected).length);
  assert.match(report, /no blanket approval to redistribute/);
  assert.match(report, /NOT 100% conformity/);
  assert.match(report, /do not display unsupported store availability/i);
});

test("HIG index parity remains separate from 172-topic implementation status", () => {
  assert.equal(register.topics.length, 172);
  assert.equal(new Set(register.topics.map((topic) => topic.url)).size, 172);
  assert.equal(ledger.officialIndex.topics, register.topics.length);
  assert.equal(ledger.officialIndex.guidelines + ledger.officialIndex.categories, 172);
  for (const [section, count] of Object.entries(ledger.officialIndex.sections)) {
    assert.equal(count, register.topics.filter((topic) => topic.section === section).length);
  }
  assert.match(register.meta.indexFieldProvenance, /User-supplied 2026-11-18/);
  assert.equal(register.topics.filter((topic) => topic.indexType === "Guideline").length, 158);
  assert.equal(register.topics.filter((topic) => topic.indexType === "Category").length, 14);
  for (const topic of register.topics) {
    assert.ok(topic.indexDescription && topic.indexSuggestedPlatforms && topic.indexType);
    // Source descriptions and suggested platform scope are not implementation evidence.
    assert.notEqual(topic.indexSuggestedPlatforms, "production_verified");
    assert.ok(topic.implementation !== "verified" || topic.releaseEvidence.length > 0);
  }
  assert.equal(ledger.officialIndex.allFullTextReviewed, false);
  assert.equal(ledger.officialIndex.allImplemented, false);
  assert.ok(register.topics.every((topic) => topic.implementation !== "verified" || topic.releaseEvidence.length > 0),
    "Verified guideline status requires independent release evidence");
});

test("IMDF archives are not confused with deployable geodata, live MapKit or credentials", () => {
  const imdf = ledger.attachments.find((entry) => entry.name === "IMDF.zip");
  assert.equal(imdf.usePolicy, "schema_reference_only");
  assert.match(imdf.findings, /no NovaPharm facility map/);
  for (const phrase of ["MapKit JS","tenant-scoped","place","licence","georeferenced","signed"]) {
    assert.match(report, new RegExp(phrase, "i"));
  }
  assert.doesNotMatch(report, /MapKit JS is live in production/);
});

test("workbook's 30 article anchors and five supporting Apple resource URLs are distinctly tracked", () => {
  const extras = ledger.supplementalLinks;
  assert.equal(extras.articleSectionAnchors.length, 30);
  assert.equal(extras.appleSupportingResources.length, 5);
  assert.equal(ledger.officialIndex.articleSectionAnchors, 30);
  assert.equal(ledger.officialIndex.appleSupportingResourceLinks, 5);
  assert.equal(ledger.officialIndex.totalIndexedLinkRecords, 207);
  assert.equal(ledger.officialIndex.allSupplementalArticleTextReviewed, false);
  const primaryUrls = new Set(register.topics.map((x) => x.url));
  for (const item of extras.articleSectionAnchors) {
    assert.ok(primaryUrls.has(item.parentUrl), "Anchor must relate to one supplied main HIG page");
    assert.equal(item.url, item.parentUrl + "#" + item.anchor);
    assert.match(item.url, /^https:\/\/developer\.apple\.com\/design\/human-interface-guidelines\/[a-z0-9-]+#[A-Za-z0-9-]+$/);
    assert.equal(item.articleTextReviewed, false);
    assert.equal(item.anchorVerifiedInOfficialArticle, false);
    assert.equal(item.implementation, "not_verified");
  }
  for (const item of extras.appleSupportingResources) {
    assert.ok(item.url.startsWith("https://developer.apple.com/"));
    assert.equal(item.fullTermsReviewed, false);
    assert.equal(item.approvedForEmbedding, false);
    assert.equal(item.implementation, "not_verified");
  }
  const all = [...extras.articleSectionAnchors, ...extras.appleSupportingResources].map((x) => x.url);
  assert.equal(new Set(all).size, 35);
  const workbook = ledger.attachments.find((x) => x.name === "Apple_HIG_Complete_Sectionwise_Index_2026-11-18.xlsx");
  assert.equal(workbook.inspectionLevel, "workbook_content_reviewed");
  assert.equal(workbook.sha256, null);
  assert.match(report, /207 indexed link records/);
  assert.match(report, /30 article-section anchors/);
});

test("17 small Apple DMG containers have bounded SHA evidence, not licensing or Mac install claims", () => {
  const actual = ledger.attachments.filter((item) => item.inspectionLevel === "disk_image_envelope_inspected");
  assert.equal(actual.length, 17);
  assert.equal(ledger.dmgEnvelopeInspection.files, 17);
  assert.equal(ledger.dmgEnvelopeInspection.uniqueSha256, 9);
  assert.equal(ledger.dmgEnvelopeInspection.byteIdenticalDuplicatePairs, 8);
  assert.equal(new Set(actual.map((item) => item.sha256)).size, 9);
  assert.equal(actual.filter((item) => item.name.endsWith(".dmg")).length, 17);
  for (const pair of [
    ["Icons-Siri-AI(1).dmg","Icons-Siri-AI(2).dmg"],
    ["NY(1).dmg","NY(2).dmg"],
    ["SF-Arabic(1).dmg","SF-Arabic(2).dmg"],
    ["SF-Hebrew(1).dmg","SF-Hebrew(2).dmg"],
    ["SF-Armenian(1).dmg","SF-Armenian(2).dmg"],
    ["SF-Georgian(1).dmg","SF-Georgian(2).dmg"],
    ["iOS-27-Icon-Templates-Photoshop-Illustrator(1).dmg","iOS-27-Icon-Templates-Photoshop-Illustrator(2).dmg"]
  ]) {
    const a = ledger.attachments.find((x) => x.name === pair[0]);
    const b = ledger.attachments.find((x) => x.name === pair[1]);
    assert.ok(a && b && a.sha256 === b.sha256, "Duplicate upload must match exactly: " + pair[0]);
  }
  assert.match(report, /17 smaller UDIF disk images/);
  assert.match(report, /macOS installer\/licence verification is still not complete/i);
});
