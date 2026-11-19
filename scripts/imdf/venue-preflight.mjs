/**
 * Offline, fail-closed NovaPharm IMDF venue submission preflight.
 * A structural preflight is NOT official Apple IMDF certification, survey,
 * venue-owner rights verification, fire/escape approval, or publication.
 * Never substitutes sample coordinates for a real venue.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredCollections = Object.freeze({
  venue: ["Polygon", "MultiPolygon"],
  footprint: ["Polygon", "MultiPolygon"],
  building: [null],
  level: ["Polygon", "MultiPolygon"],
  unit: ["Polygon", "MultiPolygon"],
  opening: ["LineString", "MultiLineString"],
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function loadJson(directory, filename, errors) {
  try {
    return JSON.parse(readFileSync(join(directory, filename), "utf8"));
  } catch (error) {
    errors.push(filename + ": missing or invalid JSON (" + (error instanceof Error ? error.message : String(error)) + ")");
    return null;
  }
}

function validGeometry(geometry, allowedTypes, label, errors) {
  if (allowedTypes.includes(null)) {
    if (geometry !== null) errors.push(label + ": geometry must be null");
    return;
  }
  if (!isRecord(geometry) || !allowedTypes.includes(geometry.type)) {
    errors.push(label + ": invalid geometry type");
    return;
  }
  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    errors.push(label + ": missing geometry coordinates");
    return;
  }
  const pairs = [];
  const walk = (item) => {
    if (Array.isArray(item) && item.length >= 2 && typeof item[0] === "number" && typeof item[1] === "number") {
      pairs.push(item);
      return;
    }
    if (!Array.isArray(item)) {
      errors.push(label + ": malformed coordinate nesting");
      return;
    }
    for (const part of item) walk(part);
  };
  walk(coordinates);
  if (pairs.length < (geometry.type.includes("Polygon") ? 4 : 2)) {
    errors.push(label + ": too few geometry coordinates");
    return;
  }
  for (const position of pairs) {
    if (!Number.isFinite(position[0]) || !Number.isFinite(position[1]) ||
        position[0] < -180 || position[0] > 180 || position[1] < -90 || position[1] > 90) {
      errors.push(label + ": invalid longitude/latitude pair");
      break;
    }
  }
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    const polygons = geometry.type === "Polygon" ? [coordinates] : coordinates;
    for (const polygon of polygons) {
      if (!Array.isArray(polygon)) {
        errors.push(label + ": malformed polygon coordinate hierarchy");
        continue;
      }
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4 ||
            !Array.isArray(ring[0]) || !Array.isArray(ring[ring.length - 1]) ||
            ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
          errors.push(label + ": open or underspecified polygon ring");
        }
      }
    }
  }
}

function referenceExists(value, ids, label, errors) {
  if (typeof value !== "string" || !ids.has(value)) errors.push(label + ": unresolved feature reference");
}

export function preflightImdfVenue(directory) {
  const root = resolve(directory);
  const errors = [];
  const manifest = loadJson(root, "manifest.json", errors);
  if (!isRecord(manifest) || typeof manifest.version !== "string" ||
      typeof manifest.language !== "string" || !Number.isFinite(Date.parse(manifest.created))) {
    errors.push("manifest.json: version, language and a valid created date are required");
  }
  // This is NovaPharm evidence metadata, not part of the official IMDF format.
  const approval = loadJson(root, "nova-venue-rights.json", errors);
  if (!isRecord(approval) || ["owner_name", "approved_by", "rights_reference", "approved_at"].some(
    (field) => typeof approval[field] !== "string" || !approval[field].trim()
  ) || !Number.isFinite(Date.parse(approval?.approved_at))) {
    errors.push("nova-venue-rights.json: owner, reviewer, rights reference and approval date are required");
  }

  const collections = new Map();
  const allIds = new Set();
  for (const [name, geometryTypes] of Object.entries(requiredCollections)) {
    const content = loadJson(root, name + ".geojson", errors);
    if (!isRecord(content) || content.type !== "FeatureCollection" ||
        !Array.isArray(content.features) || content.features.length === 0) {
      errors.push(name + ".geojson: nonempty GeoJSON FeatureCollection required");
      continue;
    }
    const features = [];
    for (const [index, feature] of content.features.entries()) {
      const label = name + ".geojson feature " + index;
      if (!isRecord(feature) || feature.type !== "Feature" || !isRecord(feature.properties) ||
          feature.properties.feature_type !== name) {
        errors.push(label + ": missing or mismatched IMDF feature_type");
        continue;
      }
      if (typeof feature.id !== "string" || !uuid.test(feature.id) || allIds.has(feature.id)) {
        errors.push(label + ": invalid or duplicate feature UUID");
        continue;
      }
      allIds.add(feature.id);
      validGeometry(feature.geometry, geometryTypes, label, errors);
      features.push(feature);
    }
    collections.set(name, features);
  }
  const levels = new Set((collections.get("level") ?? []).map((feature) => feature.id));
  const buildings = new Set((collections.get("building") ?? []).map((feature) => feature.id));
  for (const name of ["unit", "opening"]) {
    for (const feature of collections.get(name) ?? []) {
      referenceExists(feature.properties.level_id, levels, name + " " + feature.id + " level_id", errors);
    }
  }
  for (const feature of collections.get("footprint") ?? []) {
    const refs = feature.properties.building_ids;
    if (!Array.isArray(refs) || refs.length === 0) errors.push("footprint " + feature.id + ": building_ids required");
    else for (const id of refs) referenceExists(id, buildings, "footprint " + feature.id + " building_id", errors);
  }
  const summary = Object.fromEntries([...collections].map(([name, features]) => [name, features.length]));
  return { ok: errors.length === 0, errors, summary, scope: "STRUCTURAL_PREFLIGHT_ONLY" };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2];
  if (!directory) {
    process.stderr.write("Usage: node scripts/imdf/venue-preflight.mjs <authorised-venue-directory>\n");
    process.exitCode = 2;
  } else {
    const result = preflightImdfVenue(directory);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    // Passing these checks never authorises an indoor map for release.
    if (!result.ok) process.exitCode = 1;
  }
}
