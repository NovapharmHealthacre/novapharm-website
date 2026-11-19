import { createHash } from "node:crypto";

const periodRx = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const approvedMeasures = new Set(["prescribing_items", "dispensing_items", "secondary_care_quantity"]);
const fingerprint = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const round = n => Number(n.toFixed(4));
const denied = (code, details = []) => Object.freeze({
  contract: "novapharm.intelligence.forecast-baseline.v1", accepted: false, code,
  forecast: [], backtest: null, productionApproved: false, limitations: details,
});

function incrementMonth(key, by = 1) {
  const [year, month] = key.split("-").map(Number);
  const i = year * 12 + month - 1 + by;
  const y = Math.floor(i / 12);
  if (y < 1000 || y > 9999) return null;
  return `${y.toString().padStart(4, "0")}-${String(i % 12 + 1).padStart(2, "0")}`;
}

function quantile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[rank];
}

/**
 * Auditable seasonal-naive baseline, NOT a production-approved forecast.
 * Requires server-proven rights and non-sample observed records and never
 * creates a commercial recommendation, sale claim or subscription grant.
 */
export function evaluateMedicineForecastBaseline({ observations, source, scope, release } = {}) {
  if (!source || source.acceptedServerSide !== true ||
      source.licenceAllowsForecasting !== true ||
      source.ingestionRunAccepted !== true ||
      typeof source.sourceId !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/u.test(source.sourceId)) {
    return denied("source_rights_or_ingestion_unaccepted");
  }
  if (!scope || scope.verifiedServerSide !== true ||
      typeof scope.medicineId !== "string" ||
      !/^medicine-[a-f0-9]{32}$/u.test(scope.medicineId) ||
      typeof scope.jurisdiction !== "string" ||
      !/^[A-Z]{2}$/u.test(scope.jurisdiction) ||
      !approvedMeasures.has(scope.measure) ||
      typeof scope.unit !== "string" ||
      !/^[a-zA-Z][a-zA-Z0-9_-]{1,31}$/u.test(scope.unit)) {
    return denied("scope_not_authorised_or_comparable");
  }
  if (release?.verifiedServerSide !== true ||
      release?.forecastEvaluationEnabled !== true ||
      release?.customerForecastingEnabled !== false ||
      release?.sourceRightsCertified !== true) {
    return denied("forecast_evaluation_not_released");
  }
  if (!Array.isArray(observations) || observations.length < 36 || observations.length > 240) {
    return denied("insufficient_or_unbounded_history", [
      "At least 36 consecutive accepted monthly observations required.",
    ]);
  }
  let previous = null;
  for (const row of observations) {
    if (!row || typeof row !== "object" || typeof row.period !== "string" ||
        !periodRx.test(row.period) ||
        (previous !== null && row.period !== incrementMonth(previous)) ||
        typeof row.value !== "number" || !Number.isFinite(row.value) ||
        row.value < 0 || !Number.isSafeInteger(row.value * 1000) ||
        row.sourceId !== source.sourceId || row.medicineId !== scope.medicineId ||
        row.jurisdiction !== scope.jurisdiction ||
        row.measure !== scope.measure || row.unit !== scope.unit ||
        row.accepted !== true || row.validationSample !== false ||
        typeof row.provenanceSha256 !== "string" ||
        !/^[a-f0-9]{64}$/u.test(row.provenanceSha256)) {
      return denied("historical_series_invalid_or_mixed");
    }
    previous = row.period;
  }
  const holdoutCount = 12;
  const holdoutStart = observations.length - holdoutCount;
  const actual = observations.slice(holdoutStart).map(z => z.value);
  const predicted = observations.slice(holdoutStart).map((_, i) =>
    observations[holdoutStart + i - 12].value);
  const abs = actual.map((a, i) => Math.abs(a - predicted[i]));
  const mae = abs.reduce((a, b) => a + b, 0) / holdoutCount;
  const smape = actual.map((a, i) =>
    (a === 0 && predicted[i] === 0) ? 0 :
      2 * Math.abs(a - predicted[i]) / (a + predicted[i])
  ).reduce((a, b) => a + b, 0) / holdoutCount;
  const band = quantile(abs, 0.9);
  const next = [1, 2, 3].map(step => {
    const estimate = observations[observations.length - 12 + step - 1].value;
    const p = incrementMonth(previous, step);
    if (!p) return null;
    return Object.freeze({
      period: p, evidenceType: "model_forecast", estimate: round(estimate),
      empiricalErrorRange: Object.freeze({
        lower: round(Math.max(0, estimate - band)),
        upper: round(estimate + band),
      }),
      intervalIsCalibratedConfidence: false,
    });
  });
  if (next.some(x => !x)) return denied("forecast_period_out_of_bounds");
  return Object.freeze({
    contract: "novapharm.intelligence.forecast-baseline.v1",
    accepted: true, code: "candidate_baseline_only",
    baselineModel: "seasonal-naive-12-month-v1",
    evidenceType: "model_forecast",
    inputFingerprint: fingerprint({ source: source.sourceId, scope, observations }),
    backtest: Object.freeze({
      holdoutMonths: holdoutCount,
      firstHoldoutPeriod: observations[holdoutStart].period,
      lastHoldoutPeriod: previous,
      mae: round(mae), smape: round(smape),
      empiricalNinetyPercentAbsoluteError: round(band),
      leakageCheck: "historical_same-month-only",
    }),
    forecast: Object.freeze(next), productionApproved: false,
    limitations: Object.freeze([
      "Empirical holdout error range is not a calibrated predictive confidence interval.",
      "Independent model-owner review must validate leakage, comparators, stability, calibration and impact.",
      "Not a sales forecast, a customer-ready service, or a commercial recommendation.",
    ]),
  });
}
