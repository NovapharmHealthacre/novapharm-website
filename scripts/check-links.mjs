import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const ignoredDirectories = new Set([".git", "_secure", "data", "node_modules", "tmp", "vishal-portfolio-rebuild"]);
let failures = 0;
let checked = 0;

function walk(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : entry.name.endsWith(".html") ? [path] : [];
  });
}

function fail(message) {
  failures += 1;
  console.error(`Link check failed: ${message}`);
}

function targetFile(from, rawPath) {
  const clean = decodeURIComponent(rawPath.split("?")[0]);
  if (!clean || clean === "/") return join(root, "index.html");
  const base = clean.startsWith("/") ? join(root, clean.slice(1)) : resolve(dirname(from), clean);
  if (extname(base)) return base;
  return join(base, "index.html");
}

for (const file of walk()) {
  const html = readFileSync(file, "utf8");
  const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;
    if (reference.startsWith("/api/")) continue;
    const [pathPart, fragment = ""] = reference.split("#");
    const target = pathPart ? targetFile(file, pathPart) : file;
    checked += 1;
    if (!existsSync(target)) {
      fail(`${file.slice(root.length + 1)} -> ${reference}`);
      continue;
    }
    if (fragment && target.endsWith(".html")) {
      const targetHtml = readFileSync(target, "utf8");
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`(?:id|name)=["']${escaped}["']`).test(targetHtml)) fail(`${file.slice(root.length + 1)} -> missing anchor ${reference}`);
    }
  }
}

if (failures) process.exit(1);
console.log(`Checked ${checked} local links and asset references with no broken targets.`);
