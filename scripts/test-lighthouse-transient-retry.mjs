import assert from "node:assert/strict";
import test from "node:test";
import { withTransientLighthouseNavRetry } from "./lib/lighthouse-transient-retry.mjs";

test("successful Lighthouse audit is executed once without a retry", async () => {
  let calls = 0, hooks = 0;
  const result = await withTransientLighthouseNavRetry(async () => { calls++; return { performance: 99 }; },
    { onRetry: async () => { hooks++; } });
  assert.equal(calls, 1);
  assert.equal(hooks, 0);
  assert.deepEqual(result, { performance: 99 });
});

test("only NO_NAVSTART retries once; audit results remain unmodified", async () => {
  let calls = 0, hooks = 0;
  const report = { performance: 95, accessibility: 100, bestPractices: 100 };
  const result = await withTransientLighthouseNavRetry(async () => {
    calls++;
    if (calls === 1) throw new Error("Something went wrong with recording the trace (NO_NAVSTART)");
    return report;
  }, { onRetry: async () => { hooks++; } });
  assert.equal(calls, 2);
  assert.equal(hooks, 1);
  assert.equal(result, report);
});

test("ordinary navigation, network, security and score failures are not retried", async () => {
  for (const message of ["timeout while loading page", "accessibility score 99 below 100",
    "best practices 97 below 100", "security violation"]) {
    let calls = 0;
    await assert.rejects(() => withTransientLighthouseNavRetry(async () => {
      calls++; throw new Error(message);
    }), new RegExp(message.replaceAll(" ", "\\s+")));
    assert.equal(calls, 1, message);
  }
});

test("a repeated NO_NAVSTART failure propagates after exactly two attempts", async () => {
  let calls = 0;
  await assert.rejects(() => withTransientLighthouseNavRetry(async () => {
    calls++; throw new Error("NO_NAVSTART");
  }), /NO_NAVSTART/);
  assert.equal(calls, 2);
});

test("retry hook errors propagate rather than concealing the audit", async () => {
  let calls = 0;
  await assert.rejects(() => withTransientLighthouseNavRetry(async () => {
    calls++; throw new Error("NO_NAVSTART");
  }, { onRetry: async () => { throw new Error("retry worker unavailable"); } }), /retry worker unavailable/);
  assert.equal(calls, 1);
});

test("invalid inputs fail before invoking any audit", async () => {
  await assert.rejects(() => withTransientLighthouseNavRetry(null), /required/);
  await assert.rejects(() => withTransientLighthouseNavRetry(async () => ({}), { onRetry: 5 }), /required/);
});
