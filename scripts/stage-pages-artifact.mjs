import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const output = resolve(process.argv[2] || "_site");

const excludedTopLevelDirectories = new Set([
  ".git",
  ".github",
  "_secure",
  "architecture",
  "audit",
  "compliance",
  "data",
  "database",
  "deployment",
  "docs",
  "final-report",
  "geo",
  "integrations",
  "node_modules",
  "performance",
  "private-content",
  "public",
  "research",
  "scripts",
  "security",
  "seo",
  "sharepoint",
  "src",
  "tests"
]);

const allowedRootFiles = new Set([
  ".nojekyll",
  "404.html",
  "500.html",
  "BingSiteAuth.xml",
  "CNAME",
  "apple-touch-icon.png",
  "browserconfig.xml",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon.ico",
  "humans.txt",
  "index.html",
  "llms.txt",
  "manifest.webmanifest",
  "mstile-150x150.png",
  "robots.txt",
  "safari-pinned-tab.svg",
  "security.txt",
  "site.webmanifest",
  "sitemap-images.xml",
  "sitemap-insights.xml",
  "sitemap.xml",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png"
]);

const requiredPublicPaths = [
  "index.html",
  "404.html",
  "CNAME",
  "assets",
  "cro/index.html",
  "oncology/index.html",
  "contact/index.html",
  "portal/index.html"
];

function copyDirectory(source, destination) {
  cpSync(source, destination, {
    recursive: true,
    dereference: true,
    errorOnExist: false,
    force: true,
    filter(path) {
      const name = basename(path);
      return name !== ".DS_Store" && name !== "Thumbs.db";
    }
  });
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

if (output === root || output.startsWith(`${root}/assets`)) {
  throw new Error(`Refusing to stage Pages output into an unsafe path: ${output}`);
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of readdirSync(root, { withFileTypes: true })) {
  const source = join(root, entry.name);
  const destination = join(output, entry.name);

  if (entry.isDirectory()) {
    if (entry.name === ".well-known") {
      copyDirectory(source, destination);
      continue;
    }
    if (entry.name.startsWith(".") || excludedTopLevelDirectories.has(entry.name)) continue;
    copyDirectory(source, destination);
    continue;
  }

  if (entry.isFile() && allowedRootFiles.has(entry.name)) {
    cpSync(source, destination, { force: true });
  }
}

writeFileSync(join(output, ".nojekyll"), "");

for (const requiredPath of requiredPublicPaths) {
  const target = join(output, requiredPath);
  if (!existsSync(target)) throw new Error(`Pages artifact is missing required public path: ${requiredPath}`);
}

const cname = readFileSync(join(output, "CNAME"), "utf8").trim();
if (cname !== "novapharmhealthcare.com") {
  throw new Error(`Unexpected Pages custom domain in artifact: ${cname || "<empty>"}`);
}

const stagedFiles = walk(output);
if (!stagedFiles.length) throw new Error("Pages artifact contains no files.");

for (const file of stagedFiles) {
  const stagedPath = relative(output, file).replaceAll("\\", "/");
  const topLevel = stagedPath.split("/")[0];
  if (excludedTopLevelDirectories.has(topLevel)) {
    throw new Error(`Internal directory leaked into Pages artifact: ${stagedPath}`);
  }
  if (/\.(?:env|pem|key|sqlite|db|bak)$/i.test(stagedPath)) {
    throw new Error(`Sensitive file type leaked into Pages artifact: ${stagedPath}`);
  }
}

const totalBytes = stagedFiles.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`Staged ${stagedFiles.length.toLocaleString("en-GB")} public files (${totalBytes.toLocaleString("en-GB")} bytes) in ${relative(root, output) || output}.`);
