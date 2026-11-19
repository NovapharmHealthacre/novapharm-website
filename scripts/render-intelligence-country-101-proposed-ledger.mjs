#!/usr/bin/env node
/** Independent read-only 101-national-jurisdiction readiness evidence. */
import {readFileSync} from "node:fs";
import {buildProposedCountry101Ledger} from "../src/core/intelligence-country-101-proposed-ledger.mjs";
import {escapeMarkdownTableCell} from "../src/core/intelligence-country-markdown-cell.mjs";
const load = name => JSON.parse(readFileSync(new URL("../docs/intelligence/"+name,import.meta.url),"utf8"));
const report=buildProposedCountry101Ledger(
  load("global-pharma-sources-20261117.json"),
  load("country-101-scope-proposal-20261118.json")
);
const option=process.argv.slice(2);
if(option.length!==1 || !["--json","--markdown"].includes(option[0])){
  throw new Error("Usage: node scripts/render-intelligence-country-101-proposed-ledger.mjs --json|--markdown");
}
if(option[0]==="--json"){
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
}else{
  const lines=[
    "# NovaPharm Intelligence: 101-national-country proposed release ledger",
    "",
    "**Planning scope only. No independently verified customer-live national pharmaceutical data.**",
    "",
    "National countries: "+report.distinctNationalCountries+
      " (77 existing source-register countries + 24 geography-only proposals).",
    "Original candidate sources: "+report.existingSourceCandidates+
      ", national source candidates: "+report.nationalSourceCandidates+
      ", approved national sources: "+report.verifiedLicensedNationalSources+
      ", production-live national countries: "+report.verifiedCustomerLiveCountries+".",
    "",
    "| Country | ISO | Region | Scope | Candidate sources | Adapter contracts | Engineering milestone | Verified live | Next evidence gate |",
    "|---|---|---|---|---:|---:|---:|---:|---|"
  ];
  for(const c of report.countryRows){
    lines.push("| "+[
      c.country,c.countryCode,c.region,c.scopeOrigin,c.sourceCandidateCount,
      c.codedAdapterCandidateCount,c.engineeringMilestonePercent+"%",
      c.verifiedProductionCompletionPercent+"%",c.nextAction
    ].map(escapeMarkdownTableCell).join(" | ")+" |");
  }
  lines.push("","EU/EEA and Global remain source groups, never extra national countries.",
    "No source, country, research model, licensed API or native app may be activated by this report.");
  process.stdout.write(lines.join("\n")+"\n");
}
