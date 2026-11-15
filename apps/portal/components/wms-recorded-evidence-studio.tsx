"use client";

import { useMemo, useState } from "react";

type RecordedSection = Readonly<{
  title: string;
  rows: readonly Readonly<Record<string, unknown>>[];
  source?: string;
}>;
export type WmsSnapshot = Readonly<{
  module: Readonly<{ code: string }>;
  dataState: string;
  dataFreshness: string;
  sections: readonly RecordedSection[];
}>;
type PriorityFilter = "all" | "high" | "standard";
const EVIDENCE_DOMAINS = [
  ["Inventory ledger", "Inventory"],
  ["Receiving and purchasing evidence", "Inbound"],
  ["Quality and recall observations", "Quality"],
  ["Return isolation review", "Returns"],
  ["Shipment and carrier observations", "Fulfilment"],
  ["Integration delivery exceptions", "Integrations"],
  ["Commercial fulfilment queue", "Commercial"],
] as const;

function show(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return String(value).slice(0, 160);
}

function isPriority(value: unknown): value is "high" | "standard" {
  return value === "high" || value === "standard";
}

/**
 * Purely visual read model from the existing authenticated employee WMS
 * snapshot. All numbers are bounded samples; never infer network totals,
 * stock accuracy, available-to-promise, OTIF or actual warehouse health.
 */
export function WmsRecordedEvidenceStudio({ snapshot }: Readonly<{ snapshot: WmsSnapshot | null }>) {
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");
  const evidence = useMemo(() => {
    if (!snapshot || snapshot.module.code !== "employee.warehouse") return [];
    return EVIDENCE_DOMAINS.map(([title, label]) => {
      const source = snapshot.sections.find((part) => part.title === title);
      return { title, label, found: Boolean(source), count: source?.rows.length ?? null };
    });
  }, [snapshot]);

  const worklist = useMemo(() => {
    if (!snapshot || snapshot.module.code !== "employee.warehouse") return [];
    const source = snapshot.sections.find((part) => part.title === "NovaPharm Distribution exception worklist");
    const rows = source?.rows ?? [];
    return rows.filter((row) => {
      if (priority !== "all" && !isPriority(row["priority"])) return false;
      if (priority !== "all" && row["priority"] !== priority) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase().slice(0, 80);
      return [row["domain"], row["reference"], row["signal"], row["reviewOwner"]]
        .some((value) => show(value).toLowerCase().includes(q));
    }).slice(0, 120);
  }, [snapshot, priority, search]);
  if (!snapshot || snapshot.module.code !== "employee.warehouse") {
    return <section className="distribution-wms-evidence-studio" aria-label="WMS recorded data">
      <h2>Recorded operating evidence.</h2>
      <p>Authenticated WMS source data are not loaded. No quantities or exception counts are available.</p>
    </section>;
  }

  const largest = Math.max(1, ...evidence.map((x) => x.count ?? 0));
  const observed = evidence.filter((x) => x.found).length;
  const total = evidence.reduce((sum, x) => sum + (x.count ?? 0), 0);
  const synthetic = snapshot.dataState === "synthetic";
  const hasWorklist = snapshot.sections.some((part) => part.title === "NovaPharm Distribution exception worklist");

  return <section className="distribution-wms-evidence-studio" aria-labelledby="wms-evidence-studio-title">
    <div className="distribution-wms-evidence-heading">
      <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / OPERATIONAL INTELLIGENCE</p>
      <h2 id="wms-evidence-studio-title">Recorded evidence. No assumptions.</h2>
      <p>Read-only analysis of authorised application records. Bars compare visible sample sizes,
        not warehouse inventory, stock accuracy, throughput or network performance.</p>
    </div>
    <div className="distribution-wms-evidence-stats">
      <article><span>Sources in this view</span><strong>{observed} / {evidence.length}</strong>
        <small>Recorded application sources only</small></article>
      <article><span>Rows in recent samples</span><strong>{total}</strong>
        <small>Samples may overlap, not network totals</small></article>
      <article><span>Physical ATP</span><strong>Not verified</strong>
        <small>Provider stock reconciliation required</small></article>
      <article><span>Evidence state</span><strong>{synthetic ? "Synthetic" : "Unreconciled"}</strong>
        <small>{synthetic ? "Local validation, not live inventory" : "Independent 3PL authority not established"}</small></article>
    </div>
    <section className="distribution-wms-evidence-chart" aria-label="Recorded application source sizes">
      <h3>Source sample coverage</h3>
      <p>Relative number of records visible in the authenticated WMS view. An empty sample
        does not prove that an operation has no outstanding issues.</p>
      {evidence.map((source) => <div className="distribution-wms-evidence-bar-row" key={source.title}>
        <span>{source.label}</span>
        <div className="distribution-wms-evidence-bar-track" role="img"
          aria-label={source.found
            ? `${source.label}: ${source.count} records observed in bounded sample`
            : `${source.label}: source not available`}>
          {source.found ? <div className="distribution-wms-evidence-bar"
            style={{ width: `${((source.count ?? 0) / largest) * 100}%` }} /> : null}
        </div>
        <small>{source.found ? source.count : "N/A"}</small>
      </div>)}
      <p className="distribution-wms-evidence-footnote">Source time: {show(snapshot.dataFreshness)}. No
        independently authenticated Polar Speed/UPS warehouse feed is asserted by this view.</p>
    </section>
    <div className="distribution-wms-evidence-exceptions">
      <div className="distribution-wms-evidence-exceptions-heading">
        <div><h3>Exception review</h3><p>Suggested priorities from existing application evidence, not confirmed 3PL incidents.</p></div>
        {hasWorklist ? <fieldset className="distribution-wms-evidence-filters" aria-label="Filter recorded exceptions">
          {(["all", "high", "standard"] as const).map((choice) =>
            <button type="button" key={choice} aria-pressed={priority === choice}
              onClick={() => setPriority(choice)}>{choice === "all" ? "All" : choice === "high" ? "High" : "Standard"}</button>)}
        </fieldset> : null}
      </div>
      {hasWorklist ? <>
        <label className="distribution-wms-evidence-search">Search recorded exceptions
          <input type="search" value={search} maxLength={80}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Reference, domain or review team"/>
        </label>
        <p role="status" aria-live="polite">Showing {worklist.length} matching recorded exceptions in this bounded sample.</p>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll wide operational tables. */}
        <section className="distribution-wms-evidence-table-scroll" tabIndex={0}
          aria-label="Scrollable recorded WMS exceptions">
          <table>
            <thead><tr><th scope="col">Priority</th><th scope="col">Area</th><th scope="col">Reference</th><th scope="col">Observed signal</th><th scope="col">Review team</th></tr></thead>
            <tbody>{worklist.length
              ? worklist.map((row) => <tr key={show(row["observationKey"])}>
                <th scope="row" data-priority={show(row["priority"])}>{show(row["priority"])}</th>
                <td>{show(row["domain"])}</td><td>{show(row["reference"])}</td>
                <td>{show(row["signal"])}</td><td>{show(row["reviewOwner"])}</td></tr>)
              : <tr><td colSpan={5}>No matching recorded exceptions in this bounded sample. This is not a warehouse clearance.</td></tr>}</tbody>
          </table>
        </section>
      </> : <p>The authenticated exception worklist is unavailable. Review status cannot be established.</p>}
    </div>
    <p className="distribution-wms-evidence-footnote">This dashboard cannot receive stock,
      reserve lots, release quality holds, send carrier instructions, close recalls or initiate payments.
      All operational transitions require separately authorised services.</p>
  </section>;
}
