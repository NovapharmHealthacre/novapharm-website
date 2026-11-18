import assert from "node:assert/strict";
import test from "node:test";
import { assessComputeProposal } from "../src/ai/compute-admission.mjs";

const digest = "sha256:" + "a".repeat(64);
const valid = () => ({
  mode: "experiment", accelerator: "cpu", datasetDigest: digest, modelDigest: digest,
  purpose: "non-clinical-research", dataClass: "public-approved", containsPersonalData: false,
  cpuCores: 2, gpuCount: 0, memoryGiB: 4, durationMinutes: 20, retentionDays: 0,
  region: "eu-west-2", estimatedCostGbp: 0
});
const reason = (override, policy) => assessComputeProposal({ ...valid(), ...override }, policy).reasons;
test("only review-only plans are possible: never dispatch or approve a job", () => {
  const result = assessComputeProposal(valid());
  assert.equal(result.status, "review-only");
  assert.equal(result.executionEnabled, false);
  assert.equal(result.schemaVersion, 1);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.reasons));
});
test("fail closed on missing or forged workload properties", () => {
  assert.equal(assessComputeProposal(null).status, "blocked");
  assert.ok(reason({ mode: "clinical-treatment" }).includes("invalid-mode"));
  assert.ok(reason({ purpose: "medical-diagnosis" }).includes("unapproved-purpose"));
  assert.ok(reason({ dataClass: "patient" }).includes("data-class-not-admitted"));
  assert.ok(reason({ containsPersonalData: true }).includes("personal-data-not-admitted"));
  assert.ok(reason({ containsPersonalData: undefined }).includes("personal-data-not-admitted"));
  assert.ok(reason({ datasetDigest: "public-data.csv" }).includes("unversioned-dataset"));
  assert.ok(reason({ modelDigest: "" }).includes("unversioned-model"));
});
test("region, resources, retention and budget are tightly bounded", () => {
  assert.ok(reason({ region: "us-east-1" }).includes("region-not-allowed"));
  assert.ok(reason({ gpuCount: 1 }).includes("cpu-gpu-mismatch"));
  assert.ok(reason({ accelerator: "gpu", gpuCount: 0 }).includes("gpu-count-required"));
  assert.ok(reason({ cpuCores: 33 }).includes("invalid-cpuCores"));
  assert.ok(reason({ memoryGiB: 257 }).includes("invalid-memoryGiB"));
  assert.ok(reason({ durationMinutes: 1441 }).includes("invalid-durationMinutes"));
  assert.ok(reason({ retentionDays: 31 }).includes("invalid-retentionDays"));
  assert.ok(reason({ estimatedCostGbp: 0.01 }).includes("budget-not-approved"));
  assert.ok(reason({ estimatedCostGbp: NaN }).includes("budget-not-approved"));
  assert.deepEqual(reason({ accelerator: "gpu", gpuCount: 1, estimatedCostGbp: 5 },
    { allowedRegions: ["eu-west-2"], maximumBudgetGbp: 10 }), []);
});
test("never echo secret-bearing proposal values or grant execution", () => {
  const result = assessComputeProposal({ ...valid(), modelDigest: "secret-patient-text", payload: "PRIVATE" });
  const serialized = JSON.stringify(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.executionEnabled, false);
  assert.ok(!serialized.includes("PRIVATE") && !serialized.includes("secret-patient-text"));
});
