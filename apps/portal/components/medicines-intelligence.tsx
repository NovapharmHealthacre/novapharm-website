"use client";

import { type FormEvent, type ReactNode, useId, useState } from "react";
import type { MedicinesIntelligenceSubview } from "../data/routes";
import { gatewayJson, type PortalUser, professionalError } from "../lib/gateway";
import styles from "./medicines-intelligence.module.css";
import { PharmaScopeBrand } from "./pharmascope-brand";

type Metric = Readonly<{ key: string; label: string; value: number; format?: string }>;
type Column = readonly [string, string, string?];
type DataSection = Readonly<{
  title: string;
  description?: string;
  columns: readonly Column[];
  rows: readonly Record<string, unknown>[];
  emptyState: string;
  source?: string;
}>;
type IntelligenceSnapshot = Readonly<{
  environment: string;
  dataState: string;
  dataFreshness: string;
  readOnly: boolean;
  metrics: readonly Metric[];
  sections: readonly DataSection[];
  notices: readonly string[];
}>;

type MedicineSearchResult = Readonly<{
  medicineId: string;
  canonicalName: string;
  presentationCode: string | null;
  productName: string | null;
  productCode: string | null;
  chemicalSubstance: string | null;
  chemicalSubstanceCode: string | null;
  identityStatus: "bnf_current_identity_only";
}>;

type SearchResponse = Readonly<{
  query: string;
  source: string;
  sourcePeriod: string | null;
  demandFactsIncluded: false;
  results: readonly MedicineSearchResult[];
  dataFreshness: string | null;
}>;

type MedicineDetail = Readonly<{
  medicine: Readonly<{
    medicineId: string;
    canonicalName: string;
    medicineLevel: string;
    snomedCode: string | null;
    dmDStatus: string | null;
    supplierName: string | null;
    formulation: string | null;
    route: string | null;
    strength: string | null;
    unitOfMeasure: string | null;
    validFrom: string;
    validTo: string | null;
    sourceId: string;
    sourceLastSeenAt: string;
  }>;
  aliases: readonly Readonly<{ alias_type: string; alias_text: string }>[];
  codeHistory: readonly Readonly<{ code_system: string; code_value: string; code_level: string; valid_from: string; valid_to: string | null }>[];
  hierarchy: readonly Readonly<{ code: string; name: string; level: string; validFrom: string; validTo: string | null }>[];
  analyticalAvailability: Readonly<{ epd: boolean; pca: boolean; scmd: boolean; forecast: boolean }>;
  limitations: readonly string[];
}>;

type AnalyticsSummary = Readonly<{
  totalItems: number | null;
  totalQuantity: number | null;
  totalNic: number | null;
  totalActualCost: number | null;
  practiceCount: number | null;
  geographyCount: number | null;
  latestItemsPer1000: number | null;
  firstMonth: string | null;
  latestMonth: string | null;
  sourceCutoffAt: string | null;
}>;

type AnalyticsResponse = Readonly<{
  query: Readonly<{ dataset: "epd" | "pca"; metric: string; page: number; pageSize: number }>;
  source: string;
  sourcePeriods: readonly string[];
  dataState: "accepted_facts" | "no_matching_facts" | "source_not_ingested";
  rows: readonly Record<string, unknown>[];
  series: readonly Record<string, unknown>[];
  summary?: AnalyticsSummary;
  breakdowns?: Readonly<{
    geographies: readonly Record<string, unknown>[];
    presentations: readonly Record<string, unknown>[];
    practices: readonly Record<string, unknown>[];
  }>;
  pagination: Readonly<{ page: number; pageSize: number; totalRows: number; totalPages: number }>;
  reconciliation: Readonly<{ applicable: boolean; tableTotal: number | null; seriesTotal: number | null; reconciles: boolean | null; seriesTruncated?: boolean }>;
  limitations: readonly string[];
}>;

type NearbyResponse = Readonly<{
  query: Readonly<{ postcode: string; radiusKm: number; period: string | null; limit: number }>;
  origin: Readonly<{ postcode: string; latitude: number; longitude: number; sourceId: string }>;
  pharmacies: readonly Record<string, unknown>[];
  practices: readonly Record<string, unknown>[];
  resultCounts: Readonly<{ pharmacies: number; practices: number }>;
  truncated: boolean;
  source: string;
  limitations: readonly string[];
}>;

type AnalyticsFilters = Readonly<{
  dataset: "epd" | "pca";
  metric: string;
  startMonth: string;
  endMonth: string;
  region: string;
  icb: string;
  practiceCode: string;
  postcode: string;
  supplier: string;
}>;

type MedicinesIntelligenceProps = Readonly<{
  loading: boolean;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  parentStatus: string;
  snapshot: IntelligenceSnapshot;
  subview: MedicinesIntelligenceSubview | undefined;
  user: PortalUser;
}>;

const baseRoute = "/portal/executive-platform/medicines-intelligence/";
const navigationGroups = [
  {
    label: "Overview",
    items: [
      ["overview", "Dashboard", baseRoute],
      ["medicine-search", "Medicine search", `${baseRoute}medicine-search/`],
      ["geography", "Geography", `${baseRoute}geography/`],
      ["opportunities", "Pharmacy opportunity", `${baseRoute}opportunities/`],
      ["forecasts", "Forecasting", `${baseRoute}forecasts/`],
    ],
  },
  {
    label: "Data & insights",
    items: [
      ["prescribers", "Prescribing", `${baseRoute}prescribers/`],
      ["data-sources", "Data sources", `${baseRoute}data-sources/`],
    ],
  },
  {
    label: "Pharmacies",
    items: [
      ["pharmacies", "All pharmacies", `${baseRoute}pharmacies/`],
      ["campaigns", "Governed campaigns", `${baseRoute}campaigns/`],
    ],
  },
] as const;

