/**
 * Data-free, offline bridge from a locally trained synthetic attention report
 * to the same strict unverified summary consumed by web, Swift and Android.
 * NO network, tenant data, uploads, clinical decisions or rights attestation.
 */
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { inspectSparseCircuitCandidate } from "../../src/core/intelligence-sparse-circuit-assurance.mjs";

const MAX_BYTES = 65_536;
const SHA = /^[a-f0-9]{64}$/;
const SCRIPT_SHA256 = "sha256:" + createHash("sha256")
  .update(readFileSync(new URL("./tiny-sparse-transformer-experiment.py", import.meta.url)))
  .digest("hex");
const deny = () => Object.assign(new Error("Invalid or untrusted synthetic experiment report."), {
  code: "npi_sparse_experiment_rejected"
});

function exact(value, fields) {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).length !== fields.length ||
      Object.keys(value).some(key => !fields.includes(key))) throw deny();
}
function count(n, min, max) {
  return Number.isSafeInteger(n) && n >= min && n <= max;
}
function finite(n) {
  return typeof n === "number" && Number.isFinite(n);
}
function denyUnless(condition) {
  if (!condition) throw deny();
}
const REPORT_FIELDS = [
  "contract", "classification", "model", "data", "evaluation",
  "candidateArtifact", "assurance", "limits"
];
const MODEL_FIELDS = [
  "kind", "seed", "trainSteps", "parameters", "nonzeroParameters",
  "weightsSha256", "pruning", "pruneFraction"
];
const DATA_FIELDS = ["kind", "train", "calibration", "holdout", "sha256"];
const METRICS = [
  "baselineLoss", "baselineAccuracy", "prunedLoss", "prunedAccuracy",
  "isolatedCircuitLoss", "isolatedCircuitAccuracy", "ablatedLoss",
  "ablatedAccuracy", "calibrationHeadAblatedLosses", "keptHeadIndex"
];
const ASSERTIONS = [
  "independentReproduction", "rightsApproved",
  "mechanisticExplanationVerified", "productionEligible",
  "clinicalUsePermitted"
];

/**
 * Both source and report are untrusted until a separately signed and reviewed
 * model-provenance receipt exists. This parser only checks structure/consistency,
 * then emits a *sanitized*, non-authorizing research display summary.
 */
