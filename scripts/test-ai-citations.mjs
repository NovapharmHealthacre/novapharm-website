import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExtractiveAnswer, resolveCitations } from "../src/ai/citation-resolver.mjs";
import { searchKeywordIndex } from "../src/ai/keyword-index.mjs";
import { tokenize } from "../src/ai/model-registry.mjs";

const knowledge = JSON.parse(readFileSync(resolve("assets/ai/company-knowledge-index.json"), "utf8"));
const cases = [
  ["How does NovaPharm describe oncology continuity?", "page-oncology"],
  ["What is the CRO responsibility architecture?", "page-cro"],
  ["What is NovaPharm's regulatory readiness approach?", "page-regulatory-services"],
  ["How does responsible AI at NovaPharm abstain?", "page-technology-ai-governance"],
  ["Who is Vishal Chakravarty?", "leader-vishal-chakravarty"]
];

for (const [query, expectedSource] of cases) {
  const results = searchKeywordIndex(knowledge.keywordIndex, knowledge.chunks, query, { limit: 12 });
  assert.ok(results.length, query);
  const citations = resolveCitations(results, tokenize(query), { limit: 5 });
  assert.ok(citations.some((citation) => citation.sourceId === expectedSource), `${query} must cite ${expectedSource}`);
  assert.ok(citations.every((citation) => citation.url.startsWith("https://novapharmhealthcare.com/") && citation.passage));
  const answer = buildExtractiveAnswer(citations);
  assert.ok(answer && citations.some((citation) => citation.passage.includes(answer.split(/(?<=[.!?])\s+/)[0].replace(/\.\.\.$/, ""))));
}
console.log(`AI citation tests passed for ${cases.length} representative company, oncology, CRO, regulatory and leadership questions.`);
