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
  if (/letter-spacing\s*:\s*-/i.test(source)) failures.push(`${display} uses prohibited negative letter spacing`);
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
