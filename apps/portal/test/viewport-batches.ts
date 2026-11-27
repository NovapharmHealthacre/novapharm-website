import assert from "node:assert/strict";

// Keep the worker cap small: the Playwright container has bounded shared
// memory, and the synthetic API is shared by the isolated browser contexts.
export function viewportConcurrency(env: Readonly<Record<string, string | undefined>>): 1 | 2 {
  const value = env["PORTAL_BROWSER_VIEWPORT_CONCURRENCY"] ?? (env["GITHUB_ACTIONS"] === "true" ? "2" : "1");
  assert.ok(value === "1" || value === "2", "Portal viewport concurrency must be 1 or 2");
  return value === "2" ? 2 : 1;
}

export async function runViewportBatches<T>(
  items: readonly T[],
  concurrency: 1 | 2,
  requiresSerial: (item: T) => boolean,
  run: (item: T) => Promise<void>,
): Promise<void> {
  assert.ok(concurrency === 1 || concurrency === 2, "Unsafe viewport concurrency");
  let batch: T[] = [];
  async function flush(): Promise<void> {
    const active = batch;
    batch = [];
    // Drain all started work before propagating a failure, so callers may
    // close the browser without racing a second context or hiding errors.
    const results = await Promise.allSettled(active.map(async (item) => run(item)));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) throw new AggregateError(failures.map((result) => result.reason), "Portal viewport acceptance failed");
  }

  for (const item of items) {
    if (requiresSerial(item)) {
      await flush();
      await run(item);
    } else {
      batch.push(item);
      if (batch.length === concurrency) await flush();
    }
  }
  await flush();
}
