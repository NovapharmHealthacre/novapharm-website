/*
 * Apple-inspired NovaPharm branding and app-preview release gates.
 * This validates our own brand and honest marketing; it does not claim
 * HIG certification or eligibility for Apple trademarks.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const root = process.cwd();
const text = (file) => readFileSync(join(root, file), "utf8");
const manifest = JSON.parse(text("config/apple-marketing-release.json"));
const assetRoot = resolve(root, "assets");
const realAssetRoot = realpathSync(assetRoot);
const assetFile = (value) => {
  if (typeof value !== "string" || !value.startsWith("/assets/")) return null;
  const candidate = resolve(root, value.slice(1));
  if (!candidate.startsWith(assetRoot + sep) || !existsSync(candidate)) return null;
  const actual = realpathSync(candidate);
  return actual.startsWith(realAssetRoot + sep) && statSync(actual).isFile() ? actual : null;
};
const names = new Set();

assert.equal(manifest.schemaVersion, 1, "Unsupported Apple marketing release manifest schema");
for (const section of ["nativeAppListings", "appPreviews", "webProductWalkthroughs"]) {
  assert(Array.isArray(manifest[section]), section + " must be an array");
}

const verifiedApps = new Map();
for (const listing of manifest.nativeAppListings) {
  assert.equal(typeof listing.id, "string");
  assert(!names.has(listing.id), "Duplicate marketing entry: " + listing.id);
  names.add(listing.id);
  assert(["ios", "macos"].includes(listing.platform), "Only verified iPhone/iPad or Mac app listings can be advertised");
  assert.equal(listing.storeVerified, true, "Store listing needs independent verification");
  assert.match(listing.appStoreUrl ?? "", /^https:\/\/apps\.apple\.com\/(?:[a-z]{2}\/)?app\/[^?#\s]+\/id\d+(?:\?.*)?$/u, "Use a direct real App Store listing URL");
  assert.equal(listing.releaseStatus, "available", "Do not advertise non-released native apps as downloadable");
  verifiedApps.set(listing.id, listing);
}

function verifyFootage(clip, native) {
  assert.equal(typeof clip.id, "string", "Every preview requires an ID");
  assert(!names.has(clip.id), "Duplicate marketing entry: " + clip.id);
  names.add(clip.id);
  assert.equal(clip.realInterfaceCapture, true, clip.id + ": use authentic recorded product UI");
  assert.equal(clip.syntheticAccountsOnly, true, clip.id + ": patient/customer data must not be exposed");
  assert.equal(clip.rightsCleared, true, clip.id + ": prove rights for all visuals and sound");
  assert.equal(clip.regulatoryCopyReviewed, true, clip.id + ": pharma claims need approval");
  assert.equal(clip.loginDisclosureReviewed, true, clip.id + ": account or subscription gates must be disclosed");
  assert.equal(clip.actualFeaturesOnly, true, clip.id + ": no simulated functionality");
  const videoFile = assetFile(clip.video);
  assert(videoFile, clip.id + ": served video file not found");
  assert(assetFile(clip.poster), clip.id + ": real poster frame not found");
  assert(assetFile(clip.captionTrack), clip.id + ": WebVTT captions not found");
  assert.match(clip.sha256 ?? "", /^[a-f0-9]{64}$/u, clip.id + ": missing video checksum");
  assert.equal(
    createHash("sha256").update(readFileSync(videoFile)).digest("hex"),
    clip.sha256,
    clip.id + ": video bytes do not match the approved source checksum",
  );
  assert(Number.isFinite(clip.durationSeconds) && clip.durationSeconds > 0, clip.id + ": invalid duration");
  if (native) {
    assert(verifiedApps.has(clip.appId), clip.id + ": native previews require a verified App Store listing");
    assert(clip.durationSeconds <= 30, clip.id + ": native App Store previews may not exceed 30 seconds");
    assert.equal(typeof clip.locale, "string", clip.id + ": localized previews must specify language");
    assert.equal(typeof clip.displayTarget, "string", clip.id + ": device-specific footage is required");
  }
}

const nativeByAppLocaleTarget = new Map();
for (const preview of manifest.appPreviews) {
  verifyFootage(preview, true);
  const key = [preview.appId, preview.locale, preview.displayTarget].join(":");
  nativeByAppLocaleTarget.set(key, (nativeByAppLocaleTarget.get(key) ?? 0) + 1);
  assert(nativeByAppLocaleTarget.get(key) <= 3, "Apple permits a maximum of three previews per app/locale/display target");
}
for (const walkthrough of manifest.webProductWalkthroughs) {
  verifyFootage(walkthrough, false);
  assert.equal(walkthrough.playbackControls, true, walkthrough.id + ": web demos require user playback control");
  assert.equal(walkthrough.autoplay, false, walkthrough.id + ": do not autoplay marketing footage");
}

const colors = text("assets/css/novapharm-hig-colours.css");
assert(colors.includes("--np-color-accent: #e3120b"), "Preserve the approved NovaPharm identity accent");
assert(colors.includes("NOVAPHARM / BRAND PRESENTATION"), "Shared logo presentation styles have not been installed");
const componentsCss = text("packages/design-system/src/styles.ts");
assert(!componentsCss.includes(".np-state--error{border-color:#E3120B}") && !componentsCss.includes(".np-status--critical{border-color:#E3120B}"), "The shared status design system must not reuse identity red for failure");
assert(colors.includes(":focus-visible"), "Brand navigation needs an accessible keyboard focus state");
assert(colors.includes("forced-colors: active"), "Brand navigation must respect forced colours");
const controlledBrandComponents = [
  ["apps/corporate/components/brand.tsx", "novapharm-healthcare-logo.png"],
  ["apps/portal/components/portal-brand.tsx", "novapharm-healthcare-logo"],
  ["apps/portal/components/distribution-brand.tsx", "novapharm-distribution-logo.svg"],
  ["apps/portal/components/pharmascope-brand.tsx", "pharmascope-logo"],
];
for (const [file, canonicalArtwork] of controlledBrandComponents) {
  assert(text(file).includes(canonicalArtwork), file + " must retain owner-approved NovaPharm identity");
  assert(text(file).includes("aria-label"), file + " must provide a named home destination");
}
assert(text("docs/programme/brand-governance.md").includes("#E3120B"), "Approved owner brand documentation must remain intact");
console.log("Apple HIG brand principles / NovaPharm logos / honest App Store and preview release gates: PASS");
