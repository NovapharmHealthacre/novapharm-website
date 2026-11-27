import assert from "node:assert/strict";
import test from "node:test";
import { runViewportBatches, viewportConcurrency } from "./viewport-batches";

test("CI uses two workers, local uses one, and invalid settings fail closed", () => {
  assert.equal(viewportConcurrency({}), 1);
  assert.equal(viewportConcurrency({ GITHUB_ACTIONS: "true" }), 2);
  assert.equal(viewportConcurrency({ GITHUB_ACTIONS: "true", PORTAL_BROWSER_VIEWPORT_CONCURRENCY: "1" }), 1);
  assert.throws(() => viewportConcurrency({ PORTAL_BROWSER_VIEWPORT_CONCURRENCY: "3" }), /must be 1 or 2/);
});

test("the complete ordered matrix is executed once, with bounded concurrency and exclusive evidence viewports", async () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const visited: number[] = [];
  let active = 0;
  let peak = 0;
  const serial = (value: number) => value === 2 || value === 8;
  await runViewportBatches(items, 2, serial, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    visited.push(value);
    if (serial(value)) assert.equal(active, 1);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active -= 1;
  });
  assert.deepEqual(visited, items);
  assert.equal(peak, 2);
  assert.equal(active, 0);
});

test("serial mode preserves original ordering and an empty matrix does nothing", async () => {
  const seen: number[] = [];
  await runViewportBatches([1, 2, 3], 1, () => false, async (value) => {
    seen.push(value);
  });
  await runViewportBatches<number>([], 2, () => false, async (value) => {
    seen.push(value);
  });
  assert.deepEqual(seen, [1, 2, 3]);
});

test("a failed viewport drains its sibling, propagates failure and does not launch later work", async () => {
  const completed: number[] = [];
  await assert.rejects(runViewportBatches([1, 2, 3], 2, () => false, async (value) => {
    if (value === 1) throw new Error("synthetic failure");
    await new Promise<void>((resolve) => setImmediate(resolve));
    completed.push(value);
  }), /Portal viewport acceptance failed/);
  assert.deepEqual(completed, [2]);
});
