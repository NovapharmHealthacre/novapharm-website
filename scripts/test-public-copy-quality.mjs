import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "parse5";
import { visibleTextFromHtml } from "./lib/html-text.mjs";

// Read published source pages using the project's existing HTML parser.
// Avoid brittle tag-stripping expressions and keep this audit read-only.
const root = resolve(process.cwd());
const ignored = new Set([
  ".git", ".github", ".changeset", ".next", ".turbo", "node_modules",
  "apps", "packages", "scripts", "assets", "src", "audit", "architecture",
  "config", "creative-assets", "database", "deployment", "docs", "final-report",
  "geo", "infra", "integrations", "performance", "public", "research", "security",
  "seo", "sharepoint", "tooling", "artifacts", "_site", "coverage", "tmp"
]);
const files = [];
function walk(directory, atRoot = false) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (atRoot && ignored.has(entry.name)) continue;
      walk(join(directory, entry.name));
    } else if (entry.isFile() && entry.name === "index.html") {
      files.push(join(directory, entry.name));
    }
  }
}
walk(root, true);

function getAttribute(node, name) {
  return node.attrs?.find(attribute => attribute.name === name)?.value;
}
function htmlElements(html) {
  const nodes = [parse(html)];
  const elements = [];
  while (nodes.length) {
    const node = nodes.pop();
    if (node.tagName) elements.push(node);
    if (node.childNodes?.length) nodes.push(...node.childNodes);
  }
  return elements;
}

const knownMisspellings = new Set([
  "intellegence", "intellgence", "medicnes", "parntership", "regulartory",
  "goverance", "opportunties", "commerical", "infomation",
  "transperancy", "perosnal", "tranparent", "capatibilities"
]);
const brokenSequences = ["\uFFFD", "â€™", "â€œ", "â€", "Â£", "Ã©"];
const failures = [];
for (const file of files) {
  const route = file.slice(root.length + 1).replaceAll("\\", "/");
  const html = readFileSync(file, "utf8");
  const elements = htmlElements(html);
  const count = tag => elements.filter(node => node.tagName === tag).length;
  const htmlNode = elements.find(node => node.tagName === "html");
  if (getAttribute(htmlNode ?? {}, "lang") !== "en-GB") failures.push(route + ": missing British English language declaration");
  if (count("title") !== 1) failures.push(route + ": expected exactly one document title");

  const redirect = elements.some(node => node.tagName === "meta" &&
    getAttribute(node, "http-equiv")?.toLowerCase() === "refresh");
  if (!redirect && count("h1") !== 1) failures.push(route + ": expected exactly one primary heading");

  const ids = new Set();
  for (const node of elements) {
    const id = getAttribute(node, "id");
    if (id) {
      if (ids.has(id)) failures.push(route + ": repeated HTML id " + id);
      ids.add(id);
    }
    if (node.tagName === "img" && getAttribute(node, "alt") === undefined) {
      failures.push(route + ": image missing explicit alt attribute");
    }
  }
  if (brokenSequences.some(sequence => html.includes(sequence))) failures.push(route + ": possible damaged character encoding");
  const words = new Set(visibleTextFromHtml(html).toLowerCase().match(/[a-z]+/g) ?? []);
  const typos = [...knownMisspellings].filter(word => words.has(word));
  if (typos.length) failures.push(route + ": suspected spelling mistake(s): " + typos.join(", "));
}
// A page may pass copy and link checks yet omit a major product family.
// Keep the controlled B2B account journey aligned with the public products hub.
const accountRoute = join(root, "account-application", "index.html");
if (existsSync(accountRoute)) {
  const accountHtml = readFileSync(accountRoute, "utf8");
  const productNavigation = accountHtml.match(/id="npd-mega-products"[\\s\\S]*?<\\/nav><\\/div>/)?.[0] ?? "";
  const productFooter = accountHtml.match(/<div><h2>Products<\\/h2>[\\s\\S]*?<\\/div>/)?.[0] ?? "";
  const escoLink = 'href="/products/esco/"';
  if (!productNavigation.includes(escoLink)) {
    failures.push("account-application/index.html: ESCO collection missing from product navigation");
  }
  if (!productFooter.includes(escoLink)) {
    failures.push("account-application/index.html: ESCO collection missing from product footer");
  }
}

if (!existsSync(join(root, "index.html")) || files.length < 55) {
  failures.push("Public route inventory is unexpectedly incomplete: " + files.length + " HTML pages");
}
if (failures.length) {
  console.error("Public copy and document-quality audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Public copy and metadata audit passed across " + files.length + " HTML routes: language, document titles, primary headings, unique IDs, image alternatives, encoding and unambiguous spelling errors.");
