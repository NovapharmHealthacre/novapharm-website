import assert from "node:assert/strict";
import test from "node:test";
import { reviewSignalsCsvText } from "../src/ai/intelligence-openai-signals-csv.mjs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { constants, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

test("CLI reads a bounded regular file, rejects mismatched digest and never prints data values", () => {
  const dir = mkdtempSync(join(tmpdir(), "signals-cli-"));
  const table = "share_of_messages_by_topic_country_month.csv";
  const path = join(dir, table);
  const cli = fileURLToPath(new URL("./data/review-openai-signals-csv.mjs", import.meta.url));
  const csv = "month,country,topic,share_of_messages\\n2026-09-01,GB,Writing,0.4\\n";
  const run = (digest) => spawnSync(process.execPath, [cli, table, path, ...(digest ? [digest] : [])],
    { encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024 });
  try {
    writeFileSync(path, csv);
    const digest = createHash("sha256").update(csv).digest("hex");
    const good = run(digest);
    assert.equal(good.status, 0, good.stderr);
    const preview = JSON.parse(good.stdout);
    assert.equal(preview.status, "review-only");
    assert.equal(preview.recordCount, 1);
    assert.equal(preview.sha256, digest);
    assert.equal(preview.persisted, false);
    assert.equal(preview.productionApproved, false);
    assert.ok(!good.stdout.includes("Writing"));
    const bad = run("0".repeat(64));
    assert.equal(bad.status, 2);
    assert.equal(JSON.parse(bad.stdout).status, "blocked");
    assert.ok(!bad.stdout.includes("Writing"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI rejects symlinks, directories, and oversized local inputs without leaking rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "signals-filetypes-"));
  const table = "share_of_messages_by_topic_country_month.csv";
  const path = join(dir, table);
  const cli = fileURLToPath(new URL("./data/review-openai-signals-csv.mjs", import.meta.url));
  const run = () => spawnSync(process.execPath, [cli, table, path],
    { encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024 });
  const blocked = () => {
    const response = run();
    assert.equal(response.status, 2, response.stderr);
    assert.equal(JSON.parse(response.stdout).status, "blocked");
    assert.ok(!response.stdout.includes("PRIVATE"));
  };
  try {
    mkdirSync(path);
    blocked();
    rmSync(path, { recursive: true, force: true });
    writeFileSync(path, "PRIVATE");
    truncateSync(path, 8 * 1024 * 1024 + 1);
    blocked();
    if (constants.O_NOFOLLOW) {
      renameSync(path, join(dir, "source.csv"));
      symlinkSync(join(dir, "source.csv"), path);
      blocked();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
