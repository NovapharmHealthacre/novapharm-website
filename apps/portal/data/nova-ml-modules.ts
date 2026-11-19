/**
 * Native AI integration programme for the existing protected Intelligence portal.
 * These are four separate, gated extensions, NOT additions to the canonical
 * 22 medicine research workspaces and NOT claims of Apple SDK execution on web.
 */
export const novaMlWorkspaceCatalogue = Object.freeze([
  {
    slug: "nova-ml-studio",
    title: "Nova ML Studio",
    summary: "Design and review dataset, training and evaluation plans before any model is approved.",
    appleTechnology: "Create ML",
    platform: "macOS training companion required",
    capabilities: ["Dataset rights and consent review", "Training, validation and holdout split", "Model metadata and versioning", "Error analysis and accountable sign-off", "Research-only L0 hard-concrete feature gates with dense-baseline comparison"],
    requirements: ["Licensed or otherwise authorised non-patient training data", "Leakage-safe, representative evaluation", "Independent Quality and Security approval", "Signed native model-training release", "Measured active-feature sparsity, held-out error, model lineage and hardware latency"]
  },
  {
    slug: "nova-core-runtime",
    title: "Nova Core Runtime",
    summary: "Prepare a registry-controlled on-device prediction path without fabricating live model results.",
    appleTechnology: "Core ML",
    platform: "Signed iOS, iPadOS or macOS app required",
    capabilities: ["Approved model package and input schema", "Device-local prediction", "Latency, drift and error assessment", "Sparse-model artifact integrity and dense-versus-pruned benchmark", "Immediate fallback to source records"],
    requirements: ["Signed and approved model artifact", "Explicit per-use-case model rights", "Device and OS compatibility tests", "Human review for any consequential result"]
  },
  {
    slug: "nova-device-intelligence",
    title: "Nova Device Intelligence",
    summary: "Plan opt-in device document, language and media workflows, plus a separately gated OpenAI CLIP public-image retrieval research candidate.",
    appleTechnology: "Vision, Natural Language and Speech; CLIP research is separate from Apple frameworks",
    platform: "Native app and device permissions required; private CLIP server approval required",
    capabilities: ["Document text recognition after user selection", "Language-aware document assistance", "User-requested speech-to-text", "English text-to-approved-public-image CLIP research", "Opt-out and correction controls"],
    requirements: ["Minimal purpose-specific user permission", "No patient-identifiable or sensitive media by default", "On-device processing and retention review", "Independent CLIP model rights and domain-shift evaluation", "Human-verified outputs before records change"]
  },
  {
    slug: "nova-generative-assist",
    title: "Nova Generative Assist",
    summary: "Design evidence-bounded writing and research assistance using a supported native model.",
    appleTechnology: "Foundation Models and App Intents",
    platform: "Eligible Apple Intelligence device and native app required",
    capabilities: ["Request-only writing assistance", "Source attribution and visible limitations", "Edit, reject and regenerate workflow", "Scoped App Intents with no autonomous write access"],
    requirements: ["Apple device and model availability verification", "Approved source and prompt boundaries", "Privacy and prompt-injection testing", "Explicit human acceptance of every consequential action"]
  }
] as const);
export type NovaMlWorkspaceSlug = (typeof novaMlWorkspaceCatalogue)[number]["slug"];
export const novaMlWorkspaceSlugs: readonly NovaMlWorkspaceSlug[] = Object.freeze(novaMlWorkspaceCatalogue.map((module) => module.slug));
export function isNovaMlWorkspaceSlug(value: string): value is NovaMlWorkspaceSlug {
  return novaMlWorkspaceSlugs.some((slug) => slug === value);
}

