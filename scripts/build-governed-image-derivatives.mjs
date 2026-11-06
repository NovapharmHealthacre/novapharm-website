/**
 * Create responsive derivatives from a genuinely native, licensed 8K master.
 * Non-destructive: emits review-only assets and manifest; NEVER publishes.
 * Example: node scripts/build-governed-image-derivatives.mjs --id home-hero
 * --source /private/approved-master.png --output-dir /private/derivatives
 * --source-reference licence-record-123 --licence-status owned
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const policy = JSON.parse(readFileSync(resolve("config/image-master-policy.json"), "utf8"));
const argv = process.argv.slice(2);
const arg = (key) => { const i = argv.indexOf(`--${key}`); return i < 0 ? undefined : argv[i + 1]; };
const id = arg("id");
const source = arg("source");
const outputDir = arg("output-dir");
const sourceReference = arg("source-reference");
const licenceStatus = arg("licence-status");
for (const [key, value] of Object.entries({ id, source, outputDir, sourceReference, licenceStatus })) {
  assert.ok(value && !value.startsWith("--"), `Required argument missing: --${key}`);
}
assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Asset id must be kebab-case");
assert.ok(policy.governance.allowedLicenceStatus.includes(licenceStatus), "Unsupported licence status");
assert.notEqual(licenceStatus, "source-acquisition-required", "Source licence must be approved");
assert.ok(existsSync(resolve(source)), "Native approved source file unavailable");
const bytes = readFileSync(resolve(source));
const metadata = await sharp(bytes, { failOn: "error" }).metadata();
assert.ok(metadata.width >= policy.master.minimumWidth && metadata.height >= policy.master.minimumHeight,
  `Native source is ${metadata.width}x${metadata.height}, not 8K; NO UPSCALING allowed`);
assert.ok(["jpeg", "png", "tiff", "webp", "avif"].includes(metadata.format),
  "Only actual native raster source files qualify as 8K; SVG-rendered or raw images do not");
assert.ok(!metadata.hasAlpha, "8K source masters must be opaque imagery");
assert.ok(!metadata.pages || metadata.pages === 1, "Multiframe sources are not accepted");
const destination = resolve(outputDir);
assert.notEqual(destination, resolve(source), "Output must differ from source");
assert.ok(!destination.includes("/public/") && !destination.includes("/gh-pages/"),
  "Review derivatives must not be written directly to public deploy paths");
mkdirSync(destination, { recursive: true });
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const manifest = {
  id, sourceReference, licenceStatus, status: "in-review",
  master: { path: resolve(source), width: metadata.width, height: metadata.height, sha256: hash(bytes) },
  derivatives: {},
  releaseApproval: "PENDING: visual, provenance, regulatory, accessibility and browser review"
};
for (const width of policy.derivatives.widths) {
  assert.ok(width <= metadata.width, "Upscaling prohibited");
  for (const format of policy.derivatives.formats) {
    const budget = policy.budgets[String(width)]?.[format];
    assert.ok(Number.isInteger(budget) && budget > 0, `No byte budget for ${width}-${format}`);
    let result;
    for (const quality of [78, 70, 62, 54, 46, 38, 30, 24]) {
      const image = sharp(bytes).rotate().resize({ width, withoutEnlargement: true, fit: "inside" });
      const output = format === "avif" ? await image.avif({ quality, effort: 5 }).toBuffer()
        : format === "webp" ? await image.webp({ quality, effort: 5 }).toBuffer()
        : await image.jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer();
      if (output.length <= budget) { result = { output, quality }; break; }
    }
    assert.ok(result, `${id}: cannot meet ${width}-${format} byte budget`);
    const dimensions = await sharp(result.output).metadata();
    assert.equal(dimensions.width, width);
    const path = join(destination, `${id}-${width}.${format}`);
    writeFileSync(path, result.output, { flag: "wx" });
    assert.ok(statSync(path).size <= budget);
    manifest.derivatives[`${width}-${format}`] = {
      path, width: dimensions.width, height: dimensions.height, bytes: result.output.length,
      quality: result.quality, sha256: hash(result.output)
    };
  }
}
const manifestPath = join(destination, `${id}-review-manifest.json`);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
console.log(`Created ${Object.keys(manifest.derivatives).length} derivatives for review; release NOT authorised.\n${manifestPath}`);
