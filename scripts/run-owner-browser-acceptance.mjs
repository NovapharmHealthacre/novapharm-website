import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/run-browser-acceptance.mjs");
const runtimePath = resolve("scripts/.run-owner-browser-acceptance-runtime.mjs");
let source = readFileSync(sourcePath, "utf8");

for (const retiredEntry of [
  '  ["ai-governance", "/technology/ai-governance/"],\n',
  '  ["search-directory", "/search/"],\n',
  '  "ai-governance",\n'
]) {
  if (!source.includes(retiredEntry)) {
    throw new Error(`The proven browser runner no longer contains the expected retired entry: ${retiredEntry.trim()}`);
  }
  source = source.replace(retiredEntry, "");
}

writeFileSync(runtimePath, source);
try {
  await import(`${pathToFileURL(runtimePath).href}?release=${Date.now()}`);
} finally {
  if (existsSync(runtimePath)) rmSync(runtimePath, { force: true });
}
