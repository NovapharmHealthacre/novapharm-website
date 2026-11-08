import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Validate the entire source/public HTML estate, not just the showcase pages.
// Run after build:public-only or build; never alter regulated claims or copy.
const root = resolve(process.cwd());
const ignored = new Set([
  ".git", ".github", ".changeset", ".next", ".turbo", "node_modules",
  "apps", "packages", "scripts", "assets", "src", "audit", "architecture",
  "config", "creative-assets", "database", "deployment", "docs", "final-report",
  "geo", "infra", "integrations", "performance", "public", "research", "security",
  "seo", "sharepoint", "tooling", "artifacts", "_site", "coverage", "tmp"
]);
const pages = [];
function walk(directory, atRoot = false) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (atRoot && ignored.has(entry.name)) continue;
      walk(join(directory, entry.name));
    } else if (entry.isFile() && entry.name === "index.html") {
      pages.push(join(directory, entry.name));
    }
  }
}
walk(root, true);
const failures = [];
const typoPattern = /\b(?:intellegence|intellgence|medicnes|parntership|regulartory|goverance|opportunties|commerical|infomation|transperancy|perosnal|tranparent|capatibilities)\b/gi;
for (const file of pages) {
  const route = file.slice(root.length + 1).replaceAll("\\", "/");
  const html = readFileSync(file, "utf8");
  const redirect = /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html);
  if (!/<html\b[^>]*\slang=["']en-GB["']/i.test(html)) failures.push(route + ": missing British English language declaration");
  if ([...html.matchAll(/<title\b/gi)].length !== 1) failures.push(route + ": expected exactly one document title");
  if (!redirect && [...html.matchAll(/<h1\b/gi)].length !== 1) failures.push(route + ": expected exactly one primary heading");
  const ids = [...html.matchAll(/\s+id=["']([^"']+)["']/gi)].map(match => match[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) failures.push(route + ": repeated HTML id " + id);
    seen.add(id);
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\s+alt=["'][^"']*["']/i.test(tag)) failures.push(route + ": image missing explicit alt attribute");
  }
  if (/(?:\uFFFD|â€™|â€œ|â€|Â£|Ã©)/.test(html)) failures.push(route + ": possible damaged character encoding");
  const visibleText = html.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, "").replace(/<[^>]*>/g, " ");
  const errors = [...new Set([...visibleText.matchAll(typoPattern)].map(match => match[0]))];
  if (errors.length) failures.push(route + ": suspected spelling mistake(s): " + errors.join(", "));
}
if (!existsSync(join(root, "index.html")) || pages.length < 55) {
  failures.push("Public route inventory is unexpectedly incomplete: " + pages.length + " HTML pages");
}
if (failures.length) {
  console.error("Public copy and document-quality audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Public copy and metadata audit passed across " + pages.length + " HTML routes: language, document titles, primary headings, unique IDs, image alternatives, encoding and unambiguous spelling errors.");
