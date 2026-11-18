/**
 * Private, human-review-only CLIP retrieval adapter. Disabled without owner activation.
 * Browser/mobile clients must use their existing authenticated API/BFF, never this service.
 */
const CONTRACT = "novapharm.intelligence.visual-search.v1";
const MAX_QUERY_LENGTH = 240;

function unavailable(message = "Visual retrieval is not enabled for this workspace.") {
  return Object.assign(new Error(message), { statusCode: 503, code: "visual_search_unavailable" });
}
export function visualSearchReadiness(environment = process.env) {
  const enabled = environment.NPI_CLIP_ENABLED === "true";
  return Object.freeze({
    contract: CONTRACT,
    enabled,
    state: enabled ? "configured_candidate_not_verified" : "disabled",
    modelFamily: "OpenAI CLIP",
    clinicalDecisionAllowed: false,
    automaticRegulatoryDecisionAllowed: false,
    sourceRightsRequired: true,
    humanReviewRequired: true
  });
}
function validateConfiguration(environment) {
  if (environment.NPI_CLIP_ENABLED !== "true") throw unavailable();
  const secret = String(environment.NPI_CLIP_SERVICE_TOKEN ?? "");
  if (secret.length < 32 || /\s/.test(secret)) throw unavailable();
  const origin = String(environment.NPI_CLIP_SERVICE_ORIGIN ?? "");
  let url;
  try { url = new URL(origin); } catch { throw unavailable(); }
  // Default pilot is local-only. No browser supplied host and no remote model endpoint.
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw unavailable();
  return { origin: url.origin, secret };
}
function normaliseQuery(query) {
  if (typeof query !== "string") throw Object.assign(new Error("A text query is required."), { statusCode: 400 });
  const clean = query.trim();
  if (clean.length < 3 || clean.length > MAX_QUERY_LENGTH || /[\x00-\x1f\x7f]/u.test(clean)) {
    throw Object.assign(new Error("Use a query of 3 to 240 printable characters."), { statusCode: 400 });
  }
  return clean;
}
export async function searchApprovedVisualCatalogue(
  { query, limit = 5 } = {}, environment = process.env, fetchImpl = globalThis.fetch
) {
  const { origin, secret } = validateConfiguration(environment);
  const clean = normaliseQuery(query);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw Object.assign(new Error("Limit must be between 1 and 10."), { statusCode: 400 });
  }
  let response;
  try {
    response = await fetchImpl(new URL("/v1/search", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${secret}` },
      body: JSON.stringify({ query: clean, limit }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
  } catch { throw unavailable("Visual retrieval service is unavailable."); }
  if (!response.ok) throw unavailable("Visual retrieval service is unavailable.");
  let payload;
  try { payload = await response.json(); } catch { throw unavailable(); }
  if (payload?.contract !== CONTRACT || !Array.isArray(payload.results) || payload.results.length > limit) throw unavailable();
  const results = payload.results.map((item, index) => {
    if (!item || !/^[a-zA-Z0-9._:-]{1,120}$/.test(item.assetId) ||
        typeof item.title !== "string" || !item.title.trim() || item.title.length > 200 ||
        typeof item.rightsReference !== "string" || !item.rightsReference.trim() ||
        typeof item.sourceUrl !== "string") throw unavailable();
    let source;
    try { source = new URL(item.sourceUrl); } catch { throw unavailable(); }
    if (source.protocol !== "https:" || source.username || source.password) throw unavailable();
    return { rank: index + 1, assetId: item.assetId, title: item.title, rightsReference: item.rightsReference, sourceUrl: source.href, status: "unverified_visual_match" };
  });
  return {
    contract: CONTRACT, query: clean, results, sourceClass: "rights_approved_public_images",
    similarityIsNotEvidence: true, humanReviewRequired: true, clinicalDecisionAllowed: false,
    regulatoryStatusVerified: false, productIdentityVerified: false
  };
}
