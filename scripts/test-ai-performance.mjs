import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { searchKeywordIndex } from "../src/ai/keyword-index.mjs";
import { embedText } from "../src/ai/model-registry.mjs";

const bytes = (path) => statSync(resolve(path)).size;
const knowledge = JSON.parse(readFileSync(resolve("assets/ai/company-knowledge-index.json"), "utf8"));
const initialController = readFileSync(resolve("assets/js/ai-search.js"), "utf8");
assert.ok(bytes("assets/js/ai-search.js") < 2500);
assert.doesNotMatch(initialController, /^\s*import\s.+from/m);
assert.match(initialController, /import\("\/assets\/ai\/runtime\/search-controller\.mjs"\)/);
const page = readFileSync(resolve("index.html"), "utf8");
assert.doesNotMatch(page, /rel="preload"[^>]+assets\/ai|rel="prefetch"[^>]+assets\/ai/);
assert.ok(bytes("assets/ai/novapharm-evidence-vector-v1.json") < 10_000);
assert.ok(bytes("assets/ai/company-embeddings.json") < 300_000);
assert.ok(bytes("assets/ai/company-knowledge-index.json") < 1_100_000);
assert.match(readFileSync(resolve("src/ai/semantic-worker.mjs"), "utf8"), /self\.addEventListener\("message"/);

const queries = ["oncology continuity", "WDA readiness", "clinical development responsibility", "three pillar sourcing", "Vishal Chakravarty", "responsible AI citations"];
const timings = [];
for (let round = 0; round < 100; round += 1) {
  const query = queries[round % queries.length];
  const start = performance.now();
  searchKeywordIndex(knowledge.keywordIndex, knowledge.chunks, query);
  embedText(query);
  timings.push(performance.now() - start);
}
timings.sort((a, b) => a - b);
const median = timings[Math.floor(timings.length * 0.5)];
const p95 = timings[Math.floor(timings.length * 0.95)];
assert.ok(p95 < 50, `Node retrieval p95 ${p95.toFixed(2)} ms exceeded 50 ms`);
const totalOptionalBytes = bytes("assets/ai/company-knowledge-index.json") + bytes("assets/ai/company-embeddings.json") + bytes("assets/ai/novapharm-evidence-vector-v1.json");
const report = `# AI Performance Report\n\n- Reviewed: 22 July 2026\n- Initial AI entry script: ${bytes("assets/js/ai-search.js")} bytes, dynamically loaded controller only\n- Initial model/index transfer: 0 bytes before explicit search action\n- Knowledge index: ${bytes("assets/ai/company-knowledge-index.json")} bytes\n- Embeddings: ${bytes("assets/ai/company-embeddings.json")} bytes\n- Semantic model metadata: ${bytes("assets/ai/novapharm-evidence-vector-v1.json")} bytes\n- Total optional uncompressed assets: ${totalOptionalBytes} bytes\n- WASM: 0 bytes\n- Node deterministic retrieval budget: p95 below 50 ms; each run prints its observed result to the verification log\n- Worker path: implemented\n- Safari fallback: conventional keyword retrieval and no-JavaScript directory\n- Chrome WebGPU path: not used\n- WASM path: not used\n- Browser first activation, warm activation, peak memory and transfer evidence: pending browser acceptance report; not inferred here\n`;
writeFileSync(resolve("audit/ai-performance-report.md"), report);
console.log(`AI performance unit gate passed: ${bytes("assets/js/ai-search.js")} initial bytes and ${p95.toFixed(3)} ms p95 deterministic retrieval.`);
