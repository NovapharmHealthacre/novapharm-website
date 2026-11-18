"use client";

import scienceMethods from "../../../docs/intelligence/openai-science-methods-20261118.json";
import catalog from "../../../docs/intelligence/science-research-capabilities-20261118.json";
import { intelligenceWorkspaceBySlug } from "../data/intelligence-workspaces";
import styles from "./science-research-workspace.module.css";

/**
 * This route inherits the existing board-only SSR session gate.
 * The catalogue is public metadata; it is not a model/API execution surface.
 */
export function ScienceResearchWorkspace() {
  return <section className={styles["root"]} aria-labelledby="science-title" data-science-status="design-only">
    <header className={styles["header"]}>
      <p className={styles["eyebrow"]}>NovaPharm Intelligence / Scientific research</p>
      <h1 id="science-title">Science, grounded in evidence.</h1>
      <p className={styles["intro"]}>A unified research environment for literature, scientific data, modelling and investigation planning. Each capability is a controlled design candidate, not a live scientific AI service.</p>
      <p className={styles["state"]}>Research architecture · No model connected · No source ingested</p>
    </header>
    <section className={styles["metrics"]} aria-label="Research readiness">
      <div><strong>{catalog.workflows.length}</strong><span>Designed research workflows</span></div>
      <div><strong>0</strong><span>Connected research models</span></div>
      <div><strong>0</strong><span>Approved new science datasets</span></div>
    </section>
    <section aria-labelledby="science-workflows-title">
      <div className={styles["sectionHeading"]}><h2 id="science-workflows-title">Research workspaces</h2><p>Built on the existing evidence and rights architecture, without creating unsupported scientific claims.</p></div>
      <div className={styles["grid"]}>
        {catalog.workflows.map((workflow, index) => <article className={styles["card"]} key={workflow.id}>
          <p className={styles["index"]}>{`0${index + 1}`}</p>
          <h3>{workflow.title}</h3><p>{workflow.description}</p>
          <p className={styles["pending"]}>Planning only · Human review required</p>
          <h4>Evidence gates</h4>
          <ul>{workflow.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Related Intelligence workspaces</h4>
          <nav className={styles["relatedLinks"]} aria-label={`Related workspaces for ${workflow.title}`}>
            {workflow.linkedWorkspaces.map((slug) => {
              const workspace = intelligenceWorkspaceBySlug.get(slug);
              return workspace ? <a key={slug} href={`/portal/executive-platform/medicines-intelligence/${slug}/`} className={styles["relatedLink"]}>{workspace.title} · {workspace.state === "gated" ? "Gated" : "Read-only foundation"}</a> : null;
            })}
          </nav>
        </article>)}
      </div>
    </section>
    <section className={styles["methodsSection"]} aria-labelledby="science-methods-title">
      <div className={styles["sectionHeading"]}>
        <h2 id="science-methods-title">Research methods and original sources</h2>
        <p>{scienceMethods.scientificMethodologyCount} research examples and {scienceMethods.discoveryIndexCount} discovery indexes, reviewed {scienceMethods.reviewedAt}. These are published examples to study, not new operational datasets or replicated NovaPharm results.</p>
      </div>
      <div className={styles["methodsGrid"]}>
        {scienceMethods.methods.map((entry) => <article className={styles["methodCard"]} key={entry.id}>
          <p className={styles["methodType"]}>{entry.sourceType === "reference_index" ? "Discovery reference" : "Published research example"} · {entry.publishedAt ?? "Index (changes over time)"}</p>
          <h3>{entry.title}</h3>
          <p><strong>What was reported</strong> {entry.reportedFinding}</p>
          <p><strong>NovaPharm method</strong> {entry.transferablePattern}</p>
          <p><strong>Limits</strong> {entry.limitations}</p>
          <h4>Checks before use</h4>
          <ul>{entry.validationRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
          <div className={styles["methodFooter"]}>
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Read original OpenAI source</a>
            <span>Reference only · No independent NovaPharm replication</span>
          </div>
        </article>)}
      </div>
    </section>
    <section className={styles["bottom"]} aria-labelledby="science-gates-title">
      <h2 id="science-gates-title">Production release remains gated.</h2>
      <p>Access to restricted science models (including GPT-Rosalind) requires separate OpenAI eligibility and API approval. Evidence permissions, qualified scientists, regulated validation and independently verified iOS/Android security must also be established. GPT-Rosalind API access is restricted to approved internal research and is not permitted for customer-facing commercial products. Neither this screen nor the public OpenAI Science page is an API connection.</p>
      <a href="https://openai.com/science/" target="_blank" rel="noopener noreferrer">OpenAI Science — external research reference</a>
    </section>
  </section>;
}
