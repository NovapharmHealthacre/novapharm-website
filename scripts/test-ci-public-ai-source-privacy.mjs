import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { PUBLIC_AI_PRIVACY, redactForAudit, safeAggregateEvent } from "../src/ai/privacy-guard.mjs";

test("public AI source defaults to zero transcript, tracking and external inference", () => {
  for (const [name, allowed] of Object.entries(PUBLIC_AI_PRIVACY)) assert.equal(allowed, false, name);
  assert.equal(safeAggregateEvent("query_text"), null);
  assert.equal(redactForAudit("patient information").content, null);
  for (const name of ["ai_search_opened","semantic_mode_enabled","answer_source_opened","answer_abstained"]) {
    const payload = safeAggregateEvent(name);
    assert.deepEqual(Object.keys(payload).sort(),["at","name"]);
  }
  const sources = ["src/ai/search-controller.mjs","src/ai/semantic-worker.mjs","src/ai/privacy-guard.mjs"];
  if(existsSync("assets/js/ai-search.js")) sources.push("assets/js/ai-search.js");
  const runtime = sources.map(path=>readFileSync(path,"utf8")).join("\n");
  assert.doesNotMatch(runtime,/sendBeacon|google-analytics|gtag\(|mixpanel|segment\.com|openai\.com|anthropic\.com|generativelanguage|getUserMedia/i);
  assert.doesNotMatch(runtime,/localStorage\.setItem\([^,]+,\s*(?:query|answer)/i);
});

test("legacy missing public AI loader is not treated as a deployed AI product", () => {
  if(!existsSync("assets/js/ai-search.js")) {
    assert.ok(existsSync("src/ai/search-controller.mjs"));
    // A source-level check is NOT evidence that the retired static loader is publicly deployed.
    assert.equal(process.env.NOVAPHARM_PUBLIC_AI_LIVE_ACCEPTED || "no", "no");
  }
});
