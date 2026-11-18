#!/usr/bin/env node
// Manual local file review only; no network, file writes, warehouse import or stdout data rows.
import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import { basename } from "node:path";
import { reviewSignalsCsvText } from "../../src/ai/intelligence-openai-signals-csv.mjs";

const MAX_LOCAL_BYTES = 8 * 1024 * 1024;

// Open once, then inspect and read only that file descriptor. Checking a path
// with statSync followed by readFileSync(path) is susceptible to a TOCTOU swap.
// O_NOFOLLOW prevents symlinks where supported, and O_NONBLOCK avoids hanging
// while opening a non-regular file such as a FIFO.
function readBoundedLocalFile(filename) {
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
  const fd = openSync(filename, flags);
  try {
    const before = fstatSync(fd);
    if (!before.isFile() || before.size < 0 || before.size > MAX_LOCAL_BYTES) {
      throw Error("unapproved-local-file");
    }
    // Read at most MAX_LOCAL_BYTES + 1, including if the file grows after fstat.
    const buffer = Buffer.allocUnsafe(MAX_LOCAL_BYTES + 1);
    let count = 0;
    while (count < buffer.length) {
      const n = readSync(fd, buffer, count, buffer.length - count, null);
      if (n === 0) break;
      count += n;
    }
    if (count > MAX_LOCAL_BYTES) throw Error("unapproved-local-file");
    const after = fstatSync(fd);
    if (!after.isFile() || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw Error("local-file-changed-during-review");
    }
    return buffer.subarray(0, count);
  } finally {
    closeSync(fd);
  }
}

const [table, filename, expectedDigest] = process.argv.slice(2);
if (!table || !filename || basename(filename) !== table) {
  console.error("Usage: node scripts/data/review-openai-signals-csv.mjs <approved-table.csv> <local-path-with-matching-file-name> [expected-sha256-hex]");
  process.exit(2);
}
try {
  const bytes = readBoundedLocalFile(filename);
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