export function inspectTrainedSparseTransformerReport(report) {
  exact(report, REPORT_FIELDS);
  exact(report.model, MODEL_FIELDS);
  exact(report.data, DATA_FIELDS);
  exact(report.evaluation, METRICS);
  exact(report.assurance, ASSERTIONS);
  denyUnless(report.contract === "novapharm.intelligence.offline-sparse-transformer-experiment.v1");
  denyUnless(report.classification === "synthetic-local-research-only");
  denyUnless(typeof report.limits === "string" && report.limits.length <= 240 &&
    report.limits === "Not a full weight-sparse transformer, causal circuit ground truth, pharma dataset, model safety assessment or published paper replication.");
  const {model, data, evaluation, assurance, candidateArtifact} = report;
  denyUnless(model.kind === "trained-1-block-2-head-attention" &&
    model.pruning === "attention-weight-magnitude" &&
    model.seed === 117 && count(model.trainSteps, 30, 1000) &&
    count(model.parameters, 1, 100_000) &&
    count(model.nonzeroParameters, 1, model.parameters - 1) &&
    finite(model.pruneFraction) && model.pruneFraction >= 0 && model.pruneFraction <= 0.5 &&
    typeof model.weightsSha256 === "string" && SHA.test(model.weightsSha256));
  denyUnless(data.kind === "generated-non-pharmaceutical" &&
    count(data.train, 128, 4096) && data.calibration === 128 &&
    count(data.holdout, 64, 4096) &&
    typeof data.sha256 === "string" && SHA.test(data.sha256));
  denyUnless(METRICS.slice(0, 8).every(key => finite(evaluation[key])) &&
    [evaluation.baselineLoss, evaluation.prunedLoss,
      evaluation.isolatedCircuitLoss, evaluation.ablatedLoss].every(n => n >= 0) &&
    [evaluation.baselineAccuracy, evaluation.prunedAccuracy,
      evaluation.isolatedCircuitAccuracy, evaluation.ablatedAccuracy].every(n => n >= 0 && n <= 1) &&
    Array.isArray(evaluation.calibrationHeadAblatedLosses) &&
    evaluation.calibrationHeadAblatedLosses.length === 2 &&
    evaluation.calibrationHeadAblatedLosses.every(n => finite(n) && n >= 0) &&
    count(evaluation.keptHeadIndex, 0, 1));
  // Head selection is decided on calibration only; the final holdout must
  // neither influence selection nor contradict the reported intervention.
  const selectedFromCalibration =
    evaluation.calibrationHeadAblatedLosses[0] >= evaluation.calibrationHeadAblatedLosses[1] ? 0 : 1;
  denyUnless(evaluation.keptHeadIndex === selectedFromCalibration &&
    evaluation.ablatedLoss > evaluation.isolatedCircuitLoss);
  denyUnless(ASSERTIONS.every(key => assurance[key] === false));
  const checked = inspectSparseCircuitCandidate(candidateArtifact);
  denyUnless(checked.valid && checked.modelId === "toy-trained-attention" &&
    checked.taskId === "synthetic-keyword-class" &&
    candidateArtifact.model.weightsSha256 === model.weightsSha256 &&
    candidateArtifact.task.datasetSha256 === data.sha256 &&
    candidateArtifact.provenance.implementationRevision === SCRIPT_SHA256 &&
    candidateArtifact.provenance.runId ===
      "toy-transformer-" + model.seed + "-" + model.trainSteps + "-" + data.train + "-" + data.holdout &&
    candidateArtifact.evaluation.sampleCount === data.holdout &&
    candidateArtifact.evaluation.baselineLoss === evaluation.baselineLoss &&
    candidateArtifact.evaluation.circuitLoss === evaluation.isolatedCircuitLoss &&
    candidateArtifact.evaluation.ablatedLoss === evaluation.ablatedLoss &&
    candidateArtifact.circuit.nodes.length === 3 &&
    candidateArtifact.circuit.edges.length === 2 &&
    candidateArtifact.circuit.nodes[0].id === "synthetic-token" &&
    candidateArtifact.circuit.nodes[0].kind === "embedding-channel" &&
    candidateArtifact.circuit.nodes[1].id === "head-" + evaluation.keptHeadIndex &&
    candidateArtifact.circuit.nodes[1].kind === "attention-channel" &&
    candidateArtifact.circuit.nodes[2].id === "cls-readout" &&
    candidateArtifact.circuit.nodes[2].kind === "residual-write" &&
    candidateArtifact.circuit.edges[0].from === "synthetic-token" &&
    candidateArtifact.circuit.edges[0].to === "head-" + evaluation.keptHeadIndex &&
    candidateArtifact.circuit.edges[0].weight > 0 &&
    candidateArtifact.circuit.edges[1].from === "head-" + evaluation.keptHeadIndex &&
    candidateArtifact.circuit.edges[1].to === "cls-readout" &&
    candidateArtifact.circuit.edges[1].weight > 0 &&
    !checked.mechanisticExplanationVerified && !checked.productionEligible && !checked.clinicalUsePermitted);
  return checked;
}

async function main() {
  // Enforce the byte quota *before* decoding or retaining any input chunk.
  // This protects the offline research CLI against oversized stdin messages,
  // including Unicode input that occupies multiple bytes per code point.
  const buffers = [];
  let totalBytes = 0;
  try {
    for await (const chunk of process.stdin) {
      if (!Buffer.isBuffer(chunk) || chunk.byteLength > MAX_BYTES - totalBytes) throw deny();
      totalBytes += chunk.byteLength;
      buffers.push(chunk);
    }
    denyUnless(totalBytes > 0);
    const input = new TextDecoder("utf-8", { fatal: true })
      .decode(Buffer.concat(buffers, totalBytes));
    const summary = inspectTrainedSparseTransformerReport(JSON.parse(input));
    process.stdout.write(JSON.stringify(summary) + "\n");
  } catch {
    process.stderr.write("Synthetic sparse-transformer research report rejected.\n");
    process.exitCode = 1;
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
