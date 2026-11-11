import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { oncologyContent } from "../data/oncology";

const root = process.cwd();
const component = readFileSync(path.join(root, "components/oncology-editorial.tsx"), "utf8");
const css = readFileSync(path.join(root, "app/oncology-editorial.css"), "utf8");
const layout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");
const route = readFileSync(path.join(root, "app/[[...slug]]/page.tsx"), "utf8");
const pageMetadata = readFileSync(path.join(root, "data/site.ts"), "utf8");

test("Oncology is implemented in the active Next.js renderer, not solely static HTML", () => {
  assert.match(route, /case "oncology":\s*content = <OncologyEditorialPage \/>/);
  assert.match(route, /import \{ OncologyEditorialPage \} from "@\/components\/oncology-editorial"/);
  assert.match(layout, /import "\.\/oncology-editorial\.css"/);
  assert.match(component, /data-oncology-design="hope-for-tomorrow-v3"/);
  assert.match(pageMetadata, /Oncology \| Evidence-led Specialist Medicines \| NovaPharm Healthcare/);
  assert.match(component, /A Hope for\{" "\}<br \/>Tomorrow\./);
  assert.match(component, /id="oncology-focus"/);
  assert.match(component, /Selected Therapies\.<br \/>Real Impact\./);
  assert.doesNotMatch(component, /Oncology demands|oncology-vial-handling/);
  assert.match(component, /Every detail<br \/>matters/);
  assert.match(component, /Six connected decisions/);
  assert.match(component, /Complexity deserves precision/);
  assert.match(component, /The next conversation starts here/);
  assert.match(component, /id="scope-boundary"/);
  assert.match(component, /id="oncology-enquiry"/);
});

test("Oncology product safety, governance, imagery and progressive disclosure are preserved", () => {
  assert.equal(oncologyContent.continuityAxes.length, 6);
  assert.equal(oncologyContent.formulations.length, 4);
  assert.equal(oncologyContent.readiness.length, 6);
  assert.equal(oncologyContent.faqs.length, 6);
  assert.match(component, /Regulated wholesale supply has not commenced/);
  assert.match(component, /not presented as approved, stocked or available/);
  assert.match(component, /does not provide medical advice/);
  assert.match(component, /oncologyContent\.formulations\.map/);
  assert.match(component, /oncologyContent\.faqs\.map/);
  assert.match(component, /<details className="npoc-matrix">/);
  assert.match(component, /aria-label="Scrollable oncology readiness matrix"/);
  assert.match(component, /Illustrative programme categories only/);
  assert.match(component, /non-confidential opportunity summary/);
  assert.doesNotMatch(component, /<svg|lucide|oncology-editorial-gallery|specialty-pharmacy-handling|data-login-form|Buy now|In stock/i);
  assert.ok(component.includes("/assets/media/oncology/hope-tomorrow-portrait.jpg"));
  for (const image of ["hope-tomorrow-portrait.jpg", "solid-tumours.jpg", "haematological-cancers.jpg", "supportive-care.jpg"]) {
    const media = path.join(root, "../../assets/media/oncology", image);
    assert.ok(existsSync(media), `Missing approved image asset: ${media}`);
  }
  assert.match(component, /href=\{enquiry\}/);
  assert.match(component, /mailto:vishal@novapharmhealthcare\.com/);
});

test("Oncology visuals are isolated, responsive, and respect user accessibility preferences", () => {
  assert.match(css, /\.npoc-page\s*\{/);
  assert.match(css, /\.npoc-page \.npoc-hero/);
  assert.match(css, /\.npoc-page section\.npoc-hero\.npoc-hope-hero/);
  assert.match(css, /object-fit:contain/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media\(forced-colors:active\)/);
  assert.match(css, /@media print/);
  assert.doesNotMatch(css, /body\[data-page="oncology"\]/);
});


test("Next.js Oncology stylesheet remains exactly in sync with the approved static design", () => {
  const staticCss = readFileSync(path.join(root, "../../assets/css/oncology-hope-v2.css"), "utf8");
  const matchingNextSelectors = staticCss
    .replaceAll('body[data-page="oncology"] main.npoc-page', ".npoc-page")
    .replaceAll('body[data-page="oncology"] .npoc-page', ".npoc-page")
    .replace(/body\[data-page="oncology"\] \.site-header\.npd-header[^{]*\{[^}]*\}\s*/g, "");
  assert.ok(css.includes(matchingNextSelectors), "Next.js must inherit the exact owner-approved Oncology visual contract");
  assert.match(component, /A Hope for\{" "\}<br \/>Tomorrow\./);
  assert.doesNotMatch(component, /Oncology demands|oncology-vial-handling/);
});
