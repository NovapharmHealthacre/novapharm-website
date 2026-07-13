import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const ignoredDirectories = new Set([".git", "_secure", "artifacts", "data", "node_modules", "private-content", "tmp", "vishal-portfolio-rebuild"]);
const ignoredLocalFiles = new Set([".env"]);
const binaryExtensions = new Set([".eps", ".gif", ".ico", ".jpeg", ".jpg", ".pdf", ".png", ".sqlite", ".webp", ".woff2"]);
const forbiddenNames = [/^\.DS_Store$/, /\.sw[op]$/, /~$/, /^\.env$/, /\.sqlite(?:-shm|-wal)?$/, /\.map$/];
const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ["Resend API key", /\bre_[A-Za-z0-9_-]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["plaintext portal password configuration", /\bPORTAL_PASSWORD\s*=\s*["'][^"']{6,}["']/],
  ["plaintext bootstrap password configuration", /\bBOOTSTRAP_ADMIN_PASSWORD\s*=\s*["'][^"']{6,}["']/],
  ["generic bearer token", /\bBearer\s+[A-Za-z0-9._~-]{32,}\b/],
  ["private SharePoint token", /\b(?:access_token|refresh_token)\s*["':=]+\s*[A-Za-z0-9._~-]{32,}/i],
  ["private SharePoint drive identifier", /\bb![A-Za-z0-9_-]{40,}\b/],
  ["personal SharePoint URL", /https:\/\/[^\s"']+-my\.sharepoint\.com\/personal\//i]
];

function walk(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = walk();
const failures = [];
for (const file of files) {
  const name = basename(file);
  if (ignoredLocalFiles.has(name)) continue;
  const path = relative(root, file);
  if (forbiddenNames.some((pattern) => pattern.test(name))) failures.push(`${path}: forbidden development or secret-bearing artefact`);
  if (binaryExtensions.has(extname(name).toLowerCase()) || statSync(file).size > 2 * 1024 * 1024) continue;
  const content = readFileSync(file, "utf8");
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(content)) failures.push(`${path}: possible ${label}`);
  }
}

const example = readFileSync(join(root, ".env.example"), "utf8");
for (const line of example.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|API_KEY|PASSWORD_HASH|PASSWORD_SALT))=(.*)$/);
  if (!match) continue;
  const value = match[2].trim();
  if (value && !/^(?:replace-|generate-|sync-|placeholder|\.\.\.)/i.test(value)) {
    failures.push(`.env.example: ${match[1]} must be empty or an explicit placeholder`);
  }
}

if (failures.length) {
  console.error(`Secret and artefact scan failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`Secret and artefact scan passed for ${files.length} repository files; ignored runtime/private directories were excluded.`);
