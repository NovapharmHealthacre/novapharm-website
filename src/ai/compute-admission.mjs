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
const POLICY_KEYS = new Set(["allowedRegions", "maximumBudgetGbp"]);

// Copy only own data descriptors; do not invoke input getters or Proxy get traps.
function snapshotPlainData(value) {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const copy = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
      copy[key] = descriptor.value;
    }
    return copy;
  } catch {
    return null;
  }
}
function copyRegionPolicy(value) {
  try {
    if (!Array.isArray(value)) return null;
    const size = Object.getOwnPropertyDescriptor(value, "length")?.value;
    if (!Number.isSafeInteger(size) || size < 1 || size > 32) return null;
    const regions = [];
    for (let i = 0; i < size; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
      if (!descriptor || !Object.hasOwn(descriptor, "value") ||
          typeof descriptor.value !== "string" || descriptor.value.length > 64) return null;
      regions.push(descriptor.value);
    }
    if (Reflect.ownKeys(value).length !== size + 1) return null;
    return regions;
  } catch {
    return null;
  }
}
const blocked = code => Object.freeze({
  schemaVersion: 1, status: "blocked", executionEnabled: false, reasons: Object.freeze([code])
});

const NUMBER_LIMITS = Object.freeze({
  cpuCores: [1, 32],
  gpuCount: [0, 4],
  memoryGiB: [1, 256],
  durationMinutes: [1, 1440],
  retentionDays: [0, 30]
});
const fail = (reasons, code) => reasons.push(code);
const boundedInteger = (value, [min, max]) => Number.isSafeInteger(value) && value >= min && value <= max;

export function assessComputeProposal(untrustedProposal, untrustedPolicy = {}) {
  const proposal = snapshotPlainData(untrustedProposal);
  if (!proposal) return blocked("invalid-proposal");
  const policy = snapshotPlainData(untrustedPolicy);
  if (!policy) return blocked("invalid-policy");
  const reasons = [];
  if (Object.keys(policy).some(key => !POLICY_KEYS.has(key))) fail(reasons, "unexpected-policy-fields");
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
  const regions = policy.allowedRegions === undefined
    ? ["eu-west-2"] : copyRegionPolicy(policy.allowedRegions);
  if (!regions) fail(reasons, "invalid-region-policy");
  if (typeof proposal.region !== "string" || !regions?.includes(proposal.region)) fail(reasons, "region-not-allowed");
  // Estimate is untrusted planning input, NOT a cloud billing or quota enforcement control.
  if (policy.maximumBudgetGbp !== undefined &&
      (!Number.isFinite(policy.maximumBudgetGbp) || policy.maximumBudgetGbp < 0)) {
    fail(reasons, "invalid-budget-policy");
  }
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
