export const evidenceResponseLabel = "AI-generated summary based on Vishal’s published work";
export const evidenceAbstention = "I could not verify that from Vishal’s approved published work.";

export interface EvidencePassage {
  readonly heading: string;
  readonly passage: string;
}

export interface EvidenceDocument {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly type: string;
  readonly author: string;
  readonly published: string;
  readonly modified: string;
  readonly summary: string;
  readonly topics: readonly string[];
  readonly passages: readonly EvidencePassage[];
}

export interface EvidenceKnowledge {
  readonly schemaVersion: "1.0.0";
  readonly documents: readonly EvidenceDocument[];
}

export interface EvidenceCitation extends EvidencePassage {
  readonly sourceId: string;
  readonly title: string;
  readonly url: string;
  readonly type: string;
  readonly author: string;
  readonly published: string;
  readonly modified: string;
  readonly score: number;
  readonly directMatches: number;
}

export interface EvidenceAnswer {
  readonly label: string;
  readonly answer: string;
  readonly citations: readonly EvidenceCitation[];
  readonly evidenceStatus: string;
}

const stopWords = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "did",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "the",
  "their",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "work",
  "vishal",
]);

const concepts: Readonly<Record<string, readonly string[]>> = Object.freeze({
  approval: ["regulatory", "authorisation", "permission", "market access"],
  access: ["market", "channel", "launch", "commercialisation", "availability"],
  cmo: ["manufacturer", "manufacturing", "cdmo", "site", "technology transfer"],
  resilience: ["supply", "continuity", "inventory", "lead time", "supplier"],
  batch: ["manufacturing", "economics", "inventory", "minimum batch size"],
  founder: ["company building", "execution", "credibility", "entrepreneurship"],
  digital: ["technology", "data", "infrastructure", "traceability"],
  brexit: ["uk", "eu", "europe", "market entry", "regulatory"],
  specialist: ["medicine", "portfolio", "product", "market access"],
  parallel: ["import", "licensing", "supply", "risk"],
});

const policyRules = Object.freeze([
  Object.freeze({
    id: "medical",
    pattern:
      /\b(diagnos|symptom|treat(?:ment)?|dos(?:e|age)|interaction|pregnan|paediatric|medicine should i|cure|patient record|adverse event|side effect|medical emergency)\b/i,
    message:
      "This experience cannot provide medical, treatment or patient-specific information. Use an appropriate healthcare professional or official safety-reporting route.",
  }),
  Object.freeze({
    id: "private",
    pattern:
      /\b(private (?:chat|email|document|contract)|portal|customer data|supplier (?:data|price)|password|credential|immigration|visa|personal financ|bank|confidential|business plan forecast)\b/i,
    message:
      "Private, personal and confidential information is outside this experience. It searches approved public work only.",
  }),
  Object.freeze({
    id: "advice",
    pattern:
      /\b(legal advice|investment advice|personalised regulatory|guarantee|predict approval|stock price|valuation|net worth)\b/i,
    message: "This experience cannot provide legal, investment or personalised regulatory advice.",
  }),
  Object.freeze({
    id: "unsupported-status",
    pattern:
      /\b(live stock|current inventory|product available|mhra approved|wda\(h\) holder|current revenue|profit forecast|nhs contract)\b/i,
    message:
      "Current commercial, product, financial and authorisation status is not inferred from Vishal’s published essays.",
  }),
  Object.freeze({
    id: "injection",
    pattern:
      /\b(ignore (?:all |the |previous )?(?:instructions|rules)|reveal (?:the )?(?:prompt|system)|bypass|jailbreak|developer message|hidden instruction|act as vishal|pretend to be vishal)\b/i,
    message: "I cannot change the evidence and attribution boundaries of this experience.",
  }),
]);

export function tokenize(value: string): readonly string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2 && !stopWords.has(token)),
    ),
  ];
}

export function evaluateEvidencePolicy(query: string): Readonly<{ allowed: boolean; id: string; message?: string }> {
  const value = query.trim();
  if (!value)
    return { allowed: false, id: "empty", message: "Enter a question or topic from Vishal’s published work." };
  if (value.length > 400)
    return { allowed: false, id: "length", message: "Please keep the question under 400 characters." };
  const match = policyRules.find((rule) => rule.pattern.test(value));
  return match ? { allowed: false, id: match.id, message: match.message } : { allowed: true, id: "published-work" };
}

function expandedTerms(query: string): Readonly<{ direct: readonly string[]; expanded: readonly string[] }> {
  const direct = tokenize(query);
  const expanded = new Set(direct);
  for (const term of direct) {
    for (const related of concepts[term] ?? []) {
      for (const token of tokenize(related)) expanded.add(token);
    }
  }
  return { direct, expanded: [...expanded] };
}

function scoreText(text: string, terms: readonly string[], weight: number): number {
  const haystack = text.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? weight : 0), 0);
}

export function retrieveEvidence(knowledge: EvidenceKnowledge, query: string, limit = 5): readonly EvidenceCitation[] {
  const { direct, expanded } = expandedTerms(query);
  if (!direct.length) return [];
  const results: EvidenceCitation[] = [];
  for (const document of knowledge.documents) {
    const documentScore =
      scoreText(document.title, expanded, 8) +
      scoreText(document.summary, expanded, 4) +
      scoreText(document.topics.join(" "), expanded, 6);
    for (const passage of document.passages) {
      const searchable =
        `${document.title} ${document.summary} ${document.topics.join(" ")} ${passage.heading} ${passage.passage}`.toLowerCase();
      const directMatches = direct.filter((term) => searchable.includes(term));
      const required = direct.length === 1 ? 1 : Math.min(2, direct.length);
      if (directMatches.length < required) continue;
      results.push({
        sourceId: document.id,
        title: document.title,
        url: document.url,
        type: document.type,
        author: document.author,
        published: document.published,
        modified: document.modified,
        heading: passage.heading,
        passage: passage.passage,
        score:
          documentScore +
          scoreText(passage.heading, expanded, 5) +
          scoreText(passage.passage, expanded, 2) +
          directMatches.length * 9,
        directMatches: directMatches.length,
      });
    }
  }
  return results
    .sort((a, b) => b.score - a.score || b.directMatches - a.directMatches || a.title.localeCompare(b.title))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.sourceId === item.sourceId) === index)
    .slice(0, limit);
}

export function createEvidenceAnswer(results: readonly EvidenceCitation[]): EvidenceAnswer {
  if (!results.length) {
    return {
      label: evidenceResponseLabel,
      answer: evidenceAbstention,
      citations: [],
      evidenceStatus: "Insufficient approved evidence",
    };
  }
  const primary = results[0];
  if (!primary) throw new Error("Evidence result invariant failed");
  return {
    label: evidenceResponseLabel,
    answer: primary.passage,
    citations: results.slice(0, 3),
    evidenceStatus: `Cited ${primary.type.toLowerCase()}; extractive response`,
  };
}

export function isEvidenceKnowledge(value: unknown): value is EvidenceKnowledge {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate["schemaVersion"] === "1.0.0" && Array.isArray(candidate["documents"]);
}
