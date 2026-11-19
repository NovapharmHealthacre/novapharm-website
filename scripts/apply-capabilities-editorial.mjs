import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { parse } from "parse5";

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

// The earlier SVG raster looked schematic rather than the owner's approved
// photorealistic reference. Embed the approved, source-cropped WebP photography
// for robust Safari display and PDF export, while keeping the real image bytes
// in the governed repository. No new rights or clinical claims are asserted.
const sourceTemplate = readFileSync(templateFile, "utf8").trim();
let template = sourceTemplate;
for (const [className, file, width, height, alt] of [
  ["ncap-vial-illustration", "assets/media/capabilities/approved-vial-photo-800.webp", 800, 224, "Photographic study of an unbranded clear medicine vial, taken from the owner-approved visual reference"],
  ["ncap-earth-illustration", "assets/media/capabilities/approved-earth-horizon-crest.webp", 800, 53, ""],
]) {
  const expression = new RegExp('<svg class="' + className + '"[\\s\\S]*?<\\/svg>');
  const match = template.match(expression);
  if (!match) throw new Error("Capabilities artwork placeholder missing: " + className);
  const imageBuffer = readFileSync(resolve(file));
  if (imageBuffer.length < 500) throw new Error("Approved Capabilities image missing or empty: " + file);
  const metadata = await sharp(imageBuffer).metadata();
  if (metadata.format !== "webp" || metadata.width !== width) {
    throw new Error("Approved Capabilities image format/size invalid: " + file);
  }
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
// This interior must not inherit homepage-only header spacing from its shell.
const document = parse(result, { sourceCodeLocationInfo: true });
const html = document.childNodes.find(node => node.tagName === "html");
const body = html?.childNodes.find(node => node.tagName === "body");
const pageMarker = body?.sourceCodeLocation?.attrs?.["data-page"];
if (!pageMarker) throw new Error("Capabilities shell is missing its body page context.");
result = result.slice(0, pageMarker.startOffset) + 'data-page="capabilities"' + result.slice(pageMarker.endOffset);
if (!result.includes('href="' + stylesheet + '"') && !result.includes('href="' + stylesheet + '?v=')) {
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
