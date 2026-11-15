"use client";

import styles from "./medicines-intelligence.module.css";

/**
 * Three evidence-limited Intelligence research workspaces. These projections
 * consume only already-authorised medicine analytics passed by the protected
 * parent. They do not fetch a second source, construct market-share
 * denominators, turn NHS reported costs into prices or produce live signals.
 */
export type ObservedWorkspaceKind = "medicine-tape" | "market-structure" | "pricing-reimbursement";

type ObservedAnalytics = Readonly<{
  source: string;
  dataState: "accepted_facts" | "no_matching_facts" | "source_not_ingested";
  query: Readonly<{ dataset: "epd" | "pca"; metric: string }>;
  sourcePeriods: readonly string[];
  series: readonly Record<string, unknown>[];
  breakdowns?: Readonly<{ presentations: readonly Record<string, unknown>[] }>;
  summary?: Readonly<{
    totalNic: number | null;
    totalActualCost: number | null;
    firstMonth: string | null;
    latestMonth: string | null;
  }>;
  reconciliation: Readonly<{
    applicable: boolean;
    reconciles: boolean | null;
    seriesTruncated?: boolean;
  }>;
  limitations: readonly string[];
}>;
type MedicineSelection = Readonly<{ medicine: Readonly<{ medicineId: string; canonicalName: string }> }>;

const month = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const money = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(value);

const descriptions: Readonly<Record<ObservedWorkspaceKind, Readonly<{
  title: string; subtitle: string; limits: string;
}>>> = {
  "medicine-tape": {
    title: "Medicine Tape",
    subtitle: "A time-ordered record of observed prescribing, not real-time trading or stock movements.",
    limits: "The tape displays at most 36 source-accepted monthly values. No intraday market data, live stock, sales, wholesale prices or causal signals are inferred."
  },
  "market-structure": {
    title: "Market Structure",
    subtitle: "Compare observed presentation-level rows within the selected source and filters.",
    limits: "These are selected source observations, not national product market shares. Full channel coverage, supplier attribution and an independently verified denominator remain unavailable."
  },
  "pricing-reimbursement": {
    title: "Pricing & Reimbursement",
    subtitle: "Review reported NHS prescribing cost measures without treating them as prices.",
    limits: "Net ingredient cost (NIC) and actual cost are observed dataset measures, not NHS reimbursement tariffs, wholesale transaction prices, pack-equivalent commercial prices or patient co-payments."
  }
};

function DataUnavailable({ kind, reason }: Readonly<{ kind: ObservedWorkspaceKind; reason: string }>) {
  return <section className={styles.designedEmpty} role="status">
    <strong>{kind === "medicine-tape" ? "No reconciled monthly tape" : kind === "market-structure" ? "No reconciled presentation comparison" : "No reconciled reported cost measures"}</strong>
    <p>{reason}</p>
    <p>Accepted non-sample source facts, exact medicine identity and independent production rights remain required. No illustrative values are displayed.</p>
  </section>;
}

