import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "parse5";

const script = fileURLToPath(new URL("./version-public-visual-assets.mjs", import.meta.url));
const registerFile = "seo/generated/page-metadata-register.json";
const bundle = "assets/css/novapharm.bundle.css";
const defaultVersion = "20261111-forensic-design-v3";
const logo = '<picture class="brand-logo"><img src="/assets/brand/novapharm-healthcare-logo.png" alt="NovaPharm Healthcare"></picture>';
const required = new Map([
  ["index.html", []],
  ["capabilities/index.html", ["capabilities-editorial.css"]],
  ["oncology/index.html", ["oncology-editorial.css", "oncology-hope-v2.css"]],
  ["products/index.html", ["products-editorial.css"]]
]);
const semantic = new Map([
  ["about-editorial.css", "20261111-about-aa-contrast-v1"],
  ["capabilities-editorial.css", "20261111-capabilities-approved-photo-v5"],
  ["oncology-hope-v2.css", "20261113-hope-responsive-v7"],
  ["products-editorial.css", "20261111-products-layout-v4"]
]);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const read = (root, file) => readFileSync(join(root, file), "utf8");
function write(root, file, value) {
  const full = join(root, file);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value);
}
function edit(root, file, transform) { write(root, file, transform(read(root, file))); }
function editRegister(root, transform) {
  write(root, registerFile, JSON.stringify(transform(JSON.parse(read(root, registerFile)))));
}
function nodesIn(node, out = []) {
  out.push(node);
  for (const child of node.childNodes ?? []) nodesIn(child, out);
  return out;
}
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
function linksIn(html) {
  return nodesIn(parse(html, { sourceCodeLocationInfo: true, scriptingEnabled: false }))
    .filter(node => node.tagName === "link");
}
function cssLinks(html) {
  return linksIn(html).filter(node => /(?:^|\s)stylesheet(?:\s|$)/i.test(attr(node, "rel") ?? "")
    || (attr(node, "rel") === "preload" && attr(node, "as") === "style"));
}
function maskCssHrefs(html) {
  for (const node of cssLinks(html).sort((a, b) => b.sourceCodeLocation.startOffset - a.sourceCodeLocation.startOffset)) {
    const { startOffset, endOffset } = node.sourceCodeLocation.attrs.href;
    html = html.slice(0, startOffset) + "HREF_VALUE" + html.slice(endOffset);
  }
  return html;
}

// Carry only explicit dependency preloads into synthetic subprocesses, with stable paths.
const preloads = [];
for (let i = 0; i < process.execArgv.length; i += 1) {
  const flag = process.execArgv[i];
  const value = flag === "--import" ? process.execArgv[++i] : flag.startsWith("--import=") ? flag.slice(9) : null;
  if (value) preloads.push("--import", value.startsWith(".") || isAbsolute(value) ? pathToFileURL(resolve(value)).href : value);
}
function run(root, { check = false, importMode = false, setup = "" } = {}) {
  const args = [...preloads];
  if (importMode || setup) {
    args.push("--input-type=module", "-e", `${setup}\nawait import(${JSON.stringify(pathToFileURL(script).href)});`);
  } else args.push(script);
  if (check) args.push("--check");
  return spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", timeout: 15_000 });
}
function passed(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "public-visual-versioning-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const records = ["/", "/capabilities/", "/oncology/", "/products/", "/about/", "/contact/", "/products/nutraxin/item-one/"]
    .map(route => ({ route, canonical: `https://novapharmhealthcare.com${route}`, file: route === "/" ? "index.html" : `${route.slice(1)}index.html` }));
  write(root, registerFile, JSON.stringify(records));
  for (const route of ["/products/esco/bag/", "/products/marketplace/", "/products/track/"]) {
    records.push({ route, canonical: `https://novapharmhealthcare.com${route}`, file: `${route.slice(1)}index.html` });
  }
  const styles = new Set([bundle, "assets/css/about-editorial.css", "assets/css/contact-premium.css", "assets/css/nutraxin-merchant.css"]);
  for (const record of records) {
    const extras = required.get(record.file) ?? (record.route === "/about/" ? ["about-editorial.css"]
      : record.route === "/contact/" ? ["contact-premium.css"] : ["nutraxin-merchant.css"]);
    const links = ["novapharm.bundle.css", ...extras].map(name => {
      styles.add(`assets/css/${name}`);
      const v = semantic.get(name);
      return `  <link rel="stylesheet" href="/assets/css/${name}${v ? `?v=${v}` : ""}">`;
    }).join("\n");
    write(root, record.file, `<!doctype html>\n<html lang="en"><head>\n  <meta charset="utf-8">\n  <link rel="canonical" href="${record.canonical}">\n${links}\n</head><body>\n<header class="site-header">${logo}</header>\n<main data-preserve="yes">Synthetic caf\u00e9 \ud83d\udccc content for ${record.route}</main>\n</body></html>\n`);
  }
  for (const [i, file] of [...styles].entries()) write(root, file, `/* synthetic ${file} */\nbody { --fixture: ${i}; }\n`);
  return { root, records, styles };
}
function snapshots(root, records) { return records.map(record => read(root, record.file)); }
function addLink(root, markup, file = "contact/index.html") {
  edit(root, file, html => html.replace("</head>", `${markup}\n</head>`));
}
function bundleHref(root, href, file = "contact/index.html") {
  edit(root, file, html => html.replace(`href="/${bundle}"`, `href="${href}"`));
}

