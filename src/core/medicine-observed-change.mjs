/**
 * Evidence-derived, non-causal change observation for a single medicine.
 * No model, alert, commercial opportunity, or licensed-use decision is inferred.
 * All values originate from the existing board-scoped, accepted-facts analytics query.
 */
const metricTypes = new Set(["items", "quantity", "nic", "actual_cost"]);
const period = /^\d{4}-(0[1-9]|1[0-2])$/u;
const identity = /^medicine-[a-f0-9]{32}$/u;
const numeric = value => {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === "string" && /^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : null;
  }
  return null;
};
const nextPeriod = raw => {
  const [year, month] = raw.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
};
const unavailable = (reason, base) => ({
  ...base, state: "insufficient_comparable_evidence", reason, observation: null
});

/** A bounded source-attributed observation, never a causal claim or forecast. */
export function buildObservedMedicineChange({
  medicineId, dataset, metric, dataState, sourceId, series,
  reconciliation
} = {}) {
  const base = {
    contract: "novapharm.intelligence.observed-medicine-change.v1",
    evidenceType: "derived_metric",
    decisionReady: false,
    sourceRights: "must_be_checked_at_service_boundary",
    state: "insufficient_comparable_evidence",
    methodology: "Difference between the latest and oldest of exactly three consecutive monthly observations from a single accepted source, with percentage change relative to the oldest when nonzero.",
    limitations: [
      "A change in aggregated observations is not evidence of its cause, unmet demand, obtainable sales, shortage, availability, or regulatory approval.",
      "Constant practice/geography coverage, data revisions, source rights and population denominators are not independently certified by this calculation.",
      "No recommendation, probability, forecast or commercial opportunity is generated."
    ]
  };
  if (!identity.test(medicineId ?? "")) return unavailable("canonical_identity_not_selected", base);
  if (dataset !== "epd" && dataset !== "pca") return unavailable("dataset_not_accepted_for_this_contract", base);
  const approvedSource = dataset === "epd" ? "nhsbsa.epd" : "nhsbsa.pca";
  if (sourceId !== approvedSource) return unavailable("source_identity_unverified", base);
  if (!metricTypes.has(metric)) return unavailable("metric_not_comparable_without_separate_method", base);
  if (dataState !== "accepted_facts" || !Array.isArray(series) || series.length < 3 || series.length > 120) {
    return unavailable("three_accepted_monthly_observations_required", base);
  }
  if (reconciliation?.applicable !== true || reconciliation.reconciles !== true ||
      reconciliation.seriesTruncated === true) return unavailable("reconciliation_not_accepted", base);
  const observations = [];
  const used = new Set();
  for (const entry of series) {
    if (!entry || typeof entry !== "object" || !period.test(entry.month_key ?? "") ||
        used.has(entry.month_key)) return unavailable("invalid_or_duplicate_reporting_period", base);
    const value = numeric(entry.metric_value);
    if (value === null) return unavailable("invalid_or_missing_observed_value", base);
    used.add(entry.month_key);
    observations.push({ month: entry.month_key, value });
  }
  observations.sort((a,b) => a.month.localeCompare(b.month));
  const latest = observations.slice(-3);
  if (nextPeriod(latest[0].month) !== latest[1].month ||
      nextPeriod(latest[1].month) !== latest[2].month) {
    return unavailable("nonconsecutive_reporting_periods", base);
  }
  const from = latest[0], to = latest[2];
  const change = to.value - from.value;
  const percentage = from.value === 0 ? null : (change / from.value) * 100;
  if (!Number.isFinite(change) || (percentage !== null && !Number.isFinite(percentage))) {
    return unavailable("unstable_arithmetic", base);
  }
  return {
    ...base, state: "observed_change_candidate_requires_review", reason: null,
    observation: {
      sourceId: approvedSource, dataset, metric, fromMonth: from.month, throughMonth: to.month,
      baselineValue: from.value, latestValue: to.value, absoluteChange: change,
      percentageChange: percentage, comparisonMonths: latest.map(x => x.month),
      directionalLabel: change > 0 ? "increased" : change < 0 ? "decreased" : "unchanged",
      comparisonBasis: "same_dataset_same_filters_latest_three_months"
    }
  };
}
