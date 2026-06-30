import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const defaultTarget = "/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website";
const sourceRoot = resolve(process.cwd());
const targetRoot = resolve(process.argv[2] || defaultTarget);

const excluded = new Set([
  ".git",
  ".DS_Store",
  "node_modules",
  "artifacts"
]);

function shouldCopy(path) {
  const name = basename(path);
  if (excluded.has(name)) return false;
  if (resolve(path) === join(sourceRoot, "data")) return false;
  if (name.endsWith(".swp")) return false;
  return true;
}

function copyDirectory(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    if (!shouldCopy(source)) continue;
    const target = join(to, entry);
    if (statSync(source).isDirectory()) {
      copyDirectory(source, target);
    } else {
      cpSync(source, target);
    }
  }
}

if (!existsSync(targetRoot)) {
  throw new Error(`Target repository does not exist: ${targetRoot}`);
}

if (!existsSync(join(targetRoot, ".git"))) {
  throw new Error(`Target does not look like a git checkout: ${targetRoot}`);
}

if (!statSync(targetRoot).mode) {
  throw new Error(`Cannot stat target repository: ${targetRoot}`);
}

try {
  const writeTest = join(targetRoot, ".novapharm-write-test");
  cpSync(join(sourceRoot, "package.json"), writeTest, { force: true });
  rmSync(writeTest, { force: true });
} catch {
  throw new Error(`Target repository is not writable from this session: ${targetRoot}`);
}

copyDirectory(sourceRoot, targetRoot);
console.log(`Merged NovaPharm platform into ${targetRoot}`);
console.log("Next: run `git status -sb`, validations, commit, push, then deploy.");
