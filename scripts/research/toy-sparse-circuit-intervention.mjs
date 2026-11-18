/**
 * Synthetic-only sparse-circuit intervention smoke test.
 *
 * This is NOT a transformer, trained model, pharmaceutical evaluation,
 * OpenAI checkpoint, causal interpretation of an actual deployed model,
 * or production evidence. It runs one fixed, tiny feed-forward example using
 * deterministic synthetic quote-class features in CPU-local JavaScript.
 */
import { createHash } from "node:crypto";
import { inspectSparseCircuitCandidate, CIRCUIT_ARTIFACT_VERSION } from "../../src/core/intelligence-sparse-circuit-assurance.mjs";

const MODEL = Object.freeze({
  identifier: "toy-quote-sparse-circuit",
  revision: "smoke-v1",
  architecture: "manual-1-hidden-layer-relu",
  weights: Object.freeze({
    quoteToHidden: 1,
    distractorToHidden: 0,
    hiddenToOutput: 1
  })
});

const stableHash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

// Every example is fabricated for a code-level unit test, not learned from a
// dataset. The nuisance bit alternates independently of the quote-class bit.
const calibration = Object.freeze(Array.from({ length: 64 }, (_, index) => Object.freeze({
  quote: index % 2,
  distractor: Math.floor(index / 2) % 2
})));
const holdout = Object.freeze(Array.from({ length: 128 }, (_, index) => Object.freeze({
  quote: Math.floor(index / 2) % 2,
  distractor: index % 2
})));

function sparseHidden(sample) {
  return Math.max(0, MODEL.weights.quoteToHidden * sample.quote +
    MODEL.weights.distractorToHidden * sample.distractor);
}
function baseline(sample) {
  return MODEL.weights.hiddenToOutput * sparseHidden(sample);
}
function intervention(sample, { mean, ablate }) {
  return MODEL.weights.hiddenToOutput * (ablate ? mean : sparseHidden(sample));
}
function mse(data, predictor) {
  return data.reduce((sum, sample) => sum + (predictor(sample) - sample.quote) ** 2, 0) / data.length;
}

/**
 * A miniature deterministic mean-ablation demonstration. Uses the same
 * summary contract as native read-only clients but cannot create a trust or
 * source-rights receipt. Accepts no caller data, file paths or network URLs.
 */
export function runToySparseCircuitIntervention() {
  const calibrationMean = calibration.reduce((sum, item) => sum + sparseHidden(item), 0) /
    calibration.length;
  const baselineLoss = mse(holdout, baseline);
  const circuitLoss = mse(holdout, item => intervention(item, { mean: calibrationMean, ablate: false }));
  const ablatedLoss = mse(holdout, item => intervention(item, { mean: calibrationMean, ablate: true }));

  const candidate = {
    schemaVersion: CIRCUIT_ARTIFACT_VERSION,
    model: {
      identifier: MODEL.identifier,
      revision: MODEL.revision,
      weightsSha256: stableHash(MODEL),
      access: "weights-and-activations"
    },
    task: { identifier: "toy-quote-class", datasetSha256: stableHash({ calibration, holdout }) },
    circuit: {
      nodes: [
        { id: "quote-feature", kind: "embedding-channel" },
        { id: "hidden-feature", kind: "mlp-neuron" },
        { id: "readout", kind: "residual-write" }
      ],
      edges: [
        { from: "quote-feature", to: "hidden-feature", weight: 1 },
        { from: "hidden-feature", to: "readout", weight: 1 }
      ]
    },
    evaluation: {
      baselineLoss, circuitLoss, ablatedLoss, sampleCount: holdout.length,
      holdout: true, ablation: "mean"
    },
    provenance: {
      runId: "toy-quote-ablation-v1",
      implementationRevision: "offline-smoke-v1",
      evaluatedAt: "2026-11-18T00:00:00Z"
    }
  };
  const summary = inspectSparseCircuitCandidate(candidate);
  if (!summary.valid || summary.productionEligible || summary.clinicalUsePermitted) {
    throw new Error("Synthetic research assurance contract rejected.");
  }
  return Object.freeze({
    kind: "synthetic-intervention-smoke-only",
    modelClass: MODEL.architecture,
    datasetClass: "generated-balanced-binary",
    calibrationSamples: calibration.length,
    holdoutSamples: holdout.length,
    calibrationMean,
    candidateSummary: summary,
    limitation: "No transformer training, independently verified circuits, real-world model behaviour, rights approval or clinical safety."
  });
}
