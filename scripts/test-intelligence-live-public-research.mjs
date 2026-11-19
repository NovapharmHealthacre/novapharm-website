import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const js = read("assets/js/intelligence-live-research.js");
const html = read("technology/index.html");
const source = read("src/content/technology-intelligence.html");
const builder = read("scripts/apply-corporate-product-discipline.mjs");

test("live official research is attached only to Intelligence and disclosed", () => {
  assert.match(html, /intelligence-research-launcher\.js/);
  assert.match(html, /intelligence-live-research\.js/);
  assert.ok(html.indexOf("intelligence-research-launcher.js") < html.indexOf("intelligence-live-research.js"));
  assert.ok(builder.includes('src="/assets/js/intelligence-live-research.js"'));
  for (const page of [html, source]) {
    assert.match(page, /US regulatory and trial searches send the medicine term/);
    assert.match(page, /not constitute validated medicine matches or medical advice/);
  }
});

test("only fixed US official research endpoint, safe DOM and no credentials", () => {
  assert.match(js, /5pcszvyqm1\.execute-api\.eu-north-1\.amazonaws\.com/);
  assert.match(js, /https:\/\/clinicaltrials\.gov/);
  assert.match(js, /https:\/\/dailymed\.nlm\.nih\.gov/);
  assert.match(js, /credentials: "omit"/);
  assert.match(js, /cache: "no-store"/);
  assert.match(js, /textContent/);
  assert.match(js, /AbortController/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.doesNotMatch(js, /localStorage|sessionStorage/);
  assert.doesNotMatch(js, /Stripe|checkout/i);
});
