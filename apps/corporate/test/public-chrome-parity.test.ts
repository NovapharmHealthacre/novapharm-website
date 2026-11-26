import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const publicHome = read("../../../index.html");
const publicFooter = publicHome.slice(publicHome.indexOf("<footer "), publicHome.indexOf("</footer>") + "</footer>".length);
const managedHeader = read("../components/site-header.tsx");
const managedFooter = read("../components/site-footer.tsx");
const sharedStyle = read("../../../assets/css/apple-web-navigation.css");

test("the managed Corporate header retains approved compact public navigation chrome", () => {
  assert.ok(publicHome.includes('class="site-header npd-header"'));
  assert.ok(managedHeader.includes('className="site-header npd-header"'));
  assert.ok(managedHeader.includes('className="container shell header-inner npd-header-inner"'));
  assert.ok(sharedStyle.includes("--npd-header: 52px"));
  assert.ok(sharedStyle.includes(".npd-header.site-header"));
  assert.ok(sharedStyle.includes("background: #171719"));
  assert.ok(sharedStyle.includes('html[data-np-estate="corporate"] .site-header .brand img'));
  assert.ok(managedHeader.includes("<DesktopNavigation items={publicNavigation}"));
  assert.ok(managedHeader.includes("<MobileNavigation items={publicNavigation}"));
});

test("managed and public footers share four groups and all essential destinations", () => {
  assert.ok(publicFooter.startsWith("<footer "), "Public footer is required");
  for (const label of ["Company", "Capabilities", "Products", "Connect"]) {
    assert.ok(publicFooter.includes(`<h2>${label}</h2>`), `Missing public footer group ${label}`);
    assert.ok(managedFooter.includes(`<AppleFooterNavigation label={interfaceLabel(locale, "${label}")}>`), `Missing managed footer group ${label}`);
  }
  for (const link of [
    "/about/", "/about/company/", "/leadership/", "/about/governance/", "/partner-with-us/",
    "/investor-information/", "/careers/", "/distribution/", "/services/", "/regulatory-services/",
    "/cro/", "/technology/", "/products/nutraxin/", "/products/esco/", "/products/strategic-portfolio/",
    "/news-insights/", "/contact/", "/account-application/", "/trust-centre/",
    "/legal/privacy/", "/legal/cookies/", "/legal/terms/", "/legal/accessibility/",
  ]) {
    assert.ok(publicFooter.includes(`href="${link}"`) || read("../../../scripts/apply-corporate-product-discipline.mjs").includes(`href="${link}"`), `Public footer lacks ${link}`);
    assert.ok(managedFooter.includes(`href="${link}"`), `Managed footer lacks ${link}`);
  }
  assert.ok(managedFooter.includes('className="site-footer npd-footer apple-corporate-footer"'));
  assert.ok(managedFooter.includes('className="npd-footer-legal"'));
  assert.ok(managedFooter.includes("<CookieSettingsButton />"));
  assert.ok(managedFooter.includes("<InterfaceLocaleSwitcher locale={locale} />"));
  assert.ok(managedFooter.includes("Registered in England and Wales · 16716501"));
});

test("footer preserves regulated-company disclosures and accessible small-screen structure", () => {
  assert.ok(managedFooter.includes("Regulated wholesale supply has not commenced"));
  assert.ok(managedFooter.includes("NovaPharm does not provide medical advice"));
  assert.ok(managedFooter.includes("Product-specific parallel-import activity remains subject"));
  assert.ok(sharedStyle.includes("@media (max-width: 833px)"));
  assert.ok(sharedStyle.includes(".npd-footer .npd-footer-top"));
  assert.ok(sharedStyle.includes(".npd-footer .npd-footer-legal"));
  assert.ok(sharedStyle.includes("focus-visible"));
});

test("desktop category overlays use seven restored static directories and keyboard fallback", () => {
  const desktop = read("../components/desktop-navigation.tsx");
  const overlayCss = read("../app/corporate-mega-menu.css");
  const layout = read("../app/layout.tsx");

  assert.ok(layout.includes('import "./corporate-mega-menu.css";'));
  for (const id of ["company", "capabilities", "distribution", "oncology", "products", "intelligence", "insights"]) {
    assert.ok(publicHome.includes(`data-mega-panel="${id}"`) || read("../../../scripts/apply-corporate-product-discipline.mjs").includes(`  ${id}: [`), `Static category ${id} missing`);
    assert.ok(desktop.includes(`id: "${id}"`), `Managed category ${id} missing`);
  }
  for (const term of ["aria-expanded", "aria-controls", "ArrowDown", "Escape", "onPointerEnter", "aria-current", "focusFirstLink"]) {
    assert.ok(desktop.includes(term), `Managed desktop menu is missing ${term}`);
  }
  assert.ok(overlayCss.includes("min-width: 1301px"));
  assert.ok(overlayCss.includes(".npd-mega.is-open"));
  assert.ok(overlayCss.includes("forced-colors: active"));
  assert.ok(desktop.includes('href={isPortal ? portalOrigin : href}'));
  assert.doesNotMatch(desktop, /onClick=\{\(event\)/, "Category click must follow its overview");
  assert.ok(managedHeader.includes('navigation.filter(([, href]) => href !== "/news-insights/")'));
});