test("versions every canonical page and stylesheet, preserving semantic labels and other bytes", t => {
  const { root, records, styles } = fixture(t);
  write(root, "not-canonical.html", '<link rel="stylesheet" href="/assets/css/do-not-read.css">');
  const before = snapshots(root, records);
  const cssBefore = [...styles].map(file => readFileSync(join(root, file)));
  assert.match(passed(run(root)), /Versioned 20 public CSS links across 10 canonical pages/);
  for (const [i, record] of records.entries()) {
    const html = read(root, record.file);
    assert.equal(maskCssHrefs(html), maskCssHrefs(before[i]), record.file);
    for (const node of cssLinks(html)) {
      const url = new URL(attr(node, "href"), record.canonical);
      assert.equal(url.searchParams.getAll("v").length, 1);
      assert.equal(url.searchParams.getAll("sha256").length, 1);
      assert.equal(url.searchParams.get("v"), semantic.get(url.pathname.split("/").at(-1)) ?? defaultVersion);
      assert.equal(url.searchParams.get("sha256"), hash(readFileSync(join(root, url.pathname.slice(1)))));
    }
  }
  for (const [i, file] of [...styles].entries()) assert.deepEqual(readFileSync(join(root, file)), cssBefore[i]);
  assert.equal(read(root, "not-canonical.html"), '<link rel="stylesheet" href="/assets/css/do-not-read.css">');
});

test("repeat execution is byte-stable and does not rewrite unchanged HTML", t => {
  const { root, records } = fixture(t);
  passed(run(root));
  const before = snapshots(root, records);
  for (const record of records) utimesSync(join(root, record.file), 1, 1);
  assert.match(passed(run(root)), /0 pages changed/);
  assert.deepEqual(snapshots(root, records), before);
  for (const record of records) assert.equal(statSync(join(root, record.file)).mtimeMs, 1000);
});

test("changed CSS bytes change only the affected content key, with full SHA-256 digests", t => {
  const { root, records } = fixture(t);
  passed(run(root));
  const before = snapshots(root, records);
  const oldHash = hash(readFileSync(join(root, bundle)));
  const bytes = Buffer.from("\ufeff/* synthetic exact-byte update */\r\nbody { color: #123456; }\r\n", "utf8");
  write(root, bundle, bytes);
  passed(run(root));
  const newHash = hash(bytes);
  assert.notEqual(newHash, oldHash);
  for (const [i, record] of records.entries()) assert.equal(read(root, record.file), before[i].replace(oldHash, newHash));
  assert.match(newHash, /^[a-f0-9]{64}$/);
  const stable = snapshots(root, records);
  passed(run(root));
  assert.deepEqual(snapshots(root, records), stable);
});

test("updates stale and repeated version keys while retaining safe query parameter values and order", t => {
  const { root } = fixture(t);
  bundleHref(root, `/${bundle}?theme=light&amp;v=old&amp;theme=dark&amp;%76=older&amp;flag&amp;lang=%E2%9C%93&amp;%73ha256=stale&amp;sha256=again&amp;word=a+b`);
  passed(run(root));
  const node = cssLinks(read(root, "contact/index.html"))[0];
  const url = new URL(attr(node, "href"), "https://novapharmhealthcare.com");
  assert.deepEqual([...url.searchParams], [["theme", "light"], ["theme", "dark"], ["flag", ""], ["lang", "\u2713"], ["word", "a b"], ["v", defaultVersion], ["sha256", hash(readFileSync(join(root, bundle)))]]);
  assert.ok(read(root, "contact/index.html").includes("&amp;sha256="));
  const before = read(root, "contact/index.html");
  passed(run(root));
  assert.equal(read(root, "contact/index.html"), before);
});

test("source-location edits preserve quotes, case, whitespace, CRLF, comments, scripts and inert templates", t => {
  const { root } = fixture(t);
  write(root, "assets/css/sub/extra.css", "/* synthetic extra */");
  addLink(root, `<!-- <link rel="stylesheet" href="/assets/css/comment-missing.css"> -->\n<script>const sample = '<link rel="stylesheet" href="/assets/css/string-missing.css">';</script>\n<template><link rel="stylesheet" href="/assets/css/template-missing.css"></template>\n<LINK REL='alternate StyleSheet' HREF = '../assets/css/sub/extra.css?mode=print&amp;v=stale' data-keep="one">\n<link rel=stylesheet href=../assets/css/sub/extra.css data-keep="two">\n<link rel="stylesheet" href =\n"&#x2F;assets/css/sub/extra.css" data-keep="three">\n<noscript><link rel="stylesheet" href="../assets/css/sub/extra.css"></noscript>\n<link rel="preload" as="style" href="/assets/css/sub/extra.css">\n<link rel="preload" as="image" href="/assets/media/synthetic.png">`);
  edit(root, "contact/index.html", html => html.replaceAll("\n", "\r\n"));
  const before = read(root, "contact/index.html");
  passed(run(root));
  const after = read(root, "contact/index.html");
  assert.equal(maskCssHrefs(after), maskCssHrefs(before));
  assert.ok(after.includes("HREF = '../assets/css/sub/extra.css?mode=print&amp;v="));
  assert.ok(after.includes('href="../assets/css/sub/extra.css?v='));
  assert.ok(after.includes('href =\r\n"/assets/css/sub/extra.css?v='));
  const urls = cssLinks(after).map(node => new URL(attr(node, "href"), "https://novapharmhealthcare.com/contact/"));
  assert.equal(urls.filter(url => url.pathname.endsWith("/sub/extra.css")).length, 5);
  assert.ok(urls.filter(url => url.pathname.endsWith("/sub/extra.css")).every(url => url.searchParams.get("sha256") === hash("/* synthetic extra */")));
});

test("CLI --check is read-only and build-site-style import retains publication side effects", t => {
  const { root, records } = fixture(t);
  const before = snapshots(root, records);
  assert.match(passed(run(root, { check: true })), /Checked .*10 pages would change/);
  assert.deepEqual(snapshots(root, records), before);
  assert.match(passed(run(root, { importMode: true })), /Versioned .*10 pages changed/);
  assert.notDeepEqual(snapshots(root, records), before);
  const after = snapshots(root, records);
  assert.match(passed(run(root, { check: true })), /0 pages would change/);
  assert.deepEqual(snapshots(root, records), after);
});