// Human-interface acceptance contracts from Apple's HIG Machine Learning and Privacy.
// Each description is a required FUTURE user experience, not a live prediction claim.
export const novaMlExperienceGuidance = Object.freeze({
  "nova-ml-studio": {
    role: "Complementary model-development tool; no medicine workflow depends on training.",
    input: "Only explicitly selected, rights-cleared, non-patient datasets under an approved purpose.",
    interaction: "Visible and user-initiated training; fixed, versioned validation. Never train from implicit usage data.",
    feedback: "Voluntary quality review with specific failure categories; never silently treat user corrections as labels.",
    calibration: "No personal calibration. Require dataset schema, class-balance and independent holdout checks.",
    correction: "Correct source labels, inspect confusion and precision/recall, then rerun an independent test.",
    attribution: "Link evaluation to the dataset register, model version, metadata and accountable reviewer.",
    confidence: "Never display accuracy alone as clinical reliability or present uncalibrated prediction certainty.",
    limitation: "Small or imbalanced samples and training–holdout leakage invalidate release decisions.",
    fallback: "Keep original labelled source records and the existing source-first Intelligence workspaces."
  },
  "nova-core-runtime": {
    role: "Optional on-device assistance; no clinical, supply, commercial or regulatory decision authority.",
    input: "A licensed signed-app model and only the approved local input features.",
    interaction: "Visible, reactive predictions after an explicit user task; model updates happen only after release review.",
    feedback: "Offer voluntary structured corrections without automatic model retraining or user profiling.",
    calibration: "Do not request personal calibration unless a specific approved model genuinely requires it.",
    correction: "Show a clear Reject or Correct action and allow re-check against the original evidence.",
    attribution: "Identify model version, source class, limitations and that results are AI-assisted.",
    confidence: "Suppress unsound numeric scores; fail closed on uncalibrated or out-of-distribution inputs.",
    limitation: "Device support, model quality, domain shift and missing features can make predictions unavailable.",
    fallback: "Present the unmodified source and a manual workflow when inference fails or is disabled."
  },
  "nova-device-intelligence": {
    role: "Complementary document, language and media understanding; never a hidden monitoring tool.",
    input: "A single selected approved public document, text excerpt or local audio recording.",
    interaction: "Reactive and visible; no default camera, microphone, background capture or passive tracking.",
    feedback: "Opt-in correction of OCR, language or transcript drafts; do not harvest voice or usage signals.",
    calibration: "No personal voice or body calibration. Ask only for specific permission at the actual task.",
    correction: "Compare OCR/transcript with its original; let people edit, reject or discard immediately.",
    attribution: "Show which user-selected file produced the unverified extraction.",
    confidence: "Do not show raw recognizer confidence as a validated correctness percentage.",
    limitation: "Noisy audio, poor lighting, unfamiliar scripts and unsupported offline languages reduce quality.",
    fallback: "Read the original file manually or type text; never silently switch to cloud recognition."
  },
  "nova-generative-assist": {
    role: "Complementary writing helper only; not an autonomous pharmacist, agent or factual authority.",
    input: "Explicitly approved public excerpts, never protected tenant, patient or private account context.",
    interaction: "Reactive by default; a person requests each proposed rewrite and reviews it before use.",
    feedback: "Offer optional Improve, Reject and Revert actions; no silent learning from private edits.",
    calibration: "No personal preference calibration or app-wide profiling for these initial candidates.",
    correction: "Keep the original visible beside the draft, with editable and fully reversible changes.",
    attribution: "Link every candidate to its exact approved source; no fabricated citations.",
    confidence: "Do not imply model prose is verified evidence or disclose unvalidated confidence values.",
    limitation: "Models can invent facts, lose nuance or be unavailable depending on device, language or region.",
    fallback: "Use the original published text and ordinary manual editing without any model call."
  }
} as const);


/**
 * Shared Nova ML mechanistic interpretability policy.
 * Informational only: a display or a model-vendor statement cannot establish
 * that an actual causal circuit was discovered, independently reproduced or
 * approved for pharmaceutical use.
 */
