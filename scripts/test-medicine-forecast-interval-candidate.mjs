import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMedicineForecastIntervalCandidate } from "../src/core/medicine-forecast-interval-candidate.mjs";

const id = "medicine-" + "a".repeat(32);
const source = {
  acceptedServerSide: true, licenceAllowsForecasting: true,
  ingestionRunAccepted: true, sourceId: "nhsbsa-epd",
};
const scope = {
  verifiedServerSide: true, medicineId: id,
  jurisdiction: "GB", measure: "prescribing_items", unit: "items",
};
const release = {
  verifiedServerSide: true, forecastEvaluationEnabled: true,
  customerForecastingEnabled: false, sourceRightsCertified: true,
};
function history(months = 60) {
  return Array.from({ length: months }, (_, i) => ({
    period: String(2021 + Math.floor(i / 12)) + "-" + String(i % 12 + 1).padStart(2, "0"),
    value: 100 + (i % 12) * 3, sourceId: source.sourceId,
    medicineId: id, jurisdiction: scope.jurisdiction, measure: scope.measure,
    unit: scope.unit, accepted: true, validationSample: false,
    provenanceSha256: "a".repeat(64),
  }));
}
const evaluate = (changes = {}) => evaluateMedicineForecastIntervalCandidate({
  observations: history(), source, scope, release, ...changes,
});

test("chronologically disjoint 24/24 calibration-validation partitions", () => {
  const x = evaluate();
  assert.equal(x.accepted, true);
  assert.equal(x.productionApproved, false);
  assert.equal(x.customerVisible, false);
  assert.equal(x.intervalValidation.calibrationPeriods.first, "2022-01");
  assert.equal(x.intervalValidation.calibrationPeriods.last, "2023-12");
  assert.equal(x.intervalValidation.validationPeriods.first, "2024-01");
  assert.equal(x.intervalValidation.validationPeriods.last, "2025-12");
  assert.equal(x.intervalValidation.empiricalHoldoutCoverage, 1);
  assert.equal(x.intervalValidation.formalCoverageGuarantee, false);
  assert.equal(x.intervalValidation.calibratedErrorRadius, 0);
  assert.equal(x.forecast[0].period, "2026-01");
  assert.ok(x.forecast.every(f => f.intervalIsProductionCalibrated === false));
});

test("insufficient independent calibration months fail closed", () => {
  const x = evaluate({ observations: history(59) });
  assert.equal(x.code, "insufficient_independent_interval_history");
  assert.deepEqual(x.forecast, []);
  assert.equal(x.productionApproved, false);
});

test("permission rejection and unaccepted observations propagate", () => {
  assert.equal(evaluate({ source: { ...source, licenceAllowsForecasting: false } }).accepted, false);
  assert.equal(evaluate({ release: { ...release, customerForecastingEnabled: true } }).accepted, false);
  const observations = history().map((r, i) => i === 23 ? { ...r, validationSample: true } : r);
  assert.equal(evaluate({ observations }).code, "historical_series_invalid_or_mixed");
});

test("out-of-time demand shift fails actual coverage even if calibration residuals are zero", () => {
  const shifted = history().map((row, i) => i >= 36 ? { ...row, value: row.value + 200 } : row);
  const x = evaluate({ observations: shifted });
  assert.equal(x.intervalValidation.calibratedErrorRadius, 0);
  assert.equal(x.intervalValidation.empiricalHoldoutCoverage, 0.5);
  assert.equal(x.intervalValidation.empiricalCoveragePassed, false);
  assert.equal(x.accepted, false);
  assert.equal(x.code, "independent_interval_coverage_failed");
  assert.deepEqual(x.forecast, []);
  assert.equal(x.productionApproved, false);
});

test("calibration width is learned before the disjoint validation window", () => {
  const noisy = history().map((row, i) =>
    i >= 12 && i < 36 ? { ...row, value: row.value + 5 } : row);
  const x = evaluate({ observations: noisy });
  assert.equal(x.accepted, true);
  assert.ok(x.intervalValidation.calibratedErrorRadius > 0);
  assert.ok(x.forecast[0].candidateErrorRange.upper >= x.forecast[0].estimate);
  assert.equal(x.productionApproved, false);
});