const emptyFilters: AnalyticsFilters = {
  dataset: "epd",
  metric: "items",
  startMonth: "",
  endMonth: "",
  region: "",
  icb: "",
  practiceCode: "",
  postcode: "",
  supplier: "",
};

const emptyAnalyticsSummary: AnalyticsSummary = {
  totalItems: null,
  totalQuantity: null,
  totalNic: null,
  totalActualCost: null,
  practiceCount: null,
  geographyCount: null,
  latestItemsPer1000: null,
  firstMonth: null,
  latestMonth: null,
  sourceCutoffAt: null,
};

const epdColumns = [
  ["month_key", "Month"], ["canonical_name", "Medicine"], ["practice_code", "Practice code"],
  ["practice_name", "Practice"], ["practice_postcode", "Practice postcode"], ["icb_name", "ICB"],
  ["region_name", "Region"], ["items", "Items", "number"], ["quantity", "Quantity", "number"],
  ["nic", "NIC", "number"], ["actual_cost", "Actual cost", "money"], ["registered_population", "Registered population", "number"],
  ["metric_value", "Selected metric", "number"],
] as const;

const pcaColumns = [
  ["month_key", "Month"], ["canonical_name", "Medicine"], ["geography_type", "Geography type"],
  ["geography_code", "Geography code"], ["geography_name", "Geography"], ["items", "Items", "number"],
  ["quantity", "Quantity", "number"], ["nic", "NIC", "number"], ["actual_cost", "Actual cost", "money"],
  ["metric_value", "Selected metric", "number"],
] as const;

function display(value: unknown, type = ""): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (type === "money") return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(value);
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
  }
  return String(value).replaceAll("_", " ");
}

function section(snapshot: IntelligenceSnapshot, title: string): DataSection | null {
  return snapshot.sections.find((entry) => entry.title === title) ?? null;
}

function sectionValue(data: DataSection | null, rowName: string): number {
  const row = data?.rows.find((entry) => String(entry["evidence_state"] ?? entry["capability"] ?? "") === rowName);
  return Number(row?.["records"] ?? 0);
}

function metricValue(snapshot: IntelligenceSnapshot, key: string): number {
  return Number(snapshot.metrics.find((metric) => metric.key === key)?.value ?? 0);
}

function sourceStateLabel(dataState: string): string {
  if (dataState === "synthetic") return "Synthetic validation data";
  if (dataState === "authoritative_non_production_validation") return "Authoritative non-production validation evidence";
  if (dataState === "governed_sources_not_loaded") return "No governed intelligence data loaded";
  return display(dataState);
}

function activeDataStateLabel(snapshotState: string, analytics: AnalyticsResponse | null): string {
  if (analytics?.dataState === "accepted_facts") return "Accepted analytical facts loaded";
  if (analytics?.dataState === "no_matching_facts") return "No accepted facts matched the active filters";
  if (analytics?.dataState === "source_not_ingested") return "Selected source not ingested";
  return sourceStateLabel(snapshotState);
}

function updatedLabel(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Update time not recorded" : `Updated ${date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
}

function formSearchParams(filters: AnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value.trim()) params.set(key, value.trim());
  return params;
}

function EvidenceTable({ compact = false, data, headingLevel = 2 }: Readonly<{ compact?: boolean; data: DataSection | null; headingLevel?: 2 | 3 }>) {
  if (!data) return <p className={`${styles.empty} intelligence-empty`}>The governed evidence view is not available.</p>;
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return <section className={`${styles.tablePanel} ${compact ? styles.compactTablePanel : ""} intelligence-table-section`}>
    <header className={styles.panelHeader}>
      <div><Heading>{data.title}</Heading>{data.description ? <p>{data.description}</p> : null}</div>
      <p>{data.source ?? "Governed source"}</p>
    </header>
    {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll wide evidence tables. */}
    <section className={`${styles.tableRegion} intelligence-table-region`} tabIndex={0} aria-label={`${data.title}, scrollable table`}>
      <table><thead><tr>{data.columns.map(([key, label, type]) => <th scope="col" key={key} data-numeric={type === "number" || type === "money"}>{label}</th>)}</tr></thead>
        <tbody>{data.rows.length ? data.rows.map((row) => <tr key={data.columns.map(([key]) => String(row[key] ?? "")).join("|")}>{data.columns.map(([key, label, type]) => <td key={key} data-label={label} data-numeric={type === "number" || type === "money"} data-state={type === "status" ? String(row[key] ?? "unknown") : undefined}>{display(row[key], type)}</td>)}</tr>) : <tr><td className={styles.emptyCell} colSpan={Math.max(data.columns.length, 1)}>{data.emptyState}</td></tr>}</tbody>
      </table>
    </section>
  </section>;
}

