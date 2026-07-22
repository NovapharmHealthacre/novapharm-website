function tokens(value) {
  return [...new Set(String(value || "").toLowerCase().match(/[a-z0-9][a-z0-9()/-]{1,}/g) || [])];
}

export function retrieveAuthorisedRecords(query, records, limit = 8) {
  const queryTokens = tokens(query);
  return records
    .map((record) => {
      const titleTokens = tokens(record.title);
      const textTokens = new Set(tokens(record.text));
      const titleMatches = queryTokens.filter((token) => titleTokens.includes(token)).length;
      const textMatches = queryTokens.filter((token) => textTokens.has(token)).length;
      const score = queryTokens.length ? (titleMatches * 3 + textMatches) / (queryTokens.length * 4) : 0;
      return { ...record, score: Number(score.toFixed(6)) };
    })
    .filter((record) => record.text && (record.score > 0 || records.length <= limit))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function supportingPassage(text, query, maximum = 420) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maximum) return clean;
  const queryTokens = tokens(query);
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const ranked = sentences
    .map((sentence, index) => ({ sentence, index, score: queryTokens.filter((token) => sentence.toLowerCase().includes(token)).length }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const best = ranked[0]?.sentence || clean;
  return best.length <= maximum ? best : `${best.slice(0, maximum - 3).trim()}...`;
}
