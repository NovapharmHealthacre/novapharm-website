import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Idempotent, build-final owner approval. Preserve the generator's current
// shared header, navigation, structured data and regulated footer verbatim.
const pageFile = resolve("capabilities/index.html");
const templateFile = resolve("src/content/capabilities-editorial.html");
const stylesheet = "/assets/css/capabilities-editorial.css";
for (const file of [
  pageFile,
  templateFile,
  resolve("assets/css/capabilities-editorial.css"),
  resolve("assets/media/capabilities/vial-study.svg"),
  resolve("assets/media/capabilities/earth-horizon.svg")
]) {
  if (!existsSync(file)) throw new Error("Approved Capabilities asset missing: " + file);
}
const template = readFileSync(templateFile, "utf8").trim();
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