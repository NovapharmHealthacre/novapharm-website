/**
 * OpenAI CLIP visual catalogue research: shared client-side evidence boundary.
 *
 * This module deliberately contains no transport, credentials, model weights,
 * network calls, image pickers or storage. The unsigned mobile preview MUST
 * remain disabled until the separate signed board session, CSRF and licensed
 * private runtime have passed Issue #827's independent release approvals.
 *
 * PR #822 implements the protected web/API candidate and native adapters.
 * This Expo preview does not claim that those services have been deployed.
 */
export const CLIP_CONTRACT = "novapharm.intelligence.visual-search.v1" as const;

export const CLIP_MOBILE_RELEASE = Object.freeze({
  contract: CLIP_CONTRACT,
  state: "source_candidate_disabled" as const,
  enabled: false as const,
  sessionConnected: false as const,
  licensedIndexConnected: false as const,
  modelRuntimeConnected: false as const,
  humanReviewRequired: true as const,
  productIdentityVerified: false as const,
  regulatoryStatusVerified: false as const
});

export type ClipResearchCandidate = Readonly<{
  rank: number;
  assetId: string;
  title: string;
  rightsReference: string;
  sourceUrl: string;
  status: "unverified_visual_match";
}>;

export type ClipResearchResponse = Readonly<{
  contract: typeof CLIP_CONTRACT;
  query: string;
  results: readonly ClipResearchCandidate[];
  humanReviewRequired: true;
  similarityIsNotEvidence: true;
  regulatoryStatusVerified: false;
  productIdentityVerified: false;
}>;

function publicSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const source = new URL(value);
    const host = source.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
    return source.protocol === "https:" &&
      host.includes(".") &&
      !host.includes(":") &&
      !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) &&
      host !== "localhost" &&
      !/\.(?:local|localhost|internal)$/.test(host) &&
      !source.username && !source.password && !source.hash &&
      (source.port === "" || source.port === "443");
  } catch {
    return false;
  }
}

function record(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}

/**
 * An independently tested future authenticated transport must validate an
 * unknown response before displaying candidates. Does not make API calls.
 * Similarity ranking is not calibrated certainty or pharmaceutical identity.
 */
export function parseClipResearchResponse(input: unknown): ClipResearchResponse {
  if (!record(input) || input.contract !== CLIP_CONTRACT ||
      input.humanReviewRequired !== true || input.similarityIsNotEvidence !== true ||
      input.regulatoryStatusVerified !== false || input.productIdentityVerified !== false ||
      typeof input.query !== "string" || !Array.isArray(input.results) ||
      input.results.length > 5) {
    throw new Error("Unverified private visual-research response.");
  }
  const seen = new Set<string>();
  const results: ClipResearchCandidate[] = input.results.map((value: unknown, index: number) => {
    if (!record(value) ||
        value.rank !== index + 1 ||
        typeof value.assetId !== "string" || !/^[A-Za-z0-9._:-]{1,120}$/.test(value.assetId) ||
        seen.has(value.assetId) ||
        typeof value.title !== "string" || !value.title.trim() || value.title.length > 200 ||
        typeof value.rightsReference !== "string" || !value.rightsReference.trim() || value.rightsReference.length > 240 ||
        !publicSourceUrl(value.sourceUrl) ||
        value.status !== "unverified_visual_match") {
      throw new Error("Unverified or unsafe public-image attribution.");
    }
    seen.add(value.assetId);
    return Object.freeze({
      rank: index + 1,
      assetId: value.assetId,
      title: value.title,
      rightsReference: value.rightsReference,
      sourceUrl: value.sourceUrl,
      status: "unverified_visual_match"
    });
  });
  return Object.freeze({
    contract: CLIP_CONTRACT,
    query: input.query,
    results: Object.freeze(results),
    humanReviewRequired: true,
    similarityIsNotEvidence: true,
    regulatoryStatusVerified: false,
    productIdentityVerified: false
  });
}