const failures = [
  ["missing register", root => rmSync(join(root, registerFile)), /Missing local file/],
  ["malformed register JSON", root => write(root, registerFile, "{"), /SyntaxError/],
  ["non-array register", root => write(root, registerFile, "{}"), /nonempty array/],
  ["empty register", root => write(root, registerFile, "[]"), /nonempty array/],
  ["null record", root => editRegister(root, rows => [...rows, null]), /Invalid canonical page record/],
  ["missing route", root => editRegister(root, rows => rows.map((row, i) => i ? row : { ...row, route: undefined })), /Canonical route missing/],
  ["unsafe route", root => editRegister(root, rows => rows.map((row, i) => i ? row : { ...row, route: "/../" })), /Unsafe canonical route/],
  ["encoded route", root => editRegister(root, rows => rows.map((row, i) => i ? row : { ...row, route: "/%2e%2e/" })), /Unsafe canonical route/],
  ["file-route mismatch", root => editRegister(root, rows => rows.map((row, i) => i ? row : { ...row, file: "../index.html" })), /file must match its route/],
  ["nonpublic canonical", root => editRegister(root, rows => rows.map((row, i) => i ? row : { ...row, canonical: "https://example.invalid/" })), /Canonical URL must match/],
  ["canonical-route mismatch", root => editRegister(root, rows => rows.map((row, i) => i ? row : { ...row, canonical: "https://novapharmhealthcare.com/about/" })), /Canonical URL must match/],
  ["duplicate register record", root => editRegister(root, rows => [...rows, rows[0]]), /Duplicate canonical page/],
  ["missing final HTML", root => rmSync(join(root, "products/nutraxin/item-one/index.html")), /Missing local file/],
  ["missing generated commerce HTML", root => rmSync(join(root, "products/track/index.html")), /Missing local file/],
  ["generated commerce canonical mismatch", root => edit(root, "products/marketplace/index.html", html => html.replace('rel="canonical" href="https://novapharmhealthcare.com/products/marketplace/"', 'rel="canonical" href="https://novapharmhealthcare.com/products/"')), /HTML canonical disagrees/],
  ["symlinked generated commerce HTML", root => { write(root, "synthetic-commerce.html", read(root, "products/esco/bag/index.html")); rmSync(join(root, "products/esco/bag/index.html")); symlinkSync("../../../synthetic-commerce.html", join(root, "products/esco/bag/index.html")); }, /symbolic links/],
  ["missing noncore CSS", root => rmSync(join(root, "assets/css/contact-premium.css")), /Missing local file/],
  ["CSS directory", root => { rmSync(join(root, bundle)); mkdirSync(join(root, bundle)); }, /regular file/],
  ["symlinked CSS", root => { rmSync(join(root, bundle)); symlinkSync("contact-premium.css", join(root, bundle)); }, /symbolic links/],
  ["CSS symlink escaping assets", root => { write(root, "synthetic-outside.css", "/* synthetic only */"); rmSync(join(root, bundle)); symlinkSync("../../synthetic-outside.css", join(root, bundle)); }, /symbolic links/],
  ["symlinked CSS parent", root => { mkdirSync(join(root, "synthetic-styles")); write(root, "synthetic-styles/sheet.css", "/* synthetic */"); symlinkSync("../../synthetic-styles", join(root, "assets/css/linked")); addLink(root, '<link rel="stylesheet" href="/assets/css/linked/sheet.css">'); }, /symbolic links/],
  ["symlinked HTML", root => { write(root, "synthetic-page.html", read(root, "contact/index.html")); rmSync(join(root, "contact/index.html")); symlinkSync("../synthetic-page.html", join(root, "contact/index.html")); }, /symbolic links/],
  ["symlinked register", root => { write(root, "synthetic-register.json", read(root, registerFile)); rmSync(join(root, registerFile)); symlinkSync("../../synthetic-register.json", join(root, registerFile)); }, /symbolic links/],
  ["HTML canonical missing", root => edit(root, "contact/index.html", html => html.replace(/  <link rel="canonical"[^>]+>\n/, "")), /exactly one canonical link/],
  ["HTML canonical duplicate", root => addLink(root, '<link rel="canonical" href="https://novapharmhealthcare.com/contact/">'), /exactly one canonical link/],
  ["HTML canonical mismatch", root => edit(root, "contact/index.html", html => html.replace('href="https://novapharmhealthcare.com/contact/"', 'href="https://example.invalid/contact/"')), /HTML canonical disagrees/],
  ["canonical in body", root => edit(root, "contact/index.html", html => html.replace('  <link rel="canonical" href="https://novapharmhealthcare.com/contact/">\n', "").replace("<main", '<link rel="canonical" href="https://novapharmhealthcare.com/contact/"><main')), /canonical link must be in head/],
  ["canonical in comment only", root => edit(root, "contact/index.html", html => html.replace(/(<link rel="canonical"[^>]+>)/, "<!-- $1 -->")), /exactly one canonical link/],
  ["canonical in template only", root => edit(root, "contact/index.html", html => html.replace(/(<link rel="canonical"[^>]+>)/, "<template>$1</template>")), /exactly one canonical link/],
  ["base element", root => addLink(root, '<base href="https://example.invalid/">'), /base element/],
  ["duplicate href", root => addLink(root, `<link rel="stylesheet" href="/${bundle}" HREF="/assets/css/other.css">`), /duplicate link attribute/],
  ["duplicate rel", root => addLink(root, `<link rel="preload" REL="stylesheet" href="/${bundle}">`), /duplicate link attribute/],
  ["missing explicit head", root => edit(root, "contact/index.html", html => html.replace("<head>", "")), /explicit head/],
  ["missing head end", root => edit(root, "contact/index.html", html => html.replace("</head>", "")), /explicit head/],
  ["non-UTF8 HTML", root => write(root, "contact/index.html", Buffer.concat([Buffer.from(read(root, "contact/index.html")), Buffer.from([255])])), /must be UTF-8/],
  ["missing all noncore stylesheets", root => edit(root, "contact/index.html", html => html.replace(/  <link rel="stylesheet"[^>]+>\n/g, "")), /at least one actual stylesheet/],
  ["duplicate versioned required stylesheet", root => addLink(root, `<link rel="stylesheet" href="/${bundle}?v=stale">`, "index.html"), /required stylesheet should occur exactly once/],
  ["commented required stylesheet", root => edit(root, "index.html", html => html.replace(/(<link rel="stylesheet"[^>]+>)/, "<!-- $1 -->")), /required stylesheet should occur exactly once/],
  ["missing stylesheet href", root => addLink(root, '<link rel="stylesheet">'), /stylesheet href missing/],
  ["empty stylesheet href", root => addLink(root, '<link rel="stylesheet" href="">'), /unsafe stylesheet href/],
  ["missing preload CSS", root => addLink(root, '<link rel="preload" as="style" href="/assets/css/missing-preload.css">'), /Missing local file/]
];
for (const href of [
  "https://example.invalid/style.css", "https://novapharmhealthcare.com/assets/css/novapharm.bundle.css", "//example.invalid/style.css",
  "javascript:style.css", "data:text/css,body{}", "/assets/css/../css/novapharm.bundle.css", "/assets/css/%2e%2e/novapharm.bundle.css",
  "/assets/css/%6eovapharm.bundle.css", "/assets/css//novapharm.bundle.css", "/assets/css\\novapharm.bundle.css",
  "../../../assets/css/novapharm.bundle.css", "/outside/novapharm.bundle.css", "/assets/css/not-css.png",
  `/${bundle}#fragment`, ` /${bundle}`, `/${bundle}?x=%GG`, `/${bundle}?x=%`, `/${bundle}?x=%FF`,
  `/${bundle}?x=%00`, `/${bundle}?x=%0a`, `/${bundle}?%0d=value`, `/${bundle}?=value`, `/${bundle}?V=old`, `/${bundle}?SHA256=old`, `/${bundle}?x=&Tab;`
]) failures.push([`unsafe href ${JSON.stringify(href)}`, root => bundleHref(root, href), /unsafe stylesheet|safe local CSS|within assets\/css|malformed stylesheet query|ambiguous version parameter/]);
for (const [file, extras] of required) {
  failures.push([`required route ${file}`, root => editRegister(root, rows => rows.filter(row => row.file !== file)), /Required canonical page missing/]);
  for (const name of ["novapharm.bundle.css", ...extras]) {
    failures.push([`required style ${file}:${name}`, root => edit(root, file, html => html.replace(new RegExp(`  <link rel="stylesheet" href="/assets/css/${name.replaceAll(".", "\\.")}(?:\\?[^\"]+)?">\\n`), "")), /required stylesheet should occur exactly once/]);
  }
  failures.push([`approved header logo ${file}`, root => edit(root, file, html => html.replace(logo, "")), /official header logo missing/]);
  failures.push([`comment-only logo ${file}`, root => edit(root, file, html => html.replace(logo, `<!-- ${logo} -->`)), /real header markup/]);
  failures.push([`footer-only logo ${file}`, root => edit(root, file, html => html.replace(`<header class="site-header">${logo}</header>`, `<header class="site-header"></header><footer>${logo}</footer>`)), /real header markup/]);
}
for (const [name, mutate, expected] of failures) {
  test(`fails closed without partial HTML writes: ${name}`, t => {
    const { root, records } = fixture(t);
    mutate(root);
    const existing = records.filter(record => {
      try { return statSync(join(root, record.file)).isFile(); } catch { return false; }
    });
    const before = existing.map(record => readFileSync(join(root, record.file)));
    const result = run(root);
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
    for (const [i, record] of existing.entries()) assert.deepEqual(readFileSync(join(root, record.file)), before[i], record.file);
  });
}

