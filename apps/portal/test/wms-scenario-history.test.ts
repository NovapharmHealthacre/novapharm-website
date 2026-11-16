import assert from "node:assert/strict";
import test from "node:test";
import { initialWmsScenarioHistory, reduceWmsScenarioHistory } from "../lib/wms-scenario-history";

test("WMS what-if edits can be undone and redone repeatedly", () => {
  const initial = initialWmsScenarioHistory();
  const editedA = reduceWmsScenarioHistory(initial, { type: "edit", key: "orderLines", value: 1300 });
  const editedB = reduceWmsScenarioHistory(editedA, { type: "edit", key: "teamMembers", value: 8 });
  assert.equal(editedB.present.orderLines, 1300);
  assert.equal(editedB.present.teamMembers, 8);
  const undoneB = reduceWmsScenarioHistory(editedB, { type: "undo" });
  assert.equal(undoneB.present.teamMembers, initial.present.teamMembers);
  assert.equal(undoneB.present.orderLines, 1300);
  const undoneA = reduceWmsScenarioHistory(undoneB, { type: "undo" });
  assert.deepEqual(undoneA.present, initial.present);
  const redoneA = reduceWmsScenarioHistory(undoneA, { type: "redo" });
  const redoneB = reduceWmsScenarioHistory(redoneA, { type: "redo" });
  assert.equal(redoneB.present.orderLines, 1300);
  assert.equal(redoneB.present.teamMembers, 8);
  assert.equal(redoneB.future.length, 0);
});

test("reset is reversible, but a new edit clears stale redo", () => {
  const initial = initialWmsScenarioHistory();
  const edited = reduceWmsScenarioHistory(initial, { type: "edit", key: "shiftHours", value: 12 });
  const reset = reduceWmsScenarioHistory(edited, { type: "reset" });
  assert.equal(reset.present.shiftHours, initial.present.shiftHours);
  const undoReset = reduceWmsScenarioHistory(reset, { type: "undo" });
  assert.equal(undoReset.present.shiftHours, 12);
  const newEdit = reduceWmsScenarioHistory(undoReset, { type: "edit", key: "shiftHours", value: 10 });
  assert.equal(newEdit.future.length, 0);
  assert.equal(reduceWmsScenarioHistory(newEdit, { type: "redo" }), newEdit);
  assert.equal(reduceWmsScenarioHistory(initial, { type: "reset" }), initial);
});

test("invalid blank numeric assumptions remain reversible without being converted to real zeros", () => {
  const first = initialWmsScenarioHistory();
  const invalid = reduceWmsScenarioHistory(first, { type: "edit", key: "shiftHours", value: Number.NaN });
  assert.ok(Number.isNaN(invalid.present.shiftHours));
  assert.deepEqual(reduceWmsScenarioHistory(invalid, { type: "undo" }).present, first.present);
});
