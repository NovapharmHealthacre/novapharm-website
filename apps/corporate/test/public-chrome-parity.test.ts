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
  assert.ok(managedHeader.includes("<DesktopNavigation items={navigation}"));
  assert.ok(managedHeader.includes("<MobileNavigation items={navigation}"));
});

test("managed and public footers share four groups and all essential destinations", () => {
  assert.ok(publicFooter.startsWith("<footer "), "Public footer is required");
  for (const label of ["Company", "Capabilities", "Products", "Connect"]) {
    assert.ok(publicFooter.includes(`<h2>${label}</h2>`), `Missing public footer group ${label}`);
    assert.ok(managedFooter.includes(`<AppleFooterNavigation label={interfaceLabel(locale, "${label}")}>`), `Missing managed footer group ${label}`);
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
