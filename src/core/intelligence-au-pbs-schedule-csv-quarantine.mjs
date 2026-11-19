/**
 * AU PBS public schedules: offline CSV preview for the documented Schedule
 * columns. Official publisher supports CSV; exact live response still needs
 * independent sample verification and rights review before any ingestion.
 * No network, production data admission, or commercial publication capability.
 */
import { evaluatePbsScheduleJson } from "./intelligence-au-pbs-schedule-quarantine.mjs";

const MAX_BYTES = 512 * 1024;
const MAX_ROWS = 1000;
const MAX_COLUMNS = 24;
const MAX_CELL_CHARS = 2048;
const REQUIRED = Object.freeze([
  "schedule_code", "effective_date", "publication_status", "revision_number"
]);
function fail(reason) {
  throw new Error("PBS schedule CSV quarantine rejected: " + reason);
}
function textBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 ||
      bytes.byteLength > MAX_BYTES) fail("invalid source bytes");
  let value;
  try { value = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { fail("invalid UTF-8"); }
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
function parseCsv(text) {
  const rows = [];
  const row = [];
  let value = "", quoted = false, afterQuote = false, first = true;
  const cell = () => {
    if (value.length > MAX_CELL_CHARS) fail("oversize field");
    row.push(value);
    if (row.length > MAX_COLUMNS) fail("too many columns");
    value = ""; first = true; afterQuote = false;
  };
  const finish = () => {
    if (rows.length > MAX_ROWS) fail("too many source rows");
    rows.push(row.splice(0));
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i+1] === '"') { value += '"'; i++; }
        else { quoted = false; afterQuote = true; }
      } else value += c;
    } else if (c === ",") {
      cell();
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i+1] === "\n") i++;
      cell(); finish();
    } else if (c === '"' && first) {
      quoted = true; first = false;
    } else {
      if (afterQuote || c === '"') fail("invalid quoting");
      value += c; first = false;
    }
    if (value.length > MAX_CELL_CHARS) fail("oversize field");
  }
  if (quoted) fail("unterminated quoted field");
  if (row.length || value || afterQuote) { cell(); finish(); }
  return rows;
}

/** Bounded non-publishable CSV preview with original schedule identifiers. */
export function evaluatePbsScheduleCsv(bytes) {
  const rows = parseCsv(textBytes(bytes));
  if (rows.length < 2 || rows.length > MAX_ROWS+1) fail("header and data rows required");
  const head = rows.shift();
  if (head.length < REQUIRED.length || new Set(head).size !== head.length ||
      REQUIRED.some(column => !head.includes(column)) ||
      head.some(h => !/^[a-z][a-z0-9_]{0,79}$/.test(h))) {
    fail("missing or duplicated official schedule columns");
  }
  const idx = Object.fromEntries(head.map((key,i) => [key,i]));
  const entries = rows.map((row, i) => {
    if (row.length !== head.length) fail("row width at " + String(i+2));
    const revisionText = row[idx.revision_number];
    if (!/^\d{1,6}$/.test(revisionText)) fail("invalid revision number");
    // Preserve the native fields; never infer medicine listing or stock.
    return {
      schedule_code: row[idx.schedule_code],
      effective_date: row[idx.effective_date],
      publication_status: row[idx.publication_status],
      revision_number: revisionText
    };
  });
  const rendered = new TextEncoder().encode(JSON.stringify({ data: entries }));
  let baseline;
  try { baseline = evaluatePbsScheduleJson(rendered); }
  catch (error) { fail("invalid published schedule: " + error.message); }
  return Object.freeze({
    ...baseline,
    sampleFormat: "text/csv",
    csvHeaderVerifiedAgainstCandidateFields: true,
    actualPublisherCsvSampleVerified: false,
    scheduleRevisionNumbers: Object.freeze(entries.slice(0,5).map(r=>r.revision_number)),
    canPublish: false, productionAccepted: false
  });
}
