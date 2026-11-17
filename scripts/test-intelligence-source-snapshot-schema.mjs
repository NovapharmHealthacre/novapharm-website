import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSourceSnapshotQuarantine } from "../src/core/intelligence-source-snapshot-quarantine.mjs";

const schema = JSON.parse(readFileSync(new URL("../docs/intelligence/source-snapshot-quarantine-v1.schema.json", import.meta.url), "utf8"));
const manifest = buildSourceSnapshotQuarantine({
  sourceKey: "global-ctgov",
  jurisdiction: "GLOBAL",
  publisher: "ClinicalTrials.gov",
  datasetKey: "clinicaltrials-v2",
  resourceId: "sample-2026-11-17",
  resourceUrl: "https://clinicaltrials.gov/api/v2/studies",
  expectedOrigin: "https://clinicaltrials.gov",
  mediaType: "application/json",
  schemaVersion: "ctgov-v2",
  observationStart: "2026-11-01",
  observationEnd: "2026-11-01",
  publishedOn: "2026-11-01",
  fetchedAt: "2026-11-17T17:00:00.000Z",
  bytes: Buffer.from('{"studies":[]}')
});
test("the schema includes every current manifest field and bans extra keys", () => {
  assert.deepEqual([...schema.required].sort(), Object.keys(manifest).sort());
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.contract.const, manifest.contract);
  assert.match(manifest.snapshotId, new RegExp(schema.properties.snapshotId.pattern));
  assert.match(manifest.digestSha256, new RegExp(schema.properties.digestSha256.pattern));
});
test("the customer-release and rights-denial fields cannot drift from fail-closed constants", () => {
  for (const name of ["sourceRightsIndependentlyApproved","productionAccepted","canPublish","commercialDecisionReady","clinicalDecisionReady"]) {
    assert.equal(schema.properties[name].const, false);
    assert.equal(manifest[name], false);
  }
  assert.equal(schema.properties.rightsEvidenceId.const, null);
  assert.equal(manifest.rightsEvidenceId, null);
  assert.equal(schema.properties.intakeState.const, "QUARANTINED_INTERNAL_EVALUATION");
});
test("schema bounds remain compatible with the candidate only", () => {
  assert.equal(schema.properties.sampleBytes.maximum, 262144);
  assert.ok(schema.properties.mediaType.enum.includes(manifest.mediaType));
  assert.match(manifest.jurisdiction, new RegExp(schema.properties.jurisdiction.pattern));
});
