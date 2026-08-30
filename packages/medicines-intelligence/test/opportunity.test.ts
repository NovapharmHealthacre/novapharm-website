import assert from "node:assert/strict";
import test from "node:test";
import { scoreOpportunity } from "../src/index.ts";

const components = [
  { key: "local_demand", label: "Local demand", value: 0.9, source: "EPD", period: "2026-06" },
  { key: "forecast_growth", label: "Forecast growth", value: 0.7, source: "novapharm-baseline-forecast-v1", period: "2026-06" },
  { key: "distance", label: "Distance", value: 0.2, source: "ONSPD", period: "2026-05" },
] as const;
const weights = [
  { key: "local_demand", weight: 0.5, direction: "positive" },
  { key: "forecast_growth", weight: 0.3, direction: "positive" },
  { key: "distance", weight: 0.2, direction: "negative" },
] as const;

test("opportunity scoring exposes every governed contribution", () => {
  const result = scoreOpportunity(components, weights, { modelVersion: "opportunity-v1", productCommerciallyAuthorised: true, productAvailable: true, marketingEligible: true, requiredComponents: ["local_demand"] });
  assert.equal(result.eligible, true);
  assert.ok((result.score ?? 0) > 0 && (result.score ?? 0) <= 100);
  assert.equal(result.contributions.length, 3);
  assert.match(result.caveats[0] ?? "", /not proof/iu);
});

test("commercial and marketing gates fail closed", () => {
  const result = scoreOpportunity(components, weights, { modelVersion: "opportunity-v1", productCommerciallyAuthorised: false, productAvailable: true, marketingEligible: false });
  assert.equal(result.eligible, false);
  assert.equal(result.score, null);
  assert.equal(result.blockers.length, 2);
});

test("missing required evidence prevents an opportunity score", () => {
  const missing = components.map((component) => component.key === "forecast_growth" ? { ...component, value: null } : component);
  const result = scoreOpportunity(missing, weights, { modelVersion: "opportunity-v1", productCommerciallyAuthorised: true, productAvailable: true, marketingEligible: true, requiredComponents: ["forecast_growth"] });
  assert.equal(result.score, null);
  assert.match(result.blockers[0] ?? "", /forecast_growth/iu);
});
