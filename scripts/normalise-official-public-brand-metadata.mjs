import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";

// Source-only transformation. Never modifies a hosted branch, publishes a
// website, invents a production receipt, or changes a form/commerce handler.
const themeTag = /<meta\b[^>]*>/gi;
const maskTag = /<link\b[^>]*>/gi;
const hasThemeName = /\bname\s*=\s*["']theme-color["']/i;
const hasMaskRel = /\brel\s*=\s*["']mask-icon["']/i;
const contentAttribute = /\bcontent\s*=\s*(["'])[^"']*\1/i;
const colorAttribute = /\bcolor\s*=\s*(["'])[^"']*\1/i;

// Parse script element spans rather than filtering HTML with a script regex.
// HTML end tags may contain case changes and unusual whitespace; refusing
// ambiguous markup is safer than silently missing a Next.js hydration value.
function isMarkupBoundary(ch) {
  return ch === ">" || ch === "/" || ch === " " || ch === "\t" ||
    ch === "\n" || ch === "\r" || ch === "\f";
}

function findTagEnd(html, from) {
  let quote = null;
  for (let i = from; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  throw Error("Unterminated HTML tag in public brand metadata");
}

function scanInlineScripts(html) {
  const lower = html.toLowerCase();
  const scripts = [];
  let cursor = 0;
  while (cursor < html.length) {
    const comment = lower.indexOf("<!--", cursor);
    const start = lower.indexOf("<script", cursor);
    if (comment !== -1 && (start === -1 || comment < start)) {
      const endComment = lower.indexOf("-->", comment + 4);
      assert.ok(endComment !== -1, "Unterminated HTML comment in public metadata");
      cursor = endComment + 3;
      continue;
    }
    if (start === -1) break;
    if (!isMarkupBoundary(lower[start + 7])) {
      cursor = start + 7;
      continue;
    }
    const openEnd = findTagEnd(html, start + 7);
    const bodyStart = openEnd + 1;
    let close = lower.indexOf("</script", bodyStart);
    while (close !== -1 && !isMarkupBoundary(lower[close + 8])) {
      close = lower.indexOf("</script", close + 8);
    }
    assert.ok(close !== -1, "Unterminated script element in public metadata");
    const closeEnd = findTagEnd(html, close + 8);
    assert.match(html.slice(close + 8, closeEnd), /^[ \t\r\n\f]*$/,
      "Ambiguous script end tag: refusing unsafe HTML rewrite");
    scripts.push({
      start, bodyStart, bodyEnd: close, end: closeEnd + 1,
      opening: html.slice(start, bodyStart),
      body: html.slice(bodyStart, close)
    });
    cursor = closeEnd + 1;
  }
  return scripts;
}

const nextFlightTheme = /(\\?"name\\?"\s*:\s*\\?"theme-color\\?"\s*,\s*\\?"content\\?"\s*:\s*\\?")(#[0-9a-f]{6})(\\?")/gi;

// Next.js embeds viewport metadata in its Flight hydration payload as well as
// the HTML <head>. Updating only <meta> creates a hydration inconsistency.
// If CSP pins inline Flight scripts by SHA-256, change exactly that script's
// CSP hash alongside the narrowly scoped theme value. Never weaken CSP.
function normaliseNextFlightTheme(html, palette) {
  const cspOriginal = html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0] || null;
  let cspUpdated = cspOriginal;
  let alteredFlightScripts = 0;
  let next = "";
  let cursor = 0;
  for (const script of scanInlineScripts(html)) {
    const body = script.body;
    let changedBody = body;
    if (!/(?:^|\s)src\s*=/i.test(script.opening) && body.includes("self.__next_f.push")) {
      changedBody = body.replace(nextFlightTheme, (_found, start, _hex, end) =>
        start + palette.background + end);
      if (changedBody !== body) {
        assert.ok(cspUpdated, "Refusing to change Next.js hydration without verifiable inline CSP");
        const digest = value => createHash("sha256").update(value, "utf8").digest("base64");
        const originalToken = "'sha256-" + digest(body) + "'";
        const updatedToken = "'sha256-" + digest(changedBody) + "'";
        assert.equal(cspUpdated.split(originalToken).length, 2,
          "Refusing Next.js hydration rewrite without exactly one matching original CSP hash");
        cspUpdated = cspUpdated.replace(originalToken, updatedToken);
        alteredFlightScripts++;
      }
    }
    next += html.slice(cursor, script.bodyStart) + changedBody;
    cursor = script.bodyEnd;
  }
  next += html.slice(cursor);
  const result = cspUpdated !== cspOriginal ? next.replace(cspOriginal, cspUpdated) : next;
  if (alteredFlightScripts) {
    assert.ok(result.includes(cspUpdated), "Updated CSP must remain in the output document");
  }
  return result;
}

function matchingTags(html, pattern, predicate) {
  return [...html.matchAll(pattern)].filter(([tag]) => predicate.test(tag)).map(x => x[0]);
}

export function assertOfficialPublicBrandMetadata(html, palette) {
  const themes = matchingTags(html, themeTag, hasThemeName);
  assert.equal(themes.length, 1, "Exactly one public theme-color meta tag required");
  assert.match(themes[0], contentAttribute, "theme-color requires a content attribute");
  assert.equal(themes[0].match(contentAttribute)[0].match(/["']([^"']*)["']/)[1],
    palette.background, "Browser theme must use approved Pure White");
  const masks = matchingTags(html, maskTag, hasMaskRel);
  assert.ok(masks.length <= 1, "Duplicate mask-icon link is not permitted");
  if (masks.length) {
    assert.match(masks[0], colorAttribute, "mask-icon requires an official colour");
    assert.equal(masks[0].match(colorAttribute)[0].match(/["']([^"']*)["']/)[1],
      palette.crimson, "Safari mask-icon must use Healthcare's approved crimson");
  }
  for (const { body } of scanInlineScripts(html)) {
    if (!body.includes("self.__next_f.push")) continue;
    for (const match of body.matchAll(nextFlightTheme)) {
      assert.equal(match[2], palette.background,
        "Next.js hydrated theme differs from approved browser theme");
    }
  }
  assert.doesNotMatch(themes.join(" ") + masks.join(" "), /#E3120B|#B30E09/i,
    "Retired Economist Red cannot survive in public browser metadata");
}

export function normaliseOfficialPublicBrandMetadata(html, palette) {
  assert.match(html, /<head\b[^>]*>/i, "Canonical public HTML is missing a head");
  assert.match(html, /<\/head\s*>/i, "Canonical public HTML is missing a closing head");
  const themes = matchingTags(html, themeTag, hasThemeName);
  assert.ok(themes.length <= 1, "Refusing ambiguous duplicate theme-color tags");
  let next = themes.length
    ? html.replace(themes[0], `<meta name="theme-color" content="${palette.background}">`)
    : html.replace(/<head\b[^>]*>/i,
      match => match + `\n  <meta name="theme-color" content="${palette.background}">`);
  const masks = matchingTags(next, maskTag, hasMaskRel);
  assert.ok(masks.length <= 1, "Refusing ambiguous duplicate Safari mask-icon links");
  if (masks.length) {
    let replacement = masks[0];
    replacement = colorAttribute.test(replacement)
      ? replacement.replace(colorAttribute, `color="${palette.crimson}"`)
      : replacement.replace(/\s*\/>$|>$/, tail => ` color="${palette.crimson}"${tail}`);
    next = next.replace(masks[0], replacement);
  }
  next = normaliseNextFlightTheme(next, palette);
  assertOfficialPublicBrandMetadata(next, palette);
  return next;
}

export function officialPublicBrandPalette(root = process.cwd()) {
  const register = JSON.parse(readFileSync(join(root, "config/brand-identities.json"), "utf8"));
  assert.equal(register.approvedOn, "2026-11-22", "Use the November 2026 owner-approved brand registry");
  assert.equal(register.neutralPalette.primaryWhite.hex, "#FFFFFF");
  assert.equal(register.neutralPalette.secondaryWhite.hex, "#F8F7F3");
  assert.equal(register.neutralPalette.defaultInk.hex, "#0B0B0E");
  assert.equal(register.brands.healthcare.hex, "#9D1B32");
  return {
    background: register.neutralPalette.primaryWhite.hex,
    crimson: register.brands.healthcare.hex,
    defaultInk: register.neutralPalette.defaultInk.hex
  };
}

const releaseRoutes = [
  "index.html", "legal/accessibility/index.html", "contact/index.html",
  "products/index.html", "capabilities/index.html", "oncology/index.html"
];

export function normaliseCanonicalPublicBrandMetadata(root = process.cwd()) {
  const palette = officialPublicBrandPalette(root);
  const registry = JSON.parse(readFileSync(join(root, "seo/generated/page-metadata-register.json"), "utf8"));
  assert.ok(registry.length >= 60, "Canonical register must include at least 60 reviewed public pages");
  const paths = new Set(registry.map(page => page.file));
  for (const route of releaseRoutes) assert.ok(paths.has(route), "Missing public release route: " + route);
  let changed = 0;
  const safeRoot = resolve(root) + sep;
  for (const page of registry) {
    const route = page.file;
    assert.match(route, /^(?!\/)(?!.*\.\.\/)[A-Za-z0-9/_-]+\.html$/,
      "Untrusted path in canonical register");
    const target = resolve(root, route);
    assert.ok(target.startsWith(safeRoot), "Canonical file escapes repository");
    const html = readFileSync(target, "utf8");
    const next = normaliseOfficialPublicBrandMetadata(html, palette);
    if (next !== html) { writeFileSync(target, next, "utf8"); changed++; }
  }
  console.log(`Normalised official browser metadata on ${registry.length} registered public pages; ${changed} updated. No deployment performed.`);
  return { checked: registry.length, changed };
}
