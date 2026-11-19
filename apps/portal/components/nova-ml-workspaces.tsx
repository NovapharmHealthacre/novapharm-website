"use client";

import { useState } from "react";
import { novaComputeInfrastructureRows } from "../data/nova-ml-infrastructure";
import { type NovaMlWorkspaceSlug, novaMlAlignmentResearchMethods, novaMlExperienceGuidance, novaMlSparseCircuitAssurance, novaMlWorkspaceCatalogue } from "../data/nova-ml-modules";
import { ClipVisualSearch } from "./clip-visual-search";
import { MultimodalReviewPanel } from "./multimodal-review-panel";
import styles from "./nova-ml-workspaces.module.css";
import { NovaSignalsResearch } from "./nova-signals-research";

const gates = [
  { id: "rights", title: "Data and model rights", detail: "Authorised source, licence, purpose and retention are documented." },
  { id: "privacy", title: "Privacy and security", detail: "Minimal data access, device permissions, threat review and revocation are approved." },
  { id: "evaluation", title: "Evaluation and limitations", detail: "Representative holdout, failures, bias, drift and fallback criteria are tested." },
  { id: "signoff", title: "Human release authority", detail: "The accountable owner has approved deployment and its rollback plan." }
] as const;

export function NovaMlWorkspace({ kind }: Readonly<{ kind: NovaMlWorkspaceSlug }>) {
  const module = novaMlWorkspaceCatalogue.find((entry) => entry.slug === kind);
  const [review, setReview] = useState<readonly string[]>([]);
  if (!module) return null;
  const complete = gates.every((gate) => review.includes(gate.id));
  const guidance = novaMlExperienceGuidance[kind];
  const designRows = [
    ["Role", guidance.role],
    ["Data and privacy", guidance.input],
    ["Interaction and learning cadence", guidance.interaction],
    ["Feedback", guidance.feedback],
    ["Calibration", guidance.calibration],
    ["Corrections", guidance.correction],
    ["Attribution", guidance.attribution],
    ["Confidence", guidance.confidence],
    ["Limitations", guidance.limitation],
    ["Fallback", guidance.fallback]
  ] as const;

  const toggle = (id: string, checked: boolean) => {
    setReview((previous) => checked ? [...previous.filter((value) => value !== id), id] : previous.filter((value) => value !== id));
  };

  return <section className={styles.workspace} aria-labelledby="nova-ml-workspace-heading">
    <header className={styles.hero}>
      <p className={styles.eyebrow}>NOVAPHARM INTELLIGENCE / NOVA ML</p>
      <h1 id="nova-ml-workspace-heading">{module.title}</h1>
      <p className={styles.lead}>{module.summary}</p>
      <p className={styles.boundary} role="note"><strong>Integration candidate, not an active AI service.</strong> This protected web view does not train models, invoke Core ML, access Apple Intelligence, upload files, or make predictions. Native execution requires a separately approved Apple application and deployment.</p>
      <dl className={styles.facts}>
        <div><dt>Apple integration</dt><dd>{module.appleTechnology}</dd></div>
        <div><dt>Runtime</dt><dd>{module.platform}</dd></div>
        <div><dt>Decision authority</dt><dd>Human review only</dd></div>
      </dl>
    </header>

    <section className={styles.section} aria-labelledby="nova-ml-capabilities">
      <h2 id="nova-ml-capabilities">Planned capabilities</h2>
      <p className={styles.helper}>These are product contracts, not currently available prediction or training operations.</p>
      <ol className={styles.capabilities}>{module.capabilities.map((capability, index) =>
        <li key={capability}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{capability}</p></li>
      )}</ol>
    </section>

    {(kind === "nova-device-intelligence" || kind === "nova-core-runtime") && <MultimodalReviewPanel />}

    {(kind === "nova-ml-studio" || kind === "nova-generative-assist") && <section className={styles.section} aria-labelledby="nova-ml-alignment-research">
      <h2 id="nova-ml-alignment-research">AI alignment research programme</h2>
      <p className={styles.helper}>Source-only research directions. No model, rewards, critiques, training, operational actions or customer predictions run on this page.</p>
      <dl className={styles.contractGrid}>{novaMlAlignmentResearchMethods.map((method) =>
        <div className={styles.contractItem} key={method.id}>
          <dt>{method.title}</dt>
          <dd>{method.summary} {method.approval}</dd>
        </div>
      )}</dl>
    </section>}

    {kind === "nova-device-intelligence" ? <ClipVisualSearch /> : null}

    <section className={styles.section} aria-labelledby="nova-ml-experience">
      <h2 id="nova-ml-experience">Apple HIG machine-learning experience contract</h2>
      <p className={styles.helper}>Ten acceptance requirements for future native releases. These are testable design rules, not live model outputs or permission grants.</p>
      <dl className={styles.contractGrid}>{designRows.map(([label, description]) =>
        <div key={label} className={styles.contractItem}><dt>{label}</dt><dd>{description}</dd></div>
      )}</dl>
    </section>

    <section className={styles.section} aria-labelledby="nova-ml-infrastructure">
      <h2 id="nova-ml-infrastructure">Deep-learning infrastructure architecture</h2>
      <p className={styles.helper}>A cross-platform engineering contract informed by OpenAI’s 2016 infrastructure research. These are design requirements, not an active cluster, AI model or job scheduler.</p>
      <dl className={styles.contractGrid}>{novaComputeInfrastructureRows.map((item) =>
        <div key={item.title} className={styles.contractItem}><dt>{item.title}</dt><dd>{item.detail}</dd></div>
      )}</dl>
      <p className={styles.reference}>Architecture reference: <a href="https://openai.com/index/infrastructure-for-deep-learning/">OpenAI — Infrastructure for deep learning (2016)</a>. Any compute activation requires independent security, rights, cost and infrastructure approval.</p>
    </section>

    <NovaSignalsResearch />

    <section className={styles.section} aria-labelledby="nova-ml-sparse-circuits">
      <h2 id="nova-ml-sparse-circuits">{novaMlSparseCircuitAssurance.title}</h2>
      <p className={styles.boundary} role="note"><strong>{novaMlSparseCircuitAssurance.status}.</strong>
        No inspected model, circuit discovery, causal proof, sparse-model inference or production activation is connected to this workspace. This is an independently gated research contract, not a model result.
      </p>
      <p className={styles.helper}>{novaMlSparseCircuitAssurance.modelPolicy}</p>
      <dl className={styles.facts}>
        <div><dt>Artifact schema</dt><dd>{novaMlSparseCircuitAssurance.contract}</dd></div>
        <div><dt>Purpose</dt><dd>{novaMlSparseCircuitAssurance.classification}</dd></div>
        <div><dt>Safety boundary</dt><dd>Research review only</dd></div>
      </dl>
      <p>{novaMlSparseCircuitAssurance.releasePolicy}</p>
      <section className={styles.contractItem} aria-labelledby="nova-ml-synthetic-research-heading">
        <h3 id="nova-ml-synthetic-research-heading">{novaMlSparseCircuitAssurance.offlineExperiment.name}</h3>
        <p>{novaMlSparseCircuitAssurance.offlineExperiment.description}</p>
        <dl className={styles.facts}>
          <div><dt>Sample</dt><dd>{novaMlSparseCircuitAssurance.offlineExperiment.sample}</dd></div>
          <div><dt>Isolated circuit</dt><dd>{novaMlSparseCircuitAssurance.offlineExperiment.isolatedAccuracy}</dd></div>
          <div><dt>Mean ablation</dt><dd>{novaMlSparseCircuitAssurance.offlineExperiment.ablatedAccuracy}</dd></div>
        </dl>
        <p className={styles.helper}>{novaMlSparseCircuitAssurance.offlineExperiment.status}. {novaMlSparseCircuitAssurance.offlineExperiment.limitation}</p>
      </section>

      <dl className={styles.contractGrid}>{novaMlSparseCircuitAssurance.methodGates.map((gate) =>
        <div key={gate.name} className={styles.contractItem}><dt>{gate.name}</dt><dd>{gate.detail}</dd></div>
      )}</dl>
      <p className={styles.reference}>Research references: {novaMlSparseCircuitAssurance.references.map((reference, index) =>
        <span key={reference.href}>{index > 0 ? " · " : ""}<a href={reference.href} target="_blank" rel="noopener noreferrer">{reference.label}</a></span>
      )}</p>
    </section>

    <section className={styles.section} aria-labelledby="nova-ml-acceptance">
      <h2 id="nova-ml-acceptance">Requirements before activation</h2>
      <ul className={styles.requirements}>{module.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
    </section>

    <section className={styles.section} aria-labelledby="nova-ml-review-heading">
      <h2 id="nova-ml-review-heading">Review preparation</h2>
      <p className={styles.helper}>Use this temporary checklist to plan the required evidence. Your selections stay in this tab and are not saved, submitted, used for training or treated as approval.</p>
      <fieldset className={styles.checklist}>
        <legend>Local preparation checklist</legend>
        {gates.map((gate) => <label key={gate.id} className={styles.check}>
          <input type="checkbox" checked={review.includes(gate.id)} onChange={(event) => toggle(gate.id, event.currentTarget.checked)} />
          <span><strong>{gate.title}</strong><small>{gate.detail}</small></span>
        </label>)}
      </fieldset>
      <div className={styles.reviewStatus} role="status" aria-live="polite">
        <strong>{complete ? "Preparation checklist marked complete" : String(review.length) + " of " + String(gates.length) + " preparation items selected"}</strong>
        <p>{complete ? "This is a local planning state only. It does not verify evidence, confer approval, enable models or unlock a production feature." : "All proposed capabilities remain disabled until independently verified, owner-approved and deployed in a native companion."}</p>
      </div>
      <button type="button" className={styles.reset} onClick={() => setReview([])} disabled={review.length === 0}>Clear selections</button>
    </section>

    <section className={styles.section} aria-labelledby="nova-ml-privacy">
      <h2 id="nova-ml-privacy">Privacy, corrections and accountability</h2>
      <p>No implicit tracking, continuous microphone or camera capture, personalised medical advice, automatic supply release, supplier rejection, purchase approval or regulatory decision is authorised by this foundation.</p>
      <p>When a future native model is approved, its interface must show provenance, meaningful limitations, correction and rejection actions, and an accessible source-first fallback. Retrieval similarity must not be presented as calibrated certainty.</p>
      <p className={styles.reference}>Implementation guidance: <a href="https://developer.apple.com/design/human-interface-guidelines/machine-learning">Apple HIG — Machine learning</a> and <a href="https://developer.apple.com/design/human-interface-guidelines/privacy">Apple HIG — Privacy</a>.</p>
    </section>
  </section>;
}