for (const file of [bundle, "contact/index.html"]) {
  test(`rejects concurrent synthetic edits before publication: ${file}`, t => {
    const { root, records } = fixture(t);
    const before = snapshots(root, records);
    const full = join(root, file);
    // Inject a controlled edit after the first read, never against checkout files.
    const setup = `import fs from "node:fs"; import { syncBuiltinESMExports } from "node:module";
const originalRead = fs.readFileSync; let changed = false;
fs.readFileSync = function(path, ...args) {
  const bytes = originalRead.call(this, path, ...args);
  if (path === ${JSON.stringify(full)} && !changed) { changed = true; fs.appendFileSync(path, "\\n<!-- synthetic concurrent edit -->"); }
  return bytes;
}; syncBuiltinESMExports();`;
    const result = run(root, { setup });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, file === bundle ? /CSS changed during versioning/ : /HTML changed during versioning/);
    for (const [i, record] of records.entries()) {
      assert.equal(read(root, record.file), before[i] + (file === record.file ? "\n<!-- synthetic concurrent edit -->" : ""));
    }
  });
}

function independentThemeFixture(t) {
  const data = fixture(t);
  const record = { route: "/products/nutraxin/account/", canonical: "https://novapharmhealthcare.com/products/nutraxin/account/", file: "products/nutraxin/account/index.html" };
  editRegister(data.root, rows => [...rows, record]);
  const stylesheet = "assets/css/nutraxin-consumer-account.css";
  write(data.root, stylesheet, "/* synthetic independent retail theme */\r\n.nx-account { color: #123456; }\r\n");
  write(data.root, record.file, `<!doctype html><html><head><link rel="canonical" href="${record.canonical}"><link rel="stylesheet" href="/${stylesheet}"></head><body><header class="retail-header">Synthetic retail</header></body></html>`);
  return { ...data, records: [...data.records, record], record, stylesheet };
}

test("independent-theme retail canonical pages need no shared bundle or corporate header", t => {
  const { root, records, record, stylesheet } = independentThemeFixture(t);
  const before = read(root, record.file);
  assert.match(passed(run(root)), /Versioned 21 public CSS links across 11 canonical pages/);
  const after = read(root, record.file);
  assert.equal(maskCssHrefs(after), maskCssHrefs(before));
  assert.ok(!after.includes("novapharm.bundle.css"));
  assert.ok(!after.includes("brand-logo"));
  assert.ok(after.includes(`href="/${stylesheet}?v=${defaultVersion}&amp;sha256=${hash(readFileSync(join(root, stylesheet)))}"`));
  const stable = snapshots(root, records);
  assert.match(passed(run(root)), /0 pages changed/);
  assert.deepEqual(snapshots(root, records), stable);
});

