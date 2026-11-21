import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const publicHome = read("../../../index.html");
const publicFooter = publicHome.match(/<footer\\b[\\s\\S]*?<\\/footer>/i)?.[0] ?? "";
const managedHeader = read("../components/site-header.tsx");
const managedFooter = read("../components/site-footer.tsx");
const sharedStyle = read("../../../assets/css/apple-web-navigation.css");

test("the managed Corporate header uses the restored public 52px dark navigation chrome", () => {
  assert.match(publicHome, /class="site-header npd-header"/);
  assert.match(managedHeader, /className="site-header npd-header"/);
  assert.match(managedHeader, /className="container shell header-inner npd-header-inner"/);
  assert.match(sharedStyle, /--npd-header:\\s*52px/);
  assert.match(sharedStyle, /\\.npd-header\\.site-header[^{}]*\\{[\\s\\S]*?background:\\s*#171719;/);
  assert.match(sharedStyle, /html\\[data-np-estate="corporate"\\] \\.site-header \\.brand img/);
  assert.match(managedHeader, /<DesktopNavigation items=\\{navigation\\}/);
  assert.match(managedHeader, /<MobileNavigation items=\\{navigation\\}/);
});

test("managed and restored public footer use the same four directory groups and legal destinations", () => {
  assert.ok(publicFooter, "Restored public footer is required");
  for (const label of ["Company", "Capabilities", "Products", "Connect"]) {
    assert.match(publicFooter, new RegExp(`<h2>${label}</h2>`));
    assert.match(managedFooter, new RegExp(`<AppleFooterNavigation label=\\{interfaceLabel\\(locale, "${label}"\\)\\}>`));
  }
  for (const link of [
    "/about/", "/leadership/", "/about/governance/", "/partner-with-us/",
    "/investor-information/", "/careers/", "/services/", "/regulatory-services/",
    "/cro/", "/technology/", "/products/nutraxin/", "/products/strategic-portfolio/",
    "/news-insights/", "/contact/", "/account-application/", "/trust-centre/",
    "/legal/privacy/", "/legal/cookies/", "/legal/terms/", "/legal/accessibility/",
  ]) {
    assert.ok(publicFooter.includes(`href="${link}"`), `Public footer lacks ${link}`);
    assert.ok(managedFooter.includes(`href="${link}"`), `Managed footer lacks ${link}`);
  }
  assert.match(managedFooter, /className="site-footer npd-footer apple-corporate-footer"/);
  assert.match(managedFooter, /className="npd-footer-legal"/);
  assert.match(managedFooter, /<CookieSettingsButton \\/>/);
  assert.match(managedFooter, /<InterfaceLocaleSwitcher locale=\\{locale\\}/);
  assert.match(managedFooter, /Registered in England and Wales · 16716501/);
});

test("footer keeps explicit qualified-B2B and regulatory truth at every responsive size", () => {
  assert.match(managedFooter, /Regulated wholesale supply has not commenced/);
  assert.match(managedFooter, /NovaPharm does not provide medical advice/);
  assert.match(managedFooter, /Product-specific parallel-import activity remains subject/);
  assert.match(sharedStyle, /@media \\(max-width: 833px\\)/);
  assert.match(sharedStyle, /\\.npd-footer \\.npd-footer-top/);
  assert.match(sharedStyle, /\\.npd-footer \\.npd-footer-legal/);
  assert.match(sharedStyle, /focus-visible/);
});
