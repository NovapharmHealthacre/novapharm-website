import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sopRoot = resolve("docs/programme/sops");
const register = JSON.parse(await readFile(resolve(sopRoot, "sop-register.json"), "utf8"));
const rollbackGuide = await readFile(resolve("deployment/rollback-guide.md"), "utf8");
const deploymentRunbook = await readFile(resolve("deployment/deployment-runbook.md"), "utf8");
const sop11 = register.procedures.find((procedure) => procedure.id === "SOP-11");

assert.ok(sop11, "SOP-11 must remain present in the canonical SOP register");
assert.equal(sop11.title, "App Service Slot Rollback", "SOP-11 must describe the canonical App Service rollback boundary");
assert.equal(sop11.file, "docs/programme/sops/SOP-11-app-service-slot-rollback.md");
assert.equal(sop11.status, "REPOSITORY_EXECUTABLE_STAGING_REHEARSAL_REQUIRED", "Rollback remains staging-rehearsal gated at R1");
assert.deepEqual(sop11.rehearsalEvidence, [], "Repository correction must not fabricate rollback rehearsal evidence");
assert.deepEqual(sop11.productionAcceptanceEvidence, [], "Repository correction must not fabricate production rollback evidence");

const sop11Markdown = await readFile(resolve(sop11.file), "utf8");
assert.match(sop11Markdown, /^# SOP-11 — App Service Slot Rollback$/mu);
assert.match(sop11Markdown, /production candidate before promotion/iu);
assert.match(sop11Markdown, /production after an owner-approved slot promotion/iu);
assert.match(sop11Markdown, /reverse slot/iu);
assert.match(sop11Markdown, /database migration/iu);
assert.match(sop11Markdown, /customer-isolation/iu);
assert.match(sop11Markdown, /Key Vault/iu);
assert.match(sop11Markdown, /SOP-40|SOP-10/u);
assert.match(sop11Markdown, /Never automatically reverse database state/iu);
assert.match(sop11Markdown, /Repository procedure existence is \*\*not\*\* rehearsal or production acceptance evidence\./u);

await assert.rejects(
  access(resolve(sopRoot, "SOP-11-container-app-rollback.md")),
  "The obsolete Container App SOP must not coexist with the canonical App Service procedure",
);

for (const required of [
  /R1 public fallback/iu,
  /Managed staging/iu,
  /Production candidate before promotion/iu,
  /production after owner-approved slot promotion/iu,
  /App Service/iu,
  /Azure SQL recovery/iu,
  /Blob and document recovery/iu,
  /Key Vault and identity recovery/iu,
  /Legacy SQLite boundary/iu,
  /one approved hostname\/application boundary at a time/iu,
]) {
  assert.match(rollbackGuide, required, `Rollback guide is missing canonical authority: ${required}`);
}

for (const obsolete of [
  /Container App Rollback/iu,
  /persistent disk mounted at `\/var\/lib\/novapharm`/iu,
  /restore `novapharm\.sqlite` together with matching `-wal` and `-shm`/iu,
  /Executive Platform source of truth is the controlled SharePoint folder/iu,
]) {
  assert.doesNotMatch(rollbackGuide, obsolete, `Rollback guide reintroduced obsolete runtime authority: ${obsolete}`);
}

assert.match(deploymentRunbook, /six-application workflow implemented/iu);
assert.match(deploymentRunbook, /production candidate/iu);
assert.match(deploymentRunbook, /six `candidate` slots/iu);
assert.match(deploymentRunbook, /workflow cannot swap slots/iu);
assert.match(deploymentRunbook, /Candidate-to-production slot swaps[\s\S]*separate owner-controlled actions/iu);

console.log(JSON.stringify({
  sop11: sop11.title,
  canonicalRuntime: "Azure App Service candidate slots",
  databaseRecovery: "Azure SQL isolated restore",
  documentRecovery: "private Azure Blob",
  legacySQLiteProductionAuthority: false,
  fabricatedRehearsalEvidence: false,
}, null, 2));