export const PUBLIC_AI_PRIVACY = Object.freeze({
  queryLogging: false,
  answerLogging: false,
  externalInference: false,
  identityCollection: false,
  cookiesRequired: false,
  microphoneAccess: false,
  transcriptRetention: false,
  analyticsQueryText: false,
  analyticsAnswerText: false
});

export function safeAggregateEvent(name) {
  return [
    "ai_search_opened",
    "semantic_mode_enabled",
    "answer_source_opened",
    "answer_abstained",
    "model_download_completed",
    "model_cache_cleared"
  ].includes(name) ? { name, at: new Date().toISOString() } : null;
}

export function redactForAudit(value) {
  const text = String(value || "");
  return {
    length: text.length,
    categoryHint: /\b(medical|patient|adverse|price|stock|private|secret)\b/i.test(text) ? "sensitive-boundary" : "general",
    content: null
  };
}
