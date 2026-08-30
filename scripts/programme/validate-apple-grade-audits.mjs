import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const audit = JSON.parse(await readFile(resolve("docs/design/apple-grade-audits.json"), "utf8"));

async function validateEvidence(value) {
  const evidence = value.split(" (")[0];
  if (evidence.endsWith("/*.test.ts")) {
    const directory = resolve(evidence.slice(0, -"/*.test.ts".length));
    const files = await readdir(directory);
    assert.equal(files.some((file) => file.endsWith(".test.ts")), true, `${value} matches no test files.`);
    return;
  }
  await access(resolve(evidence));
}
assert.equal(audit.sectionAudits.length, 48, "The Apple-grade programme audit must contain exactly 48 sections.");
assert.deepEqual(audit.sectionAudits.map((item) => item.sectionNumber), Array.from({ length: 48 }, (_, index) => index + 1));
assert.equal(audit.moduleAudits.length, 54, "The Portal design audit must contain exactly 54 modules.");
assert.equal(new Set(audit.moduleAudits.map((item) => item.id)).size, 54, "Portal module audit identifiers must be unique.");

const requiredFields = ["purpose", "primaryUser", "primaryUserGoal", "currentImplementation", "currentVisualQuality", "currentFunctionalQuality", "scores", "accessibility", "responsiveState", "webkitState", "performanceState", "securityState", "dataAuthority", "designDefects", "functionalDefects", "redundantElements", "missingElements", "ownerStandardGap", "changesMade", "screenshotEvidence", "testEvidence", "finalStatus"];
for (const item of audit.sectionAudits) {
  for (const field of requiredFields) assert.notEqual(item[field], undefined, `Section ${item.sectionNumber} omits ${field}.`);
  assert.deepEqual(Object.keys(item.scores), ["purpose", "agency", "responsibility", "familiarity", "flexibility", "simplicity", "craft", "delight"]);
  for (const score of Object.values(item.scores)) assert.equal(Number.isInteger(score) && score >= 1 && score <= 5, true, `Section ${item.sectionNumber} has an invalid score.`);
  for (const evidence of item.testEvidence) await validateEvidence(evidence);
}

const catalog = JSON.parse(await readFile(resolve("packages/portal-contracts/src/module-catalog.json"), "utf8"));
assert.deepEqual(audit.moduleAudits.map((item) => item.id), catalog.map((item) => item.code));
for (const module of audit.moduleAudits) {
  assert.equal(module.stateCoverage.length >= 3, true, `${module.id} lacks a state review.`);
  for (const evidence of module.evidence) await validateEvidence(evidence);
}

console.log("Validated 48 complete Apple-discipline audit records and 54 individually reviewed Portal module records.");
