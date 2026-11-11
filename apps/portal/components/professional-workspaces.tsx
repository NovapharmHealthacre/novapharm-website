"use client";

import { type FormEvent, useId, useState } from "react";
import { gatewayJson, professionalError } from "../lib/gateway";
import styles from "./professional-workspaces.module.css";

export type ProfessionalWorkspaceKind =
  | "observed-market"
  | "regulatory-intelligence"
  | "tender-intelligence"
  | "portfolio"
  | "alerts"
  | "reports"
  | "decision-workspace";

type MedicineContext = Readonly<{
  medicine: Readonly<{
    medicineId: string;
    canonicalName: string;
    sourceId: string;
    validFrom: string;
    sourceLastSeenAt: string;
  }>;
  investigationPassport?: Readonly<{
    snapshotFingerprintSha256: string;
    decisionReady: false;
    lenses: readonly Readonly<{ id: string; name: string; state: string; sourceRights: string; decisionUsable: boolean }>[];
    requiredBeforeDecision: readonly string[];
  }>;
}>;
type ObservedContext = Readonly<{
  dataState: "accepted_facts" | "no_matching_facts" | "source_not_ingested";
  source: string;
  sourcePeriods: readonly string[];
  query: Readonly<{ dataset: "epd" | "pca"; metric: string }>;
  pagination: Readonly<{ totalRows: number }>;
  reconciliation: Readonly<{ applicable: boolean; reconciles: boolean | null }>;
  observedChange?: Readonly<{
    state: string;
    observation: Readonly<{ percentageChange: number | null; fromMonth: string; throughMonth: string }> | null;
  }>;
  limitations: readonly string[];
}>;
type WorkspaceProps = Readonly<{
  kind: ProfessionalWorkspaceKind;
  detail: MedicineContext | null;
  analytics: ObservedContext | null;
}>;

type TenderMatch = Readonly<{
  releaseId: string | null;
  ocid: string | null;
  title: string;
  buyer: string | null;
  publishedAt: string | null;
  tenderStatus: string;
  noticeUrl: string | null;
  classification: string;
}>;
type TenderDiscovery = Readonly<{
  contract: string;
  publisher: string;
  retrievedAt: string;
  sourceUrl: string;
  sourceLicence: string;
  updatedFrom: string;
  updatedTo: string;
  examinedReleases: number;
  matches: readonly TenderMatch[];
  truncated: boolean;
  coverage: string;
  decisionReady: false;
  limitations: readonly string[];
}>;

const workflows: Readonly<Record<ProfessionalWorkspaceKind, Readonly<{
  title: string; headline: string; description: string; checks: readonly string[];
}>>> = {
  "observed-market": {
    title: "Market analysis",
    headline: "Observe before you forecast.",
    description: "Examine separate EPD or PCA observations for one medicine. A chart is not a national market estimate without matching coverage, units, periods and source rights.",
    checks: ["Resolve the medicine identity", "Reconcile source, measure and geography", "Confirm permitted analytical use"],
  },
  "regulatory-intelligence": {
    title: "Regulatory intelligence",
    headline: "A record is not an approval.",
    description: "Investigate public FDA label records separately from marketing authorisations, current availability and country-level permissions.",
    checks: ["Confirm exact formulation and jurisdiction", "Check authority record date and status", "Review product-level rights before action"],
  },
  "tender-intelligence": {
    title: "Tender intelligence",
    headline: "Find the notice. Qualify the opportunity.",
    description: "Search a bounded sample of recent official UK procurement releases. Every match requires human review of deadline, product eligibility and contracting terms.",
    checks: ["Verify the original notice and updates", "Match the authorised product and territory", "Confirm tender eligibility and closing date"],
  },
  portfolio: {
    title: "Portfolio",
    headline: "Every product must earn its place.",
    description: "An identity record is not a licensed, in-stock or commercially approved portfolio item. Qualify each proposed product before it enters a customer portfolio.",
    checks: ["Verify medicine and manufacturer identity", "Record licence and distribution rights", "Approve price, territory and supply eligibility"],
  },
  alerts: {
    title: "Alerts",
    headline: "Signals that can be explained.",
    description: "Preview a transparent change threshold against available observed-change evidence. No alert is sent, scheduled, saved or treated as a verified trend.",
    checks: ["Accept comparable source history", "Calibrate threshold and false positives", "Approve tenant-scoped notification delivery"],
  },
  reports: {
    title: "Reports",
    headline: "A conclusion needs a provenance trail.",
    description: "Build a locally downloadable investigation brief containing identity, evidence states, missing approvals and source metadata. It is not an accepted market report.",
    checks: ["Fix the source snapshot and version", "Reconcile rights and numerical evidence", "Obtain reviewer and report-release approval"],
  },
  "decision-workspace": {
    title: "Decision workspace",
    headline: "Models explain. Humans decide.",
    description: "Document a proposed next action and its missing evidence. The draft stays in this browser until downloaded; it is not a signed decision or automated recommendation.",
    checks: ["Compare options and assumptions", "Record conflicting or absent evidence", "Secure accountable human sign-off"],
  },
};

