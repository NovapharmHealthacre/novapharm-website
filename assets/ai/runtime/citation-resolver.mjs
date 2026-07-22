function sentenceCandidates(value) {
  return String(value || "").split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

export function supportingPassage(result, queryTerms = []) {
  const terms = queryTerms.map((term) => term.toLowerCase());
  const sentences = sentenceCandidates(result.text);
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    index,
    matches: terms.reduce((count, term) => count + (sentence.toLowerCase().includes(term) ? 1 : 0), 0)
  })).sort((a, b) => b.matches - a.matches || a.index - b.index);
  const passage = ranked[0]?.sentence || result.text;
  return passage.length > 420 ? `${passage.slice(0, 417).trim()}...` : passage;
}

export function resolveCitations(results, queryTerms = [], { limit = 3 } = {}) {
  const seen = new Set();
  const citations = [];
  for (const result of results) {
    const key = `${result.sourceUrl}#${result.heading}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      sourceId: result.sourceId,
      title: result.sourceTitle,
      heading: result.heading,
      url: result.sourceUrl,
      date: result.sourceDate,
      evidenceStatus: result.evidenceStatus,
      capabilityBoundary: result.capabilityBoundary,
      passage: supportingPassage(result, queryTerms),
      score: result.score,
      method: result.method
    });
    if (citations.length >= limit) break;
  }
  return citations;
}

export function buildExtractiveAnswer(citations) {
  if (!citations.length) return null;
  const sentences = citations.map((citation) => citation.passage.replace(/\s+/g, " ").trim()).filter(Boolean);
  const answer = sentences.slice(0, 2).join(" ");
  return answer.length > 680 ? `${answer.slice(0, 677).trim()}...` : answer;
}
