import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("docs/programme/sops");
const register = JSON.parse(await readFile(resolve(root, "sop-register.json"), "utf8"));
const evidenceContract = JSON.parse(await readFile(resolve(root, "evidence-contract.json"), "utf8"));
const requiredHeadings = [
  "Owner", "Purpose", "Trigger", "Prerequisites", "Permissions", "Steps",
  "Evidence", "Stop Conditions", "Escalation", "Rollback", "Recovery", "Review Cadence",
];
const allowedStatuses = new Set(register.allowedStatuses);
const placeholderPattern = /\b(?:TODO|TBD|FIXME|placeholder|example-only)\b/iu;

assert.equal(register.metadata.requiredProcedureCount, 44);
assert.equal(register.metadata.currentReleaseState, "R1 PUBLIC RELEASE VERIFIED");
assert.equal(register.metadata.repositoryProcedureComplete, true);
assert.equal(register.metadata.rehearsalComplete, false, "Git procedure presence must not be mistaken for rehearsal evidence");
assert.equal(register.metadata.productionAccepted, false, "Section 70 cannot claim production acceptance at R1");
assert.equal(register.procedures.length, 44);
assert.equal(evidenceContract.metadata.currentReleaseState, register.metadata.currentReleaseState);
assert.equal(evidenceContract.metadata.autoPromotionAllowed, false, "SOP evidence must never auto-promote a release state");
assert.equal(evidenceContract.metadata.productionEvidenceMayBeFabricated, false);

const shaPattern = new RegExp(evidenceContract.rehearsalEvidence.sourceShaPattern, "u");
const productionShaPattern = new RegExp(evidenceContract.productionAcceptanceEvidence.sourceShaPattern, "u");
const rehearsalOutcomes = new Set(evidenceContract.rehearsalEvidence.allowedOutcomes);
const rehearsalDispositions = new Set(evidenceContract.rehearsalEvidence.allowedDispositions);
const productionOutcomes = new Set(evidenceContract.productionAcceptanceEvidence.allowedOutcomes);
const productionDispositions = new Set(evidenceContract.productionAcceptanceEvidence.allowedDispositions);
const productionReleaseStates = new Set(evidenceContract.productionAcceptanceEvidence.allowedReleaseStates);

function assertNormalizedUtc(value, label) {
  assert.equal(typeof value, "string", `${label}: timestamp must be a string`);
  const parsed = new Date(value);
  assert.equal(Number.isNaN(parsed.getTime()), false, `${label}: timestamp is invalid`);
  assert.equal(parsed.toISOString(), value, `${label}: timestamp must be normalized UTC ISO-8601`);
}

