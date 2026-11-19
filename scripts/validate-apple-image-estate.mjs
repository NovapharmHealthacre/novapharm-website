import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { parse } from "parse5";
import sharp from "sharp";

/**
 * Estate-wide, read-only image source census for the exact published HTML.
 * The browser matrix separately checks geometry and actual decoding.
 * Apple: HIG Images, Layout and Color, interpreted for the web.
 */
const root = resolve(process.cwd());
const output = join(root, "artifacts", "apple-images", "estate-audit.json");
const origin = "https://novapharmhealthcare.com";
const issues = [];
const advisories = [];
const placements = [];
const rasterExtensions = new Set([".avif", ".webp", ".jpg", ".jpeg", ".png"]);
const mediaExtensions = new Set([...rasterExtensions, ".svg", ".gif"]);
const track = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);
const publicPages = track.filter(path =>
  (path === "index.html" || path.endsWith("/index.html")) &&
  !/^(?:apps|packages|src|_site|artifacts|tests|node_modules)\//.test(path)
);
if (publicPages.length < 60) throw new Error("Image audit cannot silently drop public pages (" + publicPages.length + ")");
const recordedAssets = track.filter(path =>
  (/^assets\//.test(path) || /^apps\/[^/]+\/public\//.test(path) ||
    /^[^/]+\.(?:png|webp|jpe?g|avif)$/i.test(path)) &&
  rasterExtensions.has(extname(path).toLowerCase())
);
if (recordedAssets.length < 300) throw new Error("Image audit cannot silently drop media assets (" + recordedAssets.length + ")");

function attr(node, name) {
  return node.attrs?.find(a => a.name === name)?.value;
}
function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
  if (node.content) walk(node.content, visit);
}
function resolveAsset(uri, page, label) {
  if (!uri || uri === "none") {
    issues.push({ page, issue: "Missing " + label });
    return null;
  }
  if (uri.startsWith("data:image/")) return { inline: true };
  if (/^(?:blob:|data:)/.test(uri)) {
    issues.push({ page, issue: "Unsupported image URL for " + label });
    return null;
  }
  let url;
  try {
    url = new URL(uri, new URL(page === "index.html" ? "/" : "/" + dirname(page) + "/", origin));
  } catch {
    issues.push({ page, issue: "Malformed " + label + ": " + uri.slice(0, 180) });
    return null;
  }
  if (url.origin !== origin) {
    if (url.protocol !== "https:") issues.push({ page, issue: "Non-HTTPS external image: " + url.toString().slice(0, 180) });
    else advisories.push({ page, issue: "External image needs independently verified availability: " + url.hostname });
    return { external: true };
  }
  const name = decodeURIComponent(url.pathname).slice(1);
  if (name.includes("\\") || name.includes("\0") || name.split("/").includes("..")) {
    issues.push({ page, issue: "Unsafe local image path: " + name });
    return null;
  }
  const full = resolve(root, name);
  if (!full.startsWith(root + sep) || !existsSync(full)) {
    issues.push({ page, issue: "Broken " + label + ": /" + name });
    return null;
  }
  if (!mediaExtensions.has(extname(name).toLowerCase()) && !name.endsWith(".ico")) {
    issues.push({ page, issue: "Unexpected " + label + " type: /" + name });
  }
  return { path: name };
}
function srcsetPaths(source, page, label) {
  const candidates = source.split(",").map(s => s.trim()).filter(Boolean);
  if (!candidates.length) issues.push({ page, issue: "Empty " + label });
  let previousWidth = 0;
  for (const candidate of candidates) {
    const parts = candidate.split(/\s+/);
    resolveAsset(parts[0], page, label);
    const descriptor = parts[1];
    if (descriptor?.endsWith("w")) {
      const width = Number(descriptor.slice(0, -1));
      if (!Number.isInteger(width) || width <= previousWidth) {
        issues.push({ page, issue: "Non-increasing width descriptor: " + candidate.slice(0, 120) });
      }
      previousWidth = width;
    }
    if (descriptor && !/^\d+(?:\.\d+)?(?:w|x)$/.test(descriptor)) {
      issues.push({ page, issue: "Invalid image descriptor: " + candidate.slice(0, 120) });
    }
  }
}
for (const page of publicPages) {
  const html = readFileSync(join(root, page), "utf8");
  const doc = parse(html);
  let imageCount = 0;
  walk(doc, node => {
    if (node.tagName === "img") {
      imageCount++;
      const src = attr(node, "src");
      const alt = attr(node, "alt");
      const width = Number(attr(node, "width"));
      const height = Number(attr(node, "height"));
      if (alt === undefined) issues.push({ page, issue: "Image missing explicit alt: " + String(src).slice(0, 160) });
      if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
        issues.push({ page, issue: "Image missing positive intrinsic dimensions: " + String(src).slice(0, 160) });
      }
      const asset = resolveAsset(src, page, "img src");
      if (asset?.path) {
        placements.push({ page, src: asset.path, width, height, alt: alt ?? null });
      }
      const srcset = attr(node, "srcset");
      if (srcset) srcsetPaths(srcset, page, "img srcset");
    } else if (node.tagName === "source") {
      const srcset = attr(node, "srcset");
      if (srcset) srcsetPaths(srcset, page, "picture source srcset");
    }
  });
  if (imageCount === 0) advisories.push({ page, issue: "No image elements; typography-only page" });
}

