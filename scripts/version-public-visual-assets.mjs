import assert from "node:assert/strict";
import { isUtf8 } from "node:buffer";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { parse } from "parse5";

const version = "20261111-forensic-design-v3";
const origin = "https://novapharmhealthcare.com";
const requiredPages = new Map([
  ["index.html", []],
  ["capabilities/index.html", ["capabilities-editorial.css"]],
  ["oncology/index.html", ["oncology-editorial.css", "oncology-hope-v2.css"]],
  ["products/index.html", ["products-editorial.css"]]
]);
const semanticVersions = new Map([
  ["about/index.html:assets/css/about-editorial.css", "20261111-about-aa-contrast-v1"],
  ["capabilities/index.html:assets/css/capabilities-editorial.css", "20261111-capabilities-approved-photo-v5"],
  ["oncology/index.html:assets/css/oncology-hope-v2.css", "20261113-hope-responsive-v7"],
  ["products/index.html:assets/css/products-editorial.css", "20261111-products-layout-v4"],
  ["markets/index.html:assets/css/markets-editorial.css", "20261111-nasa-hd-1"]
]);
const root = realpathSync(process.cwd());
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const tokens = value => (value ?? "").toLowerCase().split(/[\t\n\f\r ]+/).filter(Boolean);
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;

function localFile(relativePath) {
  const full = resolve(root, relativePath);
  assert.ok(full.startsWith(`${root}/`), `Unsafe local path: ${relativePath}`);
  let real;
  try {
    real = realpathSync(full);
  } catch (error) {
    throw new Error(`Missing local file: ${relativePath}`, { cause: error });
  }
  assert.equal(real, full, `Local file must not use symbolic links: ${relativePath}`);
  assert.ok(statSync(full).isFile(), `Local path must be a regular file: ${relativePath}`);
  return full;
}

function nodesIn(node, result = []) {
  result.push(node);
  // Template contents are inert; noscript fallback links are parsed below.
  for (const child of node.childNodes ?? []) nodesIn(child, result);
  return result;
}

