import assert from "node:assert/strict";
import test from "node:test";
import { reviewSignalsCsvText } from "../src/ai/intelligence-openai-signals-csv.mjs";

test("approved Signals v3 aggregate CSV has an inspectable, never imported preview", () => {
  const csv = "month,country,topic,share_of_messages\n2026-09-01,GB,Technical help,0.42\n2026-09-01,IN,Writing,0.3\n";
  const a = reviewSignalsCsvText("share_of_messages_by_topic_country_month.csv", csv);
  assert.equal(a.status, "review-only");
  assert.equal(a.recordCount, 2);
  assert.equal(a.stored, false);
  assert.equal(a.imported, false);
  assert.equal(a.executionEnabled, false);
  assert.equal(a.requiresHumanApproval, true);
  const rank = reviewSignalsCsvText("share_of_messages_by_country_quarter_rank.csv", "quarter,country,rank\r\n2026-07-01,GB,4\r\n");
  assert.equal(rank.status, "review-only");
  const intent = reviewSignalsCsvText("share_of_messages_by_work_related_ask_do_express_month.csv",
    "month,work_related,ask_do_express,share_of_messages\n2026-09-01,1,doing,0.333\n");
  assert.equal(intent.status, "review-only");
});
test("no unsupported headers, sensitive columns, formulae, invalid metrics or raw data disclosure", () => {
  for (const csv of [
    "month,country,topic,share_of_messages,user_id\n2026-09-01,GB,Writing,0.1,PRIVATE",
    "month,country,topic,share_of_messages\n2026-09-01,GB,Writing,1.5",
    "month,country,topic,share_of_messages\n2026-09-01,GB,Writing,=1+1",
    "month,country,topic,share_of_messages\n2026-09-01,GB,=HYPERLINK,0.2",
    "month,country,topic,share_of_messages\n2026-09-01,GB,Writing,SECRET",
    "month,country,topic,share_of_messages\n2026-09-01,GB,Writing,0.2,extra",
    "month,country,topic,share_of_messages\n",
    "month,country,topic,share_of_messages\n2026-09-01,GB,\"unterminated,0.1"
  ]) {
    const value = reviewSignalsCsvText("share_of_messages_by_topic_country_month.csv", csv);
    assert.equal(value.status, "blocked");
    assert.equal(value.stored, false);
    assert.equal(value.executionEnabled, false);
    assert.ok(!JSON.stringify(value).includes("PRIVATE"));
    assert.ok(!JSON.stringify(value).includes("SECRET"));
  }
  assert.equal(reviewSignalsCsvText("raw_user_messages.csv", "user_id,prompt\n1,PRIVATE").status, "blocked");
});

test("local preview rejects duplicate publisher time/grouping grain and future-dated records", () => {
  const csv = "month,country,topic,share_of_messages\n2026-09-01,GB,Writing,0.4\n";
  const repeated = csv + "2026-09-01,GB,Writing,0.5\n";
  const duplicate = reviewSignalsCsvText("share_of_messages_by_topic_country_month.csv",repeated);
  assert.equal(duplicate.status,"blocked");
  assert.ok(duplicate.reasons.includes("duplicate-grain"));
  assert.equal(duplicate.executionEnabled,false);
  assert.equal(duplicate.stored,false);
  const distinct = csv + "2026-09-01,IN,Writing,0.5\n";
  assert.equal(reviewSignalsCsvText("share_of_messages_by_topic_country_month.csv",distinct).status,"review-only");
  const outOfWindow = "month,country,topic,share_of_messages\n2099-01-01,GB,Writing,0.5\n";
  assert.equal(reviewSignalsCsvText("share_of_messages_by_topic_country_month.csv",outOfWindow).status,"blocked");
});
