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
    const primaryIcon = icons.icon[0];
    assert.ok(primaryIcon, `${brand} must declare its primary SVG favicon`);
    assert.equal(primaryIcon.url, "/assets/brand/" + prefix + "favicon.svg");
    assert.equal(primaryIcon.type, "image/svg+xml");
    assert.equal(icons.shortcut, "/assets/brand/" + prefix + "favicon.ico");
    assert.equal(icons.apple, "/assets/brand/" + (brand === "healthcare" ? "apple-touch-icon.png" : prefix + "apple-touch-icon.png"));
    assets.add(primaryIcon.url);
  }
  assert.equal(assets.size, 3);
});


test("portal neutral surfaces inherit owner-approved official whites without changing access policy", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--white:\s*#FBFAEF\s*;/i);
  assert.match(css, /--soft:\s*#F8F7F3\s*;/i);
  assert.match(css, /--ink:\s*#0B0B0E\s*;/i);
  assert.match(css, /--red:\s*#9D1B32\s*;/i);
  const portal = readFileSync(new URL("../app/apple-pharma-portal.css", import.meta.url), "utf8");
  assert.match(portal, /--portal-white:\s*#FBFAEF\s*;/i);
  assert.match(portal, /--portal-soft:\s*#F8F7F3\s*;/i);
  assert.match(portal, /--portal-divider:\s*#DEDCD5\s*;/i);
  assert.doesNotMatch(portal, /--portal-white:\s*#(?:ffffff|fff)\s*;/i);
  assert.match(portal, /background:\s*rgba\(251,250,239,\.9\)/i);
  const distribution = readFileSync(new URL("../app/employee-distribution.css", import.meta.url), "utf8");
  assert.match(distribution, /background:var\(--portal-white,#FBFAEF\)/i);
  assert.doesNotMatch(distribution, /background:\s*#(?:fff|ffffff)\b/i);
  // White text on deliberately dark controls remains an intentional accessibility choice.
  assert.match(distribution, /color:#fff\b/i);
});
