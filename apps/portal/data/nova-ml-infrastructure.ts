/** Read-only architectural guidance, not a scheduler or model service. */
export const novaComputeInfrastructureRows = Object.freeze([
  { title: "Reproducible experiments", detail: "Version datasets, model artefacts, software images, seeds, evaluation and experiment lineage." },
  { title: "Compute selection", detail: "Choose bounded CPU or GPU work based on measured demand, not a default expensive GPU cluster." },
  { title: "Secure orchestration", detail: "Queue and schedule only after identity, rights, workload classification and human release gates." },
  { title: "Cost and capacity", detail: "Enforce trusted budget quotas, timeouts, concurrency, cancellation and shut-down before compute is enabled." },
  { title: "Data sovereignty", detail: "Use approved regional storage, encryption, immutable provenance, strict retention and private network paths." },
  { title: "Monitoring and recovery", detail: "Record redacted run metrics, failures and model evaluation, with checkpoint and rollback evidence." },
  { title: "Web, iOS and Android", detail: "Keep cloud training on the protected backend. App clients may review signed results or use separately approved local models." }
] as const);
