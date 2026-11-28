"use client";

import { useState } from "react";
import { financeDivisions, financeEvidenceRoute, financeWorkspaces, type FinanceDivision } from "../data/finance-workspaces";
import styles from "./finance-workspace.module.css";

export function FinanceWorkspaceDirectory() {
  const [division, setDivision] = useState<FinanceDivision | "All">("All");
  const visible = division === "All" ? financeWorkspaces : financeWorkspaces.filter((workspace) => workspace.division === division);
  return <section className={styles.workspace} aria-labelledby="finance-workspace-title">
    <header className={styles.hero}>
      <p className={styles.eyebrow}>NOVAPHARM FINANCE</p>
      <h2 id="finance-workspace-title">Clarity across capital.</h2>
      <p>Financial operations, treasury, global intelligence and risk in one governed workspace.</p>
      <div className={styles.summary}>
        <div><strong>36</strong><span>Planned workspaces</span></div>
        <div><strong>6</strong><span>Financial divisions</span></div>
        <div><strong>Read only</strong><span>Current directory</span></div>
      </div>
    </header>
    <p className={styles.notice}>The directory links to existing authorised evidence where available. New financial services, live market feeds and encrypted persistence are not yet connected. AES-256 is required for stored Finance data; this screen does not verify production encryption.</p>
    <div className={styles.filters} role="group" aria-label="Filter financial divisions">
      {(["All", ...financeDivisions] as const).map((item) => <button key={item} type="button" aria-pressed={division === item} onClick={() => setDivision(item)}>{item}</button>)}
    </div>
    <p className={styles.count} role="status">{visible.length} of 36 workspaces</p>
    {financeDivisions.filter((item) => division === "All" || division === item).map((item) => <section className={styles.division} key={item}>
      <h3>{item}</h3>
      <div className={styles.grid}>{visible.filter((workspace) => workspace.division === item).map((workspace) => {
        const route = financeEvidenceRoute(workspace);
        return <article className={styles.card} key={workspace.id}>
          <span className={styles.number}>{String(workspace.id).padStart(2, "0")}</span>
          <h4>{workspace.title}</h4>
          <p>{workspace.description}</p>
          {route && workspace.relatedModule !== "executive.finance" ? <a href={route}>Related evidence</a>
            : <span className={styles.state}>{workspace.relatedModule === "executive.finance" ? "Existing finance records below" : "Integration required"}</span>}
        </article>;
      })}</div>
    </section>)}
  </section>;
}