function UnavailableEvidence({ title, statement, requirements }: Readonly<{ title: string; statement: string; requirements: readonly string[] }>) {
  return <section className={`${styles.unavailable} intelligence-unavailable`} aria-labelledby={`unavailable-${title.toLowerCase().replaceAll(" ", "-")}`}>
    <p className={styles.stateLabel}>Not yet evidenced</p>
    <h1 id={`unavailable-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h1>
    <p>{statement}</p>
    <h3>Required before this view can operate</h3>
    <ul>{requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
  </section>;
}

function MetricPanel({ label, value, context, kind = "number" }: Readonly<{ label: string; value: number | null; context: string; kind?: "number" | "money" | "decimal" }>) {
  let formatted = "Not available";
  if (value !== null) {
    if (kind === "money") formatted = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
    else formatted = new Intl.NumberFormat("en-GB", { maximumFractionDigits: kind === "decimal" ? 1 : 0 }).format(value);
  }
  return <article className={styles.metricPanel} data-available={value !== null}>
    <span>{label}</span><strong>{formatted}</strong><small>{context}</small>
  </article>;
}

function TrendChart({ metric, rows }: Readonly<{ metric: string; rows: readonly Record<string, unknown>[] }>) {
  const points = rows.map((row) => ({ label: String(row["month_key"] ?? ""), value: Number(row["metric_value"] ?? 0) })).filter((row) => Number.isFinite(row.value));
  if (!points.length) return <div className={styles.designedEmpty}><strong>No accepted trend is available</strong><p>Complete a governed non-sample source ingest, then run a medicine query.</p></div>;
  if (points.length === 1) return <div className={styles.designedEmpty}><strong>One accepted period is available</strong><p>{points[0]?.label}: {new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(points[0]?.value ?? 0)} {display(metric).toLocaleLowerCase("en-GB")}. A trend requires at least two accepted periods.</p></div>;
  const width = 640;
  const height = 220;
  const inset = 24;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const polyline = points.map((point, index) => {
    const x = inset + (index / Math.max(points.length - 1, 1)) * (width - inset * 2);
    const y = height - inset - ((point.value - min) / range) * (height - inset * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return <figure className={styles.trendFigure}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="trend-title trend-description">
      <title id="trend-title">Accepted monthly {display(metric)} trend</title>
      <desc id="trend-description">The series runs from {points[0]?.label} to {points.at(-1)?.label}, based only on accepted governed facts.</desc>
      <line x1={inset} x2={width - inset} y1={height - inset} y2={height - inset} className={styles.chartAxis} />
      <line x1={inset} x2={width - inset} y1={height / 2} y2={height / 2} className={styles.chartGrid} />
      <polyline points={polyline} className={styles.chartLine} />
    </svg>
    <figcaption><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></figcaption>
  </figure>;
}

function MedicineIdentity({ detail, headingLevel = 1 }: Readonly<{ detail: MedicineDetail; headingLevel?: 1 | 2 }>) {
  const medicine = detail.medicine;
  const identityCodes = detail.codeHistory.slice(0, 4);
  const hierarchy = detail.hierarchy.slice(0, 5);
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return <header className={styles.medicineIdentity}>
    <p className={styles.breadcrumb}>Medicine search / Current BNF identity</p>
    <div className={styles.identityTitle}><div><Heading>{medicine.canonicalName}</Heading><p>{medicine.formulation || medicine.route || "Presentation-level identity from the current governed BNF source."}</p></div><span>Identity verified in repository</span></div>
    <dl className={styles.identityCodes}>
      <div><dt>Identity level</dt><dd>{display(medicine.medicineLevel)}</dd></div>
      <div><dt>SNOMED CT</dt><dd>{display(medicine.snomedCode)}</dd></div>
      <div><dt>dm+d mapping</dt><dd>{display(medicine.dmDStatus)}</dd></div>
      <div><dt>Valid from</dt><dd>{display(medicine.validFrom)}</dd></div>
      {identityCodes.map((code) => <div key={`${code.code_system}-${code.code_value}`}><dt>{display(code.code_system)}</dt><dd>{code.code_value}</dd></div>)}
    </dl>
    {hierarchy.length ? <section className={styles.identityHierarchy} aria-labelledby="medicine-hierarchy-title">
      <h3 id="medicine-hierarchy-title">Current BNF hierarchy</h3>
      <ol>{hierarchy.map((node) => <li key={`${node.level}-${node.code}`}><span>{display(node.level)}</span><strong>{node.name}</strong><code>{node.code}</code></li>)}</ol>
    </section> : null}
  </header>;
}

function GovernedEvidenceExtensions() {
  return <details className={styles.evidenceExtensions}>
    <summary>Regulatory, patent and SPC evidence</summary>
    <div>
      <section>
        <span>Regulatory documents</span>
        <strong>Authority not connected</strong>
        <p>No SmPC, PIL, assessment report or regulatory document is displayed until its issuing authority, version and effective date are governed.</p>
      </section>
      <section>
        <span>Patent and SPC intelligence</span>
        <strong>Legal interpretation not activated</strong>
        <p>No patent status, expiry date, freedom-to-operate conclusion or market-entry recommendation is inferred from an identity record.</p>
      </section>
    </div>
  </details>;
}

function AnalyticsDashboard({ analytics, detail }: Readonly<{ analytics: AnalyticsResponse | null; detail: MedicineDetail | null }>) {
  const summary = analytics?.summary ?? emptyAnalyticsSummary;
  const breakdowns = analytics?.breakdowns ?? { geographies: [], presentations: [], practices: [] };
  const period = summary.firstMonth && summary.latestMonth ? `${summary.firstMonth} to ${summary.latestMonth}` : "Run a governed query";
  const metricName = analytics?.query.metric ?? "items";
  const geographySection: DataSection = {
    title: "Top geographies",
    columns: [["name", "Geography"], ["items", "Items", "number"], ["selected_metric", "Selected metric", "number"]],
    rows: breakdowns.geographies,
    emptyState: "No accepted geographic breakdown is available for the active filters.",
    source: analytics?.source ?? "Governed geography aggregation",
  };
  const presentationSection: DataSection = {
    title: "Top presentations",
    columns: [["canonical_name", "Presentation"], ["items", "Items", "number"], ["selected_metric", "Selected metric", "number"]],
    rows: breakdowns.presentations,
    emptyState: "No accepted presentation breakdown is available for the active filters.",
    source: analytics?.source ?? "Governed medicine identity layer",
  };
  const practiceSection: DataSection = {
    title: "Top practices",
    columns: [["practice_name", "Practice"], ["practice_code", "ODS code"], ["icb_name", "ICB"], ["items", "Items", "number"], ["selected_metric", "Selected metric", "number"]],
    rows: breakdowns.practices,
    emptyState: "No accepted practice breakdown is available for the active filters.",
    source: analytics?.source ?? "English Prescribing Dataset",
  };
  const rawSection: DataSection | null = analytics ? {
    title: "Accepted analytical rows",
    description: `${analytics.pagination.totalRows.toLocaleString("en-GB")} rows matched. Page ${analytics.pagination.page.toLocaleString("en-GB")} of ${Math.max(analytics.pagination.totalPages, 1).toLocaleString("en-GB")}.`,
    columns: analytics.query.dataset === "epd" ? epdColumns : pcaColumns,
    rows: analytics.rows,
    emptyState: analytics.dataState === "source_not_ingested" ? "This source has not completed a governed non-sample ingest." : "No accepted facts matched every active filter.",
    source: analytics.source,
  } : null;
  return <>
    <section className={styles.metricGrid} aria-label="Medicine intelligence metrics">
      <MetricPanel label="Total items" value={summary.totalItems} context={period} />
      <MetricPanel label="Actual cost" value={summary.totalActualCost} context={period} kind="money" />
      <MetricPanel label="Number of practices" value={summary.practiceCount} context={analytics?.query.dataset === "epd" ? "Matched practices" : "Not applicable to PCA"} />
      <MetricPanel label="Items / 1,000 patients" value={summary.latestItemsPer1000} context={summary.latestMonth ? `Latest accepted month ${summary.latestMonth}` : "Registered-population denominator required"} kind="decimal" />
    </section>
    <section className={styles.analysisGrid}>
      <section className={styles.analysisPanel}>
        <header className={styles.analysisHeader}><h3>Prescribing trend</h3><span>{display(metricName)}</span></header>
        <TrendChart metric={metricName} rows={analytics?.series ?? []} />
        <p className={styles.sourceLine}>{analytics?.source ?? "English Prescribing Dataset source not ingested"}</p>
      </section>
      <section className={styles.analysisPanel}>
        <header className={styles.analysisHeader}><h3>Forecast</h3><span>Evidence gated</span></header>
        <div className={styles.designedEmpty}><strong>Authoritative history required</strong><p>Forecast unavailable until sufficient authoritative history, leakage-safe training, backtesting and uncertainty intervals have been accepted.</p></div>
      </section>
      <section className={styles.analysisPanel}>
        <header className={styles.analysisHeader}><h3>Geographic spread</h3><span>{summary.geographyCount === null ? "Not loaded" : `${summary.geographyCount} geographies`}</span></header>
        {breakdowns.geographies.length ? <div className={styles.geographyRanks}>{breakdowns.geographies.slice(0, 6).map((row, index) => <div key={String(row["code"] ?? row["name"] ?? index)}><span>{index + 1}</span><strong>{display(row["name"])}</strong><b>{display(row["selected_metric"])}</b></div>)}</div> : <div className={styles.designedEmpty}><strong>Interactive map not yet activated</strong><p>Period-aware polygons and accepted aggregations must be available through the protected API. No map image or inferred geography is substituted.</p></div>}
      </section>
    </section>
    <section className={styles.breakdownGrid}>
      <EvidenceTable compact data={geographySection} headingLevel={3} />
      <EvidenceTable compact data={presentationSection} headingLevel={3} />
      <EvidenceTable compact data={practiceSection} headingLevel={3} />
    </section>
    <section className={styles.opportunityPanel}>
      <header className={styles.analysisHeader}><h3>High opportunity pharmacies near high prescribing areas</h3><span>Not scored</span></header>
      <div className={styles.designedEmpty}><strong>No medicine-to-pharmacy ranking is displayed</strong><p>Accepted demand, distance, transparent score components, customer evidence and commercial approval are all required. Nearby prescribing would be labelled local prescribing demand, never items dispensed.</p></div>
    </section>
    <GovernedEvidenceExtensions />
    {rawSection ? <EvidenceTable data={rawSection} /> : null}
    {analytics ? <section className={styles.interpretation}><h3>Interpretation boundary</h3><ul>{analytics.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></section> : null}
    {!detail ? <p className={styles.srOnly}>No medicine is selected.</p> : null}
  </>;
}

function NearbyOrganisations() {
  const postcodeId = useId();
  const [response, setResponse] = useState<NearbyResponse | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Locating governed organisation records from postcode-centroid evidence.");
    try {
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(event.currentTarget).entries()) {
        const text = String(value).trim();
        if (text) params.set(key, text);
      }
      const next = await gatewayJson<NearbyResponse>(`enterprise/medicines/nearby?${params.toString()}`);
      setResponse(next);
      setStatus(`${next.resultCounts.pharmacies.toLocaleString("en-GB")} pharmacies and ${next.resultCounts.practices.toLocaleString("en-GB")} practices fall within the selected radius.`);
    } catch (error) {
      setResponse(null);
      setStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  const pharmacyRows = response?.pharmacies.map((row) => ({ ...row, verified_business_email: Number(row["verified_business_email"]) === 1 ? "Verified in source evidence" : "Not verified" })) ?? [];
  const pharmacySection: DataSection | null = response ? {
    title: "Nearby pharmacies", description: `Within ${response.query.radiusKm} km of ${response.origin.postcode}.`,
    columns: [["trading_name", "Pharmacy"], ["postcode_normalised", "Postcode"], ["country", "Nation"], ["distance_km", "Distance km", "number"], ["verified_business_email", "Business-email evidence"]],
    rows: pharmacyRows, emptyState: "No governed pharmacy record falls within this radius.", source: response.source,
  } : null;
  const practiceSection: DataSection | null = response ? {
    title: "Nearby practices", description: `Within ${response.query.radiusKm} km of ${response.origin.postcode}.`,
    columns: [["practice_name", "Practice"], ["practice_code", "Practice code"], ["distance_km", "Distance km", "number"], ["population_period", "Population period"], ["registered_population", "Registered population", "number"]],
    rows: response.practices, emptyState: "No governed practice record falls within this radius.", source: response.source,
  } : null;

  return <section className={`${styles.routeWorkspace} intelligence-query`} aria-labelledby="nearby-organisations-title">
    <header><p className={styles.stateLabel}>Period-aware postcode geography</p><h1 id="nearby-organisations-title">Nearby healthcare organisations</h1><p>Locate governed pharmacy and practice records by straight-line distance between postcode centroids. This does not establish dispensing behaviour, patient residence or travel time.</p></header>
    <form onSubmit={submit} className={styles.nearbyForm}><div className={styles.fieldGrid}>
      <label htmlFor={postcodeId}>UK postcode<input id={postcodeId} name="postcode" type="text" maxLength={12} autoComplete="postal-code" required /></label>
      <label>Radius<select name="radiusKm" defaultValue="5"><option value="1">1 km</option><option value="3">3 km</option><option value="5">5 km</option><option value="10">10 km</option></select></label>
      <label>Historical month<input name="period" type="month" /></label>
    </div><button type="submit" disabled={busy}>{busy ? "Locating" : "Find organisations"}</button></form>
    <p className={`${styles.liveStatus} medicine-search-status`} role="status" aria-live="polite">{status}</p>
    {response?.truncated ? <p className={styles.advisory}>The response reached its governed result limit. Narrow the radius before drawing conclusions.</p> : null}
    {pharmacySection ? <EvidenceTable data={pharmacySection} /> : null}
    {practiceSection ? <EvidenceTable data={practiceSection} /> : null}
    {response ? <section className={styles.interpretation}><h3>Interpretation boundary</h3><ul>{response.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></section> : null}
  </section>;
}

function FilterRail({ analytics, busy, detail, filters, onChange, onReset, onRun }: Readonly<{
  analytics: AnalyticsResponse | null;
  busy: boolean;
  detail: MedicineDetail | null;
  filters: AnalyticsFilters;
  onChange: (key: keyof AnalyticsFilters, value: string) => void;
  onReset: () => void;
  onRun: () => void;
}>) {
  return <section className={`${styles.filterSection} intelligence-query`} aria-labelledby="medicine-analytics-title">
    <header><div><h2 id="medicine-analytics-title">Examine accepted facts</h2><p>Every metric, table and chart consumes this active filter state.</p></div><button type="button" onClick={onReset} disabled={busy}>Clear</button></header>
    <fieldset disabled={busy || !detail}><legend className={styles.srOnly}>Core medicine intelligence filters</legend>
      <label>Dataset<select name="dataset" value={filters.dataset} onChange={(event) => onChange("dataset", event.currentTarget.value)}><option value="epd">English prescribing</option><option value="pca">Community dispensing</option></select></label>
      <label>Measure<select name="metric" value={filters.metric} onChange={(event) => onChange("metric", event.currentTarget.value)}><option value="items">Items</option><option value="quantity">Quantity</option><option value="nic">Net ingredient cost</option><option value="actual_cost">Actual cost</option>{filters.dataset === "epd" ? <option value="items_per_1000">Items per 1,000 patients</option> : null}</select></label>
      <div className={styles.dateFields}><label>Start month<input name="startMonth" type="month" value={filters.startMonth} onChange={(event) => onChange("startMonth", event.currentTarget.value)} /></label><label>End month<input name="endMonth" type="month" value={filters.endMonth} onChange={(event) => onChange("endMonth", event.currentTarget.value)} /></label></div>
      <details className={`${styles.advancedFilters} intelligence-filter-disclosure`}><summary>Filters</summary><div>
        <label>Region<input name="region" type="text" maxLength={160} autoComplete="off" value={filters.region} onChange={(event) => onChange("region", event.currentTarget.value)} /></label>
        <label>ICB<input name="icb" type="text" maxLength={160} autoComplete="off" value={filters.icb} onChange={(event) => onChange("icb", event.currentTarget.value)} /></label>
        <label>Practice code<input name="practiceCode" type="text" maxLength={32} autoCapitalize="characters" disabled={filters.dataset === "pca"} value={filters.practiceCode} onChange={(event) => onChange("practiceCode", event.currentTarget.value)} /></label>
        <label>Practice postcode<input name="postcode" type="text" maxLength={12} autoComplete="postal-code" disabled={filters.dataset === "pca"} value={filters.postcode} onChange={(event) => onChange("postcode", event.currentTarget.value)} /></label>
        <label>Supplier<input name="supplier" type="text" maxLength={240} autoComplete="organization" value={filters.supplier} onChange={(event) => onChange("supplier", event.currentTarget.value)} /></label>
      </div></details>
    </fieldset>
    <div className="intelligence-query-actions"><button className={styles.applyButton} type="button" disabled={busy || !detail} onClick={onRun}>{busy ? "Loading accepted facts" : "Run governed query"}</button><button type="button" disabled={busy} onClick={onReset}>Reset filters</button></div>
    {!detail ? <p className={styles.filterHint}>Select a medicine identity before running analytics.</p> : null}
    {analytics ? <dl className={styles.queryLedger}><div><dt>Data state</dt><dd>{display(analytics.dataState)}</dd></div><div><dt>Matched rows</dt><dd>{display(analytics.pagination.totalRows)}</dd></div><div><dt>Reconciled</dt><dd>{analytics.reconciliation.applicable ? display(analytics.reconciliation.reconciles) : "Not applicable"}</dd></div></dl> : null}
  </section>;
}

function ContextRail({ analytics, busy, detail, filters, onChange, onReset, onRun, snapshot }: Readonly<{
  analytics: AnalyticsResponse | null;
  busy: boolean;
  detail: MedicineDetail | null;
  filters: AnalyticsFilters;
  onChange: (key: keyof AnalyticsFilters, value: string) => void;
  onReset: () => void;
  onRun: () => void;
  snapshot: IntelligenceSnapshot;
}>) {
  const contact = section(snapshot, "Pharmacy contact evidence");
  const sources = section(snapshot, "Data sources and quality");
  const totalPharmacies = metricValue(snapshot, "pharmacies");
  const verified = sectionValue(contact, "Verified public non-NHS business email");
  const actioned = sectionValue(contact, "Research actioned, no new evidence");
  const customers = sectionValue(contact, "Linked customer");
  const prospects = sectionValue(contact, "Linked prospect");
  const marketingEligible = sectionValue(contact, "Marketing eligible");
  return <>
    <FilterRail analytics={analytics} busy={busy} detail={detail} filters={filters} onChange={onChange} onReset={onReset} onRun={onRun} />
    <section className={styles.railSection}><header><h2>Pharmacy contact evidence</h2><span>Not opportunity scoring</span></header><dl className={styles.railMetrics}>
      <div><dt>Total pharmacy records</dt><dd>{totalPharmacies.toLocaleString("en-GB")}</dd></div>
      <div><dt>Verified public business email</dt><dd>{verified.toLocaleString("en-GB")}</dd></div>
      <div><dt>Research actioned, no new evidence</dt><dd>{actioned.toLocaleString("en-GB")}</dd></div>
      <div><dt>Linked customers</dt><dd>{customers.toLocaleString("en-GB")}</dd></div>
      <div><dt>Linked prospects</dt><dd>{prospects.toLocaleString("en-GB")}</dd></div>
      <div><dt>Marketing eligible</dt><dd>{marketingEligible.toLocaleString("en-GB")}</dd></div>
    </dl><p>Verified contact evidence is not automatic marketing permission. Blank values remain blank until new evidence is approved.</p></section>
    <section className={styles.railSection}><header><h2>Top growth ICBs</h2><span>Not computed</span></header><div className={styles.designedEmpty}><strong>No accepted growth ranking</strong><p>National longitudinal prescribing facts have not completed the required governed backfill.</p></div></section>
    <section className={styles.railSection}><header><h2>Data & methodology</h2><span>Source truth</span></header>{sources?.rows.length ? <dl className={styles.methodology}>{sources.rows.slice(0, 5).map((row) => <div key={String(row["dataset_name"])}><dt>{display(row["dataset_name"])}</dt><dd>{display(row["status"])}</dd></div>)}</dl> : <p>No governed source-health rows are available.</p>}<p>Validation samples can never contribute to accepted analytics, maps, forecasts or commercial scores.</p></section>
    <section className={styles.railSection}><header><h2>AI analyst</h2><span>Governed query boundary</span></header><p>Contextual questions will resolve entities, execute deterministic queries and explain validated outputs. Numerical answers are unavailable until the relevant source and model evidence exists.</p></section>
  </>;
}

function PlatformOverview({ analytics, detail, headingLevel = 1, snapshot }: Readonly<{ analytics: AnalyticsResponse | null; detail: MedicineDetail | null; headingLevel?: 1 | 2; snapshot: IntelligenceSnapshot }>) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return <>
    {detail ? <MedicineIdentity detail={detail} headingLevel={headingLevel} /> : <header className={styles.emptySubject}><p className={styles.breadcrumb}>Medicines Intelligence / Governed workspace</p><Heading>Search a medicine</Heading><p>Understand a governed medicine identity, then examine source-separated demand, geography and commercial evidence. Nothing is inferred to fill an absent fact.</p><dl><div><dt>Medicine identities</dt><dd>{metricValue(snapshot, "medicines").toLocaleString("en-GB")}</dd></div><div><dt>Pharmacy records</dt><dd>{metricValue(snapshot, "pharmacies").toLocaleString("en-GB")}</dd></div><div><dt>Population-linked practices</dt><dd>{metricValue(snapshot, "population-linked-practices").toLocaleString("en-GB")}</dd></div></dl></header>}
    <AnalyticsDashboard analytics={analytics} detail={detail} />
  </>;
}

export function MedicinesIntelligence({ loading, onLogout, onRefresh, parentStatus, snapshot, subview, user }: MedicinesIntelligenceProps) {
  const current = subview ?? "overview";
  const searchId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [detail, setDetail] = useState<MedicineDetail | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(emptyFilters);
  const [searchStatus, setSearchStatus] = useState("");
  const [analyticsStatus, setAnalyticsStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function changeFilter(key: keyof AnalyticsFilters, value: string) {
    setFilters((currentFilters) => {
      const next = { ...currentFilters, [key]: value };
      if (key === "dataset" && value === "pca" && next.metric === "items_per_1000") next.metric = "items";
      return next;
    });
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setAnalytics(null);
    setAnalyticsStatus("Filters reset. Select the evidence you need.");
  }

  async function searchMedicine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("medicine") ?? "").trim();
    if (query.length < 2) {
      setSearchStatus("Enter at least two characters.");
      return;
    }
    setBusy(true);
    setSearchStatus("Searching the governed medicine identity register.");
    setSearchResponse(null);
    try {
      const next = await gatewayJson<SearchResponse>(`enterprise/medicines/search?q=${encodeURIComponent(query)}&limit=30`);
      setSearchResponse(next);
      setSearchStatus(next.results.length ? `${next.results.length} matching medicine identities.` : "No current BNF identity matched that search.");
    } catch (error) {
      setSearchStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  async function selectMedicine(medicineId: string) {
    setBusy(true);
    setSearchStatus("Loading the selected identity and BNF hierarchy.");
    try {
      const next = await gatewayJson<MedicineDetail>(`enterprise/medicines/${encodeURIComponent(medicineId)}`);
      setDetail(next);
      setAnalytics(null);
      setSearchResponse(null);
      setSearchStatus("Medicine identity loaded. Demand, sales, stock and availability are not inferred.");
    } catch (error) {
      setDetail(null);
      setSearchStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  async function runAnalytics() {
    if (!detail) {
      setAnalyticsStatus("Select a medicine identity before running analytics.");
      return;
    }
    const params = formSearchParams(filters);
    params.set("medicineId", detail.medicine.medicineId);
    params.set("page", "1");
    params.set("pageSize", "50");
    setBusy(true);
    setAnalyticsStatus("Loading accepted non-sample facts from the governed analytical boundary.");
    try {
      const next = await gatewayJson<AnalyticsResponse>(`enterprise/medicines/analytics?${params.toString()}`);
      setAnalytics(next);
      setAnalyticsStatus(next.dataState === "accepted_facts" ? `${next.pagination.totalRows.toLocaleString("en-GB")} accepted analytical rows matched this query.` : next.dataState === "source_not_ingested" ? "The selected national source has not completed a governed non-sample ingest." : "No accepted facts matched every selected filter.");
      setFiltersOpen(false);
    } catch (error) {
      setAnalytics(null);
      setAnalyticsStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  let central: ReactNode;
  if (current === "overview" || current === "medicine-search") central = <PlatformOverview analytics={analytics} detail={detail} snapshot={snapshot} />;
  else if (current === "geography") central = <><NearbyOrganisations /><EvidenceTable data={section(snapshot, "Practice population context")} /><EvidenceTable data={section(snapshot, "Pharmacy geography")} /></>;
  else if (current === "pharmacies") central = <section className={styles.routeWorkspace}><header><p className={styles.stateLabel}>Governed master</p><h1>All pharmacies</h1><p>Identity, geography and contact-evidence facts remain separate from medicine dispensing and marketing eligibility.</p></header><EvidenceTable data={section(snapshot, "Pharmacy geography")} /><EvidenceTable data={section(snapshot, "Pharmacy contact evidence")} /></section>;
  else if (current === "data-sources") central = <section className={styles.routeWorkspace}><header><p className={styles.stateLabel}>Source truth</p><h1>Source registry</h1><p>Discovered, schema-validated, sample-validated, ingested and production-operational remain distinct states.</p></header><EvidenceTable data={section(snapshot, "Data sources and quality")} /></section>;
  else if (current === "prescribers") central = <section className={styles.routeWorkspace}><header><p className={styles.stateLabel}>Source-separated analysis</p><h1>Prescriber intelligence</h1><p>Select a governed medicine identity through the global search, then query accepted EPD facts. An empty result remains empty.</p></header><PlatformOverview analytics={analytics} detail={detail} headingLevel={2} snapshot={snapshot} /></section>;
  else if (current === "forecasts") central = <UnavailableEvidence title="Forecasts" statement="No forecast is displayed because an identity catalogue is not a demand history and cannot support a truthful forecast by itself." requirements={["Leakage-safe historical fact series", "Recorded training and feature cutoffs", "Backtests against accepted baselines", "Uncertainty intervals and owner acceptance"]} />;
  else if (current === "opportunities") central = <UnavailableEvidence title="Commercial opportunities" statement="No pharmacy or medicine is ranked without measured demand, distance, uncertainty and approved commercial evidence." requirements={["Accepted demand facts", "Governed medicine-to-pharmacy eligibility rules", "Versioned transparent score components", "Commercial and Regulatory approval"]} />;
  else central = <UnavailableEvidence title="Campaigns" statement="No outreach campaign is active. Imported business contacts are marketing-ineligible by default and are not exposed in this view." requirements={["Lawful-purpose and channel review", "Contact evidence and suppression controls", "Human-approved content and target snapshot", "Audited delivery integration"]} />;

  return <main className={`${styles.shell} medicines-intelligence`}>
    <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} aria-label="Medicines Intelligence navigation">
      <div className={styles.brand}><PharmaScopeBrand home={baseRoute} tone="reverse" /><p><strong>Medicines Intelligence</strong><span>by NovaPharm Healthcare</span></p><button type="button" onClick={() => setMenuOpen(false)}>Close</button></div>
      <nav className={`intelligence-local-nav ${styles.navigation}`} aria-label="Medicines Intelligence views">{navigationGroups.map((group) => <section key={group.label}><h2>{group.label}</h2><ul>{group.items.map(([key, label, href]) => <li key={key}><a href={href} aria-current={current === key ? "page" : undefined}>{label}</a></li>)}</ul></section>)}</nav>
      <div className={styles.sidebarFoot}><p>{user.displayName}</p><span>{display(user.accessType)}</span><small>Protected, server-authorised, no public caching</small></div>
    </aside>
    {menuOpen ? <button className={styles.scrim} type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} /> : null}
    <section className={styles.product}>
      <header className={`${styles.topbar} medicine-search-workspace`}>
        <button className={styles.mobileMenu} type="button" onClick={() => setMenuOpen(true)}>Navigation</button>
        <search className={styles.search}><form onSubmit={searchMedicine}><label className={styles.srOnly} htmlFor={searchId}>Medicine name, brand or code</label><input id={searchId} name="medicine" type="search" minLength={2} maxLength={120} autoComplete="off" spellCheck={false} placeholder="Search medicine, BNF, SNOMED, dm+d, brand or supplier" required /><button type="submit" disabled={busy}>Search</button></form>
          {searchResponse ? <section className={`${styles.searchResults} medicine-search-results`} aria-label="Medicine search results"><header><h2>Current identity matches</h2><p>{searchResponse.source}{searchResponse.sourcePeriod ? `, ${searchResponse.sourcePeriod}` : ""}</p></header>{searchResponse.results.length ? <ul>{searchResponse.results.map((result) => <li key={result.medicineId}><button type="button" onClick={() => void selectMedicine(result.medicineId)} disabled={busy}><strong>{result.canonicalName}</strong><span>{result.presentationCode || "BNF presentation code not recorded"}{result.chemicalSubstance ? ` | ${result.chemicalSubstance}` : ""}</span></button></li>)}</ul> : <p>No current BNF identity matched. Try a generic, brand, product or BNF code.</p>}</section> : null}
        </search>
        <div className={styles.topActions}><span>Latest accepted period</span><button type="button" onClick={() => setFiltersOpen(true)}>Filters</button><button className="icon-command" type="button" onClick={() => void onRefresh()} disabled={loading}>Refresh</button><button type="button" aria-label="Sign out" onClick={() => void onLogout()}>Sign out</button></div>
      </header>
      <div className={styles.liveRegion}><p className="workflow-status" aria-live="polite">{parentStatus}</p><p className="medicine-search-status" role="status" aria-live="polite">{searchStatus}</p><p role="status" aria-live="polite">{analyticsStatus}</p></div>
      <div className={`data-context ${styles.dataContext}`}><span>{activeDataStateLabel(snapshot.dataState, analytics)}</span><span>{updatedLabel(snapshot.dataFreshness)}</span><span>Read only</span></div>
      <div className={styles.workspaceGrid}>
        <section className={styles.central}>{central}<section className={`${styles.boundary} intelligence-boundary`}><h2>Evidence boundary</h2><ul>{snapshot.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul></section></section>
        <aside className={`${styles.rightRail} ${filtersOpen ? styles.rightRailOpen : ""}`} aria-label="Contextual intelligence"><div className={styles.railMobileHeader}><h2>Filters and context</h2><button type="button" onClick={() => setFiltersOpen(false)}>Close</button></div><ContextRail analytics={analytics} busy={busy} detail={detail} filters={filters} onChange={changeFilter} onReset={resetFilters} onRun={() => void runAnalytics()} snapshot={snapshot} /></aside>
      </div>
      {filtersOpen ? <button className={styles.railScrim} type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} /> : null}
    </section>
  </main>;
}
