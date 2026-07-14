import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.cwd());
const registerPath = join(root, "creative-assets", "image-asset-register.json");
const outputRoot = join(root, "assets", "media", "products");
const maxBytes = 5 * 1024 * 1024;
const expectedWidth = 1600;
const expectedHeight = 900;
const formats = Object.freeze({
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg"
});

if (process.env.ALLOW_MEDIA_DOWNLOAD !== "true") {
  throw new Error("External media acquisition is disabled. Set ALLOW_MEDIA_DOWNLOAD=true only in the controlled acquisition workflow.");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function jpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error("Invalid JPEG signature.");
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) break;
    offset += segmentLength + 2;
  }
  throw new Error("JPEG dimensions could not be read.");
}

function webpDimensions(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("Invalid WebP signature.");
  }
  const chunk = buffer.toString("ascii", 12, 16);
  const dataOffset = 20;
  if (chunk === "VP8X") {
    const width = 1 + buffer[dataOffset + 4] + (buffer[dataOffset + 5] << 8) + (buffer[dataOffset + 6] << 16);
    const height = 1 + buffer[dataOffset + 7] + (buffer[dataOffset + 8] << 8) + (buffer[dataOffset + 9] << 16);
    return { width, height };
  }
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
      height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff
    };
  }
  if (chunk === "VP8L") {
    const b1 = buffer[dataOffset + 1];
    const b2 = buffer[dataOffset + 2];
    const b3 = buffer[dataOffset + 3];
    const b4 = buffer[dataOffset + 4];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}.`);
}

function avifDimensions(buffer) {
  if (buffer.toString("ascii", 4, 8) !== "ftyp" || !buffer.subarray(8, 64).toString("ascii").match(/avif|avis/)) {
    throw new Error("Invalid AVIF signature.");
  }
  const marker = Buffer.from("ispe");
  const offset = buffer.indexOf(marker);
  if (offset === -1 || offset + 16 > buffer.length) throw new Error("AVIF dimensions could not be read.");
  const width = buffer.readUInt32BE(offset + 8);
  const height = buffer.readUInt32BE(offset + 12);
  if (!width || !height || width > 20000 || height > 20000) throw new Error("AVIF dimensions are invalid.");
  return { width, height };
}

function dimensionsFor(format, buffer) {
  if (format === "jpg") return jpegDimensions(buffer);
  if (format === "webp") return webpDimensions(buffer);
  return avifDimensions(buffer);
}

async function download(asset, format) {
  const url = new URL(asset.downloadBaseUrl);
  url.searchParams.set("auto", "compress");
  url.searchParams.set("cs", "tinysrgb");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("h", String(expectedHeight));
  url.searchParams.set("w", String(expectedWidth));
  url.searchParams.set("fm", format);

  if (url.hostname !== "images.pexels.com") throw new Error(`Unapproved media host for ${asset.id}.`);

  const response = await fetch(url, {
    headers: {
      Accept: formats[format],
      "User-Agent": "NovaPharm-asset-acquisition/1.0"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`${asset.id}.${format} returned HTTP ${response.status}.`);
  if (new URL(response.url).hostname !== "images.pexels.com") throw new Error(`${asset.id}.${format} redirected to an unapproved host.`);

  const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
  if (contentType !== formats[format]) {
    throw new Error(`${asset.id}.${format} returned ${contentType || "no content type"}; expected ${formats[format]}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > maxBytes) throw new Error(`${asset.id}.${format} has an invalid byte size.`);
  const dimensions = dimensionsFor(format, buffer);
  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
    throw new Error(`${asset.id}.${format} is ${dimensions.width}x${dimensions.height}; expected ${expectedWidth}x${expectedHeight}.`);
  }
  return { buffer, dimensions, sourceUrl: url.toString(), contentType };
}

const register = JSON.parse(readFileSync(registerPath, "utf8"));
mkdirSync(outputRoot, { recursive: true });

for (const asset of register.assets) {
  const derivatives = {};
  for (const format of Object.keys(formats)) {
    const result = await download(asset, format);
    const path = join(outputRoot, `${asset.id}.${format}`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, result.buffer);
    derivatives[format] = {
      path: `assets/media/products/${asset.id}.${format}`,
      sourceUrl: result.sourceUrl,
      contentType: result.contentType,
      width: result.dimensions.width,
      height: result.dimensions.height,
      byteSize: result.buffer.length,
      sha256: sha256(result.buffer)
    };
  }
  asset.derivatives = derivatives;
  asset.reviewStatus = "downloaded-and-technically-validated";
}

register.materialisedAt = new Date().toISOString();
register.reviewed = new Date().toISOString().slice(0, 10);
writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`);
console.log(`Materialised ${register.assets.length} licensed product photographs in ${Object.keys(formats).length} formats.`);
