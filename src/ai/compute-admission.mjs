// Shared compute planning guard. This module NEVER submits or executes jobs.
// Only a protected backend can issue actual work authorisations; browser and
// mobile decisions are advisory and must never be used as security permits.
const MODES = new Set(["experiment", "training", "batch-inference"]);
const ACCELERATORS = new Set(["cpu", "gpu"]);
const HASH = /^sha256:[a-f0-9]{64}$/;
// Explicit metadata allowlist: never accept raw datasets, prompts, patient records or secrets.
const PROPOSAL_KEYS = new Set([
  "mode", "accelerator", "datasetDigest", "modelDigest", "purpose", "dataClass",
  "containsPersonalData", "cpuCores", "gpuCount", "memoryGiB", "durationMinutes",
  "retentionDays", "region", "estimatedCostGbp"
]);
const NUMBER_LIMITS = Object.freeze({
  cpuCores: [1, 32],
  gpuCount: [0, 4],
  memoryGiB: [1, 256],
  durationMinutes: [1, 1440],
  retentionDays: [0, 30]
});
const fail = (reasons, code) => reasons.push(code);
const boundedInteger = (value, [min, max]) => Number.isSafeInteger(value) && value >= min && value <= max;

export function assessComputeProposal(proposal, policy = {}) {
  const reasons = [];
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal) ||
      (Object.getPrototypeOf(proposal) !== Object.prototype && Object.getPrototypeOf(proposal) !== null)) {
    return Object.freeze({ schemaVersion: 1, status: "blocked", executionEnabled: false, reasons: Object.freeze(["invalid-proposal"]) });
  }
  if (Object.keys(proposal).some((name) => !PROPOSAL_KEYS.has(name))) fail(reasons, "unexpected-fields");
  if (!MODES.has(proposal.mode)) fail(reasons, "invalid-mode");
  if (!ACCELERATORS.has(proposal.accelerator)) fail(reasons, "invalid-accelerator");
  if (typeof proposal.datasetDigest !== "string" || !HASH.test(proposal.datasetDigest)) fail(reasons, "unversioned-dataset");
  if (typeof proposal.modelDigest !== "string" || !HASH.test(proposal.modelDigest)) fail(reasons, "unversioned-model");
  if (proposal.purpose !== "non-clinical-research") fail(reasons, "unapproved-purpose");
  if (proposal.dataClass !== "public-approved" && proposal.dataClass !== "internal-nonpersonal-approved") {
    fail(reasons, "data-class-not-admitted");
  }
  if (proposal.containsPersonalData !== false) fail(reasons, "personal-data-not-admitted");
  for (const [name, bounds] of Object.entries(NUMBER_LIMITS)) {
    if (!boundedInteger(proposal[name], bounds)) fail(reasons, "invalid-" + name);
  }
  if (proposal.accelerator === "cpu" && proposal.gpuCount !== 0) fail(reasons, "cpu-gpu-mismatch");
  if (proposal.accelerator === "gpu" && !(proposal.gpuCount >= 1)) fail(reasons, "gpu-count-required");
  const regions = Array.isArray(policy.allowedRegions) && policy.allowedRegions.length
    ? policy.allowedRegions : ["eu-west-2"];
  if (typeof proposal.region !== "string" || !regions.includes(proposal.region)) fail(reasons, "region-not-allowed");
  // Estimate is untrusted planning input, NOT a cloud billing or quota enforcement control.
  const maximumBudgetGbp = Number.isFinite(policy.maximumBudgetGbp) && policy.maximumBudgetGbp >= 0
    ? policy.maximumBudgetGbp : 0;
  if (typeof proposal.estimatedCostGbp !== "number" || !Number.isFinite(proposal.estimatedCostGbp) ||
      proposal.estimatedCostGbp < 0 || proposal.estimatedCostGbp > maximumBudgetGbp) {
    fail(reasons, "budget-not-approved");
  }
  return Object.freeze({
    schemaVersion: 1,
    status: reasons.length ? "blocked" : "review-only",
    executionEnabled: false,
    reasons: Object.freeze(reasons)
  });
}
