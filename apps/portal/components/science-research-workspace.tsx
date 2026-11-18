"use client";

import catalog from "../../../docs/intelligence/science-research-capabilities-20261118.json";
import styles from "./science-research-workspace.module.css";

/**
 * This route inherits the existing board-only SSR session gate.
 * The catalogue is public metadata; it is not a model/API execution surface.
 */
export function ScienceResearchWorkspace() {
  return <section className={styles.root} aria-labelledby="science-title" data-science-status="design-only">
    <header className={styles.header}>
      <p className={styles.eyebrow}>NovaPharm Intelligence / Scientific research</p>
      <h1 id="science-title">Science, grounded in evidence.</h1>
      <p className={styles.intro}>A unified research environment for literature, scientific data, modelling and investigation planning. Each capability is a controlled design candidate, not a live scientific AI service.</p>
      <p className={styles.state}>Research architecture · No model connected · No source ingested</p>
    </header>
    <div className={styles.metrics} aria-label="Research readiness">
      <div><strong>{catalog.workflows.length}</strong><span>Designed research workflows</span></div>
      <div><strong>0</strong><span>Connected research models</span></div>
      <div><strong>0</strong><span>Approved new science datasets</span></div>
    </div>
    <section aria-labelledby="science-workflows-title">
      <div className={styles.sectionHeading}><h2 id="science-workflows-title">Research workspaces</h2><p>Built on the existing evidence and rights architecture, without creating unsupported scientific claims.</p></div>
      <div className={styles.grid}>
        {catalog.workflows.map((workflow, index) => <article className={styles.card} key={workflow.id}>
          <p className={styles.index}>{"0" + (index + 1)}</p>
          <h3>{workflow.title}</h3><p>{workflow.description}</p>
          <p className={styles.pending}>Planning only · Human review required</p>
          <h4>Evidence gates</h4>
          <ul>{workflow.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>)}
      </div>
    </section>
    <section className={styles.bottom} aria-labelledby="science-gates-title">
      <h2 id="science-gates-title">Production release remains gated.</h2>
      <p>Access to restricted science models (including GPT-Rosalind) requires separate OpenAI eligibility and API approval. Evidence permissions, qualified scientists, regulated validation and independently verified iOS/Android security must also be established. Neither this screen nor the public OpenAI Science page is an API connection.</p>
      <a href="https://openai.com/science/" target="_blank" rel="noopener noreferrer">OpenAI Science — external research reference</a>
    </section>
  </section>;
}
