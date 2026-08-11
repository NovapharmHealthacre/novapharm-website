import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputPath = path.join(root, "audit/generated/image-inventory.json");
const mediaPattern = /\.(?:avif|eps|jpe?g|pdf|png|svg|webp)$/iu;
const textPattern = /\.(?:css|html|js|jsx|json|md|mdx|mjs|ts|tsx|xml|ya?ml)$/iu;
const rasterPattern = /\.(?:avif|jpe?g|png|webp)$/iu;

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
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
  const marker = relativePath.indexOf("assets/");
  return marker >= 0 ? relativePath.slice(marker) : relativePath;
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

const tracked = trackedFiles();
const mediaFiles = tracked.filter((file) => mediaPattern.test(file));
const textFiles = tracked.filter((file) => textPattern.test(file) && file !== "audit/generated/image-inventory.json");
const textCorpus = [];
for (const file of textFiles) {
  const info = await stat(path.join(root, file));
  if (info.size > 5_000_000) continue;
  textCorpus.push({ file, content: await readFile(path.join(root, file), "utf8") });
}

const [assetRegister, productRegister, moduleRegister, provenanceRegister, modulePageRegister, croRegister, nutraxinRegister, applicationRegister] = await Promise.all([
  json("creative-assets/asset-register.json"),
  json("creative-assets/image-asset-register.json"),
  json("creative-assets/module-media-asset-register.json"),
  json("docs/media-provenance-register.json"),
  json("docs/module-media-register.json"),
  json("docs/cro-media-provenance.json"),
  json("docs/nutraxin-media-provenance.json"),
  json("docs/application-media-provenance.json")
]);

const registry = new Map();
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
    ? ["assets/media/cro/leadership/vishal-chakravarty-", "images/portrait/vishal-chakravarty-"]
    : asset.id === "girish-achliya-cro-portrait"
      ? ["assets/media/cro/leadership/girish-achliya-"]
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
  reviewDate: "2026-08-11",
  scope: "All tracked raster, vector, EPS and PDF assets; generated build directories and node_modules are excluded by git inventory.",
  caveats: [
    "Perceptual groups are automated candidates at dHash distance <= 2 and require human review before deletion or replacement.",
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
    console.error("Image inventory is stale. Run npm run images:inventory and review the resulting provenance gaps.");
    process.exit(1);
  }
  console.log(`Image inventory is current: ${inventory.length} tracked assets, ${exactIndex} exact duplicate groups and ${perceptualIndex} visual-review candidate groups.`);
} else {
  await writeFile(outputPath, serialised);
  console.log(`Generated image inventory for ${inventory.length} tracked assets at audit/generated/image-inventory.json.`);
}
