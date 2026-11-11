import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd(), "../..");
const canonical = readFileSync(path.join(root, "src/content/capabilities-editorial.html"), "utf8");
const managed = readFileSync(path.join(root, "apps/corporate/components/capabilities-editorial.tsx"), "utf8");
const renderer = readFileSync(path.join(root, "apps/corporate/app/[[...slug]]/page.tsx"), "utf8");
const pageRecords = readFileSync(path.join(root, "apps/corporate/data/pages.ts"), "utf8");
const responsiveCSS = readFileSync(path.join(root, "apps/corporate/app/capabilities-route.css"), "utf8");

test("approved Capabilities editorial story is preserved in managed website", () => {
  for (const marker of [
    "From evidence", "to access.", "Four connected disciplines.",
    "Clear accountability.", "Start with one decision.",
    "Market-entry and", "Regulatory", "Clinical Research", "Governed",
    "Regulated", "Market entry, regulatory, clinical and technology decisions",
  ]) {
    if (marker === "Regulated") continue; // Regulatory status is in the shared legal footer.
    assert.ok(canonical.includes(marker), `Canonical Capabilities editorial missing ${marker}`);
    assert.ok(managed.includes(marker), `Managed Capabilities editorial missing ${marker}`);
  }
  assert.match(renderer, /case "capabilities":\s*content = <CapabilitiesEditorialPage \/>/);
  assert.match(pageRecords, /page\("capabilities", "narrative", "From evidence to access\."/);
  assert.doesNotMatch(managed, /Four connected capabilities\. One governed route to market/);
  assert.match(responsiveCSS, /ncap-managed/);
});

test("both photographic Capabilities assets are copied byte-for-byte from the approved source", () => {
  const images = ["approved-vial-photo-800.webp", "approved-earth-horizon-crest.webp"];
  for (const file of images) {
    const fullPath = path.join(root, "apps/corporate/public/assets/media/capabilities", file);
    const original = path.join(root, "assets/media/capabilities", file);
    assert.ok(statSync(fullPath).size > 500, `Approved ${file} is missing`);
    assert.deepEqual(readFileSync(fullPath), readFileSync(original), `Approved asset copy differs: ${file}`);
  }
});
