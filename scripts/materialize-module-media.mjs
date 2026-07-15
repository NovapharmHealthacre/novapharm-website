import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(process.cwd());
const config = JSON.parse(readFileSync(join(root, "config/module-art-direction.json"), "utf8"));
const generatedAssets = config.assets.filter((asset) => asset.sourceType === "generated");

function diskPath(webPath) {
  return join(root, webPath.replace(/^\//, ""));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function derivativeRecord(path, width, height, contentType) {
  return {
    path: path.replace(`${root}/`, ""),
    contentType,
    width,
    height,
    byteSize: statSync(path).size,
    sha256: sha256(path)
  };
}

async function renderAsset(asset) {
  const base = diskPath(asset.base);
  const source = `${base}-source.png`;
  const targets = [
    { path: `${base}.jpg`, width: 1600, height: 900, format: "jpeg", options: { quality: 80, mozjpeg: true }, type: "image/jpeg" },
    { path: `${base}.webp`, width: 1600, height: 900, format: "webp", options: { quality: 72, smartSubsample: true }, type: "image/webp" },
    { path: `${base}.avif`, width: 1600, height: 900, format: "avif", options: { quality: 48, effort: 5 }, type: "image/avif" },
    { path: `${base}-960.jpg`, width: 960, height: 540, format: "jpeg", options: { quality: 78, mozjpeg: true }, type: "image/jpeg" },
    { path: `${base}-960.webp`, width: 960, height: 540, format: "webp", options: { quality: 70, smartSubsample: true }, type: "image/webp" },
    { path: `${base}-960.avif`, width: 960, height: 540, format: "avif", options: { quality: 46, effort: 5 }, type: "image/avif" }
  ];

  if (existsSync(source)) {
    for (const target of targets) {
      await sharp(source)
        .rotate()
        .resize(target.width, target.height, { fit: "cover", position: "centre" })
        [target.format](target.options)
        .toFile(target.path);
    }
  } else {
    for (const target of targets) {
      if (!existsSync(target.path)) throw new Error(`Missing source and derivative for ${asset.id}: ${target.path}`);
      const metadata = await sharp(target.path).metadata();
      if (metadata.width !== target.width || metadata.height !== target.height) {
        throw new Error(`Unexpected dimensions for ${asset.id}: ${target.path}`);
      }
    }
  }

  return {
    id: asset.id,
    sourceType: asset.sourceType,
    sourceReference: asset.sourceReference,
    subject: asset.subject,
    alt: asset.alt,
    caption: asset.caption,
    allowedRoutes: asset.allowedRoutes,
    maxReuse: asset.maxReuse,
    focalPoint: asset.focalPoint,
    structuredDataRelationship: asset.structuredDataRelationship,
    derivatives: Object.fromEntries(targets.map((target) => [
      `${target.width}-${target.format === "jpeg" ? "jpg" : target.format}`,
      derivativeRecord(target.path, target.width, target.height, target.type)
    ]))
  };
}

const rendered = [];
for (const asset of generatedAssets) {
  rendered.push(await renderAsset(asset));
  process.stdout.write(`Materialised ${asset.id}\n`);
}

const register = {
  version: config.version,
  reviewed: config.reviewed,
  generation: config.generation,
  delivery: config.delivery,
  policy: config.policies,
  assets: rendered
};

writeFileSync(
  join(root, "creative-assets/module-media-asset-register.json"),
  `${JSON.stringify(register, null, 2)}\n`
);

process.stdout.write(`Materialised ${rendered.length} generated media assets.\n`);
