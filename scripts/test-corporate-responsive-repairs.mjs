import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import postcss from "postcss";
import { parse } from "parse5";

const sheet = name => postcss.parse(readFileSync(`assets/css/${name}.css`, "utf8"));
function declarations(root, selector, property, media = null) {
  const values = [];
  root.walkRules(rule => {
    if (rule.selector.replace(/\s+/g, " ").trim() !== selector.replace(/\s+/g, " ").trim()) return;
    const enclosing = rule.parent.type === "atrule" ? rule.parent.params : null;
    if (enclosing !== media) return;
    rule.walkDecls(property, decl => values.push(decl.value));
  });
  return values;
}
function contrast(foreground, background) {
  const luminance = hex => {
    assert.match(hex, /^#[0-9a-f]{6}$/i);
    const c = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  };
  const [dark, light] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (light + .05) / (dark + .05);
}

test("shared header and anchor tokens match the approved homepage at both breakpoints", () => {
  const css = sheet("corporate-product-discipline");
  assert.equal(declarations(css, ":root", "--npd-header").at(-1), "68px");
  assert.equal(declarations(css, ":root", "--npd-header", "(max-width: 760px)").at(-1), "60px");
  assert.equal(declarations(css, "html", "scroll-padding-top").at(-1), "calc(var(--npd-header) + 56px)");
});

test("desktop navigation clears legacy fixed positioning before the mobile breakpoint", () => {
  const css = sheet("corporate-product-discipline");
  const selector = '.npd-global-nav.site-nav,\nbody[data-page="home"] .npd-global-nav.site-nav';
  assert.equal(declarations(css, selector, "position").at(-1), "static");
  assert.equal(declarations(css, selector, "inset").at(-1), "auto");
  assert.equal(declarations(css, selector, "position", "(max-width: 1180px)").at(-1), "fixed");
});

test("the long specialist-medicines heading has a fitting fixed scale, not clipped viewport type", () => {
  const css = sheet("homepage-editorial");
  const selector = 'body[data-page="home"] .npd-apple-oncology .npd-apple-feature-copy h2';
  assert.equal(declarations(css, selector, "font-size").at(-1), "52px");
  assert.equal(declarations(css, selector, "letter-spacing").at(-1), "0");
  assert.equal(declarations(css, selector, "font-size", "(max-width: 1100px)").at(-1), "36px");
  assert.equal(declarations(css, selector, "font-size", "(max-width: 600px)").at(-1), "32px");
});

test("ESCO product-photo notices retain at least 4.5:1 contrast and 12px type", () => {
  const css = sheet("esco-catalogue");
  const selector = ".esco-product-visual .esco-product-art-caption";
  const colour = declarations(css, selector, "color").at(-1);
  assert.ok(contrast(colour, "#f5f5f7") >= 4.5);
  assert.equal(declarations(css, selector, "font-size").at(-1), ".75rem");
  assert.equal(declarations(css, selector, "font-size", "(max-width:520px)").at(-1), ".75rem");
});

test("ESCO source attribution remains readable on the catalogue background", () => {
  const css = sheet("esco-catalogue");
  const colour = declarations(css, ".esco-storefront .esco-source", "color").at(-1);
  assert.ok(contrast(colour, "#f5f5f7") >= 4.5);
});

test("the light Oncology evidence caption matches the existing managed-app correction", () => {
  const css = sheet("oncology-editorial");
  const selector = 'body[data-page="oncology"] .npoc-page .npoc-governance .npoc-matrix caption';
  const colour = declarations(css, selector, "color").at(-1);
  assert.equal(colour, "#555361");
  assert.ok(contrast(colour, "#ffffff") >= 4.5);
  const managed = postcss.parse(readFileSync("apps/corporate/app/oncology-editorial.css", "utf8"));
  assert.equal(declarations(managed, ".npoc-page .npoc-governance .npoc-matrix caption", "color").at(-1), colour);
});

test("contact fields use readable 16px text without changing form state or routing", () => {
  const css = sheet("contact-premium");
  const selector = ".np-contact-reference .np-contact-reference-field :is(input, select, textarea)";
  assert.equal(declarations(css, selector, "font-size").at(-1), "16px");
});

test("Capabilities generation sets its own body context without changing the shared header or footer", () => {
  const fixture = mkdtempSync(join(tmpdir(), "novapharm-capabilities-context-"));
  const files = ["capabilities/index.html", "src/content/capabilities-editorial.html",
    "assets/css/capabilities-editorial.css", "assets/media/capabilities/approved-vial-photo-800.webp",
    "assets/media/capabilities/approved-earth-horizon-crest.webp"];
  const preloads = [];
  for (let i = 0; i < process.execArgv.length; i++) {
    if (process.execArgv[i] !== "--import") continue;
    const value = process.execArgv[++i];
    preloads.push("--import", value.startsWith("file:") ? value : pathToFileURL(resolve(value)).href);
  }
  try {
    for (const file of files) {
      const target = join(fixture, file);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(file, target);
    }
    const original = readFileSync(join(fixture, "capabilities/index.html"), "utf8");
    execFileSync(process.execPath, [...preloads, fileURLToPath(new URL("./apply-capabilities-editorial.mjs", import.meta.url))], { cwd: fixture });
    const result = readFileSync(join(fixture, "capabilities/index.html"), "utf8");
    const html = parse(result).childNodes.find(n => n.tagName === "html");
    const body = html.childNodes.find(n => n.tagName === "body");
    assert.equal(body.attrs.find(a => a.name === "data-page")?.value, "capabilities");
    for (const tag of ["header", "footer"]) {
      assert.equal(result.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`))?.[0],
        original.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`))?.[0], `${tag} markup changed`);
    }
    assert.ok(result.includes("data:image/webp;base64,"));
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("tracking generation retains canonical metadata inside a valid head", () => {
  const fixture = mkdtempSync(join(tmpdir(), "novapharm-tracking-head-"));
  try {
    mkdirSync(join(fixture, "products/marketplace"), { recursive: true });
    writeFileSync(join(fixture, "products/index.html"), '<!doctype html><html><head><title>Products</title><meta name="description" content="Portfolio"><link rel="canonical" href="https://novapharmhealthcare.com/products/"></head><body><main id="main">Products</main><aside class="npd-commerce-link"><a href="/products/marketplace/">Search all 392 products</a></aside></body></html>');
    writeFileSync(join(fixture, "products/marketplace/index.html"), '<main data-commerce-marketplace><a href="/products/esco/">Shop ESCO</a></main>');
    execFileSync(process.execPath, [fileURLToPath(new URL("./generate-commerce-tracking.mjs", import.meta.url))], { cwd: fixture });
    const html = readFileSync(join(fixture, "products/track/index.html"), "utf8");
    const nodes = [];
    const visit = n => { nodes.push(n); for (const child of n.childNodes ?? []) visit(child); };
    visit(parse(html));
    const canonical = nodes.find(n => n.tagName === "link" && n.attrs.some(a => a.name === "rel" && a.value === "canonical"));
    assert.equal(canonical.parentNode.tagName, "head");
    assert.equal(canonical.attrs.find(a => a.name === "href").value, "https://novapharmhealthcare.com/products/track/");
    assert.doesNotMatch(html, /<meta name="description"[^>]*>>/);
    assert.ok(html.includes("Payment is not delivery."));
    assert.ok(html.includes('data-np-order-lookup'));
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
