export const PUBLIC_SEMANTIC_MODEL = Object.freeze({
  id: "novapharm-evidence-vector-v1",
  name: "NovaPharm Evidence Vector",
  revision: "1.0.0",
  task: "deterministic sparse lexical-semantic embedding for public evidence retrieval",
  licence: "NovaPharm repository implementation; no third-party model weights",
  commercialUse: "Permitted for NovaPharm-owned public and internal applications",
  source: "Repository-controlled rules and approved public vocabulary",
  language: ["en-GB"],
  dimensions: 384,
  quantisation: "Sparse integer term-frequency vectors; no neural weights",
  remoteModelLoading: false,
  generation: false,
  limitations: [
    "Retrieval only; it does not reason about clinical care or generate medical content.",
    "Semantic coverage is limited to the registered vocabulary and approved public corpus.",
    "A high similarity score does not establish regulatory approval, product availability or factual truth outside the cited source."
  ]
});

export const SEMANTIC_GROUPS = Object.freeze({
  authorisation: ["authorisation", "authorization", "licence", "license", "permission", "approval", "approved", "mhra"],
  wholesale: ["wholesale", "wholesaler", "distribution", "distributor", "wda", "wda(h)"],
  quality: ["quality", "qms", "gdp", "gmp", "capa", "deviation", "audit", "vendor"],
  oncology: ["oncology", "cancer", "specialist", "specialty", "tumour", "tumor"],
  clinical: ["clinical", "trial", "cro", "sponsor", "protocol", "iras", "research"],
  continuity: ["continuity", "resilience", "shortage", "availability", "supply", "source", "sourcing"],
  formulation: ["formulation", "liquid", "tablet", "capsule", "sterile", "injectable", "technology", "transfer"],
  temperature: ["temperature", "cold", "storage", "transport", "lane", "excursion", "monitoring"],
  evidence: ["evidence", "document", "record", "citation", "source", "traceability", "batch"],
  partnership: ["partner", "partnership", "manufacturer", "supplier", "cmo", "cdmo", "dossier"],
  technology: ["technology", "digital", "platform", "api", "sharepoint", "portal", "integration"],
  ai: ["ai", "artificial", "intelligence", "semantic", "search", "forecast", "model", "algorithm"],
  leadership: ["leadership", "director", "chief", "executive", "ceo", "founder", "governance"],
  market: ["market", "access", "commercial", "launch", "uk", "united", "kingdom", "nice"],
  plpi: ["plpi", "parallel", "import", "product", "licence", "license"]
});

export const STOP_WORDS = Object.freeze(new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "how", "in", "is", "it", "its",
  "of", "on", "or", "our", "that", "the", "their", "this", "to", "was", "we", "what", "when", "where", "which", "who", "will", "with"
]));

const TOKEN_ALIASES = Object.freeze({
  leads: "leadership",
  leader: "leadership",
  leaders: "leadership",
  services: "service",
  partners: "partner",
  partnerships: "partnership",
  products: "product",
  supplies: "supply",
  sources: "source",
  approvals: "approval",
  licences: "licence",
  licenses: "license",
  medicines: "medicine",
  systems: "system",
  documents: "document",
  operations: "operation",
  responsibilities: "responsibility"
});

export function normaliseToken(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9()]+/g, " ")
    .trim();
}

export function tokenize(value) {
  return normaliseToken(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .map((token) => TOKEN_ALIASES[token] || token);
}

function hashToken(token, dimensions) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % dimensions;
}

export function expandSemanticTokens(tokens, groups = SEMANTIC_GROUPS) {
  const expanded = [...tokens];
  const tokenSet = new Set(tokens);
  for (const [concept, terms] of Object.entries(groups)) {
    if (terms.some((term) => tokenSet.has(term))) expanded.push(`concept:${concept}`);
  }
  return expanded;
}

export function embedText(value, { dimensions = PUBLIC_SEMANTIC_MODEL.dimensions, groups = SEMANTIC_GROUPS } = {}) {
  const vector = new Map();
  for (const token of expandSemanticTokens(tokenize(value), groups)) {
    const index = hashToken(token, dimensions);
    vector.set(index, (vector.get(index) || 0) + (token.startsWith("concept:") ? 2 : 1));
  }
  const norm = Math.sqrt([...vector.values()].reduce((sum, weight) => sum + (weight * weight), 0)) || 1;
  return [...vector.entries()].sort((a, b) => a[0] - b[0]).map(([index, weight]) => [index, Number((weight / norm).toFixed(6))]);
}

export function cosineSparse(left, right) {
  const rightMap = right instanceof Map ? right : new Map(right);
  return left.reduce((score, [index, weight]) => score + (weight * (rightMap.get(index) || 0)), 0);
}
