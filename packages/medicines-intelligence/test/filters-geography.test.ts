import assert from "node:assert/strict";
import test from "node:test";
import { catchmentDistance, distanceKm, filterCount, normaliseMedicineFilters, normaliseMedicineSearchText, normalisePostcode, postcodeParts, stableFilterKey, withinRadius } from "../src/index.ts";

test("medicine filters preserve the required combined filter state", () => {
  const filters = normaliseMedicineFilters({
    query: "  Atorvastatin  ", metric: "items_per_1000", startMonth: "2025-01", endMonth: "2026-06", nation: "England", region: "North West", icb: "QYG", practiceCode: "P12345", postcode: "M1 1AE", radiusKm: "5",
    medicine: { BNF_CHEMICAL_SUBSTANCE_CODE: "0212000B0", SNOMED_CODE: "123456789012345678" },
  });
  assert.equal(filters.query, "Atorvastatin");
  assert.equal(filters.postcode, "M1 1AE");
  assert.equal(filters.radiusKm, 5);
  assert.equal(filters.medicine["SNOMED_CODE"], "123456789012345678");
  assert.ok(filterCount(filters) >= 8);
  assert.equal(stableFilterKey(filters), stableFilterKey(filters));
});

test("medicine filter validation rejects reversed periods and unsupported fields", () => {
  assert.throws(() => normaliseMedicineFilters({ startMonth: "2026-06", endMonth: "2025-01" }));
  assert.throws(() => normaliseMedicineFilters({ medicine: { secret_internal_field: "x" } }));
  assert.throws(() => normaliseMedicineFilters({ radiusKm: 2 }));
});

test("medicine text normalization supports names, brands and identifier matching", () => {
  assert.equal(normaliseMedicineSearchText("  Mounjaro® 2.5 mg "), "mounjaro 2 5 mg");
  assert.equal(normaliseMedicineSearchText("0212000B0"), "0212000b0");
});

test("postcodes retain canonical UK formatting and analytical parts", () => {
  assert.equal(normalisePostcode("sw1a2aa"), "SW1A 2AA");
  assert.deepEqual(postcodeParts("SW1A 2AA"), { area: "SW", district: "SW1A", sector: "SW1A 2", unit: "SW1A 2AA" });
  assert.throws(() => normalisePostcode("not a postcode"));
});

test("distance and catchment calculations use great-circle geometry", () => {
  const origin = { latitude: 51.5074, longitude: -0.1278 };
  const nearby = { latitude: 51.515, longitude: -0.13 };
  const distance = distanceKm(origin, nearby);
  assert.ok(distance > 0.8 && distance < 0.9);
  assert.equal(catchmentDistance(origin, nearby).within1Km, true);
  const matches = withinRadius(origin, [{ id: "near", ...nearby }, { id: "far", latitude: 53.4808, longitude: -2.2426 }], 10);
  assert.deepEqual(matches.map((entry) => entry.id), ["near"]);
});
