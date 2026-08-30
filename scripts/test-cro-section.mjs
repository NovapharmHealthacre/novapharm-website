import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { croContent } from "../src/content/cro-content.mjs";
import { navigation } from "../src/content/site-content.mjs";

const root = resolve(process.cwd());
const read = (path) => readFileSync(join(root, path), "utf8");
const cro = read("cro/index.html");
const leadershipMedia = JSON.parse(read("config/leadership-media.json"));

assert.deepEqual(navigation.map(([label]) => label), ["Company", "Capabilities", "Oncology", "Products", "Insights", "Contact", "Secure Portal"]);
assert.equal((cro.match(/<h1\b/g) ?? []).length, 1, "CRO page must contain exactly one H1");
assert.match(cro, /<link rel="canonical" href="https:\/\/novapharmhealthcare\.com\/cro\/">/);
assert.match(cro, /<meta name="robots" content="index, follow/);
assert.match(cro, /"@type":"Service"/);
assert.match(cro, /"@type":"FAQPage"/);
assert.doesNotMatch(cro, /"@type":"(?:ClinicalTrial|MedicalStudy|MedicalOrganization|AggregateRating|Review)"/);

for (const marker of [
  "Define the programme before assembling the delivery model.",
  "Product owners and specialist teams facing a complex UK pathway.",
  "Where programmes lose clarity.",
  "Scientific direction, delivery coordination and UK continuity.",
  "Three roles. One visible evidence trail.",
  "Evidence remains attached to the decision it supported.",
  "Corporate, scientific and operational review remain connected.",
  "Start with a non-confidential description of the programme",
]) assert.match(cro, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

assert.equal((cro.match(/class="npd-audience-list"[\s\S]*?<\/ul>/)?.[0].match(/<li>/g) ?? []).length, 4);
assert.equal((cro.match(/class="npd-principles"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 3);
assert.equal((cro.match(/class="npd-three-lanes"[\s\S]*?<\/div><\/div><\/section>/)?.[0].match(/<div>/g) ?? []).length, 3);
assert.equal((cro.match(/class="npd-horizontal-steps"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 3);
assert.equal((cro.match(/class="npd-leadership-line"[\s\S]*?<\/div>/)?.[0].match(/<a /g) ?? []).length, 3);
assert.equal((cro.match(/class="[^"]*npd-faq[^"]*"[\s\S]*?<\/section>/)?.[0].match(/<details>/g) ?? []).length, 3);

for (const path of ["capabilities/index.html", "services/index.html", "regulatory-services/index.html", "technology/index.html"]) {
  assert.match(read(path), /href="\/cro\//, `${path} must link to the CRO route through local capability navigation`);
}
assert.match(read("contact/index.html"), /Clinical development and CRO support/);
assert.match(read("sitemap.xml"), /<loc>https:\/\/novapharmhealthcare\.com\/cro\/<\/loc>/);

for (const base of ["cro-evidence-architecture", "cro-delivery-architecture"]) {
  for (const width of [640, 960, 1600]) {
    for (const extension of ["avif", "webp", "jpg"]) {
      const path = `assets/media/cro/${base}-${width}.${extension}`;
      assert.ok(existsSync(join(root, path)), `${path} is required`);
      assert.ok(statSync(join(root, path)).size < 160_000, `${path} must remain below 160 KB`);
    }
  }
}

assert.match(cro, /does not assume sponsor, investigator or competent-authority duties/);
assert.match(cro, /does not guarantee authorisation, ethics opinion, recruitment, timing or outcome/);
assert.match(cro, /do not submit patient-identifiable or safety-report information/);
assert.doesNotMatch(cro, /NovaPharm (?:is|operates as|has become) (?:a )?(?:global )?full-service CRO/i);
assert.doesNotMatch(cro, /NovaPharm (?:owns|operates) (?:clinical sites|laboratories|an investigator network|an IMP depot)/i);
assert.doesNotMatch(cro, /(?:patients enrolled|completed trials|successful submissions|approval rate|countries served):?\s*\d+/i);
assert.doesNotMatch(cro, /<svg|Clinical Development Navigator|Sponsor Decision Framework|Development-to-Market Continuity/);

for (const portrait of leadershipMedia.portraits) {
  for (const width of portrait.widths) {
    for (const extension of ["avif", "webp", "jpg"]) {
      const path = `${portrait.outputBase}-${width}.${extension}`;
      assert.ok(existsSync(join(root, path)), `${path} is required`);
      assert.ok(statSync(join(root, path)).size <= leadershipMedia.deliveryCeilingBytes, `${path} must remain below the governed delivery ceiling`);
    }
  }
}

assert.equal(croContent.lifecycle.length, 8, "governed source detail remains available behind the concise presentation");
assert.equal(croContent.services.length, 8);
assert.equal(croContent.deliveryLanes.length, 3);
assert.equal(croContent.faqs.length, 6);

console.log("CRO contracts passed for concise public hierarchy, explicit responsibility boundaries, schema, responsive media, leadership and governed source depth.");
