/**
 * Only real finite observations may become plotted trend points.
 *
 * Missing/null/blank values must not be coerced to zero. A real numeric zero
 * is valid evidence. This is a pure presentation filter; source acceptance,
 * chronological ordering and medicine entitlements remain server governed.
 */
export type ObservedTrendPoint = Readonly<{ label: string; value: number }>;

export function observedTrendPoints(rows: readonly Readonly<Record<string, unknown>>[]): readonly ObservedTrendPoint[] {
  return rows.flatMap((row): ObservedTrendPoint[] => {
    const rawPeriod = row["month_key"];
    const rawMetric = row["metric_value"];
    if (typeof rawPeriod !== "string" || !rawPeriod.trim()) return [];
    if (typeof rawMetric !== "number" && typeof rawMetric !== "string") return [];
    if (typeof rawMetric === "string" && !rawMetric.trim()) return [];
    const value = Number(rawMetric);
    if (!Number.isFinite(value)) return [];
    return [{ label: rawPeriod.trim(), value }];
  });
}
