import test from "node:test";
import assert from "node:assert/strict";
import { SIGNALS_DATASET, assessSignalsResearchProposal, assessSignalsAggregateRow, signalsApprovedTables, signalsRegisteredSources } from "../src/ai/intelligence-openai-signals.mjs";
import { signalsV3TableRegistry, signalsV3PreviewAllowlist, signalsV3TableByName } from "../src/ai/openai-signals-v3-table-registry.mjs";

const base = () => ({
  sourceId: "science-frontier", mode: "evidence-reading", purpose: "non-clinical-evidence-research",
  dataClass: "public-aggregated", containsPersonalData: false, requestsExternalTransfer: false,
  automatedDecision: false, estimatedIncrementalCostGbp: 0
});
test("registers all ten economic studies plus three technical sources and research data", () => {
  assert.equal(signalsRegisteredSources.length, 15);
  assert.equal(SIGNALS_DATASET.licensedAs, "CC-BY-4.0");
  assert.ok(SIGNALS_DATASET.datasetUrl.startsWith("https://cdn.openai.com/signals/"));
  assert.equal(signalsApprovedTables.length, 3);
});
test("review-only research never grants model, data or job execution", () => {
  const result = assessSignalsResearchProposal(base());
  assert.equal(result.status, "review-only");
  assert.equal(result.executionEnabled, false);
  assert.ok(Object.isFrozen(result.reasons));
  assert.equal(assessSignalsResearchProposal(null).status, "blocked");
  for(const property of [
    { containsPersonalData: true }, { requestsExternalTransfer: true },
    { automatedDecision: true }, { purpose: "clinical-decision" },
    { dataClass: "raw-patient-notes" }, { estimatedIncrementalCostGbp: 0.01 },
    { sourceId: "fake-source" }, { mode: "run-training" }, { rawAudio: "SECRET" }
  ]) {
    const outcome = assessSignalsResearchProposal({ ...base(), ...property });
    assert.equal(outcome.status, "blocked");
    assert.equal(outcome.executionEnabled, false);
    assert.ok(!JSON.stringify(outcome).includes("SECRET"));
  }
  assert.ok(assessSignalsResearchProposal({...base(), sourceId: "triton-2021", mode: "aggregate-data-review"}).reasons.includes("aggregate-source-mismatch"));
});
test("aggregated consumer records must match official allowed CSV schema", () => {
  const topic = { month: "2026-09-01", country: "GB", topic: "Technical help", share_of_messages: 0.42 };
  assert.equal(assessSignalsAggregateRow("share_of_messages_by_topic_country_month.csv", topic).status, "review-only");
  assert.equal(assessSignalsAggregateRow("share_of_messages_by_country_quarter_rank.csv", { quarter: "2026-07-01", country: "IN", rank: 4 }).status, "review-only");
  assert.equal(assessSignalsAggregateRow("share_of_messages_by_work_related_ask_do_express_month.csv", {month:"2026-09-01",work_related:"1",ask_do_express:"doing",share_of_messages:0.3}).status, "review-only");
  const bad = [
    ["share_of_messages_by_topic_country_month.csv", { ...topic, raw_message: "PRIVATE" }],
    ["share_of_messages_by_topic_country_month.csv", { ...topic, share_of_messages: 1.1 }],
    ["share_of_messages_by_topic_country_month.csv", { ...topic, country: "UK" + "1" }],
    ["share_of_messages_by_topic_country_month.csv", { ...topic, month: "2026-99-01" }],
    ["share_of_messages_by_topic_country_month.csv", { ...topic, share_of_messages: "0.42" }],
    ["share_of_messages_by_topic_country_month.csv", { ...topic, topic: "Medical diagnosis" }],
    ["share_of_messages_by_country_quarter_rank.csv", {quarter:"2026-09-01",country:"GB",rank:0}],
    ["share_of_messages_by_work_related_ask_do_express_month.csv", {month:"2026-09-01",work_related:2,ask_do_express:"doing",share_of_messages:0.3}],
    ["raw_prompts.csv", {user_id:"sensitive"}]
  ];
  for(const [table, row] of bad) {
    const a = assessSignalsAggregateRow(table, row);
    assert.equal(a.status, "blocked");
    assert.equal(a.executionEnabled, false);
    assert.ok(!JSON.stringify(a).includes("PRIVATE"));
    assert.ok(!JSON.stringify(a).includes("sensitive"));
  }
});

test("all 24 publisher-described Signals v3 tables are registered, but only three are reviewable", () => {
  assert.equal(signalsV3TableRegistry.length, 24);
  assert.equal(new Set(signalsV3TableRegistry.map(t => t.name)).size, 24);
  assert.equal(signalsV3PreviewAllowlist.length, 3);
  assert.deepEqual([...signalsApprovedTables].sort(), [...signalsV3PreviewAllowlist].sort());
  assert.equal(signalsV3TableRegistry.filter(t => t.admission === "metadata-only").length, 21);
  assert.equal(signalsV3TableRegistry.filter(t => t.admission === "local-aggregate-preview-only").length, 3);
  assert.ok(signalsV3TableRegistry.every(t => t.name.endsWith(".csv") && t.dimensions.length > 0));
  assert.ok(signalsV3TableRegistry.every(t => Object.isFrozen(t) && Object.isFrozen(t.dimensions)));
  for (const table of signalsV3TableRegistry) {
    assert.equal(signalsV3TableByName(table.name), table);
    if (table.admission === "metadata-only") {
      assert.equal(assessSignalsAggregateRow(table.name, Object.fromEntries(table.dimensions.map(key => [key, "none"]))).status, "blocked");
    }
  }
  assert.equal(signalsV3TableByName("../raw_messages.csv"), null);
});
