import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";

const root = resolve(process.cwd());
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "_secure",
  "artifacts",
  "coverage",
  "data",
  "node_modules",
  "private-content",
  "tmp",
  "vishal-portfolio-rebuild",
]);

function walk(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    if (entry.name.endsWith(".d.ts")) return [];
    return /\.(?:js|mjs|ts)$/.test(entry.name) ? [path] : [];
  });
}

const files = walk();
const failures = [];
for (const file of files) {
  try {
    // Node 24's --check path can parse the unstripped TypeScript source,
    // even when --experimental-strip-types is supplied. Explicitly strip
    // type-only syntax, then ask Node to parse the resulting ES module.
    // Real TypeScript type safety remains enforced by the workspace typecheck.
    const typescript = file.endsWith(".ts");
    const source = typescript ? stripTypeScriptTypes(readFileSync(file, "utf8"), { mode: "strip" }) : undefined;
    const arguments_ = typescript ? ["--input-type=module", "--check"] : ["--check", file];
    const result = spawnSync(process.execPath, arguments_, { encoding: "utf8", input: source });
    if (result.status !== 0) failures.push(`${relative(root, file)}\n${result.stderr || result.stdout}`);
  } catch (error) {
    failures.push(`${relative(root, file)}\n${String(error)}`);
  }
}

if (failures.length) {
  console.error(`Syntax validation failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`Syntax validation passed for ${files.length} JavaScript, MJS and executable TypeScript files; declaration files remain governed by TypeScript compilation.`);