for (const mode of ["missing CSS", "no stylesheet", "preload only"]) {
  test(`independent-theme canonical failure leaves all HTML unchanged: ${mode}`, t => {
    const { root, records, record, stylesheet } = independentThemeFixture(t);
    if (mode === "missing CSS") rmSync(join(root, stylesheet));
    else edit(root, record.file, html => html.replace(`<link rel="stylesheet" href="/${stylesheet}">`, mode === "preload only" ? `<link rel="preload" as="style" href="/${stylesheet}">` : ""));
    const before = snapshots(root, records);
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, mode === "missing CSS" ? /Missing local file/ : /at least one actual stylesheet/);
    assert.deepEqual(snapshots(root, records), before);
  });
}

function strictHrefCases(asset, version, digest) {
  const href = (v, sha) => `href="/${asset}?v=${v}${sha === null ? "" : `&amp;sha256=${sha}`}"`;
  return [
    ["exact", href(version, digest), true],
    ["stale digest", href(version, "0".repeat(64)), false],
    ["wrong semantic version", href(`${version}-wrong`, digest), false],
    ["missing hash", href(version, null), false],
    ["truncated hash", href(version, digest.slice(0, -1)), false],
    ["duplicate hash", href(version, `${digest}&amp;sha256=${digest}`), false],
    ["unescaped separator", href(version, digest).replace("&amp;", "&"), false]
  ];
}

const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
const { runInNewContext } = await import("node:vm");
for (const spec of [
  { file: "scripts/test-oncology-content.mjs", asset: "assets/css/oncology-hope-v2.css", version: "20261113-hope-responsive-v7", declarations: ["const approvedLayoutSha256 ="], check: "assert.ok(html.includes(`href=\"/assets/css/oncology-hope-v2.css?" },
  { file: "scripts/test-owner-corrections.mjs", asset: bundle, version: defaultVersion, declarations: ["const publicCssSha256 =", "const expectedPublicCssHref ="], check: "if (!page.includes(expectedPublicCssHref))" },
  { file: "scripts/test-intelligence-technology-page.mjs", asset: "assets/css/technology-intelligence.css", version: defaultVersion, declarations: ["const publicTechnologyCssSha256 =", "const expectedTechnologyCssHref ="], check: "assert.ok(published.includes(expectedTechnologyCssHref)" },
  { file: "scripts/test-intelligence-technology-page.mjs", asset: "assets/css/intelligence-workspace-embedded.css", version: defaultVersion, declarations: ["const publicEmbeddedCssSha256 =", "const expectedEmbeddedCssHref ="], check: "assert.ok(html.includes(expectedEmbeddedCssHref)" },
  { file: "scripts/test-nutraxin-showcase.mjs", asset: "assets/css/nutraxin-lineup.css", version: defaultVersion, declarations: ["const publicNutraxinCssSha256 =", "const expectedNutraxinCssHref ="], check: "assert.ok(page.includes(expectedNutraxinCssHref)" },
  { file: "scripts/test-global-distribution-foundation.mjs", asset: "assets/css/markets-editorial.css", version: "20261111-nasa-hd-1", declarations: ["const publicMarketsCssSha256 =", "const expectedMarketsCssHref ="], check: "assert.ok(html.includes(expectedMarketsCssHref)" }
]) {
  test(`actual JS acceptance assertion requires exact semantic label and full CSS bytes: ${spec.file}`, t => {
    const { root } = fixture(t);
    const readFixtureFile = (file, ...options) => readFileSync(isAbsolute(file) ? file : join(root, file), ...options);
    const bytes = Buffer.from("\ufeff/* synthetic strict acceptance */\r\nbody { color: #fedcba; }\r\n");
    write(root, spec.asset, bytes);
    const lines = read(sourceRoot, spec.file).split("\n");
    const declarations = spec.declarations.map(prefix => {
      const matches = lines.filter(line => line.startsWith(prefix));
      assert.equal(matches.length, 1, prefix);
      return matches[0];
    });
    const checks = lines.filter(line => line.trim().startsWith(spec.check));
    assert.equal(checks.length, 1, spec.check);
    const code = [...declarations, checks[0]].join("\n");
    for (const [name, href, accepted] of strictHrefCases(spec.asset, spec.version, hash(bytes))) {
      const html = `<link rel="stylesheet" ${href}>`;
      const execute = () => runInNewContext(code, { createHash, readFileSync: readFixtureFile, join, resolve, root, html, published: html, page: html, label: "published page", route: "synthetic", assert, fail: message => { throw new Error(message); } }, { timeout: 1000 });
      if (accepted) assert.doesNotThrow(execute, name);
      else assert.throws(execute, undefined, name);
    }
    write(root, spec.asset, Buffer.concat([bytes, Buffer.from("/* newer synthetic CSS */")]));
    const staleHtml = `<link rel="stylesheet" href="/${spec.asset}?v=${spec.version}&amp;sha256=${hash(bytes)}">`;
    assert.throws(() => runInNewContext(code, { createHash, readFileSync: readFixtureFile, join, resolve, root, html: staleHtml, published: staleHtml, page: staleHtml, label: "published page", route: "synthetic", assert, fail: message => { throw new Error(message); } }, { timeout: 1000 }));
  });
}

test("malformed head text cannot move a canonical into the body or partially publish HTML", t => {
  const { root, records } = fixture(t);
  edit(root, "contact/index.html", html => html.replace('<meta charset="utf-8">', '<meta charset="utf-8">>'));
  const before = snapshots(root, records);
  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /explicit head element missing/);
  assert.deepEqual(snapshots(root, records), before);
});

function workflowStepShell(file, name) {
  const lines = read(sourceRoot, file).split("\n");
  const start = lines.findIndex(line => line === `      - name: ${name}`);
  assert.ok(start >= 0, `Missing workflow step: ${name}`);
  const run = lines.findIndex((line, i) => i > start && line === "        run: |");
  assert.ok(run > start);
  const shell = [];
  for (const line of lines.slice(run + 1)) {
    if (line && !line.startsWith("          ")) break;
    shell.push(line.slice(10));
  }
  return shell;
}

