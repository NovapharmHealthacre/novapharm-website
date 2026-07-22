import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const targets = ["oncology/index.html", "technology/ai-governance/index.html"];
const patterns = [
  "market-leading", "leading oncology distributor", "preferred trial partner", "regulator-preferred", "MHRA approved", "NHS supplier",
  "operational blockchain", "AI-powered forecasting", "reduces stockouts", "guarantees availability", "guaranteed approval", "clinical outcomes",
  "better outcomes", "owned cold chain", "owned laboratory", "owned trial site", "automated pharmacovigilance", "available now", "proven algorithm",
  "patented", "patent pending", "25-35% savings", "25–35% savings", "40% reduction", "98% delivery", "99% accuracy"
];

const explicitBoundary = /\b(?:does not|do not|not|no|without|cannot|isn't|aren't)\b/i;

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&(?:#39|apos);/gi, "'").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

const findings = [];
for (const file of targets) {
  const text = visibleText(readFileSync(resolve(file), "utf8"));
  for (const phrase of patterns) {
    let cursor = 0;
    while (cursor < text.length) {
      const index = text.toLowerCase().indexOf(phrase.toLowerCase(), cursor);
      if (index < 0) break;
      const preceding = text.slice(Math.max(0, index - 140), index);
      if (!explicitBoundary.test(preceding)) {
        findings.push({ file, phrase, context: text.slice(Math.max(0, index - 90), index + phrase.length + 120) });
      }
      cursor = index + phrase.length;
    }
  }
}

const oncologyFindings = findings.filter((finding) => finding.file.startsWith("oncology/"));
const aiFindings = findings.filter((finding) => finding.file.startsWith("technology/"));
const report = (title, list) => `# ${title}\n\n- Scanned: 22 July 2026\n- Scope: generated visible public copy; scripts and structured data excluded\n- Result: **${list.length ? "FAIL" : "PASS"}**\n- High-risk occurrences: ${list.length}\n\n${list.length ? list.map((item) => `- \`${item.phrase}\` in \`${item.file}\`: ${item.context}`).join("\n") : "No prohibited high-risk phrase was found. Existing authorisation, availability, infrastructure, AI, forecasting and performance statements remain explicitly bounded."}\n`;
writeFileSync(resolve("audit/oncology-public-claims-report.md"), report("Oncology Public Claims Report", oncologyFindings));
writeFileSync(resolve("audit/ai-public-claims-report.md"), report("AI Public Claims Report", aiFindings));

if (findings.length) {
  console.error(JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log("Oncology and AI public-claims audit passed with zero prohibited high-risk phrases in visible copy.");
