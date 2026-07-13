import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const files = [
  "leadership/index.html",
  "leadership/vishal-chakravarty/index.html"
];

const replacements = [
  [/Founder &amp; Chief Executive Officer/g, "Chief Executive Officer"],
  [/Founder & Chief Executive Officer/g, "Chief Executive Officer"],
  [/Founder and Chief Executive Officer/g, "Chief Executive Officer"]
];

for (const relativePath of files) {
  const path = resolve(process.cwd(), relativePath);
  let content = readFileSync(path, "utf8");
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  writeFileSync(path, content);
}

console.log("Applied approved executive-title overrides to generated leadership pages.");
