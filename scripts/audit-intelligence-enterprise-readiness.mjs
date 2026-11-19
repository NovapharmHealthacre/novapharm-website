import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assessIntelligenceEnterpriseReadiness } from "../src/core/intelligence-enterprise-readiness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));
const args = new Set(process.argv.slice(2));
if ([...args].some(a => !["--require-production-ready", "--write-artifact"].includes(a))) {
  throw new Error("Unsupported audit option");
}
const audit = assessIntelligenceEnterpriseReadiness({
  registry: read("docs/intelligence/global-pharma-sources-20261117.json"),
  constraints: read("config/intelligence/owner-production-constraints.json"),
  modelRegistry: read("docs/ai-model-register.json")
});
const report = JSON.stringify(audit, null, 2) + "\n";
process.stdout.write(report);
if (args.has("--write-artifact")) {
  const filepath = resolve(root, "artifacts/intelligence-enterprise-readiness.json");
  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, report);
}
if (args.has("--require-production-ready") && !audit.enterpriseReady) process.exitCode = 1;
