#!/usr/bin/env node
/**
 * Print the read-only country-by-country NovaPharm source release matrix.
 * Do not imply rights, network access, native releases or a deployed customer API.
 */
import { readFileSync } from "node:fs";
import { buildCountryReleaseLedger } from "../src/core/intelligence-country-release-ledger.mjs";

const registry = JSON.parse(readFileSync(new URL(
  "../docs/intelligence/global-pharma-sources-20261117.json", import.meta.url
), "utf8"));
const report = buildCountryReleaseLedger(registry.sources);
const format = process.argv.slice(2);
if (format.length !== 1 || !["--markdown", "--json"].includes(format[0])) {
  throw new Error("Usage: node scripts/render-intelligence-country-release-ledger.mjs --markdown|--json");
}
if (format[0] === "--json") {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  const esc = value => String(value).replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
  const line = [];
  line.push("# NovaPharm Intelligence: 101-source country integration evidence ledger");
  line.push("");
  line.push("**Read-only planning record, not a production activation certificate.**");
  line.push("");
  line.push("National countries: " + report.nationalCountries +
    "; EU/EEA + global groups: " + report.supranationalAndGlobalGroups +
    "; source candidates: " + report.totalSources +
    "; source-only merged API contracts: " + report.sourceOnlyAdapterCount +
    "; verified live countries: " + report.verifiedProductionCountries + ".");
  line.push("");
  line.push("| Region | Country / group | Candidates | Source-only adapters | Verified production | Specific next actions |");
  line.push("|---|---|---:|---:|---:|---|");
  for (const c of report.countries) {
    const actions = c.nextSteps.map(x => x.source + ": " + x.action).join("; ");
    line.push("| " + [c.region,c.country,c.candidateSourceCount,
      c.codedAdapterCandidateCount,c.verifiedProductionCompletionPercent + "%",
      actions].map(esc).join(" | ") + " |");
  }
  line.push("");
  line.push("No value in this report can self-grant source access, approve a licence, admit evidence, activate native applications or publish to the customer.");
  process.stdout.write(line.join("\n") + "\n");
}
