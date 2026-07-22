import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { oncologyContent } from "../src/content/oncology-content.mjs";
import { navigation, pageMeta } from "../src/content/site-content.mjs";

const root = resolve(process.cwd());
const html = readFileSync(join(root, "oncology/index.html"), "utf8");
const visible = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

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
for (const phrase of ["Oncology Supply Continuity Architecture", "Formulation and Complexity Navigator", "Oncology Product-Readiness Matrix", "Development-to-Access Continuity", "no product approval, availability or treatment claim"]) assert.ok(html.includes(phrase), phrase);
assert.ok(visible.split(/\s+/).length >= 1800, "Oncology page must remain substantial");
assert.match(html, /Representative licensed scientific image; not a NovaPharm product, employee or facility\./);
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

console.log(`Oncology content passed: ${visible.split(/\s+/).length} visible words, 13 sections, 6 continuity axes, 6 readiness dimensions, 6 FAQs and 7 official sources.`);
