import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("docs/data");
const jsonPath = resolve(root, "medicines-intelligence-requirements.json");
const markdownPath = resolve(root, "medicines-intelligence-requirements.md");
const raw = await readFile(jsonPath, "utf8");
const ledger = JSON.parse(raw);

const allowedStatuses = new Set([
  "Complete",
  "Complete at repository level only",
  "Owner-controlled blocker",
  "External verification pending",
  "Incomplete",
  "Not applicable, with rationale",
  "Rejected because of a documented conflict or safety concern",
]);
const allowedBlockers = new Set([
  "repository_defect",
  "missing_api_key",
  "source_restriction",
  "schema_ambiguity",
  "production_infrastructure",
  "cost_authorisation",
  "external_service",
  "data_not_publicly_available",
  "manual_research_requirement",
  "owner_controlled",
  "external_verification",
]);
const expectedIds = [
  ...Array.from({ length: 25 }, (_, index) => `MI-40.${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `MI-41.${index + 1}`),
  ...Array.from({ length: 20 }, (_, index) => `MI-42.${index + 1}`),
];
const expectedLifecycle = [
  "SOURCE DISCOVERED",
  "ADAPTER IMPLEMENTED",
  "CONTRACT TESTED",
  "SAMPLE INGEST VERIFIED",
  "HISTORICAL BACKFILL COMPLETE",
  "SCHEDULED SYNC IMPLEMENTED",
  "LOCAL UI COMPLETE",
  "ROLE SECURITY VERIFIED",
  "FORECAST BACKTESTED",
  "FULL_PLATFORM DEPLOYABLE",
  "PRODUCTION DEPLOYED",
  "PRODUCTION OPERATIONAL",
];

assert.equal(ledger.metadata.requirementCount, 55);
assert.equal(ledger.metadata.productionComplete, false);
assert.equal(ledger.metadata.sourceDocumentSha256, "466ff1260d2ffe2e248abd9bf20675f4456b7b5b14b8977a2431d04fbe097716");
assert.equal(ledger.metadata.sourceWorkbookSha256, "c07c42c378e4aa9d8a2ce891e037fa8b1f4b2992837c94ec6436bfe06ce9d668");
assert.equal(ledger.requirements.length, 55);
assert.deepEqual(ledger.requirements.map((record) => record.id), expectedIds);
assert.equal(new Set(expectedIds).size, expectedIds.length);
assert.doesNotMatch(raw, /\/Users\//u, "The governed ledger must not contain an absolute local path");

const localEvidence = new Set();
for (const record of ledger.requirements) {
  assert.ok(allowedStatuses.has(record.status), `${record.id}: invalid status`);
  assert.ok(record.title?.trim(), `${record.id}: title missing`);
  assert.ok(record.summary?.trim(), `${record.id}: summary missing`);
  assert.ok(record.remainingAction?.trim(), `${record.id}: remaining action missing`);
  assert.ok(Array.isArray(record.evidence) && record.evidence.length > 0, `${record.id}: evidence missing`);
  assert.equal(record.productionClaim, false, `${record.id}: unsupported production claim`);
  if (record.blockerType !== null) assert.ok(allowedBlockers.has(record.blockerType), `${record.id}: invalid blocker type`);
  for (const path of record.evidence) {
    assert.doesNotMatch(path, /^\//u, `${record.id}: evidence must use a repository-relative path`);
    if (!path.startsWith("http")) localEvidence.add(path);
  }
}

assert.ok(ledger.requirements.some((record) => record.status === "Complete"));
assert.ok(ledger.requirements.some((record) => record.status === "Complete at repository level only"));
assert.ok(ledger.requirements.some((record) => record.status === "Incomplete"));
assert.ok(ledger.requirements.some((record) => record.status === "Owner-controlled blocker"));

assert.equal(ledger.lifecycle.length, expectedLifecycle.length);
assert.deepEqual(ledger.lifecycle.map((entry) => entry.stage), expectedLifecycle);
for (const entry of ledger.lifecycle) {
  assert.ok(allowedStatuses.has(entry.status), `${entry.stage}: invalid lifecycle status`);
  assert.ok(entry.detail?.trim(), `${entry.stage}: detail missing`);
  assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0, `${entry.stage}: evidence missing`);
  for (const path of entry.evidence) localEvidence.add(path);
}

for (const path of localEvidence) await access(resolve(path));

const discovery = JSON.parse(await readFile(resolve(root, "evidence/source-discovery.json"), "utf8"));
assert.deepEqual({
  registryEntries: discovery.registryEntries,
  checked: discovery.ckanSourcesChecked,
  succeeded: discovery.successfulCkanDiscoveries,
  failed: discovery.failedCkanDiscoveries,
}, { registryEntries: 32, checked: 17, succeeded: 17, failed: 0 });
assert.equal(discovery.productionIngestionClaim, false);

const pharmacy = JSON.parse(await readFile(resolve(root, "evidence/pharmacy-workbook-import.json"), "utf8"));
assert.equal(pharmacy.sourceSha256, ledger.metadata.sourceWorkbookSha256);
assert.deepEqual({
  rows: pharmacy.sourceRowCount,
  verified: pharmacy.verifiedEmails,
  blankActioned: pharmacy.blankActionedEmails,
  canonical: pharmacy.controls.canonicalPharmacies,
  marketingEligible: pharmacy.controls.marketingEligible,
}, { rows: 12_936, verified: 7_211, blankActioned: 5_725, canonical: 12_936, marketingEligible: 0 });
assert.equal(pharmacy.productionImportClaim, false);

const localPharmacyDatabase = JSON.parse(await readFile(resolve(root, "evidence/pharmacy-local-database-verification.json"), "utf8"));
assert.equal(localPharmacyDatabase.productionDatabaseClaim, false);
assert.equal(localPharmacyDatabase.sourceWorkbookSha256, ledger.metadata.sourceWorkbookSha256);
assert.deepEqual(localPharmacyDatabase.aggregateCounts, {
  canonicalPharmacies: 12_936,
  verifiedPublicBusinessEmailEvidence: 7_211,
  publicEmailNewEvidenceRequiredQueue: 5_725,
  identifierConflictReviewQueue: 100,
  marketingEligiblePharmacies: 0,
});

const population = JSON.parse(await readFile(resolve(root, "evidence/registered-population-import.json"), "utf8"));
assert.deepEqual({
  totals: population.rows.totals,
  ageSex: population.rows.ageSex,
  mappings: population.rows.mappings,
  registeredPopulation: population.rows.registeredPopulation,
  unmatched: population.rows.unmatchedTotalPractices,
}, { totals: 6_129, ageSex: 325_811, mappings: 6_129, registeredPopulation: 63_237_908, unmatched: 0 });
assert.equal(population.productionIngestionClaim, false);

const requiredDocs = [
  "medicines-intelligence-architecture.md",
  "nhsbsa-source-registry.md",
  "uk-nation-source-registry.md",
  "medicine-identity-and-bnf-snomed.md",
  "geography-postcode-postgis.md",
  "pharmacy-master.md",
  "pharmacy-email-enrichment.md",
  "forecasting-methodology.md",
  "opportunity-model.md",
  "data-quality-and-caveats.md",
  "source-refresh-and-runbook.md",
  "analytics-security-and-privacy.md",
  "medicines-intelligence-visual-acceptance.md",
];
for (const path of requiredDocs) await access(resolve(root, path));

const visualManifest = JSON.parse(await readFile(resolve("audit/evidence/medicines-intelligence/manifest.json"), "utf8"));
assert.equal(visualManifest.productionClaim, false);
assert.equal(visualManifest.browserAcceptance.engines.length, 2);
assert.equal(visualManifest.browserAcceptance.configuredViewportCount, 13);
assert.equal(visualManifest.browserAcceptance.screenshots, 1_360);
assert.equal(visualManifest.browserAcceptance.axeRuns, 230);
assert.equal(visualManifest.browserAcceptance.seriousOrCriticalFindings, 0);
for (const capture of visualManifest.selectedCaptures) await access(resolve(capture.path));

const markdown = await readFile(markdownPath, "utf8");
assert.doesNotMatch(markdown, /\/Users\//u);
for (const id of expectedIds) assert.ok(markdown.includes(`| ${id} |`), `${id}: missing from rendered ledger`);
for (const stage of expectedLifecycle) assert.ok(markdown.includes(`| ${stage} |`), `${stage}: missing from rendered ledger`);
assert.match(markdown, /makes no production-completion claim/iu);

const statuses = Object.fromEntries(
  [...allowedStatuses].map((status) => [status, ledger.requirements.filter((record) => record.status === status).length]),
);
console.log(JSON.stringify({ requirements: ledger.requirements.length, lifecycleStages: ledger.lifecycle.length, statuses, evidencePaths: localEvidence.size }, null, 2));
