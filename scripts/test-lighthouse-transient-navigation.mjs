import assert from "node:assert/strict";
import test from "node:test";
import { runLighthouseWithNavigationRetry } from "./lighthouse-transient-navigation.mjs";

const traceFailure = () => ({
  lhr: { runtimeError: { code: "NO_NAVSTART", message: "Navigation trace missing" } },
});
const success = () => ({ lhr: { categories: { performance: { score: 1 } } } });

test("a transient navigation trace failure gets exactly one retry, then returns the real audit", async () => {
  let attempts = 0;
  const result = await runLighthouseWithNavigationRetry(async () => {
    attempts += 1;
    return attempts === 1 ? traceFailure() : success();
  }, "Customer dashboard (mobile)");
  assert.equal(attempts, 2);
  assert.deepEqual(result, success());
});

test("persistent missing navigation trace fails, never bypassing Lighthouse", async () => {
  let attempts = 0;
  await assert.rejects(
    runLighthouseWithNavigationRetry(async () => {
      attempts += 1;
      return traceFailure();
    }, "Customer dashboard (mobile)"),
    /Navigation trace missing/u,
  );
  assert.equal(attempts, 2);
});

test("performance, accessibility and best-practices runtime errors fail without retry", async () => {
  for (const code of ["PAGE_HUNG", "ERRORED_DOCUMENT_REQUEST", "PROTOCOL_TIMEOUT"]) {
    let attempts = 0;
    await assert.rejects(
      runLighthouseWithNavigationRetry(async () => {
        attempts += 1;
        return { lhr: { runtimeError: { code, message: "Real browser failure" } } };
      }, "Portal test"),
      /Real browser failure/u,
    );
    assert.equal(attempts, 1);
  }
});

test("invalid arguments and absent Lighthouse results remain explicit failures", async () => {
  await assert.rejects(runLighthouseWithNavigationRetry(null, "Portal"), TypeError);
  await assert.rejects(runLighthouseWithNavigationRetry(async () => null, "Portal"), /no result/u);
});

test("successful Lighthouse audit receives no retry and preserves category scores", async () => {
  let attempts = 0;
  const response = await runLighthouseWithNavigationRetry(async () => {
    attempts += 1;
    return { lhr: { categories: {
      performance: { score: 0.96 },
      accessibility: { score: 1 },
      "best-practices": { score: 1 },
    } } };
  }, "Portal sign-in");
  assert.equal(attempts, 1);
  assert.equal(response.lhr.categories.performance.score, 0.96);
});
