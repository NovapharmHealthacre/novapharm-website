import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { oncologyContent } from "../src/content/oncology-content.mjs";
import { navigation, pageMeta } from "../src/content/site-content.mjs";
import { visibleTextFromHtml } from "./lib/html-text.mjs";

const root = resolve(process.cwd());
const html = readFileSync(join(root, "oncology/index.html"), "utf8");
const visible = visibleTextFromHtml(html);

assert.deepEqual(navigation.find(([, href]) => href === "/oncology/"), ["Oncology", "/oncology/"]);
assert.ok(pageMeta.oncology?.title.includes("Oncology"));
assert.equal(oncologyContent.continuityAxes.length, 6);
assert.equal(oncologyContent.formulations.length, 4);
assert.equal(oncologyContent.readiness.length, 6);
assert.equal(oncologyContent.temperatureControls.length, 5);
assert.equal(oncologyContent.continuityStages.length, 7);
assert.equal(oncologyContent.partners.length, 5);
assert.equal(oncologyContent.faqs.length, 6);
assert.equal(oncologyContent.sources.length, 7);

for (const phrase of [
  "Continuity is designed before supply begins.",
  "Can the evidence, product and accountable parties remain aligned through every hand-off?",
  "Five dependencies that should be visible early.",
  "A temperature range alone is not a control system.",
  "Preserve context through each accountable hand-off.",
  "NovaPharm does not provide medical advice, direct patient services or a guarantee of product authorisation",
]) assert.ok(html.includes(phrase), phrase);

assert.ok(visible.split(/\s+/).length >= 400, "Oncology page must remain concise but substantive");
assert.equal((html.match(/class="npd-service-ledger"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 5);
assert.equal((html.match(/class="npd-horizontal-steps"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 5);
assert.match(html, /Representative scientific context; it does not depict a NovaPharm facility, product or active programme\./);
assert.doesNotMatch(html, /<svg|oncology-editorial-gallery|Formulation and Complexity Navigator|Oncology Product-Readiness Matrix/);
assert.doesNotMatch(html, /"@type":"(?:Drug|MedicalTherapy|MedicalStudy|ClinicalTrial)"/);

const provenance = JSON.parse(readFileSync(join(root, "docs/oncology-media-provenance.json"), "utf8"));
for (const asset of provenance.assets) {
  for (const derivative of asset.derivatives) {
    const path = join(root, derivative.path);
    assert.ok(existsSync(path), derivative.path);
    const checksum = createHash("sha256").update(readFileSync(path)).digest("hex");
    assert.equal(checksum, derivative.sha256, `${derivative.path} checksum`);
  }
}

console.log(`Oncology content passed: ${visible.split(/\s+/).length} visible words, concise authored hierarchy, five readiness dependencies, five accountable hand-offs and truthful evidence boundaries.`);
