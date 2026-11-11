import { evaluateMedicineForecastBaseline } from "./medicine-forecast-baseline.mjs";

const CONTRACT = "novapharm.intelligence.forecast-interval-candidate.v1";
const round = n => Number(n.toFixed(4));
const refuse = code => Object.freeze({
  contract: CONTRACT, accepted: false, code,
  productionApproved: false, customerVisible: false,
  intervalValidation: null, forecast: [],
});

function absoluteSeasonalErrors(observations, from, to) {
  return Array.from({ length: to - from }, (_, index) => {
    const at = from + index;
    return Math.abs(observations[at].value - observations[at - 12].value);
  });
}

function conformalRank(values, confidence) {
  const sorted = [...values].sort((a, b) => a - b);
  // Finite-sample split-conformal order statistic; time-series exchangeability
  // is NOT assumed or claimed. Measure untouched chronological holdout coverage.
  const rank = Math.ceil((sorted.length + 1) * confidence);
  return rank > sorted.length ? null : sorted[rank - 1];
}

/**
 * Private model-validation candidate, not a customer forecasting service.
 * Requires the same server-supplied source, rights, scope and release grants
 * as the baseline. No ingestion, entitlement or model sign-off is created.
 * Chronological split: >=12-month warm-up; 24-month calibration;
 * 24-month independent validation. Each seasonal prediction uses the
 * corresponding month 12 months earlier, available before each target month.
 */
export function evaluateMedicineForecastIntervalCandidate(args = {}) {
  const baseline = evaluateMedicineForecastBaseline(args);
  if (!baseline.accepted) return refuse(baseline.code);
  const observations = args.observations;
  if (observations.length < 60) {
    return refuse("insufficient_independent_interval_history");
  }
  const validationStart = observations.length - 24;
  const calibrationStart = validationStart - 24;
  const calibrationErrors = absoluteSeasonalErrors(observations, calibrationStart, validationStart);
  const validationErrors = absoluteSeasonalErrors(observations, validationStart, observations.length);
  const width = conformalRank(calibrationErrors, 0.9);
  if (width === null || !Number.isFinite(width) || width < 0) {
    return refuse("invalid_calibration_quantile");
  }
  const covered = validationErrors.filter(e => e <= width).length;
  const actualCoverage = covered / validationErrors.length;
  const mae = validationErrors.reduce((a, b) => a + b, 0) / validationErrors.length;
  const bias = observations.slice(validationStart).reduce((acc, row, i) =>
    acc + observations[validationStart + i - 12].value - row.value, 0) / 24;
  const calibrationPeriods = Object.freeze({
    first: observations[calibrationStart].period,
    last: observations[validationStart - 1].period,
  });
  const validationPeriods = Object.freeze({
    first: observations[validationStart].period,
    last: observations.at(-1).period,
  });
  const empiricalCoveragePassed = actualCoverage >= 0.9;
  const forecast = Object.freeze((empiricalCoveragePassed ? baseline.forecast : []).map(f => Object.freeze({
    period: f.period, estimate: f.estimate, evidenceType: "model_forecast",
    candidateErrorRange: Object.freeze({
      lower: round(Math.max(0, f.estimate - width)),
      upper: round(f.estimate + width),
    }),
    intervalIsProductionCalibrated: false,
  })));
  return Object.freeze({
    contract: CONTRACT, accepted: true,
    code: "independent_interval_validation_candidate_only",
    baselineModel: baseline.baselineModel,
    inputFingerprint: baseline.inputFingerprint,
    intervalValidation: Object.freeze({
      method: "chronological-absolute-error-quantile-provisional",
      targetCoverage: 0.9,
      calibrationMonths: 24, validationMonths: 24,
      calibrationPeriods, validationPeriods,
      calibratedErrorRadius: round(width),
      empiricalHoldoutCoverage: round(actualCoverage),
      coveredMonths: covered,
      validationMae: round(mae), validationBias: round(bias),
      empiricalCoveragePassed, independentEvaluation: true,
      formalCoverageGuarantee: false,
    }),
    forecast,
    productionApproved: false, customerVisible: false,
    limitations: Object.freeze([
      "Historical data rights, ingestion acceptance and provenance require independent certification.",
      "An empirical holdout coverage test is not formal time-series predictive interval calibration.",
      "External model-owner validation, multi-medicine stability and production security sign-off remain mandatory.",
      "No customer exposure, automatic recommendation, medical or commercial inference is authorised.",
    ]),
  });
}
