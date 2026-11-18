// Local, non-executing OpenAI Signals CSV preview. No network, DB, user log or file write.
import { assessSignalsAggregateRow, signalsApprovedTables } from "./intelligence-openai-signals.mjs";

const TABLE_COLUMNS = Object.freeze({
  "share_of_messages_by_topic_country_month.csv": ["month", "country", "topic", "share_of_messages"],
  "share_of_messages_by_country_quarter_rank.csv": ["quarter", "country", "rank"],
  "share_of_messages_by_work_related_ask_do_express_month.csv": ["month", "work_related", "ask_do_express", "share_of_messages"]
});
const MAX_CSV_BYTES = 8 * 1024 * 1024;
const MAX_RECORDS = 100000;
const MAX_FIELD_BYTES = 256;
const deny = reason => Object.freeze({
  status: "blocked", reasons: Object.freeze([reason]),
  executionEnabled: false, stored: false, recordCount: 0
});
function *rows(text) {
  let field = "", fields = [], quoted = false, quoteClosed = false;
  const append = ch => {
    field += ch;
    if (field.length > MAX_FIELD_BYTES) throw Error("field-too-long");
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { append('"'); i++; }
      else if (ch === '"') { quoted = false; quoteClosed = true; }
      else append(ch);
    } else if (ch === '"' && field.length === 0 && !quoteClosed) {
      quoted = true;
    } else if (ch === ",") {
      fields.push(field); field = ""; quoteClosed = false;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      fields.push(field); field = ""; quoteClosed = false;
      if (fields.some(Boolean)) yield fields;
      fields = [];
    } else if (quoteClosed || ch === '"') {
      throw Error("invalid-csv-quoting");
    } else {
      append(ch);
    }
  }
  if (quoted) throw Error("unclosed-quote");
  if (field || fields.length) { fields.push(field); if (fields.some(Boolean)) yield fields; }
}
export function reviewSignalsCsvText(table, text) {
  if (!signalsApprovedTables.includes(table)) return deny("unapproved-table");
  if (typeof text !== "string") return deny("invalid-csv");
  if (text.length > MAX_CSV_BYTES || text.includes("\0")) return deny("unsafe-csv");
  const expected = TABLE_COLUMNS[table];
  let recordCount = 0;
  try {
    let sawHeader = false;
    for (const row of rows(text.replace(/^\uFEFF/, ""))) {
      if (!sawHeader) {
        sawHeader = true;
        if (row.length !== expected.length || row.some((field, i) => field !== expected[i])) return deny("header-mismatch");
        continue;
      }
      recordCount++;
      if (recordCount > MAX_RECORDS) return deny("too-many-records");
      if (row.length !== expected.length) return deny("column-mismatch");
      const record = Object.fromEntries(row.map((value, i) => [expected[i], value]));
      for (const field of ["rank", "share_of_messages"]) {
        if (field in record) {
          if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(record[field])) return deny("non-numeric-metric");
          record[field] = Number(record[field]);
        }
      }
      const result = assessSignalsAggregateRow(table, record);
      if (result.status !== "review-only") return deny("unapproved-record");
    }
    if (!sawHeader || recordCount === 0) return deny("empty-csv");
  } catch (error) {
    return deny(error instanceof Error && ["field-too-long", "invalid-csv-quoting", "unclosed-quote"].includes(error.message) ? error.message : "unreadable-csv");
  }
  return Object.freeze({
    status: "review-only", reasons: Object.freeze([]),
    executionEnabled: false, stored: false,
    imported: false, requiresHumanApproval: true,
    table, recordCount, source: "OpenAI Signals v3.0 — CC BY 4.0"
  });
}
