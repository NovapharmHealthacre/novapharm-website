"use client";

import { type FormEvent, useRef, useState } from "react";
import { gatewayJson, professionalError } from "../lib/gateway";
import styles from "./us-fda-evidence.module.css";

const kinds = [
  { key: "approvals", label: "Drugs@FDA applications" },
  { key: "ndc", label: "NDC listings" },
  { key: "adverse-events", label: "Adverse event reports (count only)" },
  { key: "recalls", label: "Recalls" },
] as const;
type EvidenceKind = (typeof kinds)[number]["key"];
type EvidenceResponse = Readonly<{
  sourceId: string;
  publisher: string;
  query: string;
  jurisdiction: "US";
  retrievedAt: string;
  dataState: string;
  matchedCountReported: number | null;
  records: readonly Record<string, unknown>[];
  limitations: readonly string[];
  sourceDocumentation: string;
}>;
function labelFor(key: string): string {
  const labels: Record<string, string> = {
    applicationNumber: "Application number", sponsorName: "Sponsor",
    products: "Products", submissions: "Source submissions",
    brandName: "Brand name", dosageForm: "Dosage form", marketingStatus: "Marketing status",
    productNumber: "Product number", productNdc: "Product NDC", genericName: "Generic name",
    labelerName: "Labeler", marketingCategory: "Marketing category",
    marketingStartDate: "Marketing start date", packageNdcs: "Package NDCs",
    recallNumber: "Recall number", classification: "Classification",
    status: "Source status", reportDate: "Report date", productDescription: "Product",
    reasonForRecall: "Recall reason", recallingFirm: "Recalling firm",
  };
  return labels[key] ?? key;
}
function display(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => typeof v === "object" ? JSON.stringify(v) : String(v)).join("; ");
  return "Not recorded";
}
export function UsFdaEvidence() {
  const [drug, setDrug] = useState("");
  const [kind, setKind] = useState<EvidenceKind>("approvals");
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [status, setStatus] = useState("Controlled FDA research; currently available only when the board-only service is enabled.");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = drug.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!/^[A-Za-z][A-Za-z0-9 -]{1,63}$/u.test(term)) {
      setStatus("Enter 2–64 permitted characters beginning with a letter.");
      setData(null);
      return;
    }
    const id = ++generation.current;
    setLoading(true); setData(null); setStatus("Checking the governed FDA research source.");
    try {
      const response = await gatewayJson<EvidenceResponse>(
        "v1/intelligence/regulatory/us/fda-evidence?kind=" + encodeURIComponent(kind) + "&drug=" + encodeURIComponent(term)
      );
      if (id !== generation.current) return;
      setData(response);
      setStatus(response.dataState === "no_source_matches"
        ? "No matching source records reported."
        : "FDA research returned. Review source limitations before using any observations.");
    } catch (error) {
      if (id !== generation.current) return;
      setData(null); setStatus(professionalError(error));
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }
  return <section className={styles.shell} aria-labelledby="fda-extended-heading">
    <h2 id="fda-extended-heading">Additional US FDA source evidence</h2>
    <p>Restricted regulatory research. No patient-level adverse-event records, medical advice, regulatory approval inference, or commercial release.</p>
    <form onSubmit={(event) => void submit(event)} className={styles.form}>
      <label htmlFor="npi-us-fda-kind">FDA dataset</label>
      <select id="npi-us-fda-kind" value={kind} onChange={(event) => {
        generation.current++; setKind(event.target.value as EvidenceKind); setData(null);
      }}>
        {kinds.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
      </select>
      <label htmlFor="npi-us-fda-term">Generic medicine name</label>
      <input id="npi-us-fda-term" value={drug} maxLength={64} autoComplete="off"
        onChange={(event) => { generation.current++; setDrug(event.target.value); setData(null); }}
        placeholder="e.g. apixaban" required />
      <button type="submit" disabled={loading}>{loading ? "Checking…" : "Search FDA evidence"}</button>
    </form>
    <p role="status" aria-live="polite">{status}</p>
    {data ? <div className={styles.results}>
      <p><strong>{data.publisher}</strong> · {data.jurisdiction} · Retrieved {data.retrievedAt}</p>
      <p>Source matching records: {data.matchedCountReported ?? "Not reported"}. Displayed: {data.records.length}.
        {kind === "adverse-events" ? " FAERS totals represent reports, not event rates or causation." : null}
      </p>
      {data.records.map((record, i) => <article key={data.sourceId + JSON.stringify(record)} className={styles.record}>
        <h3>Source observation {i + 1}</h3>
        <dl>{Object.entries(record).map(([key, value]) =>
          <div key={key}><dt>{labelFor(key)}</dt><dd>{display(value)}</dd></div>)}</dl>
      </article>)}
      <h3>Research limitations</h3>
      <ul>{data.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      <p><a href={data.sourceDocumentation} rel="noopener noreferrer" target="_blank">Official FDA dataset documentation</a></p>
    </div> : null}
  </section>;
}