// Resolve every local CSS background photo and image URL as well as img/srcset.
// Ignore inline color/font data and fragment-only mask references.
const cssImagePaths = new Set();
for (const css of track.filter(path => path.startsWith("assets/css/") && path.endsWith(".css"))) {
  const source = readFileSync(join(root, css), "utf8");
  for (const match of source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g)) {
    const uri = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (!uri || uri.startsWith("data:") || uri.startsWith("#")) continue;
    let pathname;
    try { pathname = new URL(uri, new URL("/" + css, origin)).pathname; } catch { continue; }
    if (!mediaExtensions.has(extname(pathname).toLowerCase())) continue;
    const record = resolveAsset(uri, css, "CSS image URL");
    if (record?.path) cssImagePaths.add(record.path);
  }
}

const media = [];
const seen = new Set();
for (const name of recordedAssets) {
  if (seen.has(name)) continue;
  seen.add(name);
  try {
    const meta = await sharp(join(root, name), { failOn: "error" }).metadata();
    const size = Number(meta.size ?? 0);
    if (!meta.width || !meta.height) issues.push({ page: name, issue: "Raster has invalid pixel dimensions" });
    if (meta.space === "cmyk" || meta.space === "lab") {
      issues.push({ page: name, issue: "Raster colorspace requires review before browser delivery: " + meta.space });
    }
    media.push({ path: name, width: meta.width, height: meta.height,
      format: meta.format, space: meta.space ?? null, hasICC: Boolean(meta.icc),
      bytes: size, orientation: meta.orientation ?? 1 });
  } catch (error) {
    issues.push({ page: name, issue: "Cannot decode raster metadata: " + String(error.message).slice(0, 160) });
  }
}
const byName = new Map(media.map(x => [x.path, x]));
for (const item of placements) {
  const meta = byName.get(item.src);
  if (!meta) continue;
  const actual = meta.width / meta.height;
  const declared = item.width / item.height;
  if (Number.isFinite(declared) && Math.abs(Math.log(actual / declared)) > 0.12) {
    issues.push({ page: item.page, issue: "Intrinsic dimensions distort image ratio " + item.src +
      ": declared " + item.width + "x" + item.height + " actual " + meta.width + "x" + meta.height });
  }
}
mkdirSync(dirname(output), { recursive: true });
const report = {
  reviewed: new Date().toISOString(), guideline: "Apple HIG Images + Layout + Color, adapted to web",
  publicPages: publicPages.length, imagePlacements: placements.length,
  rasterAssets: recordedAssets.length, cssImageReferences: cssImagePaths.size, issues, advisories,
  media, placements
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ pages: report.publicPages, placements: report.imagePlacements,
  rasterAssets: report.rasterAssets, cssImageReferences:report.cssImageReferences, issues: issues.length, advisories: advisories.length,
  firstIssues: issues.slice(0, 30), firstAdvisories: advisories.slice(0, 8) }, null, 2));
if (issues.length) process.exitCode = 1;
