import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { oncologyContent } from "../src/content/oncology-content.mjs";
import { navigation, pageMeta } from "../src/content/site-content.mjs";
import { visibleTextFromHtml } from "./lib/html-text.mjs";

const root = resolve(process.cwd());
const source = (path) => readFileSync(join(root,path), "utf8");
const html = source("oncology/index.html");
const visible = visibleTextFromHtml(html);
const css = source("assets/css/oncology-editorial.css");
const approvedLayout = source("assets/css/oncology-hope-v2.css");
const approvedLayoutSha256 = createHash("sha256").update(readFileSync(join(root, "assets/css/oncology-hope-v2.css"))).digest("hex");
const nextLayout = source("apps/corporate/app/oncology-editorial.css");

assert.deepEqual(navigation.find(([, href]) => href === "/oncology/"), ["Oncology","/oncology/"]);
assert.ok(pageMeta.oncology?.title.includes("Oncology"));
for (const [name,count] of [
  ["continuityAxes",6],["formulations",4],["readiness",6],["temperatureControls",5],
  ["continuityStages",7],["partners",5],["faqs",6],["sources",7]
]) assert.equal(oncologyContent[name].length, count, name);

for (const phrase of [
  "A Hope for<br>Tomorrow.",
  "Every detail<br>matters.",
  "Six connected decisions.",
  "Complexity deserves precision.",
  "The pathway is only as strong as its evidence.",
  "The next conversation starts here.",
  "Regulated wholesale supply has not commenced",
  "does not provide medical advice, direct patient services or a guarantee of product authorisation",
  "Use the Contact page for a non-confidential business enquiry, or email our team directly."
]) assert.ok(html.includes(phrase), phrase);

