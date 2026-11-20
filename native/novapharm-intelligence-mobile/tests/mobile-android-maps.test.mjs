import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildAndroidMapUrl } from "../android-map-url.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const screen = readFileSync(path.join(root, "native/novapharm-intelligence-mobile/MapsResearchScreen.tsx"), "utf8");

test("Android external Maps URL uses a valid HTTPS search API and exact coordinates", () => {
  const url = buildAndroidMapUrl(51.5, -0.12);
  const target = new URL(url);
  assert.equal(target.protocol, "https:");
  assert.equal(target.hostname, "www.google.com");
  assert.equal(target.pathname, "/maps/search/");
  assert.equal(target.searchParams.get("api"), "1");
  assert.equal(target.searchParams.get("query"), "51.5,-0.12");
  assert.equal(target.searchParams.size, 2, "Never forward optional research labels or identifiers");
  assert.equal(buildAndroidMapUrl(-90, 180), "https://www.google.com/maps/search/?api=1&query=-90%2C180");
});

test("Android map hand-off refuses impossible or nonfinite coordinates", () => {
  for (const point of [[91, 0], [-91, 0], [0, 181], [0, -181], [Infinity, 0], [NaN, 0]]) {
    assert.throws(() => buildAndroidMapUrl(...point), RangeError);
  }
});

test("Expo research screen routes iOS and Android separately and discloses provider hand-off", () => {
  assert.match(screen, /Platform\.OS === "android"/);
  assert.match(screen, /buildAndroidMapUrl\(lat, lon\)/);
  assert.match(screen, /https:\/\/maps\.apple\.com\/\?ll=/);
  assert.match(screen, /Opening an external map shares the chosen coordinates/);
  assert.match(screen, /The app does not store the coordinates/);
  assert.doesNotMatch(screen, /navigator\.geolocation|expo-location|requestForegroundPermissions|fetch\(|AsyncStorage|SecureStore|access_token|client_secret/);
});