export function ObservedMedicineWorkspace({
  kind, detail, analytics,
}: Readonly<{ kind: ObservedWorkspaceKind; detail: MedicineSelection | null; analytics: ObservedAnalytics | null }>) {
  const config = descriptions[kind];
  const ready = Boolean(detail && analytics &&
    analytics.dataState === "accepted_facts" &&
    analytics.reconciliation.applicable === true &&
    analytics.reconciliation.reconciles === true &&
    analytics.reconciliation.seriesTruncated !== true);
  const reason = !detail ? "Choose an authorised medicine identity using Search." :
    !analytics || analytics.dataState === "source_not_ingested" ?
      "The selected analytical source has not completed a governed non-sample ingest." :
      analytics.dataState !== "accepted_facts" ?
        "No source-accepted observations match this medicine and the active filters." :
        "The selected source period or aggregation has not passed full reconciliation.";

  const series = ready && analytics ? analytics.series : [];
  const seriesWellFormed = series.length > 0 && series.every((item) =>
    typeof item["month_key"] === "string" && month.test(item["month_key"]) && finite(item["metric_value"]));
  const ordered = seriesWellFormed ? [...series].sort((a, b) =>
    String(a["month_key"]).localeCompare(String(b["month_key"]))) : [];
  const distinctPeriods = new Set(ordered.map((item) => String(item["month_key"]))).size === ordered.length;
  const tape = ready && seriesWellFormed && distinctPeriods ? ordered.slice(-36) : [];

  const presentations = ready ? analytics?.breakdowns?.presentations ?? [] : [];
  const presentationsValid = presentations.length > 0 && presentations.every(row =>
    typeof row["canonical_name"] === "string" && row["canonical_name"].trim().length > 0 &&
    finite(row["items"]) && finite(row["selected_metric"]));
  const marketRows = presentationsValid ? presentations.slice(0, 20) : [];

  const financial = ready && analytics?.summary &&
    finite(analytics.summary.totalNic) && finite(analytics.summary.totalActualCost)
    ? analytics.summary : null;

  return <section className={styles.routeWorkspace} aria-labelledby="observed-research-workspace-title">
    <header>
      <p className={styles.stateLabel}>Source-separated, read-only research</p>
      <h1 id="observed-research-workspace-title">{config.title}</h1>
      <p>{config.subtitle}</p>
      <p>{config.limits}</p>
    </header>
    {!ready ? <DataUnavailable kind={kind} reason={reason} /> : kind === "medicine-tape" ?
      tape.length ? <section className={styles.tableRegion}>
        <table>
          <caption>Observed monthly {analytics?.query.metric} for {detail?.medicine.canonicalName}; {analytics?.query.dataset.toUpperCase()} source</caption>
          <thead><tr><th scope="col">Source month</th><th scope="col">Observed {analytics?.query.metric}</th></tr></thead>
          <tbody>{tape.map(row => <tr key={String(row["month_key"])}>
            <td>{String(row["month_key"])}</td><td>{Number(row["metric_value"]).toLocaleString("en-GB", { maximumFractionDigits: 2 })}</td>
          </tr>)}</tbody>
        </table>
        {ordered.length > 36 ? <p>Displaying the latest 36 of {ordered.length} accepted periods; the displayed portion is incomplete.</p> : null}
      </section> : <DataUnavailable kind={kind} reason="The current source series has no unique, complete, valid monthly observations." />
      : kind === "market-structure" ? marketRows.length ?
        <section className={styles.tableRegion}>
          <table>
            <caption>Observed presentation mix for {detail?.medicine.canonicalName} within the selected {analytics?.query.dataset.toUpperCase()} dataset</caption>
            <thead><tr><th scope="col">Presentation</th><th scope="col">Observed items</th><th scope="col">Selected measure</th></tr></thead>
            <tbody>{marketRows.map((row, i) => <tr key={String(row["canonical_name"]) + "-" + i}>
              <td>{String(row["canonical_name"])}</td>
              <td>{Number(row["items"]).toLocaleString("en-GB")}</td>
              <td>{Number(row["selected_metric"]).toLocaleString("en-GB", { maximumFractionDigits: 2 })}</td>
            </tr>)}</tbody>
          </table>
          {presentations.length > 20 ? <p>Top 20 source-backed presentation rows only; this is not the complete medicine market.</p> : null}
        </section> : <DataUnavailable kind={kind} reason="The selected source has no complete presentation-level breakdown." />
      : financial ? <section className={styles.metricGrid} aria-label="Observed NHS prescribing cost measures">
          <article className={styles.metricPanel}><span>Reported net ingredient cost (NIC)</span><strong>{money(financial.totalNic)}</strong><small>{financial.firstMonth ?? "Source period not recorded"} to {financial.latestMonth ?? "Source period not recorded"}</small></article>
          <article className={styles.metricPanel}><span>Reported actual cost</span><strong>{money(financial.totalActualCost)}</strong><small>{analytics?.query.dataset.toUpperCase()} observed source measure</small></article>
        </section> : <DataUnavailable kind={kind} reason="Source-accepted, reconciled NIC and actual-cost totals are not available." />
    }
    <p className={styles.sourceLine}>Source: {analytics?.source || "Not ingested"}. Reporting periods: {analytics?.sourcePeriods.join(", ") || "Not available"}.</p>
    <p className={styles.sourceLine}>These views are research projections only. Customer release, redistribution permissions, clinical or commercial decisions and model egress require separate acceptance.</p>
  </section>;
}
