import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const expectZero = args.includes("--expect-zero");
const positional = args.filter((arg) => arg !== "--expect-zero");
const [repositoryInput, protectedInput] = positional;

if (!repositoryInput || !protectedInput) {
  throw new Error("Usage: node scripts/scan-git-history-exact.mjs <mirror-repository> <protected-input-file> [--expect-zero]");
}

const repository = resolve(repositoryInput);
const protectedFile = resolve(protectedInput);
const mode = statSync(protectedFile).mode & 0o777;
if ((mode & 0o077) !== 0) throw new Error("Protected input must not be readable by group or other users.");

const needle = readFileSync(protectedFile);
if (needle.length < 6 || needle.includes(0x0a) || needle.includes(0x0d)) {
  throw new Error("Protected input must be a single value of at least six bytes.");
}

function git(args, options = {}) {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: options.encoding === null ? null : "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const objects = git(["rev-list", "--objects", "--all"])
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const separator = line.indexOf(" ");
    return separator < 0
      ? { oid: line, path: "" }
      : { oid: line.slice(0, separator), path: line.slice(separator + 1) };
  });

const firstPath = new Map();
for (const object of objects) if (!firstPath.has(object.oid)) firstPath.set(object.oid, object.path);

const matches = [];
for (const [oid, path] of firstPath) {
  const type = git(["cat-file", "-t", oid]).trim();
  if (!new Set(["blob", "commit", "tag"]).has(type)) continue;
  const body = git(["cat-file", "-p", oid], { encoding: null });
  let occurrences = 0;
  for (let offset = 0; offset <= body.length - needle.length;) {
    const index = body.indexOf(needle, offset);
    if (index < 0) break;
    occurrences += 1;
    offset = index + needle.length;
  }
  if (occurrences) matches.push({ oid, type, path: path || "(Git metadata)", occurrences });
}

console.log(JSON.stringify({ reachableObjectsScanned: firstPath.size, matchingObjects: matches.length, matches }, null, 2));
if (expectZero && matches.length) process.exitCode = 1;
