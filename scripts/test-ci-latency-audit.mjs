import assert from "node:assert/strict";
import { test } from "node:test";
import { percentile, jobObservation, summarizeRuns } from "./ci/ci-latency-audit.mjs";

const baseJob = {
  name: "Unit checks",
  created_at: "2026-11-23T09:00:00Z",
  started_at: "2026-11-23T09:03:00Z",
  completed_at: "2026-11-23T09:08:00Z",
  conclusion: "success",
};

test("nearest-rank percentiles and empty samples are deterministic", () => {
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile([9, 1, 5, 3], 0.5), 3);
  assert.equal(percentile([9, 1, 5, 3], 0.95), 9);
  assert.throws(() => percentile([1], 0), /Percentile/);
});

test("job queue time is kept separate from execution", () => {
  assert.deepEqual(jobObservation(baseJob, "Production readiness"), {
    workflow: "Production readiness", job: "Unit checks",
    queueMinutes: 3, executionMinutes: 5, conclusion: "success",
  });
});

test("incomplete and impossible timestamps are never treated as zero latency", () => {
  assert.equal(jobObservation({ ...baseJob, started_at: null }, "CI"), null);
  assert.equal(jobObservation({ ...baseJob, completed_at: "2026-11-23T08:00:00Z" }, "CI"), null);
});

test("read-only report aggregates completed job observations and flags limitations", () => {
  const result = summarizeRuns([
    { name: "Production readiness", jobs: [baseJob] },
    { name: "CodeQL", jobs: [{ ...baseJob, created_at: "2026-11-23T08:00:00Z" }] },
  ]);
  assert.equal(result.sampledCompletedPrRuns, 2);
  assert.equal(result.timedJobs, 2);
  assert.equal(result.queueP50Minutes, 3);
  assert.equal(result.queueP95Minutes, 63);
  assert.equal(result.executionP95Minutes, 5);
  assert.equal(result.byWorkflow.length, 2);
  assert.match(result.limitations.join(" "), /runner-capacity/);
});
