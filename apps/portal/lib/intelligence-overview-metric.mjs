/** Distinguish absent/unusable snapshot counts from a genuinely supplied zero. */
export function formatIntelligenceOverviewMetric(snapshot, key) {
  const matches = Array.isArray(snapshot?.metrics) ? snapshot.metrics.filter(m => m?.key === key) : [];
  if (matches.length !== 1) return "Not available";
  const value = matches[0].value;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return "Not available";
  return value.toLocaleString("en-GB");
}
