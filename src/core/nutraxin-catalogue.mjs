import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const nutraxinCatalogueCode = "NUTRAXIN-UK";
export const nutraxinExpectedRangeCounts = Object.freeze({
  "Vitamin D": 4,
  "Vitamin C": 4,
  Magnesium: 2,
  "Multivitamin and mineral": 3,
  Collagen: 3,
  "Additional support": 3
});

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function stableRecordChecksum(value) {
  return sha256(Buffer.from(JSON.stringify(value)));
}

export function loadNutraxinRegister(repositoryRoot = process.cwd()) {
  const path = resolve(repositoryRoot, "docs", "nutraxin-product-register.json");
  const bytes = readFileSync(path);
  return { path, bytes, checksum: sha256(bytes), register: JSON.parse(bytes.toString("utf8")) };
}

export function validateNutraxinRegister({ repositoryRoot = process.cwd(), verifyAssets = true } = {}) {
  const loaded = loadNutraxinRegister(repositoryRoot);
  const { register } = loaded;
  if (!register?.source?.sha256 || !Array.isArray(register.products)) throw new Error("Nutraxin register structure is invalid.");
  if (register.products.length !== 19) throw new Error(`Nutraxin register must contain exactly 19 products; found ${register.products.length}.`);
  const ids = new Set();
  const skus = new Set();
  const slugs = new Set();
  const rangeCounts = {};
  const assets = [];
  for (const product of register.products) {
    for (const field of ["id", "sku", "slug", "familyCode", "range", "category", "name", "packSize", "dosageForm", "imageBase", "imageSha256", "altText"]) {
      if (!String(product[field] || "").trim()) throw new Error(`Nutraxin product ${product.id || "unknown"} is missing ${field}.`);
    }
    if (!Array.isArray(product.formulation) || !product.formulation.length) throw new Error(`${product.id} has no composition lines.`);
    if (ids.has(product.id) || skus.has(product.sku) || slugs.has(product.slug)) throw new Error(`Duplicate Nutraxin identity detected for ${product.id}.`);
    ids.add(product.id); skus.add(product.sku); slugs.add(product.slug);
    rangeCounts[product.range] = Number(rangeCounts[product.range] || 0) + 1;
    const base = join(repositoryRoot, "assets", "media", "products", "nutraxin", product.imageBase);
    const files = [
      `${base}.png`, `${base}-480.webp`, `${base}-800.webp`, `${base}-480.avif`, `${base}-800.avif`
    ];
    if (verifyAssets) {
      for (const file of files) if (!existsSync(file)) throw new Error(`Nutraxin media asset is missing: ${file}`);
      const actualChecksum = sha256(readFileSync(files[0]));
      if (actualChecksum !== product.imageSha256) throw new Error(`Nutraxin source image checksum mismatch for ${product.id}.`);
    }
    assets.push(...files);
  }
  for (const [range, expected] of Object.entries(nutraxinExpectedRangeCounts)) {
    if (rangeCounts[range] !== expected) throw new Error(`Nutraxin range ${range} must contain ${expected} products; found ${rangeCounts[range] || 0}.`);
  }
  if (Object.keys(rangeCounts).length !== Object.keys(nutraxinExpectedRangeCounts).length) throw new Error("Nutraxin register contains an unexpected product range.");
  return {
    ...loaded,
    productCount: register.products.length,
    rangeCounts,
    assetCount: assets.length,
    discrepancyCount: register.products.reduce((total, product) => total + (product.notes?.length || 0), 0)
  };
}

