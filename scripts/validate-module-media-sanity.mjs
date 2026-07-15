import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import sharp from "sharp";

const root = resolve(process.cwd());
const read = (path) => readFileSync(join(root, path), "utf8");
const config = JSON.parse(read("config/module-art-direction.json"));
const productionRegister = JSON.parse(read("creative-assets/module-media-asset-register.json"));
const assets = new Map(config.assets.map((asset) => [asset.id, asset]));
const excludedDirectories = new Set([".git", "node_modules", "audit", "coverage", "dist", ".runtime"]);

function diskPath(webPath) {
  return join(root, webPath.replace(/^\//, ""));
}

function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function htmlRoute(path) {
  const normalised = path.split(sep).join("/");
  if (normalised === "index.html") return "/";
  if (normalised.endsWith("/index.html")) return `/${normalised.slice(0, -"index.html".length)}`;
  return `/${normalised}`;
}

function publicRoute(value) {
  return new URL(value, "https://novapharmhealthcare.com").pathname;
}

function collectHtml(directory = root, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(path, output);
    if (entry.isFile() && entry.name.endsWith(".html")) output.push(path);
  }
  return output;
}

async function differenceHash(path) {
  const { data } = await sharp(path)
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let result = 0n;
  let bit = 0n;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      if (data[(row * 9) + column] > data[(row * 9) + column + 1]) result |= 1n << bit;
      bit += 1n;
    }
  }
  return result;
}

function hammingDistance(left, right) {
  let value = left ^ right;
  let count = 0;
  while (value) {
    count += Number(value & 1n);
    value >>= 1n;
  }
  return count;
}

const htmlDocuments = collectHtml().map((path) => ({
  path,
  relativePath: relative(root, path),
  route: htmlRoute(relative(root, path)),
  html: readFileSync(path, "utf8")
}));

assert.equal(config.modules.length, 16, "exactly sixteen principal public modules must be registered");
assert.equal(new Set(config.modules.map((entry) => entry.id)).size, 16, "module IDs must be unique");
assert.equal(new Set(config.modules.map((entry) => entry.path)).size, 16, "module paths must be unique");
assert.equal(new Set(config.modules.map((entry) => entry.route)).size, 16, "module routes must be unique");
assert.equal(new Set(config.assets.map((entry) => entry.id)).size, config.assets.length, "asset IDs must be unique");
assert.equal(new Set(config.assets.map((entry) => entry.base)).size, config.assets.length, "asset paths must be unique");

const principalHeroes = config.modules.filter((module) => module.heroAsset).map((module) => module.heroAsset);
assert.equal(new Set(principalHeroes).size, principalHeroes.length, "every principal module must have a unique hero asset");