const publishWorkflow = ".github/workflows/publish-aws-contact-production.yml";
for (const spec of [
  { file: ".github/workflows/intelligence-live-smoke.yml", step: "Confirm exact research page, assets and protected-business contact", variable: "workspace_css_sha256", asset: "assets/css/intelligence-workspace-embedded.css", version: defaultVersion },
  { file: publishWorkflow, step: "Prove default public website is noncollecting", variable: "distribution_css_sha256", staged: true, asset: "assets/css/global-distribution-editorial.css", version: defaultVersion },
  { file: publishWorkflow, step: "Verify live Global Distribution, Market Access and Markets pages", variable: "distribution_css_sha256", asset: "assets/css/global-distribution-editorial.css", version: defaultVersion },
  { file: publishWorkflow, step: "Verify live Global Distribution, Market Access and Markets pages", variable: "markets_css_sha256", asset: "assets/css/markets-editorial.css", version: "20261111-nasa-hd-1" },
  { file: ".github/workflows/oncology-live-domain-acceptance.yml", step: "Verify exact live Oncology HTML and stylesheet bytes", variable: "oncology_css_sha256", asset: "assets/css/oncology-hope-v2.css", version: "20261113-hope-responsive-v7" },
  { file: publishWorkflow, step: "Prove default public website is noncollecting", variable: "technology_css_sha256", staged: true, asset: "assets/css/intelligence-workspace-embedded.css", version: defaultVersion },
  { file: publishWorkflow, step: "Verify live official Intelligence research with AWS contact preserved", variable: "technology_css_sha256", asset: "assets/css/intelligence-workspace-embedded.css", version: defaultVersion },
  { file: publishWorkflow, step: "Prove default public website is noncollecting", variable: "capabilities_css_sha256", staged: true, asset: "assets/css/capabilities-editorial.css", version: "20261111-capabilities-approved-photo-v5" },
  { file: publishWorkflow, step: "Prove default public website is noncollecting", variable: "oncology_css_sha256", staged: true, asset: "assets/css/oncology-hope-v2.css", version: "20261113-hope-responsive-v7" },
  { file: publishWorkflow, step: "Prove default public website is noncollecting", variable: "products_css_sha256", staged: true, asset: "assets/css/products-editorial.css", version: "20261111-products-layout-v4" },
  { file: publishWorkflow, step: "Verify approved Capabilities Earth, pharmaceutical vial and layout on the live domain", variable: "capabilities_css_sha256", asset: "assets/css/capabilities-editorial.css", version: "20261111-capabilities-approved-photo-v5" },
  { file: publishWorkflow, step: "Verify full-scene Oncology hero and un-cropped mobile styling on live domain", variable: "oncology_css_sha256", asset: "assets/css/oncology-hope-v2.css", version: "20261113-hope-responsive-v7" },
  { file: publishWorkflow, step: "Verify supplied official logo and secure header on four live pages", variable: "bundle_css_sha256", fromBuild: true, asset: bundle, version: defaultVersion }
]) {
  test(`actual Bash acceptance guard rejects stale, wrong-version and missing hashes: ${spec.variable} ${spec.staged ? "staged" : "live"} ${spec.file}`, t => {
    const { root } = fixture(t);
    const shell = workflowStepShell(spec.file, spec.step);
    const assignments = shell.filter(line => line.trim().startsWith(`${spec.variable}=`));
    const cssFile = `${spec.staged ? "_site/" : ""}${spec.asset}`;
    assert.deepEqual(assignments, spec.fromBuild ? ['bundle_css_sha256="$EXPECTED_BUNDLE_CSS_SHA256"']
      : [`${spec.variable}="$(sha256sum ${cssFile})"`, `${spec.variable}="\${${spec.variable}%% *}"`]);
    const validations = spec.fromBuild ? shell.filter(line => line.includes('[[ "$bundle_css_sha256" =~')) : [];
    if (spec.fromBuild) assert.deepEqual(validations, ['[[ "$bundle_css_sha256" =~ ^[0-9a-f]{64}$ ]] || exit 1']);
    const checks = shell.filter(line => line.includes(`href=\\\"/${spec.asset}?v=${spec.version}&amp;sha256=\${${spec.variable}}`));
    assert.equal(checks.length, 1);
    const pattern = checks[0].match(/grep -Fq ("(?:\\.|[^"\\])*")/)?.[1];
    assert.ok(pattern, "Missing exact fixed-string grep assertion");
    // Execute only the real digest assignments and grep expression, never a workflow body.
    const code = ["set -euo pipefail", ...assignments, ...validations, `grep -Fq ${pattern} "$1"`].join("\n");
    const bytes = Buffer.from("/* synthetic workflow CSS */\r\nbody { color: #abcdef; }\r\n");
    write(root, cssFile, bytes);
    const htmlFile = join(root, "strict-workflow-fixture.html");
    for (const [name, href, accepted] of strictHrefCases(spec.asset, spec.version, hash(bytes))) {
      writeFileSync(htmlFile, `<link rel="stylesheet" ${href}>`);
      const result = spawnSync("bash", ["-c", code, "strict-css-test", htmlFile], { cwd: root, encoding: "utf8", timeout: 5000,
        env: { ...process.env, EXPECTED_BUNDLE_CSS_SHA256: hash(readFileSync(join(root, cssFile))) } });
      assert.equal(result.error, undefined);
      assert.equal(result.status === 0, accepted, `${name}: ${result.stderr}`);
    }
    writeFileSync(htmlFile, `<link rel="stylesheet" href="/${spec.asset}?v=${spec.version}&amp;sha256=${hash(bytes)}">`);
    write(root, cssFile, Buffer.concat([bytes, Buffer.from("/* newer staged/local CSS */")]));
    const stale = spawnSync("bash", ["-c", code, "strict-css-test", htmlFile], { cwd: root, encoding: "utf8", timeout: 5000,
      env: { ...process.env, EXPECTED_BUNDLE_CSS_SHA256: hash(readFileSync(join(root, cssFile))) } });
    assert.equal(stale.status, 1, stale.stderr);
  });
}

