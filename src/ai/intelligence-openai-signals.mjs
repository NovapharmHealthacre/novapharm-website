import { signalsV3PreviewAllowlist, signalsV3TableByName } from "./openai-signals-v3-table-registry.mjs";

// OpenAI Signals research intake: local admission only. NEVER fetches, runs models or approves jobs.
export const SIGNALS_DATASET = Object.freeze({
  id: "openai-signals-v3",
  datasetUrl: "https://cdn.openai.com/signals/data-download-csv.zip",
  dictionaryUrl: "https://cdn.openai.com/signals/data-dictionary.pdf",
  methodologyUrl: "https://openai.com/signals/data-download/",
  licensedAs: "CC-BY-4.0",
  attribution: "OpenAI Signals v3.0, OpenAI Economic Research (2026)",
  releasedThrough: "2026-09",
  scope: "aggregate-consumer-message-statistics-only"
});
const SOURCE_IDS = Object.freeze([
  "science-frontier", "freelance-frontier", "workers-frontier", "novices-rct",
  "enterprise-usage", "task-crossover", "eu-jobs", "adoption-global",
  "codex-agentic", "adoption-q1", "signals-v3", "enterprise-signals",
  "whisper-2022", "large-network-training-2022", "triton-2021"
]);
const SOURCE_SET = new Set(SOURCE_IDS);
const MODES = new Set(["evidence-reading", "aggregate-data-review", "voice-design-review", "compute-design-review"]);
const KEYS = new Set(["sourceId", "mode", "purpose", "dataClass", "containsPersonalData", "requestsExternalTransfer", "automatedDecision", "estimatedIncrementalCostGbp"]);
const TOPICS = new Set(["Multimedia", "Other/Unknown", "Practical Guidance", "Seeking information", "Self-expression", "Technical help", "Writing"]);
const INTENTS = new Set(["asking", "doing", "expressing"]);
// Only three publisher tables pass the first-stage local preview gate.
// The remaining 21 are discoverable metadata, NOT authorised imports.
const FIELDS = Object.freeze(Object.fromEntries(signalsV3PreviewAllowlist.map(filename => {
  const meta = signalsV3TableByName(filename);
  return [filename, [...meta.dimensions, meta.metric]];
})));
const MONTH = /^20[0-9]{2}-(0[1-9]|1[0-2])-01$/;
const QUARTER = /^20[0-9]{2}-(01|04|07|10)-01$/;
const COUNTRY = /^[A-Z]{2}$/;
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
function answer(reasons) {
  const unique = [...new Set(reasons)];
  return Object.freeze({ status: unique.length ? "blocked" : "review-only", executionEnabled: false, reasons: Object.freeze(unique) });
}
export function assessSignalsResearchProposal(value) {
  if (!plain(value)) return answer(["invalid-proposal"]);
  const reasons = [];
  if (Object.keys(value).some(key => !KEYS.has(key))) reasons.push("unexpected-fields");
  if (!SOURCE_SET.has(value.sourceId)) reasons.push("unregistered-source");
  if (!MODES.has(value.mode)) reasons.push("invalid-mode");
  if (value.purpose !== "non-clinical-evidence-research") reasons.push("unapproved-purpose");
  if (value.dataClass !== "public-aggregated") reasons.push("data-class-not-approved");
  if (value.containsPersonalData !== false) reasons.push("personal-data-not-admitted");
  if (value.requestsExternalTransfer !== false) reasons.push("external-transfer-not-approved");
  if (value.automatedDecision !== false) reasons.push("autonomous-decision-prohibited");
  if (value.estimatedIncrementalCostGbp !== 0) reasons.push("zero-budget-only");
  if (value.mode === "aggregate-data-review" && value.sourceId !== "signals-v3") reasons.push("aggregate-source-mismatch");
  return answer(reasons);
}
// Only validates public, *already aggregated* CSV rows. No user prompts or raw transcripts.
export function assessSignalsAggregateRow(table, row) {
  const fields = FIELDS[table];
  if (!fields) return answer(["unapproved-table"]);
  if (!plain(row)) return answer(["invalid-record"]);
  const reasons = [];
  if (Object.keys(row).some(key => !fields.includes(key)) || fields.some(key => !Object.hasOwn(row, key))) reasons.push("unexpected-fields");
  if ("month" in row && (typeof row.month !== "string" || !MONTH.test(row.month))) reasons.push("invalid-month");
  if ("quarter" in row && (typeof row.quarter !== "string" || !QUARTER.test(row.quarter))) reasons.push("invalid-quarter");
  if ("country" in row && (typeof row.country !== "string" || !COUNTRY.test(row.country))) reasons.push("invalid-country");
  if ("topic" in row && !TOPICS.has(row.topic)) reasons.push("invalid-topic");
  if ("work_related" in row && ![0, 1, "0", "1"].includes(row.work_related)) reasons.push("invalid-work-classification");
  if ("ask_do_express" in row && !INTENTS.has(row.ask_do_express)) reasons.push("invalid-intent");
  if ("share_of_messages" in row && (typeof row.share_of_messages !== "number" || !Number.isFinite(row.share_of_messages) ||
    row.share_of_messages < 0 || row.share_of_messages > 1)) reasons.push("invalid-share");
  if ("rank" in row && (!Number.isSafeInteger(row.rank) || row.rank < 1)) reasons.push("invalid-rank");
  return answer(reasons);
}
export const signalsApprovedTables = Object.freeze(Object.keys(FIELDS));
export const signalsRegisteredSources = SOURCE_IDS;