export const novaMlSparseCircuitAssurance = Object.freeze({
  contract: "npi.sparse-circuit.v1",
  title: "Sparse-circuit interpretability",
  status: "Research candidate — no model experiment connected",
  classification: "non-clinical, non-operational",
  modelPolicy: "Open weights and activations are required; API-only and deterministic retrieval systems are not eligible for circuit inspection.",
  releasePolicy: "The inspector never grants production, customer, commercial, regulatory or clinical authority.",
  offlineExperiment: {
    name: "Trained synthetic attention intervention",
    description: "A separate offline CPU experiment trains a tiny two-head attention model on generated binary tokens, selects the circuit head on calibration examples only, then evaluates the isolated head and mean ablation on an untouched synthetic holdout.",
    sample: "256 generated holdout cases; no medicines or private data",
    isolatedAccuracy: "100% on this intentionally simple synthetic task",
    ablatedAccuracy: "49.2% after isolating and mean-ablating the selected head",
    status: "Local repeat verified; independent research reproduction and CI still required",
    limitation: "This does not validate a production model, reproduce OpenAI's experiments, establish causal circuit ground truth or approve any pharmaceutical conclusion."
  },
  methodGates: [
    { name: "Internal access", detail: "Verify model weights, activations, architecture, licence and version before claiming circuit access." },
    { name: "Causal experiments", detail: "Replicate sparsification, pruning, mean ablation, necessity and sufficiency on an independent held-out set." },
    { name: "Evidence separation", detail: "Keep model-internal circuits separate from the medicines knowledge graph and rights-admitted source records." },
    { name: "Independent verification", detail: "Require a reviewer, reproducible hashes, uncertainty, failures and negative controls; metadata alone is never proof." },
    { name: "Human authority", detail: "Do not infer medical safety or permit autonomous clinical, procurement, regulatory or financial decisions." }
  ] as const,
  references: [
    { label: "OpenAI research", href: "https://openai.com/index/understanding-neural-networks-through-sparse-circuits/" },
    { label: "Research implementation", href: "https://github.com/openai/circuit_sparsity" }
  ] as const
});

/**
 * Research directions only. These are not separate live workspaces and do not
 * run models in the web browser. Keep the existing four protected routes.
 */
export const novaMlAlignmentResearchMethods = Object.freeze([
  {
    id: "reward_proxy_sweep",
    title: "Reward proxy overoptimisation",
    researchStatus: "Offline evaluation candidate",
    summary: "Compare proxy scores against separate, independently adjudicated outcomes to detect Goodhart-style deterioration.",
    approval: "No trained reward model, verified independent gold outcome or optimisation permission."
  },
  {
    id: "critique_assistance",
    title: "Human-assisted critique review",
    researchStatus: "Offline evaluation candidate",
    summary: "Assess whether proposed flaws improve human review of medicine evidence, supplier documents and research summaries.",
    approval: "No automatic validation of factual correctness, medical safety or source rights."
  },
  {
    id: "instruction_conformance",
    title: "Instruction adherence",
    researchStatus: "Offline evaluation candidate",
    summary: "Audit specified requirements, missing citations and prohibited actions without trusting instructions embedded in source material.",
    approval: "No SFT, PPO, RLHF training or permission to override identity and scope."
  },
  {
    id: "offline_multiagent_scenario_scoreboard",
    title: "Long-horizon simulation",
    researchStatus: "Offline evaluation candidate",
    summary: "Compare synthetic supply-chain planning trajectories and flag unsafe action attempts, without controlling operations.",
    approval: "No trained agent, approved simulator, autonomous WMS or inventory release."
  }
] as const);

/**
 * Shared web/Expo research metadata only. Never interpreted as a live
 * candidate model manifest or permission to run inference on a device.
 */
export const novaMlSparseResearchMethod = Object.freeze({
  id: "l0_sparse_feature_gates",
  title: "L₀ sparse feature gates",
  researchStatus: "Offline mathematical research",
  summary: "Evaluate hard-concrete sparsification and exact-zero model candidates under separately governed, nonclinical research tests.",
  approval: "No licensed training dataset, independently validated model, signed mobile inference package, production API or customer release."
} as const);
