import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const excludedDirectories = new Set([".git", "node_modules", "runtime-data", "artifacts"]);

function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (excludedDirectories.has(entry)) continue;
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...collectHtmlFiles(path));
    else if (entry.endsWith(".html")) files.push(path);
  }
  return files;
}

const replacements = [
  [/Founder &amp; Chief Executive Officer/g, "Chief Executive Officer"],
  [/Founder & Chief Executive Officer/g, "Chief Executive Officer"],
  [/Founder and Chief Executive Officer/g, "Chief Executive Officer"]
];

let changed = 0;
for (const path of collectHtmlFiles(root)) {
  const original = readFileSync(path, "utf8");
  let content = original;
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    writeFileSync(path, content);
    changed += 1;
  }
}

console.log(`Applied the approved Chief Executive Officer designation to ${changed} generated HTML file${changed === 1 ? "" : "s"}.`);
