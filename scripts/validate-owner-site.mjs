import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/validate-site.mjs");
const runtimePath = resolve("scripts/.validate-owner-site-runtime.mjs");
let source = readFileSync(sourcePath, "utf8");

const retiredRequiredEntries = [
  '  "technology/ai-governance/index.html",\n',
  '  "assets/css/ai-search.css",\n',
  '  "assets/js/ai-search.js",\n',
  '  "assets/ai/company-knowledge-index.json",\n',
  '  "assets/ai/company-source-manifest.json",\n',
  '  "assets/ai/novapharm-evidence-vector-v1.json",\n',
  '  "assets/ai/company-embeddings.json",\n',
  '  "search/index.html",\n'
];

for (const entry of retiredRequiredEntries) {
  if (!source.includes(entry)) throw new Error(`The base validator no longer contains the expected retired entry: ${entry.trim()}`);
  source = source.replace(entry, "");
}

const previousCount = "const expectedPublicPageCount = Object.keys(pageMeta).length + leadership.length + insightFiles.length + 1;";
const correctedCount = "const expectedPublicPageCount = Object.keys(pageMeta).length + leadership.length + insightFiles.length;";
if (!source.includes(previousCount)) throw new Error("The public-page count expression changed; review the corrective validator.");
source = source.replace(previousCount, correctedCount);

const previousAiValidation = `const aiGovernancePage = source("technology/ai-governance/index.html");
for (const marker of ["Responsible AI starts with evidence", "Private on-device semantic retrieval", "Internal development", "Prohibited", "I could not verify that from NovaPharm's approved public information"]) {
  if (!aiGovernancePage.includes(marker)) fail(\`AI governance page is missing \${marker}\`);
}
const searchPage = source("search/index.html");
if (!searchPage.includes('name="robots" content="noindex,follow"')) fail("search directory must remain noindex and crawlable for links");
if (!searchPage.includes("Public topics")) fail("search directory needs a JavaScript-independent route index");
`;
const correctedAiValidation = `for (const retiredPublicPath of [
  "technology/ai-governance/index.html",
  "search/index.html",
  "assets/css/ai-search.css",
  "assets/js/ai-search.js",
  "assets/ai/company-knowledge-index.json",
  "assets/ai/company-source-manifest.json",
  "assets/ai/novapharm-evidence-vector-v1.json",
  "assets/ai/company-embeddings.json"
]) {
  if (existsSync(join(root, retiredPublicPath))) fail(\`retired public AI/search output must not ship: \${retiredPublicPath}\`);
}
`;
if (!source.includes(previousAiValidation)) throw new Error("The public AI/search validation block changed; review the corrective validator.");
source = source.replace(previousAiValidation, correctedAiValidation);

writeFileSync(runtimePath, source);
try {
  await import(`${pathToFileURL(runtimePath).href}?release=${Date.now()}`);
} finally {
  if (existsSync(runtimePath)) rmSync(runtimePath, { force: true });
}
