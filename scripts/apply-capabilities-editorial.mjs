import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

// Idempotent, build-final owner approval. Preserve the generator's current
// shared header, navigation, structured data and regulated footer verbatim.
const pageFile = resolve("capabilities/index.html");
const templateFile = resolve("src/content/capabilities-editorial.html");
const stylesheet = "/assets/css/capabilities-editorial.css";
for (const file of [
  pageFile,
  templateFile,
  resolve("assets/css/capabilities-editorial.css")
]) {
  if (!existsSync(file)) throw new Error("Approved Capabilities asset missing: " + file);
}

// Publish raster versions of the approved vector artwork. Browsers and
// Safari's print engine receive self-contained WebP images, not inline SVG
// or separate CSS backgrounds that can disappear from exported PDFs.
const sourceTemplate = readFileSync(templateFile, "utf8").trim();
let template = sourceTemplate;
for (const [className, width, height, alt] of [
  ["ncap-vial-illustration", 1200, 458, "Illustrative pharmaceutical glass vial representing an evidence-led route to market"],
  ["ncap-earth-illustration", 1600, 720, ""]
]) {
  const expression = new RegExp('<svg class="' + className + '"[\\s\\S]*?<\\/svg>');
  const match = template.match(expression);
  if (!match) throw new Error("Capabilities vector artwork missing: " + className);
  const imageBuffer = await sharp(Buffer.from(match[0], "utf8"))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 77, effort: 5 })
    .toBuffer();
  if (imageBuffer.length < 500) throw new Error("Capabilities raster artwork is unexpectedly empty: " + className);
  const image = '<img class="' + className + '" src="data:image/webp;base64,' + imageBuffer.toString("base64") +
    '" width="' + width + '" height="' + height + '" alt="' + alt + '" decoding="async">';
  template = template.replace(match[0], image);
}
if (template.includes("<svg")) throw new Error("Capabilities production HTML still contains inline vector markup.");
const original = readFileSync(pageFile, "utf8");
if (!/^<main id="main"[\s\S]*<\/main>$/.test(template)) {
  throw new Error("Capabilities template must consist of exactly one full main element.");
}
const mainMatches = original.match(/<main\b[^>]*>[\s\S]*?<\/main>/g) || [];
if (mainMatches.length !== 1) throw new Error("Expected exactly one Capabilities main element in generated shell.");
let result = original.replace(mainMatches[0], template);
if (!result.includes('href="' + stylesheet + '"')) {
  result = result.replace("</head>", '  <link rel="stylesheet" href="' + stylesheet + '">\n</head>');
}
if ((result.match(/<h1\b/g) || []).length !== 1 ||
    !result.includes('class="ncap-title-line">From evidence</span>') ||
    !result.includes('class="ncap-earth-illustration"') ||
    result.includes("<svg") ||
    !result.includes('class="ncap-vial-illustration"') ||
    !result.includes("Start with one decision.") ||
    !result.includes("Regulated wholesale supply has not commenced") ||
    !result.includes('href="/services/"') ||
    !result.includes('href="/regulatory-services/"') ||
    !result.includes('href="/cro/"') ||
    !result.includes('href="/technology/"')) {
  throw new Error("Approved Capabilities content, routes or legal footer failed validation.");
}
writeFileSync(pageFile, result, "utf8");
console.log("Applied approved Capabilities editorial presentation, four linked disciplines and Earth horizon CTA.");