const cleanFilePart = (value: string) => value.replace(/[^a-z0-9_-]/giu, "-").slice(0, 64);

function sourceState(detail: MedicineContext | null, analytics: ObservedContext | null) {
  if (!detail) return "No medicine selected";
  if (analytics?.dataState === "accepted_facts") return "Observed facts recorded; rights not confirmed for decision use";
  if (analytics?.dataState === "source_not_ingested") return "National observation source not ingested";
  if (analytics?.dataState === "no_matching_facts") return "No matching accepted observations";
  return "Identity available; observation state not assessed";
}

function InvestigationSummary({ detail, analytics }: Readonly<{
  detail: MedicineContext | null; analytics: ObservedContext | null;
}>) {
  return <div className={styles.contextGrid}>
    <article className={styles.contextCard}>
      <p className={styles.eyebrow}>Selected identity</p>
      <h3>{detail?.medicine.canonicalName ?? "Search a medicine to begin"}</h3>
      <dl>
        <div><dt>Source identity</dt><dd>{detail?.medicine.sourceId ?? "Not selected"}</dd></div>
        <div><dt>Source last seen</dt><dd>{detail?.medicine.sourceLastSeenAt ?? "Not recorded"}</dd></div>
        <div><dt>Investigation fingerprint</dt><dd className={styles.fingerprint}>{detail?.investigationPassport?.snapshotFingerprintSha256.slice(0, 16) ?? "Not generated"}</dd></div>
      </dl>
    </article>
    <article className={styles.contextCard}>
      <p className={styles.eyebrow}>Observed evidence boundary</p>
      <h3>{sourceState(detail, analytics)}</h3>
      <dl>
        <div><dt>Source</dt><dd>{analytics?.source ?? "Not queried"}</dd></div>
        <div><dt>Accepted matching rows</dt><dd>{analytics?.dataState === "accepted_facts" ? analytics.pagination.totalRows.toLocaleString("en-GB") : "Not available"}</dd></div>
        <div><dt>Reconciliation</dt><dd>{analytics?.reconciliation.applicable ? (analytics.reconciliation.reconciles ? "Reconciled" : "Requires review") : "Not established"}</dd></div>
      </dl>
    </article>
  </div>;
}

