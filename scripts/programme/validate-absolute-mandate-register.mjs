import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const register = JSON.parse(await readFile(resolve("docs/programme/absolute-mandate-register.json"), "utf8"));
const allowedStates = new Set(Object.keys(register.state_definitions));

assert.equal(register.metadata.source_sections, "0-121");
assert.equal(register.metadata.governed_section_count, 122, "Sections 0-121 must all remain governed");
assert.equal(register.metadata.production_complete, false, "The mandate register must not claim production completion before R6 evidence");
assert.equal(register.metadata.current_release_state, "R1 PUBLIC RELEASE VERIFIED");
assert.match(register.metadata.production_state_claim, /NOT READY beyond R1/iu);
assert.match(register.metadata.baseline_sha, /^[a-f0-9]{40}$/u);
assert.equal(register.sections.length, 122, "The absolute mandate register must contain sections 0 through 121 exactly once");

const seen = new Set();
for (const [index, section] of register.sections.entries()) {
  assert.equal(section.section, index, `Mandate section ${index} is missing or out of order`);
  assert.ok(!seen.has(section.section), `Duplicate mandate section ${section.section}`);
  seen.add(section.section);
  assert.ok(section.title?.trim(), `Mandate section ${section.section} requires a title`);
  assert.ok(allowedStates.has(section.state), `Mandate section ${section.section} has an ungoverned state: ${section.state}`);
  assert.doesNotMatch(section.state, /COMPLETE|PRODUCTION_ACCEPTED|R6/iu, `Mandate section ${section.section} must not imply unsupported production completion`);
}

for (const section of [24, 25, 26, 27]) {
  assert.equal(register.sections[section].state, "REPOSITORY_VERIFIED_STAGING_REQUIRED", `Section ${section} must retain the repository/staging truth boundary`);
}
for (const section of [85, 86, 87]) {
  assert.equal(register.sections[section].state, "DEPENDENCY_BLOCKED_MANAGED_STAGING", `Section ${section} cannot advance before managed staging is accepted`);
}
for (let section = 89; section <= 105; section += 1) {
  assert.equal(register.sections[section].state, "NOT_YET_ELIGIBLE_PRODUCTION_CUTOVER", `Section ${section} cannot become cutover-eligible before the staging gates`);
}
for (let section = 114; section <= 120; section += 1) {
  assert.equal(register.sections[section].state, "NOT_YET_ELIGIBLE_FINAL_ACCEPTANCE", `Section ${section} cannot advance before production evidence exists`);
}
assert.equal(register.sections[70].state, "IN_PROGRESS_SOP_REHEARSAL_REQUIRED");
assert.equal(register.sections[88].state, "OWNER_GATED_REAL_APPLE_HARDWARE");
assert.equal(register.sections[111].state, "OWNER_GATED_FINANCIAL_CONTRACTUAL");
assert.equal(register.sections[112].state, "OWNER_GATED_LEGAL_REGULATORY");
assert.equal(register.sections[121].state, "ACTIVE_DIRECTIVE");

console.log(JSON.stringify({
  governedSections: register.sections.length,
  currentReleaseState: register.metadata.current_release_state,
  productionComplete: register.metadata.production_complete,
  states: Object.fromEntries([...allowedStates].map((state) => [state, register.sections.filter((section) => section.state === state).length])),
}, null, 2));
