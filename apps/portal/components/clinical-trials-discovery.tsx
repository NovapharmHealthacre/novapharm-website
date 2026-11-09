"use client";

import { type FormEvent, useId, useState } from "react";
import { gatewayJson, professionalError } from "../lib/gateway";
import styles from "./us-fda-label-discovery.module.css";

type Study = Readonly<{
  nctId: string | null;
  title: string | null;
  overallStatus: string | null;
  phases: readonly (string | null)[];
  studyType: string | null;
  sponsor: string | null;
  firstPosted: string | null;
  lastUpdatePosted: string | null;
  sourceUrl: string | null;
}>;

type StudyResponse = Readonly<{
  sourceId: string;
  publisher: string;
  jurisdiction: string;
  retrievedAt: string;
  dataState: "public_registry_records" | "no_source_matches";
  records: readonly Study[];
  truncated: boolean;
  productionReuseRightsCertified: false;
  limitations: readonly string[];
}>;

function reported(value: string | null | undefined): string {
  return value || "Not reported by source";
}

export function ClinicalTrialsDiscovery() {
  const fieldId = useId();
  const [intervention, setIntervention] = useState("");
  const [result, setResult] = useState<StudyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Search public ClinicalTrials.gov study registrations by intervention.");
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = intervention.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!/^[a-zA-Z][a-zA-Z0-9 -]{1,79}$/u.test(term)) {
      setResult(null);
      setStatus("Enter 2–80 letters, numbers, spaces or hyphens, starting with a letter.");
      return;
    }
    setLoading(true);
    setResult(null);
    setStatus("Checking the ClinicalTrials.gov public registry.");
    try {
      const source = await gatewayJson<StudyResponse>(
        "v1/intelligence/evidence/us/clinical-trials?intervention=" + encodeURIComponent(term),
      );
      setResult(source);
      setStatus(source.dataState === "no_source_matches"
        ? "No public study record was returned for this intervention. No inference has been made."
        : `${source.records.length} registry record(s) returned. Review the linked source directly.`);
    } catch (error) {
      setResult(null);
      setStatus(professionalError(error));
    } finally {
      setLoading(false);
    }
  }

  return <section className={styles.discovery} aria-labelledby="trial-discovery-heading">
    <header>
      <p className={styles.eyebrow}>Evidence / Clinical studies</p>
      <h1 id="trial-discovery-heading" className={styles.heading}>Clinical study registry.</h1>
      <p className={styles.intro}>Read-only discovery of publicly registered studies. Registration is not proof of treatment efficacy, trial eligibility or regulatory approval.</p>
    </header>
    <form className={styles.form} onSubmit={(event) => void search(event)}>
      <label className={styles.label} htmlFor={fieldId}>Medicine or intervention</label>
      <div className={styles.fields}>
        <input className={styles.input} id={fieldId} type="search" minLength={2} maxLength={80}
          autoComplete="off" spellCheck={false} placeholder="e.g. pembrolizumab"
          value={intervention} onChange={(event) => setIntervention(event.currentTarget.value)} required />
        <button className={styles.submit} type="submit" disabled={loading}>{loading ? "Checking registry…" : "Search studies"}</button>
      </div>
      <p className={styles.sourceNote}>Do not enter patient information, names, confidential data or proprietary submissions.</p>
    </form>
    <p className={styles.status} role="status" aria-live="polite">{status}</p>
    {result ? <section className={styles.records} aria-label="Public registry studies">
      <div className={styles.recordsHeader}>
        <h2>Source records</h2>
        <p>{result.publisher} · {result.records.length} results displayed</p>
      </div>
      {result.dataState === "public_registry_records"
        ? <div className={styles.cards}>{result.records.map((study, index) => <article className={styles.card} key={study.nctId || index}>
          <h3>{reported(study.title)}</h3>
          <dl>
            <div><dt>Registry ID</dt><dd>{reported(study.nctId)}</dd></div>
            <div><dt>Current reported status</dt><dd>{reported(study.overallStatus)}</dd></div>
            <div><dt>Study phase</dt><dd>{study.phases.filter(Boolean).join(", ") || "Not reported by source"}</dd></div>
            <div><dt>Study type</dt><dd>{reported(study.studyType)}</dd></div>
            <div><dt>Lead sponsor</dt><dd>{reported(study.sponsor)}</dd></div>
            <div><dt>First posted</dt><dd>{reported(study.firstPosted)}</dd></div>
            <div><dt>Last update posted</dt><dd>{reported(study.lastUpdatePosted)}</dd></div>
          </dl>
          {study.sourceUrl ? <p><a className={styles.sourceLink} href={study.sourceUrl} target="_blank" rel="noopener noreferrer external">Inspect the original registry record</a></p> : null}
        </article>)}</div>
        : <p className={styles.sourceNote}>No matching records were returned by the primary registry.</p>}
      {result.truncated ? <p className={styles.sourceNote}>This is a five-record view; other registered studies may exist. Narrow the search or inspect the primary registry.</p> : null}
      <p className={styles.sourceNote}>Retrieved {result.retrievedAt}. Source ID: {result.sourceId}.</p>
      <div className={styles.boundary}><h2>Evidence boundaries</h2><ul>{result.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>
    </section> : null}
    <footer className={styles.boundary}>
      <h2>Governed research</h2>
      <p className={styles.sourceNote}>No clinical recommendations, eligibility decisions, model forecasts, approvals, patient data or global pipeline completeness are represented. External-AI rights and persistent commercial reuse require independent validation.</p>
      <p className={styles.sourceNote}><a className={styles.sourceLink} href="https://clinicaltrials.gov/data-api/api" target="_blank" rel="noopener noreferrer external">Official ClinicalTrials.gov API documentation</a></p>
    </footer>
  </section>;
}
