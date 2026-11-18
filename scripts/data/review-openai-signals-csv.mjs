#!/usr/bin/env node
// Manual local file review only; no network, file writes, warehouse import or stdout data rows.
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { reviewSignalsCsvText } from "../../src/ai/intelligence-openai-signals-csv.mjs";

const [table, filename, expectedDigest] = process.argv.slice(2);
if (!table || !filename || basename(filename) !== table) {
  console.error("Usage: node scripts/data/review-openai-signals-csv.mjs <approved-table.csv> <local-path-with-matching-file-name> [expected-sha256-hex]");
  process.exit(2);
}
try {
  const stat = statSync(filename);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw Error("unapproved-local-file");
  const bytes = readFileSync(filename);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (expectedDigest && (!/^[a-f0-9]{64}$/.test(expectedDigest) || expectedDigest !== sha256)) throw Error("checksum-mismatch");
  const value = reviewSignalsCsvText(table, bytes.toString("utf8"));
  // No data values or user prompts can be printed. A positive preview is NOT an import permit.
  console.log(JSON.stringify({
    status: value.status, table, recordCount: value.recordCount ?? 0, sha256,
    source: "OpenAI Signals v3.0; CC BY 4.0; openai.com/signals/data-download/",
    provenanceIndependentlyVerified: false,
    persisted: false, productionApproved: false, reasons: value.reasons
  }));
  if (value.status !== "review-only") process.exitCode = 2;
} catch {
  console.log(JSON.stringify({status:"blocked",reasons:["unreviewable-file"],persisted:false,productionApproved:false}));
  process.exitCode = 2;
}
