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
  }
] as const);
export type NovaMlWorkspaceSlug = (typeof novaMlWorkspaceCatalogue)[number]["slug"];
export const novaMlWorkspaceSlugs: readonly NovaMlWorkspaceSlug[] = Object.freeze(novaMlWorkspaceCatalogue.map((module) => module.slug));
export function isNovaMlWorkspaceSlug(value: string): value is NovaMlWorkspaceSlug {
  return novaMlWorkspaceSlugs.some((slug) => slug === value);
}
