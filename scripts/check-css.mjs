import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const cssRoot = join(root, "assets/css");
const files = readdirSync(cssRoot).filter((file) => file.endsWith(".css")).map((file) => join(cssRoot, file));
const failures = [];

function structuralSource(source) {
  let output = "";
  let quote = "";
  let comment = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && character === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (quote) {
      if (!escaped && character === quote) quote = "";
      escaped = !escaped && character === "\\";
      if (character !== "\\") escaped = false;
      output += " ";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      output += " ";
      continue;
    }
    output += character;
  }
  if (comment) failures.push("an unterminated CSS comment was found");
  if (quote) failures.push("an unterminated CSS string was found");
  return output;
}

for (const file of files) {
  const display = relative(root, file);
  const source = readFileSync(file, "utf8");
  const structural = structuralSource(source);
  const pairs = [["{", "}"], ["(", ")"], ["[", "]"]];
  for (const [opening, closing] of pairs) {
    let depth = 0;
    for (const character of structural) {
      if (character === opening) depth += 1;
      if (character === closing) depth -= 1;
      if (depth < 0) break;
    }
    if (depth !== 0) failures.push(`${display} has unbalanced ${opening}${closing} delimiters`);
  }
  // Approved corporate editorial headings use measured optical tightening. Keep
  // the exception file-scoped and capped, rather than allowing arbitrary
  // negative tracking across the site or in third-party UI components.
  const editorialTrackingFiles = new Set([
    "assets/css/about-editorial.css",
    "assets/css/capabilities-editorial.css",
    "assets/css/esco-order-requests.css",
    "assets/css/global-distribution-editorial.css",
    "assets/css/homepage-editorial.css",
    "assets/css/markets-editorial.css",
    "assets/css/novapharm.bundle.css",
    "assets/css/oncology-editorial.css",
    "assets/css/oncology-hope-v2.css",
    "assets/css/products-editorial.css"
  ]);
  for (const match of source.matchAll(/\bletter-spacing\s*:\s*(-(?:\d+(?:\.\d+)?|\.\d+))([a-z%]*)/giu)) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!editorialTrackingFiles.has(display) || unit !== "em" || amount < -0.08 || amount >= 0) {
      failures.push(`${display} uses out-of-policy negative letter spacing: ${match[0]}`);
    }
  }
  for (const match of source.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) {
    if (/^(?:https?:|data:)/i.test(match[1])) continue;
    if (!existsSync(resolve(dirname(file), match[1]))) failures.push(`${display} imports missing stylesheet ${match[1]}`);
  }
}

if (failures.length) {
  console.error(`CSS validation failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`CSS validation passed for ${files.length} modular stylesheets.`);