async function assertEvidenceReferences(references, label, minimum) {
  assert.equal(Array.isArray(references), true, `${label}: evidenceReferences must be an array`);
  assert.ok(references.length >= minimum, `${label}: evidenceReferences is below the governed minimum`);
  for (const reference of references) {
    assert.equal(typeof reference, "string", `${label}: evidence reference must be a string`);
    assert.ok(reference.trim(), `${label}: empty evidence reference is prohibited`);
    assert.doesNotMatch(reference, placeholderPattern, `${label}: placeholder evidence reference is prohibited`);
    if (/^https:\/\//u.test(reference)) continue;
    assert.doesNotMatch(reference, /^[a-z]+:\/\//iu, `${label}: only HTTPS URLs or repository-relative paths are allowed`);
    assert.equal(reference.startsWith("/") || reference.includes(".."), false, `${label}: local evidence must be a repository-relative path`);
    await access(resolve(reference));
  }
}

async function validateRehearsalEvidence(procedure, evidence, index) {
  const label = `${procedure.id}: rehearsalEvidence[${index}]`;
  assert.equal(evidence && typeof evidence === "object" && !Array.isArray(evidence), true, `${label}: structured evidence object required`);
  for (const field of evidenceContract.rehearsalEvidence.requiredFields) {
    assert.ok(Object.hasOwn(evidence, field), `${label}: required field ${field} missing`);
  }
  assert.equal(typeof evidence.evidenceId, "string");
  assert.ok(evidence.evidenceId.startsWith(`${procedure.id}-`), `${label}: evidenceId must be bound to ${procedure.id}`);
  assert.doesNotMatch(evidence.evidenceId, placeholderPattern);
  assert.equal(evidence.environment, evidenceContract.rehearsalEvidence.environment, `${label}: wrong environment`);
  assert.equal(typeof evidence.target, "string");
  assert.ok(evidence.target.trim(), `${label}: target required`);
  assert.doesNotMatch(evidence.target, placeholderPattern);
  assert.match(evidence.sourceSha, shaPattern, `${label}: exact 40-character source SHA required`);
  assertNormalizedUtc(evidence.performedAt, label);
  assert.equal(typeof evidence.performedBy, "string");
  assert.ok(evidence.performedBy.trim(), `${label}: named operator required`);
  assert.doesNotMatch(evidence.performedBy, placeholderPattern);
  assert.ok(rehearsalOutcomes.has(evidence.outcome), `${label}: invalid outcome ${evidence.outcome}`);
  assert.ok(rehearsalDispositions.has(evidence.rollbackDisposition), `${label}: invalid rollback disposition`);
  assert.ok(rehearsalDispositions.has(evidence.recoveryDisposition), `${label}: invalid recovery disposition`);
  assert.equal(typeof evidence.notes, "string");
  assert.ok(evidence.notes.trim(), `${label}: notes required`);
  assert.doesNotMatch(evidence.notes, placeholderPattern);
  await assertEvidenceReferences(
    evidence.evidenceReferences,
    label,
    evidenceContract.rehearsalEvidence.minimumEvidenceReferences,
  );
}

async function validateProductionEvidence(procedure, evidence, index) {
  const label = `${procedure.id}: productionAcceptanceEvidence[${index}]`;
  assert.equal(evidence && typeof evidence === "object" && !Array.isArray(evidence), true, `${label}: structured evidence object required`);
  for (const field of evidenceContract.productionAcceptanceEvidence.requiredFields) {
    assert.ok(Object.hasOwn(evidence, field), `${label}: required field ${field} missing`);
  }
  assert.equal(typeof evidence.evidenceId, "string");
  assert.ok(evidence.evidenceId.startsWith(`${procedure.id}-`), `${label}: evidenceId must be bound to ${procedure.id}`);
  assert.doesNotMatch(evidence.evidenceId, placeholderPattern);
  assert.equal(evidence.environment, evidenceContract.productionAcceptanceEvidence.environment, `${label}: wrong environment`);
  assert.equal(typeof evidence.target, "string");
  assert.ok(evidence.target.trim(), `${label}: target required`);
  assert.doesNotMatch(evidence.target, placeholderPattern);
  assert.match(evidence.sourceSha, productionShaPattern, `${label}: exact 40-character source SHA required`);
  assertNormalizedUtc(evidence.acceptedAt, label);
  assert.equal(typeof evidence.acceptedBy, "string");
  assert.ok(evidence.acceptedBy.trim(), `${label}: named acceptor required`);
  assert.doesNotMatch(evidence.acceptedBy, placeholderPattern);
  assert.ok(productionOutcomes.has(evidence.outcome), `${label}: invalid outcome ${evidence.outcome}`);
  assert.ok(productionDispositions.has(evidence.rollbackDisposition), `${label}: invalid rollback disposition`);
  assert.ok(productionDispositions.has(evidence.recoveryDisposition), `${label}: invalid recovery disposition`);
  assert.ok(productionReleaseStates.has(evidence.releaseState), `${label}: invalid release state ${evidence.releaseState}`);
  assert.equal(typeof evidence.notes, "string");
  assert.ok(evidence.notes.trim(), `${label}: notes required`);
  assert.doesNotMatch(evidence.notes, placeholderPattern);
  await assertEvidenceReferences(
    evidence.evidenceReferences,
    label,
    evidenceContract.productionAcceptanceEvidence.minimumEvidenceReferences,
  );
}

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

  for (const [index, evidence] of procedure.rehearsalEvidence.entries()) {
    await validateRehearsalEvidence(procedure, evidence, index);
  }
  for (const [index, evidence] of procedure.productionAcceptanceEvidence.entries()) {
    await validateProductionEvidence(procedure, evidence, index);
  }

  if (procedure.status === "REHEARSED_MANAGED_STAGING" || procedure.status === "PRODUCTION_ACCEPTED") {
    const qualifyingRehearsal = procedure.rehearsalEvidence.some((evidence) =>
      evidence.environment === evidenceContract.rehearsalEvidence.environment
      && evidence.outcome === evidenceContract.rehearsalEvidence.promotionOutcome
      && evidence.rollbackDisposition !== "FAILED"
      && evidence.recoveryDisposition !== "FAILED");
    assert.equal(qualifyingRehearsal, true, `${procedure.id}: rehearsed status requires a qualifying managed-staging PASS record`);
  }

  if (procedure.status === "PRODUCTION_ACCEPTED") {
    const qualifyingProductionAcceptance = procedure.productionAcceptanceEvidence.some((evidence) =>
      evidence.environment === evidenceContract.productionAcceptanceEvidence.environment
      && evidence.outcome === evidenceContract.productionAcceptanceEvidence.promotionOutcome
      && evidence.releaseState === evidenceContract.productionAcceptanceEvidence.requiredPromotionReleaseState
      && evidence.rollbackDisposition !== "FAILED"
      && evidence.recoveryDisposition !== "FAILED");
    assert.equal(qualifyingProductionAcceptance, true, `${procedure.id}: production acceptance requires a qualifying R6 PASS record`);
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
  assert.match(markdown, /Repository procedure existence (?:is|does) \*\*not\*\*/iu, `${procedure.id}: truth boundary missing`);
}

assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 44 }, (_, i) => i + 1));
assert.equal(register.procedures[26].status, "DEPENDENCY_BLOCKED_QUALIFIED_OWNER");
for (const number of [32, 33, 34, 35]) assert.equal(register.procedures[number - 1].status, "DEPENDENCY_BLOCKED_LIVE_INTEGRATION");
for (const number of [43, 44]) assert.equal(register.procedures[number - 1].status, "NOT_APPLICABLE_UNTIL_LANGUAGE_ACTIVATED");
assert.equal(register.procedures.some((procedure) => procedure.status === "PRODUCTION_ACCEPTED"), false, "R1 cannot contain a production-accepted SOP");

console.log(JSON.stringify({
  procedures: register.procedures.length,
  repositoryProcedureComplete: register.metadata.repositoryProcedureComplete,
  rehearsalComplete: register.metadata.rehearsalComplete,
  productionAccepted: register.metadata.productionAccepted,
  evidenceContract: "structured exact-SHA environment-bound evidence enforced",
  statuses: Object.fromEntries([...allowedStatuses].map((status) => [status, register.procedures.filter((procedure) => procedure.status === status).length])),
}, null, 2));