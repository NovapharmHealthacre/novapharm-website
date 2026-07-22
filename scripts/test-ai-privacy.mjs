import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PUBLIC_AI_PRIVACY, redactForAudit, safeAggregateEvent } from "../src/ai/privacy-guard.mjs";

for (const [key, value] of Object.entries(PUBLIC_AI_PRIVACY)) assert.equal(value, false, key);
for (const event of ["ai_search_opened", "semantic_mode_enabled", "answer_source_opened", "answer_abstained", "model_download_completed", "model_cache_cleared"]) {
  const payload = safeAggregateEvent(event);
  assert.deepEqual(Object.keys(payload).sort(), ["at", "name"]);
}
assert.equal(safeAggregateEvent("query_text"), null);
assert.equal(redactForAudit("private patient query").content, null);

const runtime = ["assets/js/ai-search.js", "src/ai/search-controller.mjs", "src/ai/semantic-worker.mjs"].map((file) => readFileSync(resolve(file), "utf8")).join("\n");
assert.doesNotMatch(runtime, /sendBeacon|google-analytics|gtag\(|mixpanel|segment\.com|openai\.com|anthropic\.com|generativelanguage|microphone|getUserMedia/);
assert.doesNotMatch(runtime, /localStorage\.setItem\([^,]+,\s*(?:query|answer)/i);
const privacy = readFileSync(resolve("legal/privacy/index.html"), "utf8");
const cookies = readFileSync(resolve("legal/cookies/index.html"), "utf8");
assert.match(privacy, /id="artificial-intelligence"/);
assert.match(privacy, /query and answer are not sent to an external AI provider/);
assert.match(cookies, /novapharm-public-ai/);
assert.match(cookies, /no query or answer is stored/);
console.log("AI privacy passed: no external inference, identity collection, query logging, transcript retention or undisclosed browser cache.");
