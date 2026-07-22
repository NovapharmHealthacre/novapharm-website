import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { croContent } from "../src/content/cro-content.mjs";
import { navigation } from "../src/content/site-content.mjs";

const root = resolve(process.cwd());
const read = (path) => readFileSync(join(root, path), "utf8");
const cro = read("cro/index.html");

assert.deepEqual(navigation.map(([label]) => label), ["About", "Services", "Regulatory", "CRO", "Products", "Partners", "Technology", "Insights", "Contact"]);
assert.equal((cro.match(/<h1\b/g) || []).length, 1, "CRO page must contain exactly one H1");
assert.match(cro, /<link rel="canonical" href="https:\/\/novapharmhealthcare\.com\/cro\/">/);
assert.match(cro, /<meta name="robots" content="index, follow/);
assert.match(cro, /"@type":"Service"/);
assert.match(cro, /"@type":"FAQPage"/);
assert.doesNotMatch(cro, /"@type":"(?:ClinicalTrial|MedicalStudy|MedicalOrganization|AggregateRating|Review)"/);

for (const signature of [
  "Clinical Development Navigator",
  "Transparent Delivery Architecture",
  "Sponsor Decision Framework",
  "Development-to-Market Continuity"
]) assert.match(cro, new RegExp(signature, "i"));

assert.equal(croContent.lifecycle.length, 8);
assert.equal(croContent.services.length, 8);
assert.equal(croContent.deliveryLanes.length, 3);
assert.equal(croContent.decisionOptions.length, 6);
assert.equal(croContent.faqs.length, 6);
assert.equal((cro.match(/data-cro-stage="\d+"/g) || []).length, 8);
assert.equal((cro.match(/class="cro-lane cro-lane-/g) || []).length, 3);
assert.ok((cro.match(/<details/g) || []).length >= 15, "service details, FAQs and sources must remain accessible without JavaScript");

for (const path of ["index.html", "services/index.html", "regulatory-services/index.html", "partner-with-us/index.html", "technology/index.html"]) {
  assert.match(read(path), /href="\/cro\//, `${path} must link to the CRO route`);
}
assert.match(read("contact/index.html"), /Clinical development &amp; CRO support/);
assert.match(read("sitemap.xml"), /<loc>https:\/\/novapharmhealthcare\.com\/cro\/<\/loc>/);
assert.match(read("sitemap-images.xml"), /cro-evidence-architecture-1600\.jpg/);

for (const base of ["cro-evidence-architecture", "cro-delivery-architecture"]) {
  for (const width of [640, 960, 1600]) {
    for (const extension of ["avif", "webp", "jpg"]) {
      const path = `assets/media/cro/${base}-${width}.${extension}`;
      assert.ok(existsSync(join(root, path)), `${path} is required`);
      assert.ok(statSync(join(root, path)).size < 160_000, `${path} must remain below 160 KB`);
    }
  }
}

assert.doesNotMatch(cro, /NovaPharm (?:is|operates as|has become) (?:a )?(?:global )?full-service CRO/i);
assert.doesNotMatch(cro, /NovaPharm (?:owns|operates) (?:clinical sites|laboratories|an investigator network|an IMP depot)/i);
assert.doesNotMatch(cro, /(?:patients enrolled|completed trials|successful submissions|approval rate|countries served):?\s*\d+/i);
assert.match(cro, /Sponsor-retained/);
assert.match(cro, /does not present itself as a global full-service CRO/);
assert.match(cro, /A conventional full-service CRO may be the better fit/);
assert.match(cro, /Do not submit patient data/);

for (const portrait of ["vishal-chakravarty", "girish-achliya"]) {
  for (const width of [480, 800]) {
    for (const extension of ["avif", "webp", "jpg"]) {
      const path = `assets/media/cro/leadership/${portrait}-${width}.${extension}`;
      assert.ok(existsSync(join(root, path)), `${path} is required`);
      assert.ok(statSync(join(root, path)).size < 90_000, `${path} must remain below 90 KB`);
    }
  }
}

const provenance = JSON.parse(read("docs/cro-media-provenance.json"));
assert.equal(provenance.assets.length, 4);
for (const asset of provenance.assets) {
  assert.equal(asset.reviewStatus, "human-reviewed-approved-for-candidate");
  assert.match(asset.fallbackChecksumSha256, /^[a-f0-9]{64}$/);
}
assert.ok(provenance.graphics.length >= 5, "five code-native signature graphics must be registered");

console.log("CRO contracts passed for evidence boundaries, navigation, signatures, schema, responsive media, cross-site links and public claims.");