function TenderResearch() {
  const inputId = useId();
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TenderDiscovery | null>(null);
  const [status, setStatus] = useState("Enter an exact procurement or medicine phrase to inspect recent official UK notices.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setStatus("Inspecting a bounded official Find a Tender sample.");
    try {
      const next = await gatewayJson<TenderDiscovery>("v1/intelligence/tenders/uk/discovery?q=" + encodeURIComponent(phrase));
      setResult(next);
      setStatus(next.matches.length
        ? `${next.matches.length} matching source releases in ${next.examinedReleases} examined. Verify notices on the publisher's site.`
        : `No exact-phrase matches among ${next.examinedReleases} examined releases. This is not evidence that no tenders exist.`);
    } catch (error) {
      setStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  return <section className={styles.feature} aria-labelledby="tender-research-title">
    <h3 id="tender-research-title">UK official notice discovery</h3>
    <p>Read-only source inspection. No application is submitted, no outreach is sent and no tender is declared eligible.</p>
    <form className={styles.researchForm} onSubmit={(event) => void submit(event)}>
      <label htmlFor={inputId}>Medicine or exact procurement phrase</label>
      <div className={styles.fieldRow}>
        <input id={inputId} type="search" minLength={2} maxLength={80} value={phrase}
          onChange={(event) => setPhrase(event.currentTarget.value)} placeholder="Search by medicine name" required />
        <button type="submit" disabled={busy}>{busy ? "Checking source…" : "Inspect notices"}</button>
      </div>
    </form>
    <p role="status" aria-live="polite">{status}</p>
    {result ? <div className={styles.results}>
      <p className={styles.eyebrow}>{result.publisher} · {result.retrievedAt}</p>
      <p>{result.coverage}</p>
      {result.matches.length ? <ul>{result.matches.map((match, index) => <li key={match.releaseId ?? match.ocid ?? index}>
        <h4>{match.title}</h4>
        <p>Notice {match.releaseId ?? "not recorded"} · {match.publishedAt ?? "Date not recorded"} · {match.buyer ?? "Buyer not recorded"}</p>
        <p>Reported source status: {match.tenderStatus}. Product eligibility and deadlines not independently verified.</p>
        {match.noticeUrl ? <a href={match.noticeUrl} target="_blank" rel="noopener noreferrer">Review official source notice</a> : <p>No verified direct notice link in this release.</p>}
      </li>)}</ul> : <p className={styles.noResults}>No matches in this limited sample; review the official search directly for comprehensive discovery.</p>}
      <p>{result.truncated ? "Additional source pages exist or the page cap was reached. This result is incomplete." : "Only this constrained seven-day window was inspected."}</p>
      <ul className={styles.boundaryList}>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
    </div> : null}
    <a href="https://www.find-tender.service.gov.uk/Search" target="_blank" rel="noopener noreferrer">Open the official UK tender search</a>
  </section>;
}

function DraftReport({ kind, detail, analytics }: WorkspaceProps) {
  const [notes, setNotes] = useState("");
  const notesId = useId();
  const ready = Boolean(detail);
  const download = () => {
    if (!detail) return;
    const passport = detail.investigationPassport;
    const data = {
      contract: "novapharm.intelligence.professional-investigation-draft.v1",
      classification: "unapproved_research_draft",
      generatedAt: new Date().toISOString(),
      workspace: kind,
      medicine: {
        medicineId: detail.medicine.medicineId,
        canonicalName: detail.medicine.canonicalName,
        sourceId: detail.medicine.sourceId,
        sourceLastSeenAt: detail.medicine.sourceLastSeenAt,
      },
      investigationFingerprint: passport?.snapshotFingerprintSha256 ?? null,
      fingerprintIsPublisherAttestation: false,
      evidenceLenses: passport?.lenses.map((lens) => ({
        id: lens.id, state: lens.state, sourceRights: lens.sourceRights, decisionUsable: false,
      })) ?? [],
      observation: {
        dataset: analytics?.query.dataset ?? null,
        source: analytics?.source ?? null,
        sourcePeriods: analytics?.sourcePeriods ?? [],
        state: analytics?.dataState ?? "not_assessed",
        matchingRowCount: analytics?.dataState === "accepted_facts" ? analytics.pagination.totalRows : null,
        numericValuesIncluded: false,
        reconciliation: analytics?.reconciliation.reconciles ?? null,
      },
      authorNotes: notes.trim().slice(0, 2000) || null,
      sourceLicencesVerified: false,
      tenantExportPermissionVerified: false,
      decisionReady: false,
      humanApprovalRecorded: false,
      caveats: passport?.requiredBeforeDecision ?? ["Rights-approved sources, commercial permissions and human sign-off are outstanding."],
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `novapharm-${cleanFilePart(kind)}-${cleanFilePart(detail.medicine.medicineId)}-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <section className={styles.feature} aria-labelledby="draft-report-title">
    <h3 id="draft-report-title">{kind === "decision-workspace" ? "Prepare a decision review" : "Create an investigation brief"}</h3>
    <p>This local draft contains identity and evidence metadata, never unlicensed raw market rows. It is not saved, signed, sent or published.</p>
    <label htmlFor={notesId}>Review notes and unresolved assumptions (local until download)</label>
    <textarea id={notesId} maxLength={2000} rows={4} value={notes} onChange={(event) => setNotes(event.currentTarget.value)}
      placeholder="Record alternatives, evidence gaps and questions for the responsible reviewer. Do not include patient or confidential personal data." />
    <button type="button" onClick={download} disabled={!ready}>Download unapproved investigation draft</button>
    {!ready ? <p>Select a medicine with the search bar before generating its investigation record.</p> : null}
  </section>;
}

function AlertPreview({ analytics }: Readonly<{ analytics: ObservedContext | null }>) {
  const thresholdId = useId();
  const [threshold, setThreshold] = useState("15");
  const numericThreshold = Number(threshold);
  const change = analytics?.observedChange?.observation?.percentageChange;
  const evaluated = analytics?.observedChange?.state === "observed_change_candidate_requires_review" && typeof change === "number" && Number.isFinite(change);
  const above = evaluated && Math.abs(change) >= numericThreshold;
  return <section className={styles.feature} aria-labelledby="alert-preview-title">
    <h3 id="alert-preview-title">Observed-change threshold preview</h3>
    <p>Adjust a hypothetical percentage threshold against accepted comparison output, where available. There is no customer watchlist, saved rule or notification delivery.</p>
    <label htmlFor={thresholdId}>Absolute change threshold (%)</label>
    <select id={thresholdId} value={threshold} onChange={(event) => setThreshold(event.currentTarget.value)}>
      <option value="5">5%</option><option value="10">10%</option><option value="15">15%</option>
      <option value="25">25%</option><option value="50">50%</option>
    </select>
    <p className={styles.previewState}>{evaluated
      ? `Historical candidate ${Math.abs(change).toFixed(2)}%. ${above ? "Above" : "Below"} preview threshold. Requires review; no alert sent.`
      : "Not evaluated. Comparable accepted observations are required before a rule can be previewed."}</p>
  </section>;
}

export function ProfessionalWorkspace({ kind, detail, analytics }: WorkspaceProps) {
  const workflow = workflows[kind];
  const passport = detail?.investigationPassport;
  const relatedLens = kind === "tender-intelligence" ? "tenders"
    : kind === "regulatory-intelligence" ? "regulatory"
      : kind === "observed-market" ? "primary_care"
        : kind === "decision-workspace" ? "decision"
          : kind === "portfolio" ? "opportunity"
            : kind === "alerts" ? "forecast" : "decision";
  const lens = passport?.lenses.find((item) => item.id === relatedLens);
  return <section className={styles.workspace} aria-label={workflow.title}>
    <header className={styles.intro}>
      <p className={styles.eyebrow}>NovaPharm Intelligence / {workflow.title}</p>
      <h2>{workflow.headline}</h2>
      <p>{workflow.description}</p>
      <span className={styles.restricted}>Research workspace · Board-only · Not approved for customer release</span>
    </header>
    <InvestigationSummary detail={detail} analytics={analytics} />
    <div className={styles.checkPanel}>
      <div><h3>Evidence-to-action protocol</h3><p>{lens ? `Investigation lens: ${lens.name}. State: ${lens.state}. Source rights: ${lens.sourceRights}.` : "Select a medicine to load its twelve evidence perspectives."}</p></div>
      <ol>{workflow.checks.map((check) => <li key={check}>{check}</li>)}</ol>
    </div>
    {kind === "tender-intelligence" ? <TenderResearch /> : null}
    {kind === "alerts" ? <AlertPreview analytics={analytics} /> : null}
    {kind === "reports" || kind === "decision-workspace" ? <DraftReport kind={kind} detail={detail} analytics={analytics} /> : null}
    {kind === "portfolio" ? <p className={styles.disclaimer}>Portfolio records are not writable until tenant ownership, authorised product rights and durable audit history are proven. No stock or marketing authorisation is inferred.</p> : null}
    {kind === "observed-market" ? <p className={styles.disclaimer}>Use the source-separated filters and charts in the connected market view. Do not combine EPD, PCA, secondary care or private commercial volumes.</p> : null}
    {kind === "regulatory-intelligence" ? <p className={styles.disclaimer}>The FDA research panel below is public label discovery only. No cross-jurisdiction equivalence or product licence conclusion is inferred.</p> : null}
    <p className={styles.disclaimer}>Sources and model output are never treated as decision-ready merely because a record exists. Human verification and production tenant isolation remain release gates.</p>
  </section>;
}
