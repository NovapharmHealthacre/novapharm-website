import type { ForecastMetrics, ForecastPoint, ForecastResult, TimeSeriesPoint } from "./types.ts";

type ForecastModel = "seasonal_naive" | "holt_linear";

interface ModelFit {
  readonly predict: (horizon: number) => number;
  readonly residualStandardDeviation: number;
}

function validateSeries(series: readonly TimeSeriesPoint[]): void {
  if (series.length < 6) throw new Error("Forecasting requires at least six monthly observations.");
  let previous = "";
  for (const point of series) {
    if (!/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/u.test(point.period)) throw new Error("Forecast period must use YYYY-MM.");
    if (point.period <= previous) throw new Error("Forecast periods must be unique and strictly increasing.");
    if (!Number.isFinite(point.value) || point.value < 0) throw new Error("Forecast observations must be finite and non-negative.");
    previous = point.period;
  }
}

function nextMonth(period: string, offset: number): string {
  const [yearValue, monthValue] = period.split("-").map(Number);
  if (!yearValue || !monthValue) throw new Error("Forecast period is invalid.");
  const date = new Date(Date.UTC(yearValue, monthValue - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1));
}

function seasonalNaive(values: readonly number[], seasonLength: number): ModelFit {
  if (values.length < seasonLength) throw new Error("Seasonal-naive history is shorter than the configured season.");
  const residuals = values.slice(seasonLength).map((value, index) => value - (values[index] ?? value));
  return Object.freeze({
    predict: (horizon: number) => values[values.length - seasonLength + ((horizon - 1) % seasonLength)] ?? values.at(-1) ?? 0,
    residualStandardDeviation: standardDeviation(residuals),
  });
}

function holtFor(values: readonly number[], alpha: number, beta: number): Readonly<{ level: number; trend: number; residuals: readonly number[]; sse: number }> {
  let level = values[0] ?? 0;
  let trend = values.length > 1 ? (values[1] ?? level) - level : 0;
  const residuals: number[] = [];
  let sse = 0;
  for (let index = 1; index < values.length; index += 1) {
    const observed = values[index] ?? 0;
    const predicted = level + trend;
    const residual = observed - predicted;
    residuals.push(residual);
    sse += residual ** 2;
    const priorLevel = level;
    level = alpha * observed + (1 - alpha) * predicted;
    trend = beta * (level - priorLevel) + (1 - beta) * trend;
  }
  return Object.freeze({ level, trend, residuals: Object.freeze(residuals), sse });
}

function holtLinear(values: readonly number[]): ModelFit {
  const grid = [0.2, 0.4, 0.6, 0.8] as const;
  let best = holtFor(values, grid[0], grid[0]);
  for (const alpha of grid) for (const beta of grid) {
    const fit = holtFor(values, alpha, beta);
    if (fit.sse < best.sse) best = fit;
  }
  return Object.freeze({ predict: (horizon: number) => Math.max(0, best.level + horizon * best.trend), residualStandardDeviation: standardDeviation(best.residuals) });
}

function fit(model: ForecastModel, values: readonly number[], seasonLength: number): ModelFit {
  return model === "seasonal_naive" ? seasonalNaive(values, Math.min(seasonLength, values.length)) : holtLinear(values);
}

function metrics(actual: readonly number[], predicted: readonly number[], lowers: readonly number[], uppers: readonly number[]): ForecastMetrics {
  if (!actual.length || actual.length !== predicted.length) throw new Error("Forecast evaluation arrays do not reconcile.");
  const errors = actual.map((value, index) => (predicted[index] ?? 0) - value);
  const absolute = errors.map(Math.abs);
  const actualTotal = actual.reduce((sum, value) => sum + Math.abs(value), 0);
  const smape = actual.reduce((sum, value, index) => {
    const prediction = Math.abs(predicted[index] ?? 0);
    const denominator = Math.abs(value) + prediction;
    return sum + (denominator === 0 ? 0 : (2 * Math.abs((predicted[index] ?? 0) - value)) / denominator);
  }, 0) / actual.length;
  const covered = actual.filter((value, index) => value >= (lowers[index] ?? Number.POSITIVE_INFINITY) && value <= (uppers[index] ?? Number.NEGATIVE_INFINITY)).length;
  return Object.freeze({
    mae: absolute.reduce((sum, value) => sum + value, 0) / actual.length,
    wape: actualTotal === 0 ? 0 : absolute.reduce((sum, value) => sum + value, 0) / actualTotal,
    smape,
    bias: errors.reduce((sum, value) => sum + value, 0) / actual.length,
    intervalCoverage: covered / actual.length,
    observations: actual.length,
  });
}

