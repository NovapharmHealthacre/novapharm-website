import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputPath = path.join(root, "audit/generated/image-inventory.json");
const mediaPattern = /\.(?:avif|eps|jpe?g|pdf|png|svg|webp)$/iu;
const textPattern = /\.(?:css|html|js|jsx|json|md|mdx|mjs|ts|tsx|xml|ya?ml)$/iu;
const rasterPattern = /\.(?:avif|jpe?g|png|webp)$/iu;

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .sort();
}

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function normaliseAssetPath(value) {
  return String(value ?? "").replace(/^\//u, "");
}

function canonicalDeliveryPath(relativePath) {
  const publicMarker = "/public/";
  const publicIndex = relativePath.indexOf(publicMarker);
  if (publicIndex >= 0) return relativePath.slice(publicIndex + publicMarker.length);
  return relativePath;
}

function licenceName(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.name ?? value.url ?? "Registered licence object";
}

function addRegistryRecord(index, assetPath, record) {
  const key = normaliseAssetPath(assetPath);
  if (!key) return;
  index.set(key, { ...(index.get(key) ?? {}), ...record });
}

function countOccurrences(content, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = content.indexOf(needle, offset)) >= 0) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function markupFacts(content, canonicalPath) {
  const facts = { altText: new Set(), captions: new Set(), loading: new Set(), fetchPriority: new Set() };
  const publicPath = `/${canonicalPath}`;
  for (const picture of content.match(/<picture\b[\s\S]*?<\/picture>/giu) ?? []) {
    if (!picture.includes(canonicalPath) && !picture.includes(publicPath)) continue;
    const image = picture.match(/<img\b[^>]*>/iu)?.[0] ?? "";
    const alt = image.match(/\balt=["']([^"']*)["']/iu)?.[1];
    const loading = image.match(/\bloading=["']([^"']+)["']/iu)?.[1];
    const priority = image.match(/\bfetchpriority=["']([^"']+)["']/iu)?.[1];
    if (alt !== undefined) facts.altText.add(alt);
    if (loading) facts.loading.add(loading);
    if (priority) facts.fetchPriority.add(priority);
  }
  for (const figure of content.match(/<figure\b[\s\S]*?<\/figure>/giu) ?? []) {
    if (!figure.includes(canonicalPath) && !figure.includes(publicPath)) continue;
    const caption = figure.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/iu)?.[1]
      ?.replace(/<[^>]+>/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
    if (caption) facts.captions.add(caption);
  }
  return facts;
}

