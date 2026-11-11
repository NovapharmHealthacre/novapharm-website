import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { articles } from "../data/articles";
import nutraxinRegister from "../data/nutraxin-product-register.json";
import { corporatePages } from "../data/pages";
import { leadership } from "../data/site";

const root = process.cwd();
const style = readFileSync(path.join(root, "app/design-system.css"), "utf8");
const layout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");

test("one governed design layer is applied across every public corporate route", () => {
  assert.match(layout, /import "\.\/design-system\.css"/);
  assert.ok(layout.indexOf('import "./design-system.css"') > layout.indexOf('import "./homepage-editorial.css"'));
  for (const name of ["--nph-ink", "--nph-silver", "--nph-link", "--nph-accent", "--nph-radius", "--nph-system"]) {
    assert.ok(style.includes(name), `Missing shared design token: ${name}`);
  }
  assert.match(style, /\.site-header\s*\{/);
  assert.match(style, /\.site-footer\s*\{/);
  assert.match(style, /\.page-hero\s*\{/);
  assert.match(style, /\.article-hero\s*\{/);
  assert.match(style, /\.profile-hero\s*\{/);
  assert.match(style, /\.final-cta\s*\{/);
  assert.match(style, /\.nutraxin-product-hero/);
  assert.match(style, /\.legal-grid/);
  assert.match(style, /\.status-notice-regulatory/);
  assert.match(style, /\.nph-editorial-home/);
  assert.match(style, /\.np-contact-reference/);
});

test("Apple-inspired system remains a NovaPharm identity with accessible, functional surfaces", () => {
  assert.match(style, /-apple-system, BlinkMacSystemFont/);
  assert.match(style, /--nph-accent:\s*#e3120b/);
  assert.match(style, /--nph-link: #0066cc/);
  assert.match(style, /min-height: 46px/);
  assert.match(style, /:focus-visible/);
  assert.match(style, /@media \(max-width: 520px\)/);
  assert.match(style, /prefers-reduced-motion: reduce/);
  assert.match(style, /@media print/);
  assert.doesNotMatch(style, /SF Pro|Apple logo|Apple artwork/i);
  assert.doesNotMatch(style, /letter-spacing:\s*-\d/);
  assert.doesNotMatch(style, /display:\s*none\s*!important[^}]*status-notice/);
  assert.doesNotMatch(style, /\.np-contact-reference\s*\{\s*display:\s*none/);
});

test("audit route register includes every corporate, leadership, article and canonical Nutraxin destination", () => {
  const routes = [
    ...corporatePages.map((page) => `/${page.slug ? `${page.slug}/` : ""}`),
    ...leadership.map((person) => `/leadership/${person.slug}/`),
    ...articles.map((article) => `/news-insights/${article.slug}/`),
    ...nutraxinRegister.products.map((product) => `/products/nutraxin/${product.slug}/`),
  ];
  assert.equal(new Set(routes).size, routes.length, "Duplicate canonical destination must be fixed");
  assert.ok(routes.length >= 45, "Do not silently drop route families from the system audit");
  assert.ok(routes.includes("/"), "Homepage is required");
  assert.ok(routes.includes("/contact/"), "Approved contact experience is required");
  assert.ok(routes.includes("/oncology/"), "Oncology is required");
  assert.ok(routes.includes("/legal/privacy/"), "Privacy/legal routes are required");
  assert.ok(routes.some((route) => route.startsWith("/products/nutraxin/") && route !== "/products/nutraxin/"));
});


test("official corporate logo is visible on managed homepage and never replaced by text", () => {
  const brand = readFileSync(path.join(root, "components/brand.tsx"), "utf8");
  const homepage = readFileSync(path.join(root, "app/homepage-editorial.css"), "utf8");
  assert.match(brand, /src="\/assets\/brand\/novapharm-healthcare-logo\.png"/);
  assert.doesNotMatch(homepage, /content:\s*"NOVAPHARM"/);
  assert.doesNotMatch(homepage, /\.brand > img\s*\{\s*display:\s*none/);
  assert.match(homepage, /\.site-header \.brand > img\s*\{[\s\S]*?display:\s*block/);
  const site = readFileSync(path.join(root, "data/site.ts"), "utf8");
  assert.match(site, /\["Distribution", "\/distribution\/"\]/);
});

test("forensic page identity and privacy choices do not regress", () => {
  const renderer = readFileSync(path.join(root, "components/page-renderer.tsx"), "utf8");
  const oncology = readFileSync(path.join(root, "components/oncology-editorial.tsx"), "utf8");
  const capabilitiesCss = readFileSync(path.join(root, "../../assets/css/capabilities-editorial.css"), "utf8");
  assert.match(renderer, /page\.slug === "capabilities" \? "Capabilities"/,
    "Capabilities must never inherit the About NovaPharm breadcrumb");
  assert.match(oncology, /Oncology demands\{" "\}<br \/>more than supply\./,
    "The Oncology H1 must have a spoken word boundary at its visual line break");
  assert.doesNotMatch(capabilitiesCss, /#767981/i,
    "Small Capabilities labels must not use the previously low-contrast grey");
  assert.ok(layout.indexOf("<CookieControls />") < layout.indexOf('<main id="main-content">'),
    "Cookie consent must be in normal document flow before main content");
  assert.match(style, /Forensic remediation: non-obscuring consent/);
  assert.match(style, /\.cookie-banner\s*\{[\s\S]*?position: relative;/);
});


test("brand red token remains identical across public and managed corporate design", () => {
  const publicTokens = readFileSync(path.join(root, "../../assets/css/tokens.css"), "utf8");
  assert.match(publicTokens, /--brand:\s*#E3120B/i);
  assert.match(style, /--nph-accent:\s*#e3120b/i);
  assert.match(style, /--red-dark:\s*#b30e09/i);
  assert.match(style, /--pharma-red-dark:\s*#b30e09/i);
  assert.match(style, /--nph-link:\s*#0066cc/i, "Links and focus should remain distinguishable from brand CTAs");
});
