"use client";

import { type FormEvent, useEffect, useState } from "react";
import { gatewayJson, professionalError, protectedMutation } from "../lib/gateway";
import { WMS_PROTOTYPE_WORKSPACE_MAP } from "./wms-prototype-workspace-map";

const workspaces = WMS_PROTOTYPE_WORKSPACE_MAP.map((entry) => ({
  label: entry.title,
  code: entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
}));
type FeedbackResult = "working" | "broken" | "needs_improvement";
type FeedbackEntry = Readonly<{
  workspaceCode: string;
  result: FeedbackResult;
  note: string;
  updatedAt: string;
}>;
type FeedbackResponse = Readonly<{
  pilot: string;
  dataMode: "synthetic_only";
  warehouseExecutionEnabled: false;
  entries: FeedbackEntry[];
}>;
type PilotAdminSummary = Readonly<{
  dataMode: "synthetic_only";
  warehouseExecutionEnabled: false;
  sampledReports: number;
  sampleLimited: boolean;
  counts: Readonly<Record<FeedbackResult, number>>;
  reports: ReadonlyArray<FeedbackEntry & { testerUsername: string }>;
}>;
const resultLabels: Record<FeedbackResult, string> = {
  working: "Working",
  broken: "Not working",
  needs_improvement: "Needs improvement",
};
const initialWorkspace = workspaces[0]?.code ?? "control-tower";

