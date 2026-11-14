import assert from "node:assert/strict";
import test from "node:test";
import { parseVerifiedTrialView } from "../apps/portal/lib/intelligence-trial-view.ts";
const now = "2026-11-14T10:00:00.000Z";
const valid = {
  status: "trialing",
  trialEndsAt: "2026-12-01T00:00:00.000Z",
  remainingSearches: 14,
  searchLimit: 25,
};
test("validated active trial projects only bounded view data", () => {
  assert.deepEqual(parseVerifiedTrialView(valid, now), valid);
});
test("unapproved, expired and impossible metadata cannot render a trial", () => {
  for (const input of [
    null, "", {},
    {...valid, status: "active"},
    {...valid, trialEndsAt: "2026-11-01T00:00:00.000Z"},
    {...valid, trialEndsAt: "2026-11-31T00:00:00.000Z"},
    {...valid, trialEndsAt: "2026-12-01T24:00:00.000Z"},
    {...valid, searchLimit: 1000},
    {...valid, searchLimit: 0},
    {...valid, remainingSearches: -1},
    {...valid, remainingSearches: 26},
    {...valid, remainingSearches: 1.1},
    {...valid, remainingSearches: "25"},
  ]) assert.equal(parseVerifiedTrialView(input,now), null);
});
test("trial display expires at the exact server-specified time", () => {
  assert.deepEqual(parseVerifiedTrialView(valid,"2026-11-30T23:59:59.000Z"),valid);
  assert.equal(parseVerifiedTrialView(valid,"2026-12-01T00:00:00.000Z"),null);
});
