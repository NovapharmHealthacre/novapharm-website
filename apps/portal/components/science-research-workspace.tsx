"use client";

import { useState } from "react";

import { assessQuantumResourcePlan } from "../../../src/core/intelligence-quantum-resource-estimate.mjs";
import quantumProgram from "../../../docs/intelligence/quantum-research-program-v1.json";
import scienceMethods from "../../../docs/intelligence/openai-science-methods-20261118.json";
import catalog from "../../../docs/intelligence/science-research-capabilities-20261118.json";
import { intelligenceWorkspaceBySlug } from "../data/intelligence-workspaces";
import styles from "./science-research-workspace.module.css";

/**
 * This route inherits the existing board-only SSR session gate.
 * The catalogue is public metadata; it is not a model/API execution surface.
 */
export function ScienceResearchWorkspace() {
  const [selectedQubits, setSelectedQubits] = useState(20);
  const resourceReview = assessQuantumResourcePlan({
    schemaVersion: "npi.quantum-simulator-preflight.v1",
    backend: "classical-state-vector-only",
    qubits: selectedQubits,
    shots: 512,
    circuitGates: 500,
    memoryBudgetMiB: 64,
    hardwareExecutionRequested: false,
    paidComputeRequested: false,
    protectedDataRequested: false,
    productionApproved: false
  });
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
    <section className={styles["methodsSection"]} aria-labelledby="quantum-research-title" data-quantum-research="source-only">
      <div className={styles["sectionHeading"]}>
        <h2 id="quantum-research-title">Quantum and computational science</h2>
        <p>A research-only programme inspired by Google Quantum AI. No quantum hardware, molecular model, cloud job or customer experiment is connected. Classical computing remains the reference baseline.</p>
      </div>
      <div className={styles["methodsGrid"]}>
        {quantumProgram.modules.map((module) => <article className={styles["methodCard"]} key={module.id}>
          <p className={styles["methodType"]}>{module.status.replaceAll("-", " ")} · no production activation</p>
          <h3>{module.title}</h3>
          <p>{module.description}</p>
        </article>)}
      </div>
      <div className={styles["lifecycle"]} aria-labelledby="quantum-ram-preflight">
        <h3 id="quantum-ram-preflight">State-vector memory preflight</h3>
        <p>This interactive calculator only evaluates the mathematical memory footprint of one complex128 state vector. No simulator, chemistry job, quantum processor, cloud service or data upload runs.</p>
        <div className={styles["relatedLinks"]} role="group" aria-label="Select illustrative qubit count">
          {[10, 20, 25, 30].map((count) =>
            <button key={count} type="button" className={styles["relatedLink"]} aria-pressed={selectedQubits === count} onClick={() => setSelectedQubits(count)}>{count} qubits</button>
          )}
        </div>
        <p role="status">{selectedQubits} qubits · {resourceReview.stateVectorMemoryMiB.toLocaleString("en-GB")} MiB theoretical vector storage · 64 MiB declared study budget. {resourceReview.conservativeResearchCandidate ? "Within source review threshold only." : "Exceeds the conservative research advisory."}</p>
        <p>Actual RAM overhead, runtime, licence requirements, price and physical qubit counts remain unknown. This preflight never approves execution.</p>
      </div>
      <div className={styles["lifecycle"]}>
        <h3>Scientific verification DNA</h3>
        <ul>{quantumProgram.principles.map((item) => <li key={item.title}><strong>{item.title}.</strong> {item.detail}</li>)}</ul>
        <p>Only an optional local two-qubit Cirq smoke is defined in source. No H₂ molecular benchmark, real quantum-device measurement, independent replication or pharmaceutical benefit is claimed.</p>
        <p>{quantumProgram.links.map((item, index) => <span key={item.href}>{index ? " · " : ""}<a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a></span>)}</p>
      </div>
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
          <p><strong>Scientific verification</strong> {entry.validationTrack.replaceAll("_", " ")} track · External publisher claim not independently verified · Retractions/corrections: {entry.retractionCorrectionStatus.replaceAll("_", " ")}</p>
          <h4>Checks before use</h4>
          <ul>{entry.validationRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
          <div className={styles["methodFooter"]}>
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Read original OpenAI source</a>
            <span>Reference only · No independent NovaPharm replication</span>
          </div>
        </article>)}
      </div>
    </section>
    <section className={styles["lifecycle"]} aria-labelledby="science-lifecycle-title">
      <h2 id="science-lifecycle-title">Eight checks before a scientific claim.</h2>
      <p>These are unverified prerequisites, not completed scientific validations or clinical permissions.</p>
      <ol className={styles["lifecycleSteps"]}>
        {scienceMethods.claimIntegrityPolicy.requiredStages.map((stage) =>
          <li key={stage}><strong>{stage.replaceAll("_", " ")}</strong><span>Independent verification required</span></li>)}
      </ol>
    </section>
    <section className={styles["bottom"]} aria-labelledby="science-gates-title">
      <h2 id="science-gates-title">Production release remains gated.</h2>
      <p>Access to restricted science models (including GPT-Rosalind) requires separate OpenAI eligibility and API approval. Evidence permissions, qualified scientists, regulated validation and independently verified iOS/Android security must also be established. GPT-Rosalind API access is restricted to approved internal research and is not permitted for customer-facing commercial products. Neither this screen nor the public OpenAI Science page is an API connection.</p>
      <a href="https://openai.com/science/" target="_blank" rel="noopener noreferrer">OpenAI Science — external research reference</a>
    </section>
  </section>;
}
