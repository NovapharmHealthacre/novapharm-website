import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("docs/data/medicines-intelligence-requirements.json");
const outputPath = resolve("docs/data/medicines-intelligence-requirements.md");
const ledger = JSON.parse(await readFile(sourcePath, "utf8"));

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function links(paths) {
  return paths.map((path) => `\`${path}\``).join("<br>");
}

const statusCounts = Object.fromEntries(
  [...new Set(ledger.requirements.map((record) => record.status))]
    .toSorted()
    .map((status) => [status, ledger.requirements.filter((record) => record.status === status).length]),
);

const blockerCounts = Object.fromEntries(
  [...new Set(ledger.requirements.map((record) => record.blockerType).filter(Boolean))]
    .toSorted()
    .map((type) => [type, ledger.requirements.filter((record) => record.blockerType === type).length]),
);

const lines = [
  "# Medicines Intelligence Continuation Ledger",
  "",
  `Status date: ${ledger.metadata.statusDate}`,
  "",
  `Source sections: \`${ledger.metadata.sourceSectionRange}\` (${ledger.metadata.requirementCount} governed records)`,
  "",
  `Source prompt SHA-256: \`${ledger.metadata.sourceDocumentSha256}\``,
  "",
  `Owner pharmacy workbook SHA-256: \`${ledger.metadata.sourceWorkbookSha256}\``,
  "",
  "> Repository validation, managed deployment and production operation are separate states. This ledger makes no production-completion claim.",
  "",
  "## Status summary",
  "",
  ...Object.entries(statusCounts).map(([status, count]) => `- **${status}:** ${count}`),
  "",
  "## Requirement reconciliation",
  "",
  "| ID | Requirement | Final status | Repository evidence | Remaining action | Blocker |",
  "| --- | --- | --- | --- | --- | --- |",
  ...ledger.requirements.map((record) => `| ${cell(record.id)} | ${cell(record.title)}<br>${cell(record.summary)} | ${cell(record.status)} | ${links(record.evidence)} | ${cell(record.remainingAction)} | ${cell(record.blockerType ?? "None")} |`),
  "",
  "## Lifecycle evidence",
  "",
  "| Stage | Status | Evidence | Truthful state |",
  "| --- | --- | --- | --- |",
  ...ledger.lifecycle.map((entry) => `| ${cell(entry.stage)} | ${cell(entry.status)} | ${links(entry.evidence)} | ${cell(entry.detail)} |`),
  "",
  "## Blocker distribution",
  "",
  ...Object.entries(blockerCounts).map(([type, count]) => `- \`${type}\`: ${count}`),
  "",
  "## Production boundary",
  "",
  "No cost-bearing infrastructure was provisioned. Production identity, private managed storage, national fact backfills, scheduled ingestion, monitoring, accepted forecast runs, approved opportunity weights, campaign authority and exact-environment acceptance remain separate gates.",
  "",
];

await writeFile(outputPath, lines.join("\n"), "utf8");
console.log(`Rendered ${ledger.requirements.length} medicines-intelligence requirements and ${ledger.lifecycle.length} lifecycle stages.`);
