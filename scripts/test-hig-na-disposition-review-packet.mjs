import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// This is a source-consistency guard, NOT independent N/A approval or a
// production HIG conformance check.
const register = JSON.parse(readFileSync(
  "docs/design/apple-hig-172-topic-acceptance-register.json", "utf8"
));
const packet = readFileSync(
  "docs/design/apple-hig-na-disposition-review-packet-20261120.md", "utf8"
);
const platforms = ["web", "ios", "android"];
const escapePipe = value => String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();

function validateScopeSnapshot(topics) {
  assert.equal(topics.length, 172);
  const proposed = topics.filter(topic => platforms.every(platform =>
    topic.platformApplicability[platform]?.state === "not_applicable"
  ));
  assert.equal(proposed.length, 28,
    "A change in proposed N/A scope must update and re-review the packet");
  const rows = packet.split("\n").filter(line =>
    /^\|\s*\d+\s*\|\s*\[/.test(line)
  );
  assert.equal(rows.length, proposed.length,
    "Candidate checklist must have exactly the current N/A entries");
  const expected = proposed.map(topic =>
    `| ${topic.sourceRowIndex + 1} | [${escapePipe(topic.title)}](${topic.url}) | ${escapePipe(topic.section)} | ${escapePipe(topic.priority)} | Pending |`
  );
  assert.deepEqual(rows, expected,
    "Candidate rows, source links and order must match the register's scope");

  for (const [index, topic] of proposed.entries()) {
    const marker = `### ${index + 1}. ${topic.title} — row ${topic.sourceRowIndex + 1}`;
    const from = packet.indexOf(marker);
    assert.ok(from !== -1, "Missing source-specific rationale: " + topic.title);
    const end = packet.indexOf("\n### ", from + marker.length);
    const section = packet.slice(from, end < 0 ? undefined : end);
    assert.ok(section.includes("Official HIG: " + topic.url),
      topic.title + ": missing exact primary source link");
    for (const [platform, label] of [["web", "Web"], ["ios", "Native iOS"], ["android", "Android"]]) {
      const expected = "- **" + label + ":** " + topic.platformApplicability[platform].rationale;
      assert.ok(section.split("\n").includes(expected),
        topic.title + ": missing/changed " + platform + " disposition rationale");
    }
    assert.ok(section.includes("- **Review result:** Pending independent approval"),
      topic.title + ": historical packet must not claim to be the approval receipt");
  }
}

test("the dated packet preserves every all-platform N/A candidate and its exact rationales", () => {
  validateScopeSnapshot(register.topics);
  assert.ok(packet.includes("0 accepted N/A"));
  assert.ok(packet.includes("not an approval"));
  assert.ok(packet.includes("other than the PR author"));
});

test("a subsequent disposition does not rewrite the packet, but a scope change requires re-review", () => {
  // Current approvals are checked by the register and independent review suites.
  const topics = structuredClone(register.topics);
  const candidate = topics.find(topic => topic.title === "Digit entry views");
  candidate.implementation = "not_applicable";
  assert.doesNotThrow(() => validateScopeSnapshot(topics));
  candidate.platformApplicability.web.rationale += " Changed after snapshot.";
  assert.throws(() => validateScopeSnapshot(topics), /missing\/changed web disposition rationale/);
  candidate.platformApplicability.web.state = "applicable";
  assert.throws(() => validateScopeSnapshot(topics), /change in proposed N\/A scope/);
});