test("commercial routes preserve the approved Markets label and bind every stylesheet", t => {
  const { root } = fixture(t);
  const records = ["distribution", "market-access", "markets"].map(slug => ({
    route: `/${slug}/`, file: `${slug}/index.html`, canonical: `https://novapharmhealthcare.com/${slug}/`,
  }));
  write(root, "assets/css/global-distribution-editorial.css", "/* synthetic distribution */");
  write(root, "assets/css/markets-editorial.css", "/* synthetic approved Markets */");
  for (const page of records) write(root, page.file,
    `<html><head><link rel="canonical" href="${page.canonical}"><link rel="stylesheet" href="/assets/css/global-distribution-editorial.css">${page.route === "/markets/" ? '<link rel="stylesheet" href="/assets/css/markets-editorial.css?v=20261111-nasa-hd-1">' : ""}</head><body>Separate commercial theme</body></html>`);
  editRegister(root, pages => [...pages, ...records]);
  passed(run(root));
  for (const page of records) for (const node of cssLinks(read(root, page.file))) {
    const url = new URL(attr(node, "href"), page.canonical);
    assert.equal(url.searchParams.get("v"), url.pathname.endsWith("/markets-editorial.css") ? "20261111-nasa-hd-1" : defaultVersion);
    assert.equal(url.searchParams.get("sha256"), hash(readFileSync(join(root, url.pathname.slice(1)))));
  }
  assert.match(passed(run(root)), /0 pages changed/);
});

test("late-generated published commerce pages receive content keys without changing the SEO register", t => {
  const { root } = fixture(t);
  const originalRegister = read(root, registerFile);
  const records = ["products/esco/bag", "products/marketplace", "products/track"].map(slug => ({
    file: `${slug}/index.html`, canonical: `https://novapharmhealthcare.com/${slug}/`,
  }));
  for (const page of records) write(root, page.file,
    `<html><head><link rel="canonical" href="${page.canonical}"><link rel="stylesheet" href="/${bundle}"><link rel="stylesheet" href="/assets/css/nutraxin-merchant.css"></head><body>Generated commerce fixture</body></html>`);
  passed(run(root));
  for (const page of records) for (const node of cssLinks(read(root, page.file))) {
    const url = new URL(attr(node, "href"), page.canonical);
    assert.equal(url.searchParams.get("sha256"), hash(readFileSync(join(root, url.pathname.slice(1)))), page.file);
  }
  assert.equal(read(root, registerFile), originalRegister);
  write(root, bundle, "/* changed shared CSS for the late commerce pages */");
  passed(run(root));
  for (const page of records) {
    const url = new URL(attr(cssLinks(read(root, page.file))[0], "href"), page.canonical);
    assert.equal(url.searchParams.get("sha256"), hash(read(root, bundle)), page.file);
  }
  assert.match(passed(run(root)), /0 pages changed/);
});

test("the approved About semantic label survives content-bound versioning", t => {
  const { root } = fixture(t);
  edit(root, "about/index.html", html => html.replace('href="/assets/css/about-editorial.css"',
    'href="/assets/css/about-editorial.css?v=20261111-about-aa-contrast-v1"'));
  passed(run(root));
  const link = cssLinks(read(root, "about/index.html")).find(node => attr(node, "href").startsWith("/assets/css/about-editorial.css"));
  const url = new URL(attr(link, "href"), "https://novapharmhealthcare.com/about/");
  assert.equal(url.searchParams.get("v"), "20261111-about-aa-contrast-v1");
  assert.equal(url.searchParams.get("sha256"), hash(read(root, "assets/css/about-editorial.css")));
});

test("commerce pages already present in a later SEO register are not duplicated", t => {
  const { root, records } = fixture(t);
  editRegister(root, () => records);
  const originalRegister = read(root, registerFile);
  assert.match(passed(run(root)), /Versioned 20 public CSS links across 10 canonical pages/);
  assert.equal(read(root, registerFile), originalRegister);
  assert.match(passed(run(root)), /0 pages changed/);
});

for (const [file, command] of [
  ["intelligence-three-plan-public-pricing.yml", "npm run test:technology-page"],
  ["intelligence-gbp-pricing-review.yml", "node scripts/test-intelligence-technology-page.mjs"],
  ["intelligence-research-acceptance.yml", "node scripts/test-intelligence-technology-page.mjs"],
]) {
  test(`published-page workflow builds the actual public output before checking content keys: ${file}`, () => {
    const source = read(sourceRoot, `.github/workflows/${file}`);
    const install = source.indexOf("run: npm ci");
    const build = source.indexOf("run: npm run build:public-only");
    const check = source.indexOf(`run: ${command}`);
    assert.ok(install >= 0 && build > install && check > build);
    assert.doesNotMatch(source, /NOVAPHARM_CONTACT_RELEASE_ACCEPTED|NOVAPHARM_CONTACT_API_ORIGIN/);
  });
}

