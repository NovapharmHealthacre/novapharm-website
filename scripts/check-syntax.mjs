import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const ignoredDirectories = new Set([".git", "_secure", "artifacts", "data", "node_modules", "private-content", "tmp"]);

function walk(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.(?:js|mjs|ts)$/.test(entry.name) ? [path] : [];
  });
}

const files = walk();
const failures = [];
for (const file of files) {
  const arguments_ = file.endsWith(".ts") ? ["--experimental-strip-types", "--check", file] : ["--check", file];
  const result = spawnSync(process.execPath, arguments_, { encoding: "utf8" });
  if (result.status !== 0) failures.push(`${relative(root, file)}\n${result.stderr || result.stdout}`);
}

if (failures.length) {
  console.error(`Syntax validation failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`Syntax validation passed for ${files.length} JavaScript, MJS and TypeScript files.`);
