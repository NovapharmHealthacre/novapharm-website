import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMedicineForecastBaseline } from "../src/core/medicine-forecast-baseline.mjs";

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
const data = Array.from({ length: 36 }, (_, i) => ({
  period: `${2023 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, "0")}`,
  value: 100 + (i % 12) * 2, sourceId: source.sourceId,
  medicineId: id, jurisdiction: scope.jurisdiction, measure: scope.measure,
  unit: scope.unit, accepted: true, validationSample: false,
  provenanceSha256: "a".repeat(64),
}));
const evaluate = overrides => evaluateMedicineForecastBaseline({
  observations: data, source, scope, release, ...overrides,
});

test("36 accepted months yield reproducible holdout and unapproved baseline", () => {
  const a = evaluate();
  assert.deepEqual(a, evaluate());
  assert.equal(a.accepted, true);
  assert.equal(a.productionApproved, false);
  assert.equal(a.backtest.holdoutMonths, 12);
  assert.equal(a.backtest.mae, 0);
  assert.equal(a.backtest.smape, 0);
  assert.deepEqual(a.forecast.map(f => f.period), [
    "2026-01", "2026-02", "2026-03",
  ]);
  assert.ok(a.forecast.every(f => f.evidenceType === "model_forecast" &&
    !f.intervalIsCalibratedConfidence));
});

test("licence, accepted ingestion, authorised scope and release are mandatory", () => {
  assert.equal(evaluate({
    source: { ...source, licenceAllowsForecasting: false },
  }).code, "source_rights_or_ingestion_unaccepted");
  assert.equal(evaluate({
    source: { ...source, ingestionRunAccepted: false },
  }).accepted, false);
  assert.equal(evaluate({
    release: { ...release, customerForecastingEnabled: true },
  }).accepted, false);
  assert.equal(evaluate({
    scope: { ...scope, verifiedServerSide: false },
  }).accepted, false);
});

test("gaps, mixing, unaccepted data and unsafe numeric values are rejected", () => {
  for (const changed of [
    { period: "2023-99" }, { period: "2029-01" },
    { measure: "dispensing_items" }, { jurisdiction: "US" },
    { unit: "packs" }, { sourceId: "different-source" },
    { accepted: false }, { validationSample: true },
    { provenanceSha256: "fake" }, { value: -1 }, { value: Number.NaN },
  ]) {
    const contaminated = data.map((row, index) =>
      index === 12 ? { ...row, ...changed } : row);
    assert.equal(evaluate({
      observations: contaminated,
    }).code, "historical_series_invalid_or_mixed");
  }
});

test("short series, excessive series and commercial sales do not forecast", () => {
  assert.equal(evaluate({
    observations: data.slice(1),
  }).code, "insufficient_or_unbounded_history");
  assert.equal(evaluate({
    scope: { ...scope, measure: "commercial_sales" },
  }).accepted, false);
  assert.equal(evaluate({
    observations: Array.from({ length: 241 }, (_, i) => data[i % 36]),
  }).accepted, false);
});

test("holdout error remains visible and never implies owner approval", () => {
  const shifted = data.map((row, i) =>
    i < 24 ? row : { ...row, value: row.value + 50 });
  const result = evaluate({ observations: shifted });
  assert.equal(result.backtest.mae, 50);
  assert.ok(result.backtest.smape > 0);
  assert.equal(result.productionApproved, false);
  assert.equal(result.forecast[0].empiricalErrorRange.lower, 100);
});