export function WmsPilotFeedbackPanel() {
  const [readState, setReadState] = useState<"loading" | "available" | "unavailable">("loading");
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [adminSummary, setAdminSummary] = useState<PilotAdminSummary | null>(null);
  const [workspaceCode, setWorkspaceCode] = useState(initialWorkspace);
  const [result, setResult] = useState<FeedbackResult>("working");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    gatewayJson<FeedbackResponse>("enterprise/wms/pilot-feedback")
      .then((response) => {
        if (cancelled) return;
        if (response.dataMode !== "synthetic_only" || response.warehouseExecutionEnabled !== false) {
          setReadState("unavailable");
          return;
        }
        setEntries(response.entries);
        setReadState("available");
      })
      .catch(() => { if (!cancelled) setReadState("unavailable"); });
    // This endpoint fails closed for ordinary employees. No tester can
    // request another tester's feedback by altering browser state.
    gatewayJson<PilotAdminSummary>("enterprise/wms/pilot-feedback-summary")
      .then((response) => {
        if (!cancelled && response.dataMode === "synthetic_only" &&
            response.warehouseExecutionEnabled === false) setAdminSummary(response);
      })
      .catch(() => { /* Deliberate: only server-authorised admin sessions see the summary. */ });
    return () => { cancelled = true; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readState !== "available" || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const answer = await protectedMutation<{ feedback: { status: string; updatedAt: string } }>(
        "enterprise/wms/pilot-feedback", { workspaceCode, result, note },
      );
      if (answer.feedback.status !== "recorded_for_review") throw new Error("Feedback acknowledgement was unavailable.");
      setEntries((previous) => [
        { workspaceCode, result, note, updatedAt: answer.feedback.updatedAt },
        ...previous.filter((entry) => entry.workspaceCode !== workspaceCode),
      ]);
      setNote("");
      setMessage("Pilot observation saved for review.");
      // Refresh the administrator's bounded multi-tester summary after a save.
      // The same endpoint remains inaccessible to ordinary employees.
      gatewayJson<PilotAdminSummary>("enterprise/wms/pilot-feedback-summary")
        .then((response) => {
          if (response.dataMode === "synthetic_only" &&
              response.warehouseExecutionEnabled === false) setAdminSummary(response);
        })
        .catch(() => { /* Server authorisation remains the only source of admin access. */ });
    } catch (error) {
      setMessage(professionalError(error));
    } finally {
      setSaving(false);
    }
  }

  const saved = entries.length;
  const latest = entries.find((entry) => entry.workspaceCode === workspaceCode);
  return <section className="distribution-wms-pilot" aria-labelledby="wms-pilot-title">
    <div className="distribution-wms-pilot-header">
      <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / PRIVATE PILOT</p>
      <h2 id="wms-pilot-title">Test. Record. Improve.</h2>
      <p>Each approved tester can submit one current observation per workspace.
        Start by exploring the existing screens, then record the actual result and how to reproduce a problem.</p>
    </div>
    <ol className="distribution-wms-pilot-steps">
      <li><strong>01 / Open a workspace</strong><span>Use the governed navigation above to explore the relevant view.</span></li>
      <li><strong>02 / Check the behaviour</strong><span>Verify navigation, data labels, filters, accessibility and error handling.</span></li>
      <li><strong>03 / Submit feedback</strong><span>Choose the outcome and explain what happened. Retest after each release.</span></li>
    </ol>
    {readState === "loading" ? <p role="status">Checking private pilot access…</p> : null}
    {readState === "unavailable" ? <div className="distribution-wms-pilot-locked" role="status">
      <strong>Private pilot not activated for this account.</strong>
      <p>An authorised staging session, synthetic-only dataset and an allowlisted test account
        are required. This control does not enable stock movement, medicine supply or real dispatch.</p>
    </div> : null}
    {readState === "available" ? <div className="distribution-wms-pilot-grid">
      <form onSubmit={submit} className="distribution-wms-pilot-form">
        <h3>Record an observation</h3>
        <label htmlFor="distribution-pilot-workspace">Workspace</label>
        <select id="distribution-pilot-workspace" value={workspaceCode}
          onChange={(event) => { setWorkspaceCode(event.target.value); setMessage(""); }}>
          {workspaces.map((entry) =>
            <option key={entry.code} value={entry.code}>{entry.label}</option>)}
        </select>
        <label htmlFor="distribution-pilot-result">Test outcome</label>
        <select id="distribution-pilot-result" value={result}
          onChange={(event) => setResult(event.target.value as FeedbackResult)}>
          {(["working", "broken", "needs_improvement"] as const).map((value) =>
            <option key={value} value={value}>{resultLabels[value]}</option>)}
        </select>
        <label htmlFor="distribution-pilot-note">What happened? {result === "working" ? "(optional)" : "(at least 8 characters)"}</label>
        <textarea id="distribution-pilot-note" rows={4} maxLength={600}
          value={note} onChange={(event) => setNote(event.target.value)}
          placeholder="Describe the steps you tried and what you expected to happen."/>
        <p className="distribution-wms-pilot-privacy">
          No passwords, patient information, personal contact details, API secrets or live order data.
          This is software testing feedback, not a QMS safety report.
        </p>
        <button type="submit" disabled={saving || (result !== "working" && note.trim().length < 8)}>
          {saving ? "Saving observation…" : "Save test observation"}
        </button>
        <p role="status" aria-live="polite">{message}</p>
      </form>
      <div className="distribution-wms-pilot-summary">
        <h3>Your workspace results</h3>
        <p>{saved} of {workspaces.length} workspaces have a saved result in this private pilot.</p>
        {latest ? <p>Selected workspace: <strong>{resultLabels[latest.result]}</strong></p> : null}
        <div className="distribution-wms-pilot-table">
          <table>
            <thead><tr><th scope="col">Workspace</th><th scope="col">Your result</th></tr></thead>
            <tbody>{workspaces.map((workspace) => {
              const report = entries.find((entry) => entry.workspaceCode === workspace.code);
              return <tr key={workspace.code}>
                <td>{workspace.label}</td>
                <td data-outcome={report?.result ?? "not_tested"}>
                  {report ? resultLabels[report.result] : "Not tested"}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </div> : null}
    {readState === "available" && adminSummary ? <section
      className="distribution-wms-pilot-admin" aria-label="Administrator pilot review">
      <h3>Private pilot review</h3>
      <p>Only the approved pilot administrator can review reports across test accounts.
        These are software observations, not verified warehouse incidents or QMS cases.</p>
      <div className="distribution-wms-pilot-admin-stats">
        <span><strong>{adminSummary.counts.working}</strong> Working</span>
        <span><strong>{adminSummary.counts.broken}</strong> Not working</span>
        <span><strong>{adminSummary.counts.needs_improvement}</strong> Needs improvement</span>
      </div>
      <div className="distribution-wms-pilot-table">
        <table>
          <thead><tr><th scope="col">Tester</th><th scope="col">Workspace</th>
            <th scope="col">Result</th><th scope="col">Observation</th></tr></thead>
          <tbody>{adminSummary.reports.map((entry) =>
            <tr key={entry.testerUsername + ":" + entry.workspaceCode}>
              <td>{entry.testerUsername}</td><td>{entry.workspaceCode}</td>
              <td>{resultLabels[entry.result]}</td><td>{entry.note || "No note provided"}</td>
            </tr>)}</tbody>
        </table>
      </div>
      <p>Showing {adminSummary.sampledReports} recent reports at most.
        This is a bounded pilot review, not a complete production analytics service.</p>
    </section> : null}
    <p className="distribution-wms-pilot-bottom">
      Pilot results do not prove the live 3PL, customer orders or quality systems are ready.
      All warehouse execution functions remain separately gated.
    </p>
  </section>;
}
