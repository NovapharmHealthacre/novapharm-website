import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isCurrentCorporateNavigation } from "../lib/navigation-current";

test("current corporate navigation recognizes exact and nested routes without prefix collisions", () => {
  const cases: Array<[string | null, string, boolean]> = [
    ["/about/", "/about/", true],
    ["/about/governance/", "/about/", true],
    ["/products/nutraxin/vitamin-d3/", "/products/", true],
    ["/products-archive/", "/products/", false],
    ["/contact-other/", "/contact/", false],
    ["/about", "/about/", true],
    ["/about/?tab=company", "/about/", true],
    ["/technology/?view=research", "/technology/", true],
    ["/", "/", true],
    ["/about/", "/", false],
    ["/portal/", "/portal/", false],
    ["/portal/customer/", "/portal/", false],
    ["/about/", "https://portal.novapharmhealthcare.com", false],
    ["//external.example/", "/about/", false],
    [null, "/about/", false],
  ];
  for (const [pathname, href, expected] of cases)
    assert.equal(isCurrentCorporateNavigation(pathname, href), expected,
      `Current nav state mismatch for ${pathname ?? "null"} and ${href}`);
});

test("both corporate navigation variants expose aria-current while protecting external portal semantics", () => {
  const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
  const desktop = read("../components/desktop-navigation.tsx");
  const mobile = read("../components/mobile-navigation.tsx");
  const header = read("../components/site-header.tsx");
  const css = read("../app/design-system.css");

  for (const source of [desktop, mobile]) {
    assert.match(source, /aria-current=\{!isPortal && isCurrentCorporateNavigation\(pathname, href\) \? "page" : undefined\}/);
    assert.match(source, /rel=\{isPortal \? "nofollow" : undefined\}/);
    assert.match(source, /href=\{isPortal \? portalOrigin : href\}/);
  }
  assert.match(desktop, /usePathname\(\)/);
  assert.match(mobile, /usePathname\(\)/);
  assert.match(header, /<DesktopNavigation items=\{navigation\} portalOrigin=\{portalOrigin\} locale=\{locale\}/);
  assert.match(header, /<MobileNavigation items=\{navigation\} portalOrigin=\{portalOrigin\} locale=\{locale\}/);
  assert.match(css, /\.desktop-nav a\[aria-current="page"\]::after\s*\{\s*right:\s*0;/);
  assert.match(css, /\.mobile-menu nav a\[aria-current="page"\]\s*\{[^}]*text-decoration:\s*underline/);
});
