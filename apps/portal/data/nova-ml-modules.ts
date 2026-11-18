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
    capabilities: ["Dataset rights and consent review", "Training, validation and holdout split", "Model metadata and versioning", "Error analysis and accountable sign-off"],
    requirements: ["Licensed or otherwise authorised non-patient training data", "Leakage-safe, representative evaluation", "Independent Quality and Security approval", "Signed native model-training release"]
  },
  {
    slug: "nova-core-runtime",
    title: "Nova Core Runtime",
    summary: "Prepare a registry-controlled on-device prediction path without fabricating live model results.",
    appleTechnology: "Core ML",
    platform: "Signed iOS, iPadOS or macOS app required",
    capabilities: ["Approved model package and input schema", "Device-local prediction", "Latency, drift and error assessment", "Immediate fallback to source records"],
    requirements: ["Signed and approved model artifact", "Explicit per-use-case model rights", "Device and OS compatibility tests", "Human review for any consequential result"]
  },
  {
    slug: "nova-device-intelligence",
    title: "Nova Device Intelligence",
    summary: "Plan opt-in document, language and media analysis using native device frameworks.",
    appleTechnology: "Vision, Natural Language and Speech",
    platform: "Native app and device permissions required",
    capabilities: ["Document text recognition after user selection", "Language-aware document assistance", "User-requested speech-to-text", "Opt-out and correction controls"],
    requirements: ["Minimal purpose-specific user permission", "No patient-identifiable or sensitive media by default", "On-device processing and retention review", "Human-verified outputs before records change"]
  },
  {
    slug: "nova-generative-assist",
    title: "Nova Generative Assist",
    summary: "Design evidence-bounded writing and research assistance using a supported native model.",
    appleTechnology: "Foundation Models and App Intents",
    platform: "Eligible Apple Intelligence device and native app required",
    capabilities: ["Request-only writing assistance", "Source attribution and visible limitations", "Edit, reject and regenerate workflow", "Scoped App Intents with no autonomous write access"],
    requirements: ["Apple device and model availability verification", "Approved source and prompt boundaries", "Privacy and prompt-injection testing", "Explicit human acceptance of every consequential action"]
  },
  {
    slug: "nova-model-microscope",
    title: "Nova Model Microscope",
    summary: "Inspect independently reviewed, rights-cleared model features, layers and research hypotheses without disclosing weights, source samples or sensitive records.",
    appleTechnology: "OpenAI Microscope research principles (not an OpenAI API)",
    platform: "Governed web research view and iOS/Android read-only preview",
    capabilities: ["Versioned model, layer and feature index", "Provenance-linked feature visualization hypotheses", "Researcher-reviewed circuit and failure hypotheses", "Explicit uncertainty, falsification and source-first fallback"],
    requirements: ["Introspection rights for the exact owned or licensed model", "Non-patient evaluation dataset and source rights", "Independent model review, artifact provenance and tenant-scoped authorization", "Signed inspection service, privacy tests and platform release"]
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
  },
  "nova-model-microscope": {
    role: "Read-only interpretability research, never a validated explanation for medicine, clinical or commercial decisions.",
    input: "Only separately approved non-patient model artifacts, layers and evaluation references with verified origin.",
    interaction: "Explicit authorized model/version/layer/feature exploration; no continuous model monitoring or implicit collection.",
    feedback: "Document researcher hypotheses and counterexamples only after reviewed write permission is separately designed.",
    calibration: "Do not imply feature activations or saliency percentages are calibrated prediction probabilities.",
    correction: "Record alternative hypotheses, disconfirming examples and independent model evaluations before accepting claims.",
    attribution: "Require stable model/version/layer/feature IDs, approved dataset reference, independent rights and digest provenance.",
    confidence: "A feature description is a hypothesis, not a verified model explanation or medical justification.",
    limitation: "Third-party hosted models may expose no internal layers; visualizations can be misleading or polysemantic.",
    fallback: "Always use original accepted medicine source evidence and accountable human review."
  }
} as const);