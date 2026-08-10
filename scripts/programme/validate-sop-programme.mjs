import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("docs/programme/sops");
const register = JSON.parse(await readFile(resolve(root, "sop-register.json"), "utf8"));
const requiredHeadings = [
  "Owner", "Purpose", "Trigger", "Prerequisites", "Permissions", "Steps",
  "Evidence", "Stop Conditions", "Escalation", "Rollback", "Recovery", "Review Cadence",
];
const allowedStatuses = new Set(register.allowedStatuses);

assert.equal(register.metadata.requiredProcedureCount, 44);
assert.equal(register.metadata.currentReleaseState, "R1 PUBLIC RELEASE VERIFIED");
assert.equal(register.metadata.repositoryProcedureComplete, true);
assert.equal(register.metadata.rehearsalComplete, false, "Git procedure presence must not be mistaken for rehearsal evidence");
assert.equal(register.metadata.productionAccepted, false, "Section 70 cannot claim production acceptance at R1");
assert.equal(register.procedures.length, 44);

const ids = new Set();
const numbers = new Set();
const files = await readdir(root);
const sopFiles = files.filter((name) => /^SOP-\d{2}-.*\.md$/u.test(name)).sort();
assert.equal(sopFiles.length, 44, "Exactly 44 canonical SOP Markdown files are required");

for (const procedure of register.procedures) {
  assert.match(procedure.id, /^SOP-\d{2}$/u);
  assert.ok(!ids.has(procedure.id), `Duplicate SOP id ${procedure.id}`);
  ids.add(procedure.id);
  assert.ok(!numbers.has(procedure.number), `Duplicate SOP number ${procedure.number}`);
  numbers.add(procedure.number);
  assert.ok(procedure.title?.trim(), `${procedure.id}: title required`);
  assert.ok(procedure.owner?.trim(), `${procedure.id}: owner required`);
  assert.ok(allowedStatuses.has(procedure.status), `${procedure.id}: invalid status ${procedure.status}`);
  assert.equal(Array.isArray(procedure.rehearsalEvidence), true);
  assert.equal(Array.isArray(procedure.productionAcceptanceEvidence), true);

  if (!["REHEARSED_MANAGED_STAGING", "PRODUCTION_ACCEPTED"].includes(procedure.status)) {
    assert.equal(procedure.rehearsalEvidence.length, 0, `${procedure.id}: unrehearsed state must not contain rehearsal claims`);
  }
  if (procedure.status !== "PRODUCTION_ACCEPTED") {
    assert.equal(procedure.productionAcceptanceEvidence.length, 0, `${procedure.id}: non-production state must not contain production acceptance`);
  }

  const expectedPrefix = `${procedure.id}-`;
  const matching = sopFiles.filter((file) => file.startsWith(expectedPrefix));
  assert.equal(matching.length, 1, `${procedure.id}: exactly one canonical procedure file is required`);
  assert.equal(procedure.file, `docs/programme/sops/${matching[0]}`);

  const markdown = await readFile(resolve(root, matching[0]), "utf8");
  assert.match(markdown, new RegExp(`^# ${procedure.id} — `, "mu"));
  assert.ok(markdown.includes(`Execution status: **${procedure.status}**`), `${procedure.id}: status line mismatch`);
  for (const heading of requiredHeadings) {
    assert.ok(markdown.includes(`## ${heading}`), `${procedure.id}: missing ## ${heading}`);
  }
  const ownerSection = markdown.split("## Owner")[1]?.split("## Purpose")[0] ?? "";
  assert.ok(ownerSection.includes(procedure.owner), `${procedure.id}: owner mismatch`);
  assert.doesNotMatch(markdown, /\b(?:TODO|TBD|FIXME|placeholder)\b/iu, `${procedure.id}: unresolved placeholder language is prohibited`);
  assert.match(markdown, /STOP condition/iu, `${procedure.id}: executable stop behavior required`);
  assert.match(markdown, /Repository procedure existence is \*\*not\*\*/iu, `${procedure.id}: truth boundary missing`);
}

assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 44 }, (_, i) => i + 1));
assert.equal(register.procedures[26].status, "DEPENDENCY_BLOCKED_QUALIFIED_OWNER");
for (const number of [32, 33, 34, 35]) assert.equal(register.procedures[number - 1].status, "DEPENDENCY_BLOCKED_LIVE_INTEGRATION");
for (const number of [43, 44]) assert.equal(register.procedures[number - 1].status, "NOT_APPLICABLE_UNTIL_LANGUAGE_ACTIVATED");

console.log(JSON.stringify({
  procedures: register.procedures.length,
  repositoryProcedureComplete: register.metadata.repositoryProcedureComplete,
  rehearsalComplete: register.metadata.rehearsalComplete,
  productionAccepted: register.metadata.productionAccepted,
  statuses: Object.fromEntries([...allowedStatuses].map((status) => [status, register.procedures.filter((procedure) => procedure.status === status).length])),
}, null, 2));
