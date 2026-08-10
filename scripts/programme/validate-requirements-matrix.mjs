import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

await import("./validate-absolute-mandate-register.mjs");
await import("./validate-sop-programme.mjs");

const allowedStatuses = new Set([
  "Complete",
  "Complete at repository level only",
  "Owner-controlled blocker",
  "External verification pending",
  "Incomplete",
  "Not applicable, with rationale",
  "Rejected because of a documented conflict or safety concern",
]);
const matrix = JSON.parse(await readFile(resolve("docs/programme/requirements/requirements-matrix.json"), "utf8"));
assert.equal(matrix.records.length, 5900, "The matrix must retain all 5,900 source records");
assert.equal(matrix.metadata.requirement_record_count, 5900);
assert.equal(matrix.metadata.production_complete, false, "Repository reconciliation must not claim production completion");

const ids = new Set();
let staleStatuses = 0;
let ambiguousStatuses = 0;
for (const record of matrix.records) {
  assert.ok(!ids.has(record.id), `Duplicate requirement ID: ${record.id}`);
  ids.add(record.id);
  assert.ok(allowedStatuses.has(record.final_completion_status), `${record.id}: invalid final status`);
  assert.equal(record.current_status, record.final_completion_status, `${record.id}: current/final status mismatch`);
  if (/(pending-implementation|pending without owner|open-governance|partial|local-only|baseline)/iu.test(record.final_completion_status)) staleStatuses += 1;
  assert.doesNotMatch(record.final_completion_status, /pending-implementation|pending without owner|open-governance|partial|local-only|baseline/iu);
  if (record.current_status !== record.final_completion_status || !allowedStatuses.has(record.current_status)) ambiguousStatuses += 1;
  assert.ok(record.evidence && typeof record.evidence === "object", `${record.id}: evidence object missing`);
  for (const field of ["code_locations", "tests", "ci_result", "documentation", "deployment_evidence", "production_evidence"]) {
    assert.ok(Array.isArray(record.evidence[field]) && record.evidence[field].length > 0, `${record.id}: ${field} missing`);
  }
  assert.ok(record.evidence.rationale?.trim(), `${record.id}: rationale missing`);
  assert.ok(record.required_action?.trim(), `${record.id}: required action missing`);
  if (["Owner-controlled blocker", "External verification pending", "Incomplete"].includes(record.final_completion_status)) {
    assert.match(record.required_action, new RegExp(record.requirement.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").slice(0, 80), "iu"), `${record.id}: gated action does not identify the source requirement`);
  }
  if (record.final_completion_status === "Not applicable, with rationale") {
    assert.match(record.evidence.rationale, /(structural|response shape|heading)/iu, `${record.id}: not-applicable rationale is not specific`);
  }
}
assert.equal(staleStatuses, 0, "Stale matrix statuses remain");
assert.equal(ambiguousStatuses, 0, "Ambiguous matrix statuses remain");

const byId = new Map(matrix.records.map((record) => [record.id, record]));
for (const id of ["NDE-0539", "NDE-1762", "NDE-1768", "NDE-1769", "NDE-1789", "NDE-1808", "NDE-0935", "NDE-1042"]) {
  assert.equal(byId.get(id)?.final_completion_status, "Complete at repository level only", `${id}: implemented increment remains stale`);
}
assert.equal(byId.get("NDE-0578")?.final_completion_status, "Rejected because of a documented conflict or safety concern");

const localEvidence = new Set();
for (const record of matrix.records) {
  for (const field of ["code_locations", "tests", "documentation"]) {
    for (const item of record.evidence[field]) {
      if (!item.startsWith("http") && !item.includes("Not applicable") && !item.includes("None")) localEvidence.add(item);
    }
  }
}
for (const path of localEvidence) await access(resolve(path));

const csv = await readFile(resolve("docs/programme/requirements/requirements-matrix.csv"), "utf8");
assert.equal(csv.trimEnd().split("\n").length, 5901, "CSV must contain one header and 5,900 records");
const markdown = await readFile(resolve("docs/programme/requirements/requirements-matrix.md"), "utf8");
assert.match(markdown, /fully reconciled at repository level/iu);
for (const status of allowedStatuses) assert.ok(markdown.includes(status), `Markdown omits status: ${status}`);

console.log(JSON.stringify({
  records: matrix.records.length,
  statuses: matrix.metadata.status_counts,
  evidencePaths: localEvidence.size,
  staleStatuses,
  ambiguousStatuses,
}, null, 2));