async function perceptualHash(absolutePath) {
  const pixels = await sharp(absolutePath, { failOn: "none" })
    .flatten({ background: "#ffffff" })
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let bits = "";
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const offset = row * 9 + column;
      bits += pixels[offset] > pixels[offset + 1] ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

function hammingDistance(left, right) {
  let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (value) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return distance;
}

function crossPlatformComparable(report) {
  const comparable = structuredClone(report);
  delete comparable.summary.perceptualDuplicateCandidateGroups;
  for (const asset of comparable.assets) {
    delete asset.perceptualHash;
    delete asset.perceptualDuplicateCandidateGroup;
  }
  return JSON.stringify(comparable);
}

const tracked = trackedFiles().filter((file) => existsSync(path.join(root, file)));
// Build-time original concept SVGs are not uploaded supplier photographs and have
// no independent image licence/photographic provenance. They are generated from
// source metadata for the ESCO shopping display and tested in test-esco-catalogue.
// Preserve the audited physical-source media inventory without presenting
// algorithmic derivatives as supplier-owned photographic assets.
const generatedEscoConcept = (file) => /^assets\/media\/esco\/previews\/esco-cat-[0-9]{4}\.svg$/.test(file);
const mediaFiles = tracked.filter((file) => mediaPattern.test(file) && !generatedEscoConcept(file));
const textFiles = tracked.filter((file) => textPattern.test(file) && file !== "audit/generated/image-inventory.json");
const textCorpus = [];
for (const file of textFiles) {
  const info = await stat(path.join(root, file));
  if (info.size > 5_000_000) continue;
  textCorpus.push({ file, content: await readFile(path.join(root, file), "utf8") });
}

const [assetRegister, productRegister, moduleRegister, provenanceRegister, modulePageRegister, croRegister, nutraxinRegister, applicationRegister, medicinesIntelligenceEvidence] = await Promise.all([
  json("creative-assets/asset-register.json"),
  json("creative-assets/image-asset-register.json"),
  json("creative-assets/module-media-asset-register.json"),
  json("docs/media-provenance-register.json"),
  json("docs/module-media-register.json"),
  json("docs/cro-media-provenance.json"),
  json("docs/nutraxin-media-provenance.json"),
  json("docs/application-media-provenance.json"),
  json("audit/evidence/medicines-intelligence/provenance.json")
]);

const registry = new Map();
// Provenance-specific records for the 61 source PDF photos. This establishes
// source and model-code links, NOT an assumption that publication rights or
// exact supply variants are independently approved.
const escoSupplierPhotos = await json("assets/data/esco-model-photo-map.json");
for (const [catalogueReference, image] of Object.entries(escoSupplierPhotos.images ?? {})) {
  if (!/^ESCO-CAT-[0-9]{4}$/.test(catalogueReference) ||
      !/^\/assets\/media\/esco\/esco-p[0-9]{2}-image[0-9]{2}\.webp$/.test(image.path)) throw Error("Unreviewed ESCO photo reference");
  addRegistryRecord(registry, image.path, {
    id: catalogueReference,
    source: "Owner-supplied Eastern Surgical Company ESCO 2026 PDF, page " + image.sourcePage,
    licence: "Manufacturer website usage rights pending confirmation",
    altText: "ESCO supplier catalogue photograph associated with model " + image.model,
    caption: "Printed model-code match only; actual supplied variant may differ",
    semanticPurpose: "Illustrative supplier product photograph",
    pageUsage: ["products/esco/index.html"],
    reviewStatus: "Model-code matched; image rights and exact variant unconfirmed",
    technicalStatus: "source-catalogue-provenance-registered-rights-pending",
    provenanceRecord: "assets/data/esco-model-photo-map.json#" + catalogueReference
  });
}

for (const asset of assetRegister.assets ?? []) {
  addRegistryRecord(registry, asset.path, {
    id: asset.path,
    source: asset.source,
    licence: licenceName(asset.licence),
    altText: asset.altText ?? null,
    caption: asset.caption ?? null,
    semanticPurpose: asset.type ?? null,
    responsiveDerivatives: asset.optimisedVariants ?? [],
    pageUsage: asset.pageUsage ?? [],
    reviewStatus: asset.ownerApproval ?? asset.technicalStatus ?? null,
    technicalStatus: asset.technicalStatus ?? null
  });
}

for (const asset of productRegister.assets ?? []) {
  const derivativePaths = Object.values(asset.derivatives ?? {}).map((derivative) => derivative.path);
  for (const derivative of Object.values(asset.derivatives ?? {})) {
    addRegistryRecord(registry, derivative.path, {
      id: asset.id,
      source: asset.sourcePage,
      licence: licenceName(productRegister.licence),
      altText: asset.altText ?? null,
      caption: asset.claimBoundary ?? null,
      semanticPurpose: asset.category ?? null,
      responsiveDerivatives: derivativePaths,
      focalPoint: asset.cropNotes ?? null,
      reviewStatus: asset.reviewStatus ?? null,
      technicalStatus: "registered-product-derivative"
    });
  }
}

for (const asset of moduleRegister.assets ?? []) {
  const derivativePaths = Object.values(asset.derivatives ?? {}).map((derivative) => derivative.path);
  for (const derivative of Object.values(asset.derivatives ?? {})) {
    addRegistryRecord(registry, derivative.path, {
      id: asset.id,
      source: asset.sourceReference,
      licence: moduleRegister.generation?.useStatus ?? null,
      altText: asset.alt ?? null,
      caption: asset.caption ?? null,
      semanticPurpose: asset.subject ?? null,
      responsiveDerivatives: derivativePaths,
      focalPoint: asset.focalPoint ?? null,
      pageUsage: asset.allowedRoutes ?? [],
      reviewStatus: moduleRegister.generation?.reviewRule ?? null,
      technicalStatus: "registered-module-derivative"
    });
  }
}

for (const asset of provenanceRegister.assets ?? []) {
  const publicBase = normaliseAssetPath(asset.publicBase);
  for (const file of mediaFiles) {
    const canonical = canonicalDeliveryPath(file).replace(/\.(?:avif|jpe?g|png|webp)$/iu, "").replace(/-\d+$/u, "");
    if (canonical !== publicBase) continue;
    addRegistryRecord(registry, canonicalDeliveryPath(file), {
      id: asset.id,
      source: asset.source,
      licence: licenceName(asset.licence),
      pageUsage: asset.pagesUsingIt ?? [],
      reviewStatus: asset.reviewStatus ?? null,
      provenanceRecord: asset.detailedRegister ?? null
    });
  }
}

for (const asset of croRegister.assets ?? []) {
  const prefixes = asset.id === "vishal-chakravarty-cro-portrait"
    ? ["assets/media/leadership/vishal-chakravarty-", "images/portrait/vishal-chakravarty-"]
    : asset.id === "prabhakar-lahare-cro-portrait"
      ? ["assets/media/leadership/prabhakar-lahare-"]
    : asset.id === "girish-achliya-cro-portrait"
      ? ["assets/media/leadership/girish-achliya-"]
      : [`assets/media/cro/${asset.id}-`];
  for (const file of mediaFiles) {
    const canonical = canonicalDeliveryPath(file);
    if (!prefixes.some((prefix) => canonical.startsWith(prefix))) continue;
    addRegistryRecord(registry, canonical, {
      id: asset.id,
      source: asset.source,
      licence: asset.licence,
      altText: asset.altText ?? null,
      caption: asset.caption ?? null,
      semanticPurpose: asset.visualPurpose ?? asset.type ?? null,
      focalPoint: {
        desktop: asset.desktopCrop ?? null,
        tablet: asset.tabletCrop ?? null,
        mobile: asset.mobileCrop ?? null
      },
      pageUsage: asset.placement ?? [],
      reviewStatus: asset.reviewStatus ?? null,
      technicalStatus: "registered-cro-media",
      provenanceRecord: `docs/cro-media-provenance.json#${asset.id}`
    });
  }
}

for (const asset of nutraxinRegister.assets ?? []) {
  addRegistryRecord(registry, asset.path, {
    id: asset.productId,
    source: asset.source,
    licence: asset.rightsBasis,
    altText: asset.altText ?? null,
    caption: nutraxinRegister.controls?.misrepresentation ?? null,
    semanticPurpose: `${asset.role}; owner-supplied Nutraxin catalogue product-pack artwork`,
    pageUsage: ["/product-portfolio/", "/product-portfolio/nutraxin/"],
    reviewStatus: asset.reviewStatus ?? null,
    technicalStatus: asset.role ?? null,
    provenanceRecord: `docs/nutraxin-media-provenance.json#${asset.path}`
  });
}

for (const asset of applicationRegister.assets ?? []) {
  addRegistryRecord(registry, canonicalDeliveryPath(asset.path), {
    id: asset.id,
    source: asset.source,
    licence: asset.licence,
    semanticPurpose: asset.semanticPurpose ?? null,
    pageUsage: asset.pageUsage ?? [],
    reviewStatus: asset.reviewStatus ?? null,
    technicalStatus: "registered-application-media",
    provenanceRecord: `docs/application-media-provenance.json#${asset.id}`
  });
}

for (const asset of medicinesIntelligenceEvidence.assets ?? []) {
  addRegistryRecord(registry, canonicalDeliveryPath(asset.path), {
    id: asset.path,
    source: asset.source,
    licence: asset.licence,
    semanticPurpose: asset.semanticPurpose,
    pageUsage: [],
    reviewStatus: asset.reviewStatus,
    technicalStatus: asset.technicalStatus,
    provenanceRecord: "audit/evidence/medicines-intelligence/provenance.json"
  });
}

for (const file of mediaFiles.filter((value) => value.startsWith("creative-assets/brand/novapharm-logo-asset-pack/"))) {
  addRegistryRecord(registry, file, {
    id: `official-logo-pack:${path.relative("creative-assets/brand/novapharm-logo-asset-pack", file)}`,
    source: "Owner-supplied NovaPharm Healthcare Logo Asset Pack received 13 August 2026",
    licence: "Owner-authorised NovaPharm Healthcare identity use; source rights controlled by NovaPharm Healthcare Ltd",
    semanticPurpose: "Governed non-public source master or approved brand derivative",
    pageUsage: [],
    reviewStatus: "owner-approved-authoritative-logo-pack",
    technicalStatus: "checksum-verified-source-archive",
    provenanceRecord: "final-report/official-logo-register.md"
  });
}

for (const file of mediaFiles.filter((value) => value.startsWith("creative-assets/brand/pharmascope-logo-asset-pack/"))) {
  addRegistryRecord(registry, file, {
    id: `official-pharmascope-pack:${path.relative("creative-assets/brand/pharmascope-logo-asset-pack", file)}`,
    source: "Owner-supplied PharmaScope Logo Asset Pack received 26 August 2026",
    licence: "Owner-authorised PharmaScope product-identity use; source rights controlled by NovaPharm Healthcare Ltd",
    semanticPurpose: "Governed non-public product-identity source master or approved derivative",
    pageUsage: [],
    reviewStatus: "owner-approved-authoritative-pharmascope-pack",
    technicalStatus: "checksum-verified-source-archive",
    provenanceRecord: "final-report/official-logo-register.md"
  });
}

// Canonical three-brand source rights and SHA evidence: never infer provenance
// from a filename, colour, matching perceptual image, or a declared renderer.
// The canonical current web canvas is Pure White #FFFFFF, while previously
// generated raster evidence remains historical (mineral-white #FBFAEF).
// Do not relabel historical bytes or waive per-asset SHA checks.
// The parent source registry records exact owner-supplied vector bytes; raster
// candidates are admitted only when their current physical SHA matches the
// signed-off generated-derivative register. No public release is implied.
const officialBrand = await json("config/brand-identities.json");
const brandRasterEvidence = await json("audit/generated/three-brand-raster-provenance.json");
if (officialBrand.approvedOn !== "2026-11-22" ||
    officialBrand.neutralPalette?.primaryWhite?.hex !== "#FFFFFF" ||
    brandRasterEvidence.sourceDate !== "2026-11-22" ||
    brandRasterEvidence.method !== "SVG source master rasterized by sharp" ||
    brandRasterEvidence.lightSocialBackground !== "#FBFAEF" ||
    !Array.isArray(brandRasterEvidence.files) ||
    brandRasterEvidence.files.length !== 31 ||
    brandRasterEvidence.count !== 44) {
  throw new Error("Official three-brand provenance contract changed without review");
}
const officialBrandVariants = {
  "assets/brand/novapharm-healthcare-logo-reverse.svg": "2aa3e14774fed64bd9454ed52ec3ca24a5dfa3b7477689093284c71eeebdf6f2",
  "assets/brand/novapharm-healthcare-logo-monochrome.svg": "598b755d89d0db65ed9929a260d829aebaa68c476cd4e51a33f0b3a8b8d68d0f",
  "assets/brand/novapharm-distribution-logo-reverse.svg": "ad4836f70ff23b66d5f213ed5188862628c41c918c451d7f709ab1baa1c2c036",
  "assets/brand/novapharm-distribution-logo-monochrome.svg": "85e296f76cb1534112c34ad04ee97f4a93c5a034f40239ea57499795dd66f2e1",
  "assets/brand/novapharm-intelligence-logo-reverse.svg": "0fc0272d8ab5c441193959f4afa3bac7939a5ca02ab706d5fb67c78cd6c62e1f",
  "assets/brand/novapharm-intelligence-logo-monochrome.svg": "9a408c1b98e91035b01fb6ef4e01a893047e26252443c946ba7d22538eaa805e"
};
const vectorEvidence = new Map(Object.entries(officialBrandVariants));
for (const brand of Object.values(officialBrand.brands)) {
  vectorEvidence.set(normaliseAssetPath(brand.primaryVector), brand.primaryVectorZipSha256);
  vectorEvidence.set(normaliseAssetPath(brand.favicon), brand.browserIconZipSha256);
}
const officialMedia = new Set(mediaFiles);
for (const [assetPath, expectedSha] of vectorEvidence) {
  if (!officialMedia.has(assetPath)) throw new Error("Approved official brand vector missing: " + assetPath);
  const actualSha = createHash("sha256").update(await readFile(path.join(root, assetPath))).digest("hex");
  if (actualSha !== expectedSha) throw new Error("Official brand vector provenance digest mismatch: " + assetPath);
  if (registry.get(assetPath)?.source) continue; // Preserve existing owner provenance.
  const estate = assetPath.includes("distribution") ? "distribution"
    : assetPath.includes("intelligence") ? "intelligence" : "healthcare";
  const brand = officialBrand.brands[estate];
  addRegistryRecord(registry, assetPath, {
    id: "three-brand-owner-vector:" + assetPath,
    source: "Owner-supplied " + brand.officialName + " approved SVG master/variant, exact SHA-256 " + expectedSha,
    licence: "Owner-authorised NovaPharm identity use; owner archive and source rights remain governed",
    semanticPurpose: "Official " + brand.officialName + " vector identity; not a third-party or clinical asset",
    pageUsage: [],
    reviewStatus: "owner-approved-byte-exact-vector-source",
    technicalStatus: "verified-svg-source-digest",
    provenanceRecord: "config/brand-identities.json; scripts/test-official-brand-triad.mjs"
  });
}
const rasterPaths = new Set();
for (const item of brandRasterEvidence.files) {
  const assetPath = item.path;
  const approvedRasterPath = typeof assetPath === "string" &&
    assetPath.startsWith("assets/brand/") &&
    !assetPath.slice("assets/brand/".length).includes("/") &&
    [".png", ".jpg", ".jpeg", ".ico"].some((extension) => assetPath.endsWith(extension));
  // Browser ICO files are SHA-verified against this owner-approved manifest,
  // but the current physical image inventory deliberately covers SVG, PNG,
  // JPEG, WebP, AVIF, EPS and PDF rather than ICO.
  const inventoriedRaster = !assetPath.endsWith(".ico");
  if (rasterPaths.has(assetPath) || !approvedRasterPath ||
      (inventoriedRaster && !officialMedia.has(assetPath)) ||
      !/^[a-f0-9]{64}$/u.test(item.sha256) ||
      !Number.isInteger(item.bytes) || item.bytes <= 0) {
    throw new Error("Invalid or missing three-brand physical derivative: " + String(assetPath));
  }
  rasterPaths.add(assetPath);
  const bytes = await readFile(path.join(root, assetPath));
  if (bytes.length !== item.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== item.sha256) {
    throw new Error("Three-brand derivative does not match registered bytes: " + assetPath);
  }
  if (!inventoriedRaster) continue; // Validate ICO bytes, but do not invent an inventory record.
  if (registry.get(assetPath)?.source) continue; // Preserve established source record.
  const estate = assetPath.includes("distribution") ? "distribution"
    : assetPath.includes("intelligence") ? "intelligence" : "healthcare";
  const brand = officialBrand.brands[estate];
  addRegistryRecord(registry, assetPath, {
    id: "three-brand-derived:" + assetPath,
    source: "SHA-verified SVG-derived asset generated by scripts/programme/rebuild-three-brand-derivatives.mjs from owner-approved " + brand.officialName + " source",
    licence: "Owner-authorised NovaPharm identity use; generated derivative, NOT identical to original ZIP raster",
    semanticPurpose: "Source-derived " + brand.officialName + " browser, PWA, favicon or social artwork",
    pageUsage: [],
    reviewStatus: "registered-generated-asset-awaiting-rendered-release-acceptance",
    technicalStatus: "source-linked-derived-raster-with-verified-sha256",
    provenanceRecord: "audit/generated/three-brand-raster-provenance.json#" + assetPath
  });
}

// Native release candidates are not public or signed binaries. Register each
// iOS/Android icon as a governed physical asset only after checking the exact
// owner-approved Intelligence SVG and its SHA-256 generated-output manifest.
// No filename-only, similarity-only, or inferred source-rights admissions.
// Native raster assets were approved under the older mineral-white canvas.
// Preserve their byte-verified provenance until an independent regeneration.
const nativeIconEvidence = await json("audit/generated/native-intelligence-icon-provenance.json");
const nativeIconPaths = new Set([
  "native/novapharm-intelligence-ios/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024x1024.png",
  "native/novapharm-intelligence-ios/App/Assets.xcassets/AppIcon.appiconset/AppIcon-dark-1024x1024.png",
  "native/novapharm-intelligence-ios/App/Assets.xcassets/AppIcon.appiconset/AppIcon-tinted-1024x1024.png",
  ...["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"].flatMap((density) => [
    `native/novapharm-intelligence-android/app/src/main/res/mipmap-${density}/ic_launcher.png`,
    `native/novapharm-intelligence-android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`
  ]),
  "native/novapharm-intelligence-android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png",
  "native/novapharm-intelligence-android/app/src/main/res/drawable-nodpi/ic_launcher_monochrome.png"
]);
if (nativeIconEvidence.schemaVersion !== 1 ||
    nativeIconEvidence.brand !== officialBrand.brands.intelligence.officialName ||
    nativeIconEvidence.source !== normaliseAssetPath(officialBrand.brands.intelligence.favicon) ||
    nativeIconEvidence.sourceSha256 !== officialBrand.brands.intelligence.browserIconZipSha256 ||
    nativeIconEvidence.color !== officialBrand.brands.intelligence.hex ||
    nativeIconEvidence.lightInk !== officialBrand.neutralPalette.defaultInk.hex ||
    nativeIconEvidence.lightBackground !== "#FBFAEF" ||
    nativeIconEvidence.status !== "unsigned-source-assets-only" ||
    !Array.isArray(nativeIconEvidence.outputs) ||
    nativeIconEvidence.outputs.length !== nativeIconPaths.size ||
    nativeIconPaths.size !== 15) {
  throw new Error("Native Intelligence source/provenance contract changed without review");
}
const seenNativeIcons = new Set();
for (const asset of nativeIconEvidence.outputs) {
  const assetPath = asset.filename;
  if (!nativeIconPaths.has(assetPath) || seenNativeIcons.has(assetPath) ||
      !officialMedia.has(assetPath) || !/^[a-f0-9]{64}$/u.test(asset.sha256) ||
      !Number.isInteger(asset.bytes) || asset.bytes <= 0) {
    throw new Error("Unapproved or missing Intelligence native icon: " + String(assetPath));
  }
  seenNativeIcons.add(assetPath);
  const bytes = await readFile(path.join(root, assetPath));
  if (bytes.length !== asset.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
    throw new Error("Native icon bytes do not match source-derived manifest: " + assetPath);
  }
  addRegistryRecord(registry, assetPath, {
    id: "intelligence-native-source-derived:" + assetPath,
    source: "SHA-256 verified derivative of owner-approved NovaPharm Intelligence SVG (not an app-store receipt)",
    licence: "Owner-authorised NovaPharm Intelligence identity artwork; unsigned prototype only",
    semanticPurpose: "Governed native launch icon candidate for iOS/Android",
    pageUsage: [],
    reviewStatus: "source-verified-unsigned-native-candidate-awaiting-device-and-release-acceptance",
    technicalStatus: "byte-exact-native-icon-manifest-validation",
    provenanceRecord: "audit/generated/native-intelligence-icon-provenance.json#" + assetPath
  });
}
if (seenNativeIcons.size !== nativeIconPaths.size) {
  throw new Error("Native Intelligence icon provenance set is incomplete");
}

for (const file of mediaFiles.filter((value) => value.startsWith("assets/media/oncology/") && value.endsWith(".svg"))) {
  const canonical = canonicalDeliveryPath(file);
  addRegistryRecord(registry, canonical, {
    id: path.basename(file, ".svg"),
    source: "Original repository-authored NovaPharm SVG",
    licence: "Original NovaPharm project work for owner-approved corporate use",
    semanticPurpose: "Oncology editorial information graphic",
    pageUsage: ["/oncology/"],
    reviewStatus: "registered-owner-directed-corrective-media",
    technicalStatus: "script-free-vector-delivery",
    provenanceRecord: "docs/oncology-corrective-media-register.md"
  });
}

// Each Connective owner-authorised pack photograph has exact source SHA256
// provenance. This is photo ownership and identity evidence, not a label or
// regulated-product retail approval.
if (existsSync(path.join(root, "docs/retail/connective-395-owner-photo-candidates.json"))) {
  const photos = await json("docs/retail/connective-395-owner-photo-candidates.json");
  if (photos.schema !== "novapharm-connective-owner-photos-v1" ||
      photos.originalImagesVerified !== 802 || photos.localImagesPrepared !== 395 ||
      !Array.isArray(photos.products) || photos.products.length !== 395 ||
      photos.paymentOffersAdmitted !== 0) {
    throw new Error("Unexpected Connective photograph provenance contract");
  }
  const seen = new Set();
  for (const record of photos.products) {
    if (!/^\d{13}$/.test(record.gtin) || seen.has(record.gtin) ||
        record.localImage !== "/assets/media/products/connective/"+record.gtin+"/front-800.webp" ||
        !/^[a-f0-9]{64}$/.test(record.sha256) ||
        record.ownerPhotoUsageAuthorised !== true || record.visuallyCurrentPackVerified !== false ||
        record.mandatoryLabelConfirmed !== false || record.paidCheckoutApproved !== false) {
      throw new Error("Unverified or malformed Connective image source");
    }
    seen.add(record.gtin);
    addRegistryRecord(registry, record.localImage, {
      id: "connective-owner-photo:"+record.gtin,
      source: "Checksum-verified archived supplier/manufacturer candidate image: "+record.originalSource+
        " (original SHA256 "+record.originalSha256+")",
      licence: "NovaPharm owner-authorised use of product photograph; third-party rights not independently validated",
      altText: "Supplier original photograph of "+record.gtin+" candidate pack",
      semanticPurpose: "Authentic manufacturer/supplier product-photo candidate for matching GTIN",
      pageUsage: [],
      reviewStatus: "owner-authorised-image; exact current UK packaging and full label pending",
      technicalStatus: "sha256-verified-original-derived-webp",
      provenanceRecord: "docs/retail/connective-395-owner-photo-candidates.json#"+record.gtin
    });
  }
}

const routeByAssetId = new Map();
for (const module of modulePageRegister.modules ?? []) {
  for (const assetId of [module.heroAsset, module.secondaryAsset].filter(Boolean)) {
    const current = routeByAssetId.get(assetId) ?? [];
    routeByAssetId.set(assetId, [...new Set([...current, module.route])]);
  }
}

const inventory = [];
for (const relativePath of mediaFiles) {
  const absolutePath = path.join(root, relativePath);
  const canonicalPath = canonicalDeliveryPath(relativePath);
  const fileBuffer = await readFile(absolutePath);
  const info = await stat(absolutePath);
  const record = registry.get(canonicalPath) ?? {};
  let metadata = {};
  let visualHash = null;
  if (rasterPattern.test(relativePath)) {
    metadata = await sharp(fileBuffer, { failOn: "none" }).metadata();
    visualHash = await perceptualHash(absolutePath);
  } else if (/\.svg$/iu.test(relativePath)) {
    metadata = await sharp(fileBuffer, { failOn: "none" }).metadata().catch(() => ({}));
  }

  const usageFiles = [];
  let referenceCount = 0;
  const observedAltText = new Set();
  const observedCaptions = new Set();
  const observedLoading = new Set();
  const observedPriority = new Set();
  for (const source of textCorpus) {
    const occurrences = countOccurrences(source.content, canonicalPath);
    if (!occurrences) continue;
    usageFiles.push(source.file);
    referenceCount += occurrences;
    if (/\.(?:html|tsx|jsx)$/iu.test(source.file)) {
      const facts = markupFacts(source.content, canonicalPath);
      facts.altText.forEach((value) => observedAltText.add(value));
      facts.captions.forEach((value) => observedCaptions.add(value));
      facts.loading.forEach((value) => observedLoading.add(value));
      facts.fetchPriority.forEach((value) => observedPriority.add(value));
    }
  }

  const provenanceStatus = record.source
    ? "registered"
    : relativePath.startsWith("audit/evidence/")
      ? "repository-generated-test-evidence"
      : "unregistered-physical-asset";
  const classification = record.source || relativePath.startsWith("audit/evidence/")
    ? "KEEP"
    : usageFiles.length
      ? "NEEDS_PROVENANCE"
      : "NEEDS_PROVENANCE";
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  const aspectRatio = width && height ? Number((width / height).toFixed(6)) : null;
  const routes = [...new Set([...(record.pageUsage ?? []), ...(routeByAssetId.get(record.id) ?? [])])].sort();
  const lcpRelevance = observedPriority.has("high") || /supply-network-hero(?!-1200)/u.test(relativePath);

  inventory.push({
    path: relativePath,
    canonicalDeliveryPath: canonicalPath,
    format: String(metadata.format ?? path.extname(relativePath).slice(1)).toLowerCase(),
    bytes: info.size,
    width,
    height,
    aspectRatio,
    sha256: createHash("sha256").update(fileBuffer).digest("hex"),
    perceptualHash: visualHash,
    classification,
    provenanceStatus,
    source: record.source ?? null,
    licence: record.licence ?? null,
    reviewStatus: record.reviewStatus ?? null,
    technicalStatus: record.technicalStatus ?? null,
    provenanceRecord: record.provenanceRecord ?? null,
    semanticPurpose: record.semanticPurpose ?? null,
    routes,
    focalPoint: record.focalPoint ?? null,
    registeredAltText: record.altText ?? null,
    registeredCaption: record.caption ?? null,
    observedAltText: [...observedAltText].sort(),
    observedCaptions: [...observedCaptions].sort(),
    responsiveDerivatives: [...new Set(record.responsiveDerivatives ?? [])].sort(),
    observedLoading: [...observedLoading].sort(),
    observedFetchPriority: [...observedPriority].sort(),
    lcpRelevance,
    usageCount: usageFiles.length,
    referenceCount,
    usageFiles: usageFiles.sort(),
    exactDuplicateGroup: null,
    perceptualDuplicateCandidateGroup: null,
    budgetReview: relativePath.startsWith("audit/evidence/")
      ? "REVIEW_EVIDENCE_EXEMPT_FROM_PUBLIC_DELIVERY_BUDGET"
      : relativePath.startsWith("creative-assets/brand/novapharm-logo-asset-pack/") || relativePath.startsWith("creative-assets/brand/pharmascope-logo-asset-pack/") || relativePath.startsWith("creative-assets/leadership/approved-")
        ? "REVIEW_GOVERNED_SOURCE_MASTER_EXEMPT_FROM_PUBLIC_DELIVERY_BUDGET"
      : info.size > 800_000
        ? "REVIEW_OVER_800_KB"
        : "WITHIN_PHYSICAL_FILE_CEILING"
  });
}

const exactGroups = new Map();
for (const asset of inventory) exactGroups.set(asset.sha256, [...(exactGroups.get(asset.sha256) ?? []), asset]);
let exactIndex = 0;
for (const assets of exactGroups.values()) {
  if (assets.length < 2) continue;
  exactIndex += 1;
  for (const asset of assets) asset.exactDuplicateGroup = `exact-${String(exactIndex).padStart(3, "0")}`;
  const registered = assets.find((asset) => asset.provenanceStatus === "registered");
  if (registered) {
    for (const asset of assets.filter((candidate) => candidate.provenanceStatus === "unregistered-physical-asset")) {
      asset.classification = "KEEP";
      asset.provenanceStatus = "registered-identical-delivery-copy";
      asset.source = `Byte-identical delivery copy of ${registered.path}`;
      asset.licence = registered.licence;
      asset.reviewStatus = registered.reviewStatus;
      asset.provenanceRecord = registered.provenanceRecord;
    }
  }
}

const hashable = inventory.filter((asset) => asset.perceptualHash);
const assigned = new Set();
let perceptualIndex = 0;
for (let index = 0; index < hashable.length; index += 1) {
  const anchor = hashable[index];
  if (assigned.has(anchor.path)) continue;
  const candidates = [anchor];
  for (let candidateIndex = index + 1; candidateIndex < hashable.length; candidateIndex += 1) {
    const candidate = hashable[candidateIndex];
    if (assigned.has(candidate.path)) continue;
    if (hammingDistance(anchor.perceptualHash, candidate.perceptualHash) <= 2) candidates.push(candidate);
  }
  if (candidates.length < 2) continue;
  perceptualIndex += 1;
  const group = `visual-candidate-${String(perceptualIndex).padStart(3, "0")}`;
  for (const asset of candidates) {
    asset.perceptualDuplicateCandidateGroup = group;
    assigned.add(asset.path);
  }
}

const countBy = (field) => Object.fromEntries(
  [...new Set(inventory.map((asset) => asset[field]))]
    .sort()
    .map((value) => [String(value), inventory.filter((asset) => asset[field] === value).length])
);

const report = {
  schemaVersion: "1.0",
  reviewDate: "2026-08-26",
  scope: "All tracked raster, vector, EPS and PDF assets; generated build directories and node_modules are excluded by git inventory.",
  caveats: [
    "Perceptual groups are automated candidates at dHash distance <= 2 and require human review before deletion or replacement.",
    "Cross-platform staleness validation excludes only native-decoder-derived perceptual hashes and candidate groups; byte hashes, dimensions, provenance, usage and all other fields remain strict.",
    "A physical file may be a governed delivery derivative or an intentional application copy; duplicate status alone is not permission to remove it.",
    "Repository-generated screenshots are test evidence, not public visual assets.",
    "Null semantic or provenance fields are explicit gaps, not inferred approvals."
  ],
  summary: {
    trackedAssetCount: inventory.length,
    byClassification: countBy("classification"),
    byProvenanceStatus: countBy("provenanceStatus"),
    exactDuplicateGroups: exactIndex,
    perceptualDuplicateCandidateGroups: perceptualIndex,
    overPublicDeliveryFileCeiling: inventory.filter((asset) => asset.budgetReview === "REVIEW_OVER_800_KB").length,
    lcpRelevantAssets: inventory.filter((asset) => asset.lcpRelevance).length
  },
  assets: inventory.sort((left, right) => left.path.localeCompare(right.path))
};

const serialised = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== serialised) {
    let currentReport;
    try {
      currentReport = JSON.parse(current);
    } catch {
      console.error("Image inventory is missing or invalid. Run npm run images:inventory and review the generated report.");
      process.exit(1);
    }
    if (crossPlatformComparable(currentReport) !== crossPlatformComparable(report)) {
      // Make a failed immutable-media review actionable without weakening the
      // comparison. Native dHash candidate differences remain advisory.
      const currentByPath = new Map((currentReport.assets ?? []).map((asset) => [asset.path, asset]));
      const skip = new Set(["perceptualHash", "perceptualDuplicateCandidateGroup"]);
      let diagnostics = 0;
      for (const expected of report.assets) {
        const existing = currentByPath.get(expected.path);
        if (!existing) {
          console.error("Media inventory missing asset:", expected.path);
          diagnostics += 1;
          continue;
        }
        for (const key of Object.keys(expected)) {
          if (skip.has(key)) continue;
          if (JSON.stringify(existing[key]) === JSON.stringify(expected[key])) continue;
          const preview = (value) => JSON.stringify(value)?.slice(0, 180);
          console.error("Media inventory mismatch:", expected.path, key,
            "stored=", preview(existing[key]), "expected=", preview(expected[key]));
          diagnostics += 1;
          if (diagnostics >= 24) break;
        }
        if (diagnostics >= 24) break;
      }
      if (!diagnostics) {
        console.error("Media inventory diagnostic: stored summary=", JSON.stringify(currentReport.summary), "generated summary=", JSON.stringify(report.summary));
        console.error("Media inventory diagnostic: stored assets=", currentReport.assets?.length, "generated assets=", report.assets.length);
        console.error("Media inventory diagnostic: first divergent ordering index=", report.assets.findIndex((asset, index) => asset.path !== currentReport.assets?.[index]?.path));
        console.error("Media inventory report summary, structure, or asset ordering differs from regenerated source");
      }
      console.error("Image inventory authoritative fields are stale. Run npm run images:inventory and review the resulting provenance gaps.");
      process.exit(1);
    }
    console.log("Image inventory authoritative fields are current; native-decoder perceptual candidates differ on this platform and remain advisory.");
  } else {
    console.log(`Image inventory is current: ${inventory.length} tracked assets, ${exactIndex} exact duplicate groups and ${perceptualIndex} visual-review candidate groups.`);
  }
} else {
  await writeFile(outputPath, serialised);
  console.log(`Generated image inventory for ${inventory.length} tracked assets at audit/generated/image-inventory.json.`);
}
