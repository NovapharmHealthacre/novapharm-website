import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const search = readFileSync(resolve("search/index.html"), "utf8");
const oncology = readFileSync(resolve("oncology/index.html"), "utf8");
const governance = readFileSync(resolve("technology/ai-governance/index.html"), "utf8");
assert.match(search, /name="robots" content="noindex,follow"/);
assert.equal((search.match(/class="search-directory"[\s\S]*?<\/section>/)?.[0].match(/<a href=/g) || []).length, 12);
for (const route of ["/oncology/", "/cro/", "/technology/ai-governance/", "/news-insights/", "/contact/"]) assert.ok(search.includes(`href="${route}"`));
assert.equal((oncology.match(/data-formulation-panel=/g) || []).length, 4);
assert.doesNotMatch(oncology, /data-formulation-panel="[^"]+"[^>]*\shidden/);
assert.match(governance, /AI maturity/);
assert.match(governance, /Citation architecture/);
assert.match(governance, /Privacy by default/);
console.log("AI no-JavaScript fallback passed for route discovery, Oncology content and Responsible AI governance content.");
