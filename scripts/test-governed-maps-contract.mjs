import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("only the verified protected geography route opts into the MapKit JS CSP exception", () => {
  const policy = read("packages/security/src/index.ts");
  const proxy = read("apps/portal/proxy.ts");
  assert.match(policy, /readonly mapKitJs\?: boolean/);
  assert.match(policy, /input\.mapKitJs \?/);
  assert.match(policy, /wasm-unsafe-eval/);
  assert.ok(policy.includes("worker-src 'self' blob:"));
  assert.ok(policy.includes("frame-src https://*.apple-mapkit.com"));
  assert.ok(policy.includes('"https://*.apple-mapkit.com", "blob:"'));
  assert.match(proxy, /\/portal\/executive-platform\/medicines-intelligence\/geography\//);
  assert.ok(proxy.includes('Boolean(process.env["NEXT_PUBLIC_APPLE_MAPS_TOKEN"])'));
  assert.match(proxy, /mapKitJs,/);
  assert.match(policy, /geolocation=\(\)/);
});

test("authorised geography consumes accepted postcode centroid and renders no fabricated routes", () => {
  const workspace = read("apps/portal/components/medicines-intelligence.tsx");
  const map = read("apps/portal/components/governed-healthcare-map.tsx");
  assert.match(workspace, /<GovernedHealthcareMap origin=\{response\.origin\}/);
  assert.match(map, /NEXT_PUBLIC_APPLE_MAPS_TOKEN/);
  assert.ok(map.includes('const token = process.env.NEXT_PUBLIC_APPLE_MAPS_TOKEN;'));
  assert.ok(read('apps/portal/lib/next-public-pilot-env.d.ts').includes('NEXT_PUBLIC_APPLE_MAPS_TOKEN?: string'));
  assert.ok(map.includes("https://cdn.apple-mapkit.com/mk/6/mapkit.core.js"));
  assert.match(map, /showsUserLocation: false/);
  assert.match(map, /showsUserLocationControl: false/);
  assert.ok(map.includes('script.dataset["libraries"] = "full-map"'));
  assert.match(map, /recorded coordinates/);
  assert.match(map, /clusteringIdentifier: `novapharm-\$\{point\.kind\}`/);
  assert.doesNotMatch(map, /navigator\.geolocation|getCurrentPosition|watchPosition/);
  assert.doesNotMatch(map, /routes|estimatedArrival|drivingDistance/);
});

test("Expo candidate offers opt-in external map references without background geolocation", () => {
  const app = read("native/novapharm-intelligence-mobile/App.tsx");
  const screen = read("native/novapharm-intelligence-mobile/MapsResearchScreen.tsx");
  assert.match(app, /screen: "maps", label: "Maps and location"/);
  assert.match(app, /<MapsResearchScreen/);
  assert.match(screen, /Linking\.openURL\(target\)/);
  assert.ok(screen.includes("https://maps.apple.com/?ll="));
  assert.doesNotMatch(screen, /fetch\(|Geolocation|watchPosition|AsyncStorage|SecureStore/);
  const manifest = JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo;
  assert.equal(manifest.android.permissions, undefined);
});

test("separate iOS and Android native code stays permission-free and source-gated", () => {
  const swift = read("native/novapharm-intelligence-apple/NovaMapKitView.swift");
  const swiftPackage = read("native/novapharm-intelligence-apple/Package.swift");
  const kotlin = read("native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaExternalMapLink.kt");
  const android = read("native/novapharm-intelligence-android/app/src/main/AndroidManifest.xml");
  assert.match(swift, /import MapKit/);
  assert.match(swift, /Map\(position: \$camera\)/);
  assert.match(swiftPackage, /NovaMapKitView\.swift/);
  assert.ok(kotlin.split("\n").some((line) => line.trim() === 'Locale.ROOT, "https://maps.apple.com/?ll=%.6f,%.6f&q=%s",'));
  assert.doesNotMatch(android, /android\\.permission\\.(?:ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|INTERNET)/);
});

test("indoor mapping refuses to claim a surveyed venue is included", () => {
  const policy = read("docs/maps/apple-maps-imdf-adoption-20261118.md");
  assert.match(policy, /no building geometry/i);
  assert.match(policy, /IMDF_Data_Model_Full\.pdf/);
  assert.match(policy, /imdf-validations-1\.0\.3\.csv/);
  assert.match(policy, /venue-owner approval/i);
});
