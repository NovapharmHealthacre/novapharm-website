"use client";

import { type FormEvent, useId, useState } from "react";
import { gatewayJson, professionalError } from "../lib/gateway";
import styles from "./us-fda-label-discovery.module.css";

type LabelRecord = Readonly<{
  recordId: string | null;
  setId: string | null;
  effectiveDate: string | null;
  genericNames: readonly string[];
  brandNames: readonly string[];
  applicationNumbers: readonly string[];
  productTypes: readonly string[];
}>;

type FdaLabelResponse = Readonly<{
  query: string;
  sourceId: string;
  publisher: string;
  jurisdiction: string;
  retrievedAt: string;
  recordType: string;
  dataState: "public_source_observations" | "no_source_matches";
  records: readonly LabelRecord[];
  truncated: boolean;
  limitations: readonly string[];
}>;

function readableDate(value: string | null): string {
  if (!value || !/^\d{8}$/u.test(value)) return "Not reported";
  return value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8);
}

function listValues(values: readonly string[]): string {
  return values.length ? values.join(", ") : "Not recorded by source";
}

export function UsFdaLabelDiscovery() {
  const fieldId = useId();
  const [medicine, setMedicine] = useState("");
  const [response, setResponse] = useState<FdaLabelResponse | null>(null);
  const [status, setStatus] = useState("Enter a generic medicine name to query official US FDA drug-label records.");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const drug = medicine.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!/^[a-zA-Z][a-zA-Z0-9 -]{1,79}$/u.test(drug)) {
      setResponse(null);
      setStatus("Enter 2–80 letters, numbers, spaces or hyphens, starting with a letter.");
      return;
    }
    setLoading(true);
    setResponse(null);
    setStatus("Checking the current US FDA public drug-label source.");
    try {
      const source = await gatewayJson<FdaLabelResponse>(
        "v1/intelligence/regulatory/us/fda-labels?drug=" + encodeURIComponent(drug),
      );
      setResponse(source);
      setStatus(source.dataState === "no_source_matches"
        ? "No source label record matched this generic-name search."
        : String(source.records.length) + " FDA label record(s) returned. Review each record and its source limitations.");
    } catch (error) {
      setResponse(null);
      setStatus(professionalError(error));
    } finally {
      setLoading(false);
    }
  }

  return <section className={styles.discovery} aria-labelledby="fda-discovery-heading">
    <header>
      <p className={styles.eyebrow}>Regulatory Intelligence / United States</p>
      <h1 id="fda-discovery-heading" className={styles.heading}>Official drug-label records.</h1>
      <p className={styles.intro}>
        Search the public US FDA drug-label source. Each result is a source record, not proof
        of current marketing approval, availability, equivalent products or medical suitability.
      </p>
    </header>

    <form className={styles.form} onSubmit={(event) => void submit(event)}>
      <label className={styles.label} htmlFor={fieldId}>Generic medicine name</label>
      <div className={styles.fields}>
        <input
          className={styles.input}
          id={fieldId}
          type="search"
          name="generic-medicine"
          minLength={2}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. apixaban"
          value={medicine}
          onChange={(event) => setMedicine(event.currentTarget.value)}
          required
        />
        <button className={styles.submit} type="submit" disabled={loading}>{loading ? "Checking source…" : "Search FDA labels"}</button>
      </div>
      <p className={styles.sourceNote}>Professional research only. Do not enter patient information or confidential records.</p>
    </form>

    <p className={styles.status} role="status" aria-live="polite">{status}</p>

    {response ? <section className={styles.records} aria-label="FDA source records">
      <div className={styles.recordsHeader}>
        <h2>Observed source records</h2>
        <p>{response.publisher} · {response.jurisdiction} · {response.records.length} records displayed</p>
      </div>
      {response.dataState === "public_source_observations"
        ? <div className={styles.cards}>{response.records.map((record, index) => <article className={styles.card} key={record.setId || record.recordId || index}>
          <h3>{record.genericNames[0] || "Generic name not reported"}</h3>
          <dl>
            <div><dt>Brand names in source</dt><dd>{listValues(record.brandNames)}</dd></div>
            <div><dt>FDA application reference</dt><dd>{listValues(record.applicationNumbers)}</dd></div>
            <div><dt>Label effective date</dt><dd>{readableDate(record.effectiveDate)}</dd></div>
            <div><dt>Product types</dt><dd>{listValues(record.productTypes)}</dd></div>
            <div><dt>Label record ID</dt><dd>{record.recordId || "Not recorded"}</dd></div>
          </dl>
        </article>)}</div>
        : <p className={styles.sourceNote}>The FDA source reported no matching label records. Nothing has been inferred.</p>}
      {response.truncated ? <p className={styles.sourceNote}>More source records were reported than the five-record display cap. Narrow the medicine name for focused research.</p> : null}
      <p className={styles.sourceNote}>Retrieved: {response.retrievedAt}. Source ID: {response.sourceId}.</p>
      <div className={styles.boundary}>
        <h2>Evidence boundary</h2>
        <ul>{response.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </div>
    </section> : null}

    <footer className={styles.boundary}>
      <h2>Source and rights</h2>
      <p className={styles.sourceNote}>
        This US-only public label lookup is not a global regulatory intelligence service.
        Other national regulators require their own rights, identity mappings and freshness checks.
        Medical and regulatory decisions require qualified human review.
      </p>
      <p className={styles.sourceNote}>
        <a className={styles.sourceLink} href="https://open.fda.gov/apis/drug/label/" target="_blank" rel="noopener noreferrer">About the official openFDA drug-label API</a>
      </p>
    </footer>
  </section>;
}
