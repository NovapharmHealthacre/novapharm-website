import { novaSignalsResearchGroups, novaSignalsResearchSources } from "../data/nova-signals-research";
import styles from "./nova-signals-research.module.css";

/** Protected evidence register only, rendered inside Nova ML's existing board-session boundary. */
export function NovaSignalsResearch() {
  return <section className={styles.section} aria-labelledby="nova-signals-evidence">
    <h2 id="nova-signals-evidence">Science, enterprise research and AI engineering evidence</h2>
    <p className={styles.intro}>Source-first reading register spanning OpenAI Signals, ten published economic and scientific research reports, Whisper, distributed neural-network training and Triton. Expand any source to review its proposed use and limitations. This does not fetch live data or activate an AI service.</p>
    <p className={styles.intro}>Signals v3 data inventory: 24 publisher tables documented, but only three aggregate-only CSV types accepted for local, non-persistent preview. The other 21 are metadata-only and cannot be imported. <a href="https://cdn.openai.com/signals/data-dictionary.pdf" target="_blank" rel="noopener noreferrer">Read the publisher data dictionary</a>.</p>
    {novaSignalsResearchGroups.map(group => <div className={styles.group} key={group}>
      <h3>{group}</h3>
      {novaSignalsResearchSources.filter(source => source.group === group).map(source => <details className={styles.detail} key={source.id}>
        <summary>{source.title}</summary>
        <p><strong>Research finding:</strong> {source.finding}</p>
        <p><strong>NovaPharm application:</strong> {source.adaptation}</p>
        <p><strong>Limitation:</strong> {source.boundary}</p>
        <a href={source.url} target="_blank" rel="noopener noreferrer">Read the original OpenAI research</a>
      </details>)}
    </div>)}
    <p className={styles.boundary}><strong>Research, not live operations.</strong> No transcription, GPU training, Triton kernels, auto-agent execution, clinical decisions, published report scraping, or real-time OpenAI data feeds are enabled by this view. Sources retain their own authorship, dates, rights and methodological limitations.</p>
  </section>;
}
