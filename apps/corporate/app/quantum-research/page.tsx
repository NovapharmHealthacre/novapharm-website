import type { Metadata } from "next";
import quantumProgram from "../../../../docs/intelligence/quantum-research-program-v1.json";
import styles from "./quantum-research.module.css";

export const metadata: Metadata = {
  title: "Quantum & Computational Science | NovaPharm Healthcare",
  description: "Research roadmap for reproducible quantum algorithms, molecular simulation and independent verification.",
  robots: { index: false, follow: false }
};
export default function QuantumResearchPage() {
  return <section className={styles.page} id="quantum-research">
    <div className={styles.shell}>
      <p className={styles.eyebrow}>NovaPharm Healthcare / Research architecture</p>
      <h1>Quantum and computational science.</h1>
      <p className={styles.lead}>A source-only engineering programme for reproducible simulation, molecular research and scientific verification. No live quantum hardware, validated drug discovery, clinical use or customer-facing research service is available.</p>
      <p className={styles.status}>Research candidate · No production or hardware activation</p>
      <h2>Research directions</h2>
      <div className={styles.grid}>
        {quantumProgram.modules.map((module, index) => <article key={module.id} className={styles.card}>
          <p className={styles.number}>{String(index + 1).padStart(2,"0")} · {module.status.replaceAll("-"," ")}</p>
          <h3>{module.title}</h3>
          <p>{module.description}</p>
        </article>)}
      </div>
      <h2>Scientific verification principles</h2>
      <div className={styles.grid}>
        {quantumProgram.principles.map((item) => <section key={item.title} className={styles.card}>
          <h3>{item.title}</h3><p>{item.detail}</p>
        </section>)}
      </div>
      <p className={styles.note}>Scientific simulations must be compared with independent classical benchmarks. A validated schema does not establish scientific truth, clinical utility or a quantum speedup. Quantum hardware access is a future, separately approved research option.</p>
      <h2>Official technical references</h2>
      <ul className={styles.references}>{quantumProgram.links.map((link) => <li key={link.href}><a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a></li>)}</ul>
    </div>
  </section>;
}