function stylesheetUrl(href, page) {
  assert.equal(typeof href, "string", `${page.file}: stylesheet href missing`);
  assert.ok(href.length > 0 && !/[\s\u0000-\u001f\u007f\\#]/u.test(href), `${page.file}: unsafe stylesheet href`);
  const pathname = href.split("?", 1)[0];
  assert.match(pathname, /^(?:\/|(?:\.\.?\/)*)(?:[a-zA-Z0-9_-][a-zA-Z0-9._-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.css$/, `${page.file}: stylesheet must be a safe local CSS path`);
  const asset = pathname.startsWith("/") ? pathname.slice(1) : posix.join(posix.dirname(page.file), pathname);
  assert.match(asset, /^assets\/css\/(?:[a-zA-Z0-9_-][a-zA-Z0-9._-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.css$/, `${page.file}: stylesheet must stay within assets/css`);
  const url = new URL(href, page.canonical);
  assert.equal(url.origin, origin, `${page.file}: nonlocal stylesheet`);
  assert.equal(url.pathname, `/${asset}`, `${page.file}: ambiguous stylesheet path`);
  // URLSearchParams tolerates malformed escapes; publication must not silently repair them.
  const query = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  assert.doesNotThrow(() => decodeURIComponent(query.replace(/\+/g, " ")), `${page.file}: malformed stylesheet query`);
  for (const [key, value] of url.searchParams) {
    assert.ok(key.length > 0 && !/[\u0000-\u001f\u007f]/u.test(key + value), `${page.file}: unsafe stylesheet query`);
    assert.ok(!["v", "sha256"].includes(key.toLowerCase()) || ["v", "sha256"].includes(key), `${page.file}: ambiguous version parameter`);
  }
  return { url, asset, pathname };
}

function replaceHref(html, node, href, page) {
  const location = node.sourceCodeLocation?.attrs?.href;
  assert.ok(location, `${page}: stylesheet href source location missing`);
  const source = html.slice(location.startOffset, location.endOffset);
  // parse5 provides the attribute span, not its value span. Preserve its spelling and quotes.
  const prefix = source.match(/^href\s*=\s*/i)?.[0];
  assert.ok(prefix, `${page}: malformed stylesheet href attribute`);
  const originalQuote = source[prefix.length];
  const quote = ["'", '"'].includes(originalQuote) ? originalQuote : '"';
  const escaped = href.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(quote === '"' ? /"/g : /'/g, quote === '"' ? "&quot;" : "&#39;");
  return { start: location.startOffset, end: location.endOffset, value: `${prefix}${quote}${escaped}${quote}` };
}

const register = JSON.parse(readFileSync(localFile("seo/generated/page-metadata-register.json"), "utf8"));
assert.ok(Array.isArray(register) && register.length > 0, "Canonical page register must be a nonempty array");
const pages = [...register];
// These staged commerce pages are not supplied by the earlier SEO register.
// Version their existing self-canonical HTML without inventing SEO records.
for (const route of ["/products/esco/bag/", "/products/marketplace/", "/products/track/"]) {
  const file = `${route.slice(1)}index.html`;
  if (!register.some(page => page?.file === file)) pages.push({ route, file, canonical: `${origin}${route}` });
}
const seen = new Set();
for (const page of pages) {
  assert.ok(page && typeof page === "object", "Invalid canonical page record");
  assert.equal(typeof page.route, "string", "Canonical route missing");
  assert.match(page.route, /^\/(?:[a-zA-Z0-9_-]+\/)*$/, "Unsafe canonical route in SEO register");
  const expectedFile = page.route === "/" ? "index.html" : `${page.route.slice(1)}index.html`;
  assert.equal(page.file, expectedFile, "Canonical page file must match its route");
  assert.equal(page.canonical, `${origin}${page.route}`, "Canonical URL must match the public route");
  assert.ok(!seen.has(page.file), `Duplicate canonical page: ${page.file}`);
  seen.add(page.file);
}
for (const file of requiredPages.keys()) assert.ok(seen.has(file), `Required canonical page missing: ${file}`);

const assets = new Map();
const plans = [];
let links = 0;
for (const page of pages) {
  const full = localFile(page.file);
  const bytes = readFileSync(full);
  assert.ok(isUtf8(bytes), `${page.file}: canonical HTML must be UTF-8`);
  const html = bytes.toString("utf8");
  const duplicateAttrs = [];
  const document = parse(html, {
    sourceCodeLocationInfo: true,
    scriptingEnabled: false,
    onParseError: error => { if (error.code === "duplicate-attribute") duplicateAttrs.push(error); }
  });
  const nodes = nodesIn(document);
  const head = nodes.find(node => node.tagName === "head");
  assert.ok(head?.sourceCodeLocation?.startTag && head.sourceCodeLocation.endTag, `${page.file}: explicit head element missing`);
  assert.ok(!nodes.some(node => node.tagName === "base"), `${page.file}: base element would change local asset resolution`);
  const linkNodes = nodes.filter(node => node.tagName === "link");
  for (const node of linkNodes) {
    const location = node.sourceCodeLocation;
    assert.ok(!duplicateAttrs.some(error => error.startOffset >= location.startOffset && error.startOffset < location.endOffset), `${page.file}: duplicate link attribute`);
  }
  const canonicals = linkNodes.filter(node => tokens(attr(node, "rel")).includes("canonical"));
  assert.equal(canonicals.length, 1, `${page.file}: expected exactly one canonical link`);
  assert.ok(canonicals[0].parentNode === head, `${page.file}: canonical link must be in head`);
  assert.equal(attr(canonicals[0], "href"), page.canonical, `${page.file}: HTML canonical disagrees with SEO register`);

  if (requiredPages.has(page.file)) {
    assert.match(html, /<picture class="brand-logo"><img src="\/assets\/brand\/novapharm-healthcare-logo\.png"/, `${page.file}: official header logo missing`);
    const headerLogo = nodes.some(node => node.tagName === "img" && attr(node, "src") === "/assets/brand/novapharm-healthcare-logo.png"
      && node.parentNode?.tagName === "picture" && tokens(attr(node.parentNode, "class")).includes("brand-logo")
      && (() => {
        for (let parent = node.parentNode; parent; parent = parent.parentNode) {
          if (parent.tagName === "header" && tokens(attr(parent, "class")).includes("site-header")) return true;
        }
        return false;
      })());
    assert.ok(headerLogo, `${page.file}: official header logo must be real header markup`);
  }

  const counts = new Map();
  const edits = [];
  for (const node of linkNodes) {
    const rel = tokens(attr(node, "rel"));
    const stylesheet = rel.includes("stylesheet");
    if (!stylesheet && !(rel.includes("preload") && attr(node, "as")?.toLowerCase() === "style")) continue;
    const href = attr(node, "href");
    const { url, asset, pathname } = stylesheetUrl(href, page);
    if (stylesheet) counts.set(asset, (counts.get(asset) ?? 0) + 1);
    if (!assets.has(asset)) {
      const file = localFile(asset);
      assets.set(asset, { file, hash: digest(readFileSync(file)) });
    }
    const params = url.searchParams;
    params.delete("v");
    params.delete("sha256");
    params.append("v", semanticVersions.get(`${page.file}:${asset}`) ?? version);
    params.append("sha256", assets.get(asset).hash);
    const next = `${pathname}?${params}`;
    if (next !== href) edits.push(replaceHref(html, node, next, page.file));
    links += 1;
  }
  if (!requiredPages.has(page.file)) assert.ok(counts.size > 0, `${page.file}: canonical page must have at least one actual stylesheet`);
  for (const stylesheet of requiredPages.has(page.file) ? ["novapharm.bundle.css", ...requiredPages.get(page.file)] : []) {
    const asset = `assets/css/${stylesheet}`;
    assert.equal(counts.get(asset) ?? 0, 1, `${page.file}: required stylesheet should occur exactly once: /${asset}`);
  }
  let next = html;
  for (const edit of edits.sort((a, b) => b.start - a.start)) next = next.slice(0, edit.start) + edit.value + next.slice(edit.end);
  plans.push({ file: full, html, next });
}

// Validate the complete snapshot before touching HTML, including concurrent source edits.
for (const [asset, { file, hash }] of assets) {
  assert.equal(localFile(asset), file);
  assert.equal(digest(readFileSync(file)), hash, `CSS changed during versioning; rerun after edits finish: ${asset}`);
}
for (const plan of plans) {
  assert.equal(localFile(posix.relative(root, plan.file)), plan.file);
  assert.equal(readFileSync(plan.file, "utf8"), plan.html, `HTML changed during versioning: ${plan.file}`);
}
const changed = plans.filter(plan => plan.next !== plan.html);
// Keep build-site's import-time publication behavior; --check is an explicit read-only preflight.
const checkOnly = process.argv.includes("--check");
if (!checkOnly) for (const plan of changed) writeFileSync(plan.file, plan.next, "utf8");
console.log(`${checkOnly ? "Checked" : "Versioned"} ${links} public CSS links across ${plans.length} canonical pages (${assets.size} SHA-256 assets; ${changed.length} pages ${checkOnly ? "would change" : "changed"}).`);
