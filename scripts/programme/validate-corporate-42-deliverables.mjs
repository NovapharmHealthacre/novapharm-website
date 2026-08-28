import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const required = [
  "docs/design/apple-primary-source-study.md",
  "docs/design/apple-vs-novapharm.md",
  "docs/design/information-architecture.md",
  "docs/design/component-system.md",
  "docs/design/image-removal-register.md",
  "docs/design/content-audit.md",
  "docs/design/accessibility-contrast-audit.md",
  "docs/design/responsive-acceptance.md",
  "docs/design/print-pdf-acceptance.md",
  "docs/products/nutraxin-product-matrix.md",
  "docs/products/nutraxin-commerce-readiness.md",
  "docs/contact/contact-production-evidence.md",
  "docs/account/account-onboarding-production-evidence.md",
  "docs/portal/54-module-production-matrix.md",
  "docs/portal/security-production-evidence.md",
  "docs/infrastructure/dns-change-record.md",
  "docs/infrastructure/managed-production-evidence.md",
  "docs/release/final-acceptance.md",
  "docs/release/owner-action-register.md",
  "docs/programme/corporate-42-module-ledger.md"
];

const failures = [];
const read = (path) => readFileSync(join(root, path), "utf8");
for (const path of required) if (!existsSync(join(root, path))) failures.push(`missing required deliverable: ${path}`);

if (!failures.length) {
  const modules = JSON.parse(read("packages/portal-contracts/src/module-catalog.json"));
  const products = JSON.parse(read("docs/nutraxin-product-register.json")).products;
  const portalMatrix = read("docs/portal/54-module-production-matrix.md");
  const productMatrix = read("docs/products/nutraxin-product-matrix.md");
  const programme = read("docs/programme/corporate-42-module-ledger.md");
  const ownerActions = read("docs/release/owner-action-register.md");

  for (const module of modules) if (!portalMatrix.includes(`\`${module.code}\``)) failures.push(`Portal matrix omits ${module.code}`);
  for (const product of products) if (!productMatrix.includes(`/products/nutraxin/${product.slug}/`)) failures.push(`Nutraxin matrix omits ${product.slug}`);
  for (let number = 1; number <= 42; number += 1) if (!new RegExp(`^\\| ${number} \\|`, "m").test(programme)) failures.push(`42-module ledger omits module ${number}`);
  if (!ownerActions.includes("Repository-controlled work is not moved into this register")) failures.push("owner-action register does not state its external-only boundary");
  if (/REPOSITORY TODO|finish code|implement page|fix test/i.test(ownerActions)) failures.push("owner-action register contains repository-controlled unfinished work");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`Corporate deliverable validation failed: ${failure}`));
  process.exit(1);
}

console.log("Validated all 20 governed corporate deliverables, 42 programme rows, 54 Portal modules and 19 Nutraxin products.");
