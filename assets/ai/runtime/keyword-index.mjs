import { tokenize } from "./model-registry.mjs";

export function buildKeywordIndex(chunks) {
  const postings = {};
  const documentFrequency = {};
  for (const chunk of chunks) {
    const terms = [
      ...tokenize(chunk.text),
      ...tokenize(chunk.sourceTitle),
      ...tokenize(chunk.sourceTitle),
      ...tokenize(chunk.heading),
      ...tokenize(chunk.heading),
      ...tokenize(chunk.heading),
      ...tokenize(chunk.sourceId.replace(/^(?:page|leader|article)-/, "")),
      ...tokenize(chunk.sourceId.replace(/^(?:page|leader|article)-/, ""))
    ];
    const counts = {};
    for (const term of terms) counts[term] = (counts[term] || 0) + 1;
    for (const [term, count] of Object.entries(counts)) {
      postings[term] ||= [];
      postings[term].push([chunk.id, count]);
      documentFrequency[term] = (documentFrequency[term] || 0) + 1;
    }
  }
  return { version: 1, documentCount: chunks.length, postings, documentFrequency };
}

export function searchKeywordIndex(index, chunks, query, { limit = 8 } = {}) {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const scores = new Map();
  const matchedTerms = new Map();
  for (const term of terms) {
    const matches = index.postings[term] || [];
    const inverseFrequency = Math.log(1 + (index.documentCount / (1 + (index.documentFrequency[term] || 0))));
    for (const [id, count] of matches) {
      scores.set(id, (scores.get(id) || 0) + ((1 + Math.log(count)) * inverseFrequency));
      matchedTerms.set(id, (matchedTerms.get(id) || new Set()).add(term));
    }
  }
  const minimumMatches = terms.length === 1 ? 1 : 2;
  return [...scores.entries()]
    .map(([id, score]) => ({
      ...chunkById.get(id),
      score: Number(score.toFixed(5)),
      method: "keyword",
      matchedQueryTerms: matchedTerms.get(id)?.size || 0
    }))
    .filter((result) => result.text && result.matchedQueryTerms >= minimumMatches)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}
