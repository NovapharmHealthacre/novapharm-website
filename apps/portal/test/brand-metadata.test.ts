import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { portalBrandMetadata, resolvePortalBrand } from "../lib/brand-metadata";

test("host and employee area select separate owner-approved brand identities", () => {
  assert.equal(resolvePortalBrand("intelligence.novapharmhealthcare.com", null), "intelligence");
  assert.equal(resolvePortalBrand("INTELLIGENCE.NOVAPHARMHEALTHCARE.COM:443", "employee"), "intelligence");
  assert.equal(resolvePortalBrand("portal.novapharmhealthcare.com", "employee"), "distribution");
  assert.equal(resolvePortalBrand("portal.novapharmhealthcare.com", "customer"), "healthcare");
  assert.equal(resolvePortalBrand("portal.novapharmhealthcare.com", "executive"), "healthcare");
  assert.equal(resolvePortalBrand("intelligence.novapharmhealthcare.com.attacker.test", "employee"), "distribution");
  assert.equal(resolvePortalBrand("unknown.test", null), "healthcare");
});

test("favicon and touch art remain exclusive to each licensed owner identity", () => {
  const assets = new Set<string>();
  for (const [brand, prefix] of [
    ["healthcare", ""], ["distribution", "novapharm-distribution-"], ["intelligence", "novapharm-intelligence-"],
  ] as const) {
    const metadata = portalBrandMetadata(brand);
    assert.deepEqual(metadata.robots, { index: false, follow: false, noarchive: true });
    const icons = metadata.icons as { icon: Array<{ url: string; type?: string }>; shortcut: string; apple: string };
    assert.equal(icons.icon[0].url, "/assets/brand/" + prefix + "favicon.svg");
    assert.equal(icons.icon[0].type, "image/svg+xml");
    assert.equal(icons.shortcut, "/assets/brand/" + prefix + "favicon.ico");
    assert.equal(icons.apple, "/assets/brand/" + (brand === "healthcare" ? "apple-touch-icon.png" : prefix + "apple-touch-icon.png"));
    assets.add(icons.icon[0].url);
  }
  assert.equal(assets.size, 3);
});


test("portal neutral surfaces inherit owner-approved official whites without changing access policy", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--white:\s*#FBFAEF\s*;/i);
  assert.match(css, /--soft:\s*#F8F7F3\s*;/i);
  assert.match(css, /--ink:\s*#0B0B0E\s*;/i);
  assert.match(css, /--red:\s*#9D1B32\s*;/i);
});
