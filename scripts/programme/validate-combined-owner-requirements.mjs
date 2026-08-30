import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ledger = JSON.parse(await readFile(resolve("docs/programme/combined-owner-requirements.json"), "utf8"));
const allowed = new Set(["Already complete and verified", "Partially implemented", "Not implemented", "Externally blocked", "Owner action required"]);
assert.equal(ledger.sections.length, 49, "The definitive owner ledger must contain Sections 1-49 exactly once.");
assert.deepEqual(ledger.sections.map((item) => item.id), Array.from({ length: 49 }, (_, index) => String(index + 1)));
assert.equal(ledger.storeReleaseAmendment.length, 20, "The additive store ledger must contain controls 49.1-49.20.");
assert.deepEqual(ledger.storeReleaseAmendment.map((item) => item.id), Array.from({ length: 20 }, (_, index) => `49.${index + 1}`));

for (const item of [...ledger.sections, ...ledger.storeReleaseAmendment]) {
  assert.equal(allowed.has(item.status), true, `${item.id} has an ambiguous status.`);
  assert.equal(typeof item.implementation === "string" && item.implementation.length > 20, true, `${item.id} lacks current implementation truth.`);
  assert.equal(Array.isArray(item.evidence) && item.evidence.length > 0, true, `${item.id} lacks evidence references.`);
  assert.equal(typeof item.nextAction === "string" && item.nextAction.length > 15, true, `${item.id} lacks an exact next action.`);
  if (item.status === "Already complete and verified") assert.equal(item.blocker, null, `${item.id} cannot be verified complete while carrying a blocker.`);
  if (["Partially implemented", "Not implemented", "Externally blocked", "Owner action required"].includes(item.status)) {
    assert.equal(typeof item.blocker === "string" && item.blocker.length > 15, true, `${item.id} must state its exact blocker.`);
  }
  for (const evidence of item.evidence) await access(resolve(evidence));
}

const markdown = await readFile(resolve("docs/programme/combined-owner-requirements.md"), "utf8");
for (const item of ledger.sections) assert.match(markdown, new RegExp(`^\\| ${item.id} \\|`, "m"));
for (const item of ledger.storeReleaseAmendment) assert.match(markdown, new RegExp(`^\\| ${item.id.replace(".", "\\.")} \\|`, "m"));
assert.doesNotMatch(markdown, /pending without owner|baseline status|TBD|TODO/iu);

console.log("Validated 49 master owner sections, 20 additive store-release controls, explicit statuses, blockers, next actions and evidence paths.");
