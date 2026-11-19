import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { preflightImdfVenue } from "./venue-preflight.mjs";

const id = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const rectangle = [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]];
const feature = (n, kind, geometry, extra = {}) => ({
  type: "Feature", id: id(n), geometry,
  properties: { feature_type: kind, ...extra },
});
const polygon = { type: "Polygon", coordinates: rectangle };
const line = { type: "LineString", coordinates: [[0, 0.005], [0.01, 0.005]] };

function makeFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "nova-imdf-synthetic-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const write = (file, contents) => writeFileSync(join(dir, file), JSON.stringify(contents));
  write("manifest.json", { version: "1.0.0", language: "en", created: "2026-11-19T00:00:00Z" });
  write("nova-venue-rights.json", {
    owner_name: "SYNTHETIC TEST DATA — NOT A REAL VENUE",
    approved_by: "test-fixture-only",
    rights_reference: "never-publish-synthetic-test",
    approved_at: "2026-11-19T00:00:00Z",
  });
  const files = {
    venue: feature(1, "venue", polygon),
    footprint: feature(2, "footprint", polygon, { building_ids: [id(3)] }),
    building: feature(3, "building", null),
    level: feature(4, "level", polygon, { ordinal: 0 }),
    unit: feature(5, "unit", polygon, { level_id: id(4) }),
    opening: feature(6, "opening", line, { level_id: id(4) }),
  };
  for (const [kind, item] of Object.entries(files)) {
    write(kind + ".geojson", { type: "FeatureCollection", features: [item] });
  }
  return { dir, write, files };
}

test("an IMDF reference/specification-only directory is never an accepted venue", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "nova-imdf-empty-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const result = preflightImdfVenue(dir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("venue.geojson")));
  assert.ok(result.errors.some((error) => error.includes("nova-venue-rights.json")));
});

test("synthetic connected geometry passes only an explicitly limited structural preflight", (t) => {
  const fixture = makeFixture(t);
  const result = preflightImdfVenue(fixture.dir);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.scope, "STRUCTURAL_PREFLIGHT_ONLY");
  assert.equal(result.summary.opening, 1);
});

test("missing rights evidence and unresolved level references fail closed", (t) => {
  const fixture = makeFixture(t);
  unlinkSync(join(fixture.dir, "nova-venue-rights.json"));
  fixture.files.unit.properties.level_id = id(999);
  fixture.write("unit.geojson", { type: "FeatureCollection", features: [fixture.files.unit] });
  const result = preflightImdfVenue(fixture.dir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("nova-venue-rights.json")));
  assert.ok(result.errors.some((error) => error.includes("unresolved feature reference")));
});

test("invalid coordinates, open polygons and malformed nesting cannot be accepted", (t) => {
  const fixture = makeFixture(t);
  fixture.files.venue.geometry = { type: "Polygon", coordinates: [[[181, 0], [0, 0], [0, 1], [0, 0.5]]] };
  fixture.write("venue.geojson", { type: "FeatureCollection", features: [fixture.files.venue] });
  const result = preflightImdfVenue(fixture.dir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("longitude/latitude")));
  assert.ok(result.errors.some((error) => error.includes("polygon ring")));
});

test("adversarial malformed MultiPolygon hierarchy reports errors instead of throwing", (t) => {
  const fixture = makeFixture(t);
  fixture.files.venue.geometry = { type: "MultiPolygon", coordinates: [[rectangle], null] };
  fixture.write("venue.geojson", { type: "FeatureCollection", features: [fixture.files.venue] });
  const result = preflightImdfVenue(fixture.dir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("malformed polygon coordinate hierarchy")));
});