test("live Technology pricing checks match current markup and reject retired calls to action", t => {
  const { root } = fixture(t);
  const lines = workflowStepShell(".github/workflows/intelligence-live-smoke.yml", "Confirm exact research page, assets and protected-business contact");
  const start = lines.findIndex(line => line.includes("grep -Fq 'id=\"intelligence-pricing\"'"));
  const end = lines.findIndex((line, index) => index > start && line.includes("grep -Fq 'novapharm-intelligence-hero.avif'"));
  assert.ok(start >= 0 && end > start);
  const checks = lines.slice(start, end).map(line => line.match(/grep -Fq ('[^']+') \/tmp\/novapharm-technology-live\.html/)?.[1]).filter(Boolean);
  assert.equal(checks.length, 8, "Keep the pricing heading, four plan identities and two current action checks");
  const canonical = read(sourceRoot, "src/content/technology-intelligence.html");
  const htmlFile = join(root, "current-technology.html");
  const code = ["set -euo pipefail", ...checks.map(pattern => `grep -Fq ${pattern} "$1"`)].join("\n");
  const inspect = markup => {
    writeFileSync(htmlFile, markup);
    const result = spawnSync("bash", ["-c", code, "pricing-live-check", htmlFile], { encoding: "utf8", timeout: 5000 });
    assert.equal(result.error, undefined);
    return result.status;
  };
  assert.equal(inspect(canonical), 0, "The actual live workflow must accept current canonical pricing markup");
  assert.equal(inspect(canonical.replaceAll("Create free account", "Request free trial")), 1, "Retired trial action must not pass");
  assert.equal(inspect(canonical.replaceAll("Subscribe", "Request Professional")), 1, "Retired paid action must not pass");
  assert.equal(inspect(canonical.replaceAll('data-npi-plan="trial"', 'data-npi-plan="missing"')), 1, "Missing trial plan must not pass");
});

test("deployment bundle guard binds generated staged bytes rather than stale checkout bytes", t => {
  const { root } = fixture(t);
  const shell = workflowStepShell(publishWorkflow, "Verify supplied official logo and secure header on four live pages");
  const assignments = shell.filter(line => line.trim().startsWith("bundle_css_sha256="));
  const validations = shell.filter(line => line.includes('[[ "$bundle_css_sha256" =~'));
  const pattern = shell.find(line => line.includes("href=\\\"/assets/css/novapharm.bundle.css?"))?.match(/grep -Fq ("(?:\\.|[^"\\])*")/)?.[1];
  assert.ok(pattern);
  const code = ["set -euo pipefail", ...assignments, ...validations, `grep -Fq ${pattern} "$1"`].join("\n");
  const staged = "/* generated from reviewed configuration, not the checkout cache */";
  write(root, bundle, "/* older checked-in generated bundle */");
  const htmlFile = join(root, "deployed.html");
  writeFileSync(htmlFile, `<link rel="stylesheet" href="/${bundle}?v=${defaultVersion}&amp;sha256=${hash(staged)}">`);
  const inspect = receipt => spawnSync("bash", ["-c", code, "staged-digest-test", htmlFile], {
    cwd: root, encoding: "utf8", timeout: 5000,
    env: { ...process.env, EXPECTED_BUNDLE_CSS_SHA256: receipt },
  });
  const accepted = inspect(hash(staged));
  assert.equal(accepted.error, undefined);
  assert.equal(accepted.status, 0, "The published generated bundle must be checked against the build receipt");
  for (const receipt of ["", "invalid", hash("older build"), hash(staged).slice(0, 40)]) {
    assert.notEqual(inspect(receipt).status, 0, "Missing, malformed or stale build receipt must fail closed");
  }
  write(root, bundle, "/* another stale checkout cache must not influence the receipt */");
  assert.equal(inspect(hash(staged)).status, 0);
});

test("build receipt is emitted only after all staged bundle links match and is fenced before deployment", t => {
  const { root } = fixture(t);
  const workflow = read(sourceRoot, publishWorkflow);
  assert.match(workflow, /bundle_css_sha256: \$\{\{ steps\.public_css\.outputs\.bundle_css_sha256 \}\}/);
  assert.equal((workflow.match(/EXPECTED_BUNDLE_CSS_SHA256: \$\{\{ needs\.build-and-verify\.outputs\.bundle_css_sha256 \}\}/g) ?? []).length, 2);
  const producer = workflowStepShell(publishWorkflow, "Bind staged shared stylesheet to deployment receipt").join("\n");
  const fence = workflowStepShell(publishWorkflow, "Prove forward-only release ancestry and deploy evidence").join("\n");
  assert.ok(fence.includes('[[ "$EXPECTED_BUNDLE_CSS_SHA256" =~ ^[0-9a-f]{64}$ ]]'));
  assert.ok(workflow.indexOf("Bind staged shared stylesheet to deployment receipt") < workflow.indexOf("Upload exact verified Pages artifact"));
  assert.ok(workflow.indexOf("Prove forward-only release ancestry and deploy evidence") < workflow.indexOf("Publish verified Pages artifact"));
  const bytes = "/* synthetic build output */";
  write(root, `_site/${bundle}`, bytes);
  const html = `<link rel="stylesheet" href="/${bundle}?v=${defaultVersion}&amp;sha256=${hash(bytes)}">`;
  const pages = ["index.html", "capabilities/index.html", "oncology/index.html", "products/index.html"];
  for (const page of pages) write(root, `_site/${page}`, html);
  const output = join(root, "output.txt");
  const inspect = () => spawnSync("bash", ["-c", producer], { cwd: root, encoding: "utf8", timeout: 5000, env: { ...process.env, GITHUB_OUTPUT: output } });
  const valid = inspect();
  assert.equal(valid.error, undefined);
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(readFileSync(output, "utf8"), `bundle_css_sha256=${hash(bytes)}\n`);
  rmSync(output);
  for (const page of pages) {
    write(root, `_site/${page}`, html.replace(hash(bytes), hash("stale output")));
    assert.notEqual(inspect().status, 0, page);
    assert.equal(spawnSync("test", ["-e", output]).status, 1, "No receipt may be emitted after refusal");
    write(root, `_site/${page}`, html);
  }
  write(root, `_site/${bundle}`, "");
  assert.notEqual(inspect().status, 0);
});

test("invalid deployment receipts stop before any ancestry command executes", t => {
  const { root } = fixture(t);
  const fence = workflowStepShell(publishWorkflow, "Prove forward-only release ancestry and deploy evidence").join("\n");
  const marker = join(root, "ancestry-command-called.txt");
  const code = `node() { printf 'called\\n' >> "$PROBE_OUTPUT"; }\n${fence}`;
  const inspect = receipt => spawnSync("bash", ["-c", code], { cwd: root, encoding: "utf8", timeout: 5000,
    env: { PATH: process.env.PATH, PROBE_OUTPUT: marker, ...(receipt === undefined ? {} : { EXPECTED_BUNDLE_CSS_SHA256: receipt }) } });
  for (const receipt of [undefined, "", "invalid", "a".repeat(40), "A".repeat(64)]) {
    const result = inspect(receipt);
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0, "Invalid receipt must make the actual fence fail");
    assert.equal(spawnSync("test", ["-e", marker]).status, 1, "Invalid receipt reached the ancestry command");
  }
  assert.equal(inspect(hash("synthetic staged bundle")).status, 0);
  assert.equal(readFileSync(marker, "utf8"), "called\n");
});
