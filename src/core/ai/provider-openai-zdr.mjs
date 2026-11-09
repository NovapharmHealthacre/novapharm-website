const APPROVED_EU_ENDPOINT = "https://eu.api.openai.com";
const MAX_INPUT_CHARS = 14000;
const MAX_OUTPUT_TOKENS = 380;

function blocked(code, message, statusCode = 503) {
  return Object.assign(new Error(message), { code, statusCode });
}

/**
 * Controlled adapter only. NOVA is NOT activated in the public portal or in
 * executeInternalAiReview; validated server-side source retrieval and rights
 * approvals are prerequisites to any production call through this adapter.
 */
export function createOpenAiZdrProvider({
  apiKey = "",
  model = "gpt-6-luna",
  endpoint = APPROVED_EU_ENDPOINT,
  productionApproved = false,
  euZdrApproved = false,
  fetchImplementation = globalThis.fetch,
} = {}) {
  if (productionApproved !== true || euZdrApproved !== true) {
    throw blocked("nova_release_not_approved", "Production NOVA and EU ZDR permissions must be independently verified before model setup.");
  }
  if (endpoint !== APPROVED_EU_ENDPOINT) {
    throw blocked("nova_endpoint_not_approved", "NOVA requires the approved EU API endpoint.", 400);
  }
  if (model !== "gpt-6-luna") {
    throw blocked("nova_model_not_approved", "The requested NOVA model is outside the approved capped evaluation configuration.", 400);
  }
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 12 || /[\s\r\n]/u.test(apiKey)) {
    throw blocked("nova_credentials_missing", "A protected, project-scoped API credential is required.");
  }
  const endpointUrl = new URL("/v1/responses", APPROVED_EU_ENDPOINT);
  return Object.freeze({
    id: "openai-zdr",
    status: "adapter-configured-awaiting-server-evidence-approval",
    async complete({ system, prompt, sourceManifest } = {}) {
      if (
        !sourceManifest ||
        sourceManifest.verifiedServerSide !== true ||
        sourceManifest.externalAiRightsApproved !== true ||
        sourceManifest.humanReviewRequired !== true ||
        !Array.isArray(sourceManifest.sourceIds) ||
        sourceManifest.sourceIds.length === 0
      ) {
        throw blocked("nova_source_rights_not_approved", "Server-verified evidence and external-AI use rights are required.", 403);
      }
      const instructions = String(system ?? "").trim();
      const input = String(prompt ?? "").trim();
      if (!instructions || !input || instructions.length > 3000 || input.length > MAX_INPUT_CHARS) {
        throw blocked("nova_input_rejected", "NOVA requires bounded, reviewed instructions and evidence.", 400);
      }
      let upstream;
      try {
        upstream = await fetchImplementation(endpointUrl.toString(), {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model,
            store: false,
            background: false,
            stream: false,
            instructions,
            input,
            max_output_tokens: MAX_OUTPUT_TOKENS,
          }),
          signal: AbortSignal.timeout(20000),
          redirect: "error",
          cache: "no-store",
        });
      } catch {
        throw blocked("nova_upstream_unavailable", "The approved AI gateway is temporarily unavailable.");
      }
      if (!upstream.ok) {
        throw blocked("nova_upstream_unavailable", "The approved AI gateway did not accept this request.");
      }
      let payload;
      try {
        payload = await upstream.json();
      } catch {
        throw blocked("nova_invalid_response", "NOVA could not validate the model response.");
      }
      if (payload?.status !== "completed" || !Array.isArray(payload.output)) {
        throw blocked("nova_incomplete_response", "NOVA has no verified completed model response.");
      }
      const paragraphs = payload.output
        .filter((item) => item?.type === "message" && Array.isArray(item.content))
        .flatMap((item) => item.content.filter((part) => part?.type === "output_text" && typeof part.text === "string").map((part) => part.text));
      const text = paragraphs.join("\n").trim().slice(0, 6000);
      if (!text) throw blocked("nova_empty_response", "NOVA must abstain when the model returns no reviewable text.");
      return text;
    },
  });
}
