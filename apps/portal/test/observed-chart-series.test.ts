import assert from "node:assert/strict";
import test from "node:test";
import { observedTrendPoints } from "../lib/observed-chart-series";

test("accepted observed series retains genuine zero and excludes missing or invalid numbers", () => {
  assert.deepEqual(observedTrendPoints([
    { month_key: "2026-01", metric_value: 12 },
    { month_key: "2026-02", metric_value: null },
    { month_key: "2026-03", metric_value: "" },
    { month_key: "2026-04", metric_value: 0 },
    { month_key: "2026-05", metric_value: "20.5" },
    { month_key: "2026-06", metric_value: "not available" },
    { month_key: "2026-07", metric_value: Number.POSITIVE_INFINITY },
    { month_key: "", metric_value: 500 },
    { month_key: "2026-08" },
  ]), [
    { label: "2026-01", value: 12 },
    { label: "2026-04", value: 0 },
    { label: "2026-05", value: 20.5 },
  ]);
});

test("empty, non-finite and unavailable source series stay empty without synthetic points", () => {
  assert.deepEqual(observedTrendPoints([]), []);
  assert.deepEqual(observedTrendPoints([{ month_key: "2026-11", metric_value: undefined }]), []);
  assert.deepEqual(observedTrendPoints([{ month_key: "2026-11", metric_value: Number.NaN }]), []);
});