function rollingBacktest(series: readonly TimeSeriesPoint[], model: ForecastModel, seasonLength: number): ForecastMetrics {
  const values = series.map((point) => point.value);
  const start = Math.max(Math.min(seasonLength * 2, values.length - 2), Math.ceil(values.length * 0.5), 4);
  const actual: number[] = [];
  const predicted: number[] = [];
  const lowers: number[] = [];
  const uppers: number[] = [];
  for (let origin = start; origin < values.length; origin += 1) {
    const history = values.slice(0, origin);
    const modelFit = fit(model, history, seasonLength);
    const prediction = Math.max(0, modelFit.predict(1));
    const width = 1.96 * modelFit.residualStandardDeviation;
    actual.push(values[origin] ?? 0);
    predicted.push(prediction);
    lowers.push(Math.max(0, prediction - width));
    uppers.push(prediction + width);
  }
  return metrics(actual, predicted, lowers, uppers);
}

export function forecastMonthlySeries(
  series: readonly TimeSeriesPoint[],
  options: Readonly<{ horizon: number; seasonLength?: number; featureCutoff?: string }> ,
): ForecastResult {
  validateSeries(series);
  const horizon = options.horizon;
  const seasonLength = options.seasonLength ?? 12;
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 24) throw new Error("Forecast horizon must be between one and 24 months.");
  if (!Number.isInteger(seasonLength) || seasonLength < 2 || seasonLength > 12) throw new Error("Forecast season length must be between two and 12 months.");
  const trainingCutoff = series.at(-1)?.period ?? "";
  const featureCutoff = options.featureCutoff ?? trainingCutoff;
  if (featureCutoff > trainingCutoff) throw new Error("Forecast features may not be newer than the training cutoff.");
  const candidates: readonly ForecastModel[] = series.length >= seasonLength * 2 ? ["seasonal_naive", "holt_linear"] : ["holt_linear"];
  const evaluations = candidates.map((model) => Object.freeze({ model, metrics: rollingBacktest(series, model, seasonLength) }));
  const selected = evaluations.toSorted((left, right) => left.metrics.wape - right.metrics.wape || left.metrics.mae - right.metrics.mae)[0];
  if (!selected) throw new Error("No forecast model could be evaluated.");
  const fitted = fit(selected.model, series.map((point) => point.value), seasonLength);
  const values: ForecastPoint[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    const value = Math.max(0, fitted.predict(step));
    const width = 1.96 * fitted.residualStandardDeviation * Math.sqrt(step);
    values.push(Object.freeze({ horizon: step, period: nextMonth(trainingCutoff, step), value, lower: Math.max(0, value - width), upper: value + width }));
  }
  return Object.freeze({
    model: selected.model,
    modelVersion: "novapharm-baseline-forecast-v1",
    trainingCutoff,
    featureCutoff,
    seasonLength,
    intervalLevel: 0.95,
    backtest: selected.metrics,
    values: Object.freeze(values),
    limitations: Object.freeze([
      "This is a numerical baseline selected by rolling-origin validation; it is not generated by an LLM.",
      "Intervals are residual-based and require ongoing calibration monitoring.",
      "NHS demand and NovaPharm obtainable sales remain separate forecasts.",
    ]),
  });
}

export function reconcileBottomUp(children: Readonly<Record<string, readonly ForecastPoint[]>>): readonly ForecastPoint[] {
  const series = Object.values(children);
  if (!series.length) return Object.freeze([]);
  const horizon = series[0]?.length ?? 0;
  if (series.some((values) => values.length !== horizon)) throw new Error("Hierarchical child forecasts must use the same horizon.");
  return Object.freeze(Array.from({ length: horizon }, (_, index) => {
    const points = series.map((values) => values[index]).filter((value): value is ForecastPoint => Boolean(value));
    const first = points[0];
    if (!first || points.some((point) => point.period !== first.period || point.horizon !== first.horizon)) throw new Error("Hierarchical child forecast periods do not align.");
    return Object.freeze({ horizon: first.horizon, period: first.period, value: points.reduce((sum, point) => sum + point.value, 0), lower: points.reduce((sum, point) => sum + point.lower, 0), upper: points.reduce((sum, point) => sum + point.upper, 0) });
  }));
}
