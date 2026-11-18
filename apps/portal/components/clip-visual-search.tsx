"use client";

import { type FormEvent, useEffect, useState } from "react";
import { gatewayJson, professionalError, protectedMutation } from "../lib/gateway";
import styles from "./clip-visual-search.module.css";

type VisualCandidate = Readonly<{
  rank: number;
  assetId: string;
  title: string;
  rightsReference: string;
  sourceUrl: string;
  status: "unverified_visual_match";
}>;
type VisualReadiness = Readonly<{
  contract: "novapharm.intelligence.visual-search.v1";
  enabled: boolean;
  state: "disabled" | "configured_candidate_not_verified";
}>;

type VisualResponse = Readonly<{
  contract: "novapharm.intelligence.visual-search.v1";
  query: string;
  results: readonly VisualCandidate[];
  humanReviewRequired: true;
  similarityIsNotEvidence: true;
  productIdentityVerified: false;
  regulatoryStatusVerified: false;
}>;

function approvedSourceUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) &&
      !parsed.username && !parsed.password && !parsed.hash &&
      (parsed.port === "" || parsed.port === "443");
  } catch {
    return false;
  }
}

/** Only authenticated board sessions can request the candidate endpoint. */
export function ClipVisualSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly VisualCandidate[]>([]);
  const [status, setStatus] = useState("Checking private research availability…");
  const [pending, setPending] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void gatewayJson<VisualReadiness>("v1/intelligence/visual/readiness")
      .then((readiness) => {
        if (!active) return;
        const configured = readiness.contract === "novapharm.intelligence.visual-search.v1" &&
          readiness.enabled === true && readiness.state === "configured_candidate_not_verified";
        setEnabled(configured);
        setStatus(configured
          ? "Private research candidate configured. Actual model availability and source rights remain separately gated."
          : "Research candidate disabled. No model queries are available.");
      })
      .catch(() => {
        if (active) {
          setEnabled(false);
          setStatus("Private visual research is unavailable.");
        }
      });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !enabled) return;
    setPending(true);
    setResults([]);
    setStatus("Checking the private visual catalogue…");
    try {
      const response = await protectedMutation<VisualResponse>("v1/intelligence/visual/search", {
        query: query.trim(), limit: 5
      });
      if (response.contract !== "novapharm.intelligence.visual-search.v1" ||
          !response.humanReviewRequired || !response.similarityIsNotEvidence ||
          response.productIdentityVerified !== false || response.regulatoryStatusVerified !== false ||
          !Array.isArray(response.results) || response.results.length > 5 ||
          response.results.some((item) => item.status !== "unverified_visual_match" || !approvedSourceUrl(item.sourceUrl))) {
        throw new Error("The visual search response failed its evidence boundary.");
      }
      setResults(response.results);
      setStatus(response.results.length ? "Possible visual matches only. Check the official record and original image." : "No approved visual candidates were returned.");
    } catch (error) {
      setStatus(professionalError(error));
    } finally {
      setPending(false);
    }
  }

  return <section className={styles["section"]} aria-labelledby="clip-visual-title">
    <h2 id="clip-visual-title">CLIP visual catalogue research</h2>
    <p className={styles["description"]}>Find candidate matches within a separately approved public-image catalogue using English descriptions. No uploaded images, patient data, supplier files or unsanctioned product material. This is not a medicine identification, authentication or regulatory verification tool.</p>
    <form className={styles["form"]} onSubmit={(event) => { void submit(event); }}>
      <label htmlFor="npi-clip-query">Describe an approved public pharmaceutical image</label>
      <div className={styles["controls"]}>
        <input
          id="npi-clip-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="e.g. blue-and-white public medicine carton"
          minLength={3}
          maxLength={240}
          autoComplete="off"
          spellCheck={false}
          required
          disabled={pending || !enabled}
        />
        <button type="submit" disabled={!enabled || pending || query.trim().length < 3}>{pending ? "Searching…" : "Find candidate images"}</button>
      </div>
    </form>
    <p role="status" aria-live="polite" className={styles["status"]}>{status}</p>
    {results.length ? <ol className={styles["results"]}>
      {results.map((candidate) => <li key={candidate.assetId}>
        <strong>{candidate.title}</strong>
        <span>Candidate match #{candidate.rank} · Rights record: {candidate.rightsReference}</span>
        <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer">Review original published source</a>
      </li>)}
    </ol> : null}
    <p className={styles["footnote"]}>Similarity does not establish product identity, strength, authenticity, quality, stock, marketing authorisation or medical suitability. A human must verify every match.</p>
  </section>;
}