assert.doesNotMatch(html, /The contact page prepares an email draft;/, "Public Oncology copy must not contradict live AWS-backed Contact");
assert.ok(visible.split(/\s+/).length >= 700, "Oncology page requires substantive, evidence-led B2B content");
assert.equal((html.match(/class="npoc-evidence-list"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 6, "Six evidence areas");
assert.equal((html.match(/class="npoc-programme-list"[\s\S]*?<\/div><aside/)?.[0].match(/<details/g) ?? []).length, 4, "Four expandable programme categories");
assert.equal((html.match(/class="npoc-pathway"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length, 5, "Five accountable hand-offs");
assert.equal((html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr>/g) ?? []).length, 6, "Six readiness-matrix rows");
assert.equal((html.match(/class="npoc-faq-list"[\s\S]*?<\/div><\/div><\/section>/)?.[0].match(/<details/g) ?? []).length, 6, "Six public FAQs");
assert.equal((html.match(/<meta property="og:image" content=/g) ?? []).length, 1, "Only one authoritative Oncology social preview");
assert.match(html, /id="scope-boundary"/);
assert.match(html, /id="oncology-faqs"/);
assert.match(html, /href="\/contact\/\?enquiry=Oncology%20%26%20specialist%20medicines"/);
assert.match(html, /href="\/assets\/css\/oncology-editorial\.css(?:\?v=[^"]+)?"/);
assert.ok(html.includes(`href="/assets/css/oncology-hope-v2.css?v=20261113-hope-responsive-v7&amp;sha256=${approvedLayoutSha256}"`), "Responsive framing correction must use the approved semantic version and exact CSS SHA-256");
assert.ok(html.indexOf("oncology-hope-v2.css") > html.indexOf("oncology-editorial.css"), "Approved style must follow original stylesheet");
assert.match(approvedLayout, /object-fit:contain/, "Portrait must preserve its full framing");
assert.match(approvedLayout, /-webkit-mask-image:linear-gradient/, "Desktop image must blend into one continuous hero");
assert.match(approvedLayout, /width:72%/, "Approved desktop portrait must use the seamless 72% composition");
// Match actual CSS selectors. A double-escaped regex here silently matches
// nothing and incorrectly fails even when the portrait is fully visible.
const portraitRules = [...approvedLayout.matchAll(/\.npoc-hope-hero \.npoc-hero-visual img\s*\{([^}]*)\}/g)];
assert.ok(portraitRules.length > 0, "Approved portrait selector must exist");
assert.ok(portraitRules.some(([, declarations]) => /object-fit:\s*contain;/.test(declarations)),
  "Approved portrait must remain fully visible without cropping");
assert.ok(portraitRules.some(([, declarations]) => /object-fit:\s*cover;/.test(declarations)),
  "Desktop portrait must cover its image box without a sharp letterbox boundary");
assert.match(approvedLayout, /Oncology production seam repair \| source-edge text suppression/,
  "Latest reference repair must suppress text embedded at the JPEG's left edge");
assert.match(approvedLayout, /object-position:right top;/,
  "Full-bleed crop must preserve the head and facial framing");
assert.match(approvedLayout, /\.npoc-hope-focus \.npoc-focus-card img\s*\{[^}]*object-fit:\s*cover;/,
  "Oncology supporting category photographs should retain their cropped card treatment");
const responsiveImageRule = (stylesheet, mediaPattern) => {
  const pattern = new RegExp(`${mediaPattern}\\s*\\{[\\s\\S]*?\\.npoc-hope-hero \\.npoc-hero-visual img\\s*\\{([^}]*)\\}`, "g");
  return [...stylesheet.matchAll(pattern)].at(-1)?.[1] ?? "";
};
const desktopMedia = "@media\\s*\\(min-width:1101px\\)";
const tabletMedia = "@media\\s*\\(min-width:761px\\)\\s*and\\s*\\(max-width:1100px\\)";
const mobileMedia = "@media\\s*\\(max-width:760px\\)";
for (const [name, stylesheet] of [["static",approvedLayout],["Next",nextLayout]]) {
  const desktopRule = responsiveImageRule(stylesheet,desktopMedia);
  const tabletRule = responsiveImageRule(stylesheet,tabletMedia);
  const mobileRule = responsiveImageRule(stylesheet,mobileMedia);
  assert.match(desktopRule,/object-fit:\s*cover;/,`${name}: desktop portrait must cover its hero canvas`);
  assert.match(tabletRule,/object-fit:\s*contain;/,`${name}: tablet portrait must preserve full framing`);
  assert.match(mobileRule,/object-fit:\s*contain;/,`${name}: mobile portrait must preserve full framing`);
  assert.match(mobileRule,/-webkit-mask-image:\s*linear-gradient/,`${name}: mobile must suppress source-edge lettering`);
  assert.match(mobileRule,/transparent 8%.*#000 14%/,`${name}: mobile mask must fully hide the JPEG's left-edge lettering`);
  assert.match(stylesheet,/aspect-ratio:890\/550;/,`${name}: mobile canvas must follow the portrait's native aspect ratio`);
  assert.match(stylesheet,/padding:22px 0 54px;/,`${name}: mobile copy must follow the portrait in normal flow`);
}
assert.match(approvedLayout, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/, "All three Oncology visuals share a grid row");
assert.match(approvedLayout, /npoc-focus-card span/, "Image labels must overlay on the cards");

// The previous annotation cleanup must never consume the remainder of a media query.
// Validate the intact mobile track, responsive card height and balanced stylesheet braces.
assert.match(approvedLayout, /grid-template-columns:repeat\(3,minmax\(220px,1fr\)\)/,
  "Oncology mobile art cards must retain a full-width horizontal grid track");
assert.match(approvedLayout, /height:285px;/,
  "Oncology mobile art cards must retain their approved card height");
assert.equal((approvedLayout.match(/{/g) ?? []).length,
  (approvedLayout.match(/}/g) ?? []).length,
  "Oncology stylesheet declarations and responsive blocks must be balanced");

assert.ok(!html.includes("href=\"/assets/media/products/oncology-vial-handling.avif\""), "Retired hero image must not preload");
assert.match(html, /<img[^>]+hope-tomorrow-portrait\.jpg[^>]+fetchpriority="high"/);
assert.match(css, /body\[data-page="oncology"\]/);
assert.match(css, /npoc-hope-hero/);
assert.match(html, /id="oncology-focus"/);
assert.doesNotMatch(html, /Illustrative creative image\. No patient, treatment result or NovaPharm facility is depicted\./, "Hero annotation removed from public page");
assert.doesNotMatch(html, /class="npoc-image-note"/, "Hero should not carry a visible disclaimer badge");
assert.match(css, /@media\(max-width:760px\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /@media\(forced-colors:active\)/);
assert.match(css, /@media print/);
assert.doesNotMatch(html, /<svg|lucide|doodle|oncology-editorial-gallery|Formulation and Complexity Navigator|Oncology Product-Readiness Matrix/);
assert.doesNotMatch(html, /"@type":"(?:Drug|MedicalTherapy|MedicalStudy|ClinicalTrial)"/);
for (const filename of ["hope-tomorrow-portrait.jpg", "solid-tumours.jpg", "haematological-cancers.jpg", "supportive-care.jpg"]) {
  assert.ok(existsSync(join(root, "assets/media/oncology", filename)), "Approved oncology image missing: "+filename);
  assert.ok(html.includes(filename), "Oncology image must be referenced: "+filename);
}
assert.doesNotMatch(html, /specialty-pharmacy-handling/, "Retired specialist media must not be used on public page");
assert.match(html, /class="npoc-programme-image npoc-editorial-panel"/);

const provenance = JSON.parse(source("docs/oncology-media-provenance.json"));
for (const asset of provenance.assets) {
  for (const derivative of asset.derivatives) {
    const path = join(root, derivative.path);
    assert.ok(existsSync(path), derivative.path);
    const checksum = createHash("sha256").update(readFileSync(path)).digest("hex");
    assert.equal(checksum, derivative.sha256, derivative.path+" checksum");
  }
}
console.log("Oncology editorial contract passed: six axes, four programmes, six gated readiness rows, six FAQs, responsive scoped CSS and truthful regulatory boundaries.");