for (const module of config.modules) {
  assert.ok(module.purpose && module.label && module.signals.length >= 4, `${module.id} requires complete art direction`);
  if (module.heroAsset && module.secondaryAsset) {
    assert.notEqual(module.heroAsset, module.secondaryAsset, `${module.id} cannot repeat one image as hero and secondary media`);
  }
  const html = read(module.path);
  if (module.id === "home") {
    assert.match(html, /hero-cinematic-layer/, "homepage cinematic hero must remain present");
    assert.match(html, /hero-uk-marker/, "homepage must identify the United Kingdom home market");
    assert.match(html, /sourcing-route-grid/, "homepage must use the three-route sourcing composition");
    assert.match(html, /partner-pathway-grid/, "homepage must use four distinct partner pathways");
    assert.match(html, /data-media-asset="regulatory-batch-integrity"/, "homepage batch-integrity media must be photographic");
    continue;
  }
  assert.match(html, new RegExp(`data-module-media="${module.id}"`), `${module.id} must have a module-specific hero`);
  assert.match(html, /module-signal/, `${module.id} must have a subject-specific signal layer`);
  if (module.heroAsset) {
    const asset = assets.get(module.heroAsset);
    assert.ok(asset, `${module.id} references an unknown hero asset`);
    assert.ok(html.includes(asset.base), `${module.id} must render its registered hero asset`);
  }
  assert.doesNotMatch(html, /assets\/media\/editorial\/[^"']+\.svg/, `${module.id} must not retain decorative editorial SVG imagery`);
}

for (const moduleId of ["services", "regulatory", "partners", "technology"]) {
  const module = config.modules.find((entry) => entry.id === moduleId);
  const secondary = assets.get(module.secondaryAsset);
  assert.ok(read(module.path).includes(secondary.base), `${module.path} must include its tailored secondary photography`);
}
assert.match(read("regulatory-services/index.html"), /regulatory-control-track/, "Regulatory must use a staged control sequence");
assert.match(read("technology/index.html"), /architecture-map-photographic/, "Technology must use the photographic control architecture");
assert.match(read("leadership/index.html"), /module-portrait-composition/, "Leadership must use approved portraits");
assert.match(read("product-portfolio/index.html"), /portfolio-media/, "Product Portfolio must retain category-specific product media");
assert.doesNotMatch(read("index.html"), /partner-ecosystem-grid/, "Homepage must not retain the generic repeated partner grid");

const generatedRegister = new Map(productionRegister.assets.map((asset) => [asset.id, asset]));
const generatedAssets = config.assets.filter((asset) => asset.sourceType === "generated");
assert.equal(generatedRegister.size, generatedAssets.length, "generated asset register must cover every generated image");

const byteBudgets = {
  "1600-jpg": 220_000,
  "1600-webp": 140_000,
  "1600-avif": 90_000,
  "960-jpg": 110_000,
  "960-webp": 80_000,
  "960-avif": 60_000
};

for (const asset of generatedAssets) {
  const record = generatedRegister.get(asset.id);
  assert.ok(record, `${asset.id} is missing from the production asset register`);
  assert.equal(record.sourceReference, asset.sourceReference, `${asset.id} provenance must match the canonical registry`);
  assert.deepEqual(record.allowedRoutes, asset.allowedRoutes, `${asset.id} route permissions must match the canonical registry`);
  assert.equal(record.maxReuse, asset.maxReuse, `${asset.id} reuse policy must match the canonical registry`);
  assert.ok(asset.alt && asset.caption && asset.subject, `${asset.id} requires subject, alt text and caption`);
  assert.ok(asset.focalPoint?.desktop && asset.focalPoint?.mobile, `${asset.id} requires responsive focal points`);
  assert.ok(asset.structuredDataRelationship, `${asset.id} requires a structured-data relationship`);

  for (const [key, expected] of Object.entries(record.derivatives)) {
    const path = join(root, expected.path);
    assert.ok(existsSync(path), `${asset.id} is missing ${key}`);
    const metadata = await sharp(path).metadata();
    assert.equal(metadata.width, expected.width, `${asset.id} ${key} width mismatch`);
    assert.equal(metadata.height, expected.height, `${asset.id} ${key} height mismatch`);
    assert.equal(statSync(path).size, expected.byteSize, `${asset.id} ${key} byte count changed without regenerating the register`);
    assert.equal(hash(path), expected.sha256, `${asset.id} ${key} hash changed without regenerating the register`);
    assert.ok(expected.byteSize <= byteBudgets[key], `${asset.id} ${key} exceeds the ${byteBudgets[key]} byte budget`);
  }
}

const imageHashes = new Map();
const perceptualHashes = [];
for (const asset of config.assets) {
  const jpg = diskPath(`${asset.base}.jpg`);
  assert.ok(existsSync(jpg), `${asset.id} is missing its JPEG fallback`);
  const digest = hash(jpg);
  assert.ok(!imageHashes.has(digest), `${asset.id} is byte-identical to ${imageHashes.get(digest)}`);
  imageHashes.set(digest, asset.id);
  perceptualHashes.push({ id: asset.id, value: await differenceHash(jpg) });

  const usedRoutes = new Set(htmlDocuments.filter((document) => document.html.includes(asset.base)).map((document) => document.route));
  const allowedRoutes = new Set(asset.allowedRoutes.map(publicRoute));
  assert.ok(usedRoutes.size > 0, `${asset.id} is registered but unused`);
  assert.ok(usedRoutes.size <= asset.maxReuse, `${asset.id} is used on ${usedRoutes.size} routes, above its limit of ${asset.maxReuse}`);
  for (const route of usedRoutes) {
    assert.ok(allowedRoutes.has(route), `${asset.id} is used on unapproved route ${route}`);
  }
}

for (let left = 0; left < perceptualHashes.length; left += 1) {
  for (let right = left + 1; right < perceptualHashes.length; right += 1) {
    const distance = hammingDistance(perceptualHashes[left].value, perceptualHashes[right].value);
    assert.ok(
      distance > config.policies.perceptualDuplicateThreshold,
      `${perceptualHashes[left].id} and ${perceptualHashes[right].id} are perceptually too similar (${distance})`
    );
  }
}

const productionImageUsage = new Map();
const productionImagePlacements = new Map();
const productionMediaPattern = /\/assets\/media\/(modules|stories|insights|products)\/([a-z0-9-]+?)(?:-960)?\.(?:avif|webp|jpe?g)/g;
const productionImagePattern = /<img[^>]+src="(\/assets\/media\/(modules|stories|insights|products)\/([a-z0-9-]+)\.jpg)"[^>]*>/g;
for (const document of htmlDocuments) {
  for (const match of document.html.matchAll(productionMediaPattern)) {
    const base = `/assets/media/${match[1]}/${match[2]}`;
    if (!productionImageUsage.has(base)) productionImageUsage.set(base, new Set());
    productionImageUsage.get(base).add(document.route);
  }
  for (const match of document.html.matchAll(productionImagePattern)) {
    const base = match[1].slice(0, -4);
    productionImagePlacements.set(base, (productionImagePlacements.get(base) || 0) + 1);
  }
}

const configuredBases = new Set(config.assets.map((asset) => asset.base));
for (const [base, routes] of productionImageUsage) {
  assert.ok(routes.size <= config.policies.generalMaximumUses, `${base} appears on more than two public routes`);
  if (base.startsWith("/assets/media/modules/") || base.startsWith("/assets/media/stories/") || base.startsWith("/assets/media/insights/")) {
    assert.ok(configuredBases.has(base), `${base} is production media without a canonical registry entry`);
  }
  if (base.startsWith("/assets/media/products/")) {
    for (const route of routes) {
      assert.ok(route === "/" || route === "/product-portfolio/", `${base} leaks product photography into unrelated route ${route}`);
    }
  }
}

for (const [base, count] of productionImagePlacements) {
  assert.ok(count <= config.policies.generalMaximumUses, `${base} has ${count} visible placements, above the two-placement limit`);
}

for (const document of htmlDocuments) {
  assert.doesNotMatch(document.html, /<picture(?:\s[^>]*)?>\s*<\/picture>/, `${document.relativePath} contains an empty picture`);
  assert.doesNotMatch(document.html, /<img(?![^>]*\bsrc=)[^>]*>/, `${document.relativePath} contains an image without a source`);
}

const css = read("assets/css/module-media-sanity.css");
const legacyVisualCss = read("assets/css/visual-refinement.css");
assert.match(css, /page-hero-cinematic/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /modulePhotoDrift/);
assert.match(css, /article-grid-editorial-links/);
for (const page of ["services", "regulatory-services", "partner-with-us", "technology"]) {
  assert.doesNotMatch(
    legacyVisualCss,
    new RegExp(`body\\[data-page="${page}"\\] \\.page-hero::after[^\\n]*assets/media/products`),
    `${page} must not retain a product-photo CSS fallback`
  );
}

console.log(`Unique module art direction passed: ${config.modules.length} principal modules, ${config.assets.length} registered assets, ${generatedAssets.length} generated media sets, route-aware reuse limits, byte hashes and perceptual duplicate checks.`);
