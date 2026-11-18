import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { inspectTrainedSparseTransformerReport } from "./research/validate-trained-sparse-transformer-report.mjs";

const fixture = () => JSON.parse(readFileSync(
  new URL("./research/fixtures/trained-sparse-transformer-observed-local-run.json", import.meta.url),
  "utf8"
));
const copy = value => JSON.parse(JSON.stringify(value));

test("an actual trained synthetic model observation maps to the same unverified native display contract", () => {
  const report = fixture();
  const summary = inspectTrainedSparseTransformerReport(report);
  assert.equal(summary.schemaVersion, "npi.sparse-circuit.v1");
  assert.equal(summary.valid, true);
  assert.equal(summary.modelId, "toy-trained-attention");
  assert.equal(summary.taskId, "synthetic-keyword-class");
  assert.equal(summary.nodeCount, 3);
  assert.equal(summary.edgeCount, 2);
  assert.equal(summary.sampleCount, 256);
  assert.ok(summary.lossDeltaAblatedVsCircuit > 4);
  assert.equal(summary.status, "unverified-research-candidate");
  assert.equal(summary.productionEligible, false);
  assert.equal(summary.clinicalUsePermitted, false);
  assert.equal(summary.mechanisticExplanationVerified, false);
  assert.deepEqual(Object.keys(summary).sort(), [
    "schemaVersion", "valid", "status", "modelId", "taskId",
    "nodeCount", "edgeCount", "lossDeltaCircuitVsBaseline",
    "lossDeltaAblatedVsCircuit", "sampleCount", "ablation",
    "mechanisticExplanationVerified", "productionEligible",
    "clinicalUsePermitted"
  ].sort());
});

test("contradicted model rights, hidden private fields and altered hash cannot be smuggled into reports", () => {
  const mutations = [
    report => { report.assurance.rightsApproved = true; },
    report => { report.assurance.productionEligible = true; },
    report => { report.assurance.mechanisticExplanationVerified = true; },
    report => { report.patient = {name:"PRIVATE-NEVER-OUTPUT"}; },
    report => { report.candidateArtifact.sourceToken = "PRIVATE-NEVER-OUTPUT"; },
    report => { report.model.weightsSha256 = "a".repeat(64); },
    report => { report.candidateArtifact.provenance.implementationRevision = "sha256:" + "0".repeat(64); },
    report => { report.candidateArtifact.provenance.runId = "unrelated-run"; },
    report => { report.data.sha256 = "b".repeat(64); },
    report => { report.evaluation.ablatedLoss = 0; },
    report => { report.evaluation.keptHeadIndex = 13; },
    report => { report.candidateArtifact.evaluation.sampleCount = 1_000_001; },
    report => { report.candidateArtifact.circuit.nodes[0].note = "PRIVATE-NEVER-OUTPUT"; }
  ];
  const original = fixture();
  for (const mutate of mutations) {
    const value = copy(original);
    mutate(value);
    assert.throws(() => inspectTrainedSparseTransformerReport(value), {
      code: "npi_sparse_experiment_rejected"
    });
  }
});

test("CLI accepts a bounded offline report and emits no raw experiment data", () => {
  const report = fixture();
  const cli = new URL("./research/validate-trained-sparse-transformer-report.mjs", import.meta.url);
  const processResult = spawnSync(process.execPath, [cli.pathname], {
    input: JSON.stringify(report),
    encoding: "utf8",
    timeout: 20_000,
    maxBuffer: 65_536
  });
  assert.equal(processResult.status, 0, processResult.stderr);
  assert.deepEqual(JSON.parse(processResult.stdout), inspectTrainedSparseTransformerReport(report));
  assert.doesNotMatch(processResult.stdout, /weightsSha256|patient|sourceToken|provenance|datasetSha256/);
});

test("CLI rejects oversized and forged requests without leaking their contents", () => {
  const cli = new URL("./research/validate-trained-sparse-transformer-report.mjs", import.meta.url);
  for (const report of [
    JSON.stringify({...fixture(), patientName: "VERY-PRIVATE"}),
    "Z".repeat(70_000)
  ]) {
    const p = spawnSync(process.execPath, [cli.pathname], {
      input: report, encoding: "utf8", timeout: 20_000, maxBuffer: 65_536
    });
    assert.notEqual(p.status, 0);
    assert.equal(p.stdout, "");
    assert.match(p.stderr, /report rejected/i);
    assert.doesNotMatch(p.stderr, /VERY-PRIVATE/);
  }
});
