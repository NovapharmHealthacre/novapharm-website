import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const register = JSON.parse(await readFile(resolve("docs/programme/absolute-mandate-register.json"), "utf8"));
const amendments = JSON.parse(await readFile(resolve("docs/programme/binding-mandate-amendments.json"), "utf8"));
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

const expectedAmendmentIds = ["0A", "0B", "3A", "3B", "3C", "3D", "3E", "3F", "3G", "3H", "3I", "3J", "3K"];
assert.equal(amendments.metadata.current_release_state, register.metadata.current_release_state);
assert.equal(amendments.metadata.production_complete, false);
assert.match(amendments.metadata.reconciliation_basis, /exact repository checkout.*requirements:validate/iu, "Binding amendment currency must be proven by the checkout under CI rather than a self-staling SHA field");
assert.equal(Object.hasOwn(amendments.metadata, "reconciled_against_main_sha"), false, "Binding amendment metadata must not make a static SHA claim of perpetual currency");
assert.deepEqual(amendments.amendments.map((entry) => entry.id), expectedAmendmentIds, "All binding 0A/0B and 3A-3K amendments must remain explicitly governed in source order");

for (const amendment of amendments.amendments) {
  assert.ok(amendment.title?.trim(), `${amendment.id}: binding amendment title missing`);
  assert.ok(allowedStates.has(amendment.state), `${amendment.id}: ungoverned state ${amendment.state}`);
  assert.doesNotMatch(amendment.state, /COMPLETE|PRODUCTION_ACCEPTED|R6/iu, `${amendment.id}: amendment must not imply unsupported production completion`);
  assert.ok(Array.isArray(amendment.evidence) && amendment.evidence.length > 0, `${amendment.id}: evidence missing`);
  assert.ok(amendment.remaining_gate?.trim(), `${amendment.id}: remaining gate missing`);
  for (const evidencePath of amendment.evidence) await access(resolve(evidencePath));
}

const byAmendmentId = new Map(amendments.amendments.map((entry) => [entry.id, entry]));
assert.equal(byAmendmentId.get("0A")?.state, "REPOSITORY_VERIFIED_STAGING_LIVE_EVIDENCE_REQUIRED", "0A must retain staging/live and real-device truth boundaries");
assert.match(byAmendmentId.get("0A")?.remaining_gate ?? "", /Apple hardware|official Apple|private Apple/iu, "0A must preserve current-primary-source and real-device limits");
assert.equal(byAmendmentId.get("0B")?.state, "VERIFIED_GOVERNANCE_GUARD");
for (const id of ["3A", "3B", "3C", "3D", "3E", "3H", "3I"]) {
  assert.equal(byAmendmentId.get(id)?.state, "VERIFIED_REPOSITORY_GOVERNANCE", `${id} must remain a proved repository release-control repair`);
}
for (const id of ["3F", "3G", "3J"]) {
  assert.equal(byAmendmentId.get(id)?.state, "VERIFIED_GOVERNANCE_GUARD", `${id} must remain an active release-control guard`);
}
assert.equal(byAmendmentId.get("3K")?.state, "ACTIVE_DIRECTIVE");
assert.match(byAmendmentId.get("3K")?.remaining_gate ?? "", /staging.*identity.*modules.*recovery.*cutover/iu, "3K must retain the mandated programme sequence");

console.log(JSON.stringify({
  governedSections: register.sections.length,
  bindingAmendments: amendments.amendments.length,
  reconciliation: "current CI checkout",
  currentReleaseState: register.metadata.current_release_state,
  productionComplete: register.metadata.production_complete,
  states: Object.fromEntries([...allowedStates].map((state) => [state, register.sections.filter((section) => section.state === state).length])),
}, null, 2));